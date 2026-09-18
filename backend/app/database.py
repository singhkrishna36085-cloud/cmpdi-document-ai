import os
import logging
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

logger = logging.getLogger("database")

# ── 1. Locate Database Connection String from Environment ─────────────────────
# Detect standard DATABASE_URL or common cloud platform aliases (Render, Neon, Supabase, Vercel)
raw_db_url = (
    os.getenv("DATABASE_URL") or
    os.getenv("DATABASE_INTERNAL_URL") or
    os.getenv("DATABASE_EXTERNAL_URL") or
    os.getenv("POSTGRES_URL") or
    os.getenv("POSTGRES_PRISMA_URL") or
    os.getenv("POSTGRES_URL_NON_POOLING") or
    os.getenv("POSTGRESQL_URL")
)

connect_args = {}
url_source = "DATABASE_URL"
sanitized_host = "localhost"
sanitized_port = "5432"
sanitized_db = "cmpdi"
ssl_enabled = False

if not raw_db_url:
    url_source = "POSTGRES_* components (fallback)"
    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "cmpdi")
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    sanitized_host = DB_HOST
    sanitized_port = DB_PORT
    sanitized_db = DB_NAME
else:
    DATABASE_URL = raw_db_url.strip()
    # Normalize scheme to asyncpg driver
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

    # Clean query string for asyncpg (translate sslmode -> connect_args and strip unsupported libpq params)
    try:
        parsed = urllib.parse.urlparse(DATABASE_URL)
        sanitized_host = parsed.hostname or "unknown"
        sanitized_port = str(parsed.port or "5432")
        sanitized_db = parsed.path.lstrip("/") or "unknown"
        qs = urllib.parse.parse_qs(parsed.query)

        # Determine SSL requirement
        is_local_host = sanitized_host.lower() in ("localhost", "127.0.0.1", "host.docker.internal", "db")
        explicit_ssl_req = any(
            k in qs for k in ("sslmode", "ssl")
        ) or os.getenv("DB_SSL", "").lower() in ("true", "1", "require")
        explicit_ssl_disable = (
            qs.get("sslmode", [""])[0].lower() in ("disable", "false", "0") or
            qs.get("ssl", [""])[0].lower() in ("disable", "false", "0") or
            os.getenv("DB_SSL", "").lower() in ("false", "0", "disable")
        )

        # Cloud hosts (Neon, Supabase, Render, Railway, AWS RDS, etc.) require SSL by default
        if not explicit_ssl_disable and (explicit_ssl_req or not is_local_host):
            connect_args["ssl"] = True
            ssl_enabled = True

        # Strip libpq-specific params unsupported by asyncpg
        unsupported_params = {"sslmode", "ssl", "channel_binding", "pgbouncer", "target_session_attrs", "application_name"}
        clean_query = "&".join(
            [f"{k}={v[0]}" for k, v in qs.items() if k not in unsupported_params]
        )
        DATABASE_URL = urllib.parse.urlunparse(parsed._replace(query=clean_query))
    except Exception as parse_err:
        logger.warning(f"Notice on DATABASE_URL parsing: {parse_err}")

# ── 2. Asyncpg Driver Connection Arguments ───────────────────────────────────
# Statement cache size 0 is required for PgBouncer / Neon / Supabase transaction poolers
connect_args["statement_cache_size"] = 0
connect_args["timeout"] = int(os.getenv("DB_TIMEOUT", "15"))

DEBUG_MODE = os.getenv("DEBUG", "False").lower() in ("true", "1")

# Connection pool settings for reliable cloud connections
engine_kwargs = {
    "echo": DEBUG_MODE,
    "future": True,
    "pool_pre_ping": True,
    "pool_recycle": 1800,
    "connect_args": connect_args,
}

if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))

# Log safe sanitized database configuration (NEVER logs credentials or secrets)
logger.info(
    f"PostgreSQL async engine configured: host={sanitized_host}:{sanitized_port}, "
    f"database={sanitized_db}, ssl={ssl_enabled}, source={url_source}"
)

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
        "is_cloud_host": sanitized_host.lower() not in ("localhost", "127.0.0.1", "host.docker.internal"),
        "source": url_source,
    }


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session



