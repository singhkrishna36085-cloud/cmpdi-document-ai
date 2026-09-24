"""
database.py - CMPDI / CIL Document AI
Async PostgreSQL connection via SQLAlchemy + asyncpg.

KEY DESIGN DECISIONS:
- All query params (channel_binding, sslmode, ssl, pgbouncer, etc.) are STRIPPED
  from DATABASE_URL before passing to SQLAlchemy / asyncpg.
  asyncpg.connect() does NOT accept libpq-specific parameters.
- The URL is REBUILT from its individual components (user, password, host, port, db),
  guaranteeing that NO query string parameters survive into asyncpg.
- SSL is handled via connect_args["ssl"] = True for cloud (non-localhost) hosts.
- PgBouncer / Neon transaction pooler compatibility: statement_cache_size=0.
"""

import os
import ssl
import logging
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

def _get_ssl_context() -> ssl.SSLContext:
    """Creates a TLS context that encrypts traffic while accepting Supabase/cloud pooler certificates."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

# Ensure startup logs are visible in Render / Docker / cloud environments
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("database")

# ── 1. Read raw Database URL from environment ─────────────────────────────────
# Support Render, Neon, Supabase, Vercel, Railway env var names
raw_db_url = (
    os.getenv("DATABASE_URL") or
    os.getenv("DATABASE_INTERNAL_URL") or
    os.getenv("DATABASE_EXTERNAL_URL") or
    os.getenv("POSTGRES_URL") or
    os.getenv("POSTGRES_PRISMA_URL") or
    os.getenv("POSTGRES_URL_NON_POOLING") or
    os.getenv("POSTGRESQL_URL") or
    ""
).strip()

# Diagnostic variables (non-sensitive — never contain password)
connect_args: dict = {}
url_source = "unknown"
sanitized_host = "localhost"
sanitized_port = "5432"
sanitized_db = "cmpdi"
ssl_enabled = False


def _extract_raw_userinfo(netloc: str) -> tuple[str, str]:
    """
    Extract the raw (already-percent-encoded) username and password from netloc.
    Returns them as-is so we do not double-encode existing %-encoded chars.
    Example: 'user:p%40ss@host:5432' -> ('user', 'p%40ss')
    """
    at_pos = netloc.rfind("@")
    if at_pos == -1:
        return "", ""
    userinfo = netloc[:at_pos]
    colon_pos = userinfo.find(":")
    if colon_pos == -1:
        return userinfo, ""
    return userinfo[:colon_pos], userinfo[colon_pos + 1:]


def _build_clean_url(raw: str) -> tuple[str, str, str, str, bool]:
    """
    Parse a raw PostgreSQL connection URL and rebuild it WITHOUT any query string.

    This is the critical safety mechanism:
    - Extracts: host, port, database, user, password (raw/encoded)
    - Detects SSL requirement from sslmode/ssl query params
    - Returns a clean URL with ONLY scheme://user:pass@host:port/db
      — zero query params reach asyncpg.connect()

    Returns: (clean_url, host, port, dbname, ssl_required)
    """
    url = raw.strip()

    # Normalize scheme to postgresql+asyncpg
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    # If already postgresql+asyncpg:// or unknown scheme, keep as-is

    try:
        parsed = urllib.parse.urlparse(url)
    except Exception as exc:
        logger.error("Failed to parse DATABASE_URL: %s", exc)
        return url, "unknown", "5432", "unknown", True  # assume SSL for safety

    # Extract raw (possibly percent-encoded) user/password from netloc
    raw_user, raw_pass = _extract_raw_userinfo(parsed.netloc)

    db_host = parsed.hostname or "localhost"
    db_port = str(parsed.port or 5432)
    db_name = (parsed.path or "/cmpdi").lstrip("/") or "cmpdi"

    # Detect SSL requirement from query params BEFORE discarding them
    qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    sslmode_val = qs.get("sslmode", [""])[0].lower()
    ssl_val = qs.get("ssl", [""])[0].lower()
    db_ssl_env = os.getenv("DB_SSL", "").lower()

    is_local = db_host.lower() in (
        "localhost", "127.0.0.1", "::1", "host.docker.internal", "db", "postgres"
    )
    explicit_disable = (
        sslmode_val in ("disable", "false", "0") or
        ssl_val in ("disable", "false", "0", "no") or
        db_ssl_env in ("false", "0", "disable", "no")
    )
    needs_ssl = not explicit_disable and (
        sslmode_val in ("require", "prefer", "allow", "verify-ca", "verify-full") or
        ssl_val in ("true", "1", "require") or
        db_ssl_env in ("true", "1", "require") or
        not is_local  # non-localhost → cloud → require SSL
    )

    # On long-running web servers (FastAPI/Uvicorn on Render), connecting through
    # Neon's PgBouncer pooler (-pooler) causes session limit exhaustion and
    # "53000 InsufficientResourcesError".
    # Neon provides an identical direct host without '-pooler.' that accepts standard asyncpg connections.
    prefer_direct = os.getenv("PREFER_DIRECT_DB", "true").lower() in ("true", "1")
    if prefer_direct and "-pooler." in db_host:
        original_host = db_host
        db_host = db_host.replace("-pooler.", ".")
        logger.info(
            "Auto-switching Neon host from pooler (%s) to direct (%s) for persistent asyncpg connection.",
            original_host, db_host,
        )

    # Rebuild URL from scratch — NO query params (this is what prevents the error)
    if raw_user and raw_pass:
        # Strip literal brackets if user retained them from [YOUR-PASSWORD]
        clean_pass = raw_pass.strip()
        if clean_pass.startswith("[") and clean_pass.endswith("]"):
            clean_pass = clean_pass[1:-1]
        
        # Safely percent-encode password so special characters like @, #, : do not corrupt asyncpg connection
        enc_pass = urllib.parse.quote(urllib.parse.unquote(clean_pass), safe="")
        enc_user = urllib.parse.quote(urllib.parse.unquote(raw_user), safe=".")
        clean_url = f"postgresql+asyncpg://{enc_user}:{enc_pass}@{db_host}:{db_port}/{db_name}"
    elif raw_user:
        enc_user = urllib.parse.quote(urllib.parse.unquote(raw_user), safe=".")
        clean_url = f"postgresql+asyncpg://{enc_user}@{db_host}:{db_port}/{db_name}"
    else:
        clean_url = f"postgresql+asyncpg://{db_host}:{db_port}/{db_name}"

    return clean_url, db_host, db_port, db_name, needs_ssl


# ── 2. Build the final, clean DATABASE_URL ────────────────────────────────────
if not raw_db_url:
    # No URL env var: assemble from individual POSTGRES_* vars
    url_source = "POSTGRES_* env vars (fallback)"
    _user = os.getenv("POSTGRES_USER", "postgres")
    _pass = urllib.parse.quote(os.getenv("POSTGRES_PASSWORD", "password"), safe="")
    _host = os.getenv("POSTGRES_HOST", "localhost")
    _port = os.getenv("POSTGRES_PORT", "5432")
    _db = os.getenv("POSTGRES_DB", "cmpdi")
    _user_enc = urllib.parse.quote(_user, safe="")

    sanitized_host = _host
    sanitized_port = _port
    sanitized_db = _db

    DATABASE_URL = f"postgresql+asyncpg://{_user_enc}:{_pass}@{_host}:{_port}/{_db}"

    _is_local = _host.lower() in ("localhost", "127.0.0.1", "::1", "host.docker.internal", "db", "postgres")
    _db_ssl = os.getenv("DB_SSL", "").lower()
    if not _is_local or _db_ssl in ("true", "1", "require"):
        connect_args["ssl"] = _get_ssl_context()
        ssl_enabled = True
else:
    url_source = "DATABASE_URL env var"
    DATABASE_URL, sanitized_host, sanitized_port, sanitized_db, ssl_enabled = _build_clean_url(raw_db_url)
    if ssl_enabled:
        connect_args["ssl"] = _get_ssl_context()

# ── 3. asyncpg-compatible connect_args ────────────────────────────────────────
# statement_cache_size=0: required for PgBouncer / Neon / Supabase transaction poolers
# (avoids "prepared statement does not exist" errors after connection is recycled)
connect_args["statement_cache_size"] = 0
connect_args["timeout"] = int(os.getenv("DB_TIMEOUT", "30"))

# ── 4. Safe diagnostic log (password is NEVER logged) ────────────────────────
logger.info(
    "PostgreSQL engine: host=%s port=%s db=%s ssl=%s source=%s connect_args_keys=%s",
    sanitized_host, sanitized_port, sanitized_db,
    ssl_enabled, url_source,
    list(connect_args.keys()),
)

# Double-check: log whether the final URL has any query params
_has_query = "?" in DATABASE_URL
if _has_query:
    logger.error(
        "CRITICAL: DATABASE_URL still contains query parameters after cleanup! "
        "This will cause asyncpg.connect() to fail. URL fragment after host: %s",
        DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
    )
else:
    logger.info("DATABASE_URL is clean — no query parameters (channel_binding safe).")

DEBUG_MODE = os.getenv("DEBUG", "False").lower() in ("true", "1")

# ── 5. Create the SQLAlchemy async engine ────────────────────────────────────
engine_kwargs: dict = {
    "echo": DEBUG_MODE,
    "future": True,
    "pool_pre_ping": True,
    "pool_recycle": 1800,
    "connect_args": connect_args,
}

if "-pooler" in sanitized_host or os.getenv("USE_NULL_POOL", "false").lower() in ("true", "1"):
    from sqlalchemy.pool import NullPool
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs.pop("pool_recycle", None)
    logger.info("Using NullPool for connection pooler (%s)", sanitized_host)
elif not DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "5"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "10"))

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


def get_sanitized_db_info() -> dict:
    """Returns non-sensitive database connection metadata for diagnostic health checks."""
    return {
        "driver": "asyncpg",
        "host": sanitized_host,
        "port": sanitized_port,
        "database": sanitized_db,
        "ssl_configured": ssl_enabled,
        "is_cloud_host": sanitized_host.lower() not in (
            "localhost", "127.0.0.1", "::1", "host.docker.internal"
        ),
        "source": url_source,
        "connect_args_keys": list(connect_args.keys()),
    }


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
