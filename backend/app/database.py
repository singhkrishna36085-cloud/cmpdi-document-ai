import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# ── Construct / Parse PostgreSQL Connection URL ──────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
connect_args = {}

if not DATABASE_URL:
    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "cmpdi")
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Normalize scheme to asyncpg driver
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

    # Clean query string for asyncpg (translate sslmode -> connect_args and strip unsupported libpq params)
    try:
        parsed = urllib.parse.urlparse(DATABASE_URL)
        qs = urllib.parse.parse_qs(parsed.query)
        if "sslmode" in qs or "ssl" in qs:
            connect_args["ssl"] = True

        clean_query = "&".join(
            [f"{k}={v[0]}" for k, v in qs.items() if k not in ("sslmode", "ssl", "channel_binding")]
        )
        DATABASE_URL = urllib.parse.urlunparse(parsed._replace(query=clean_query))
    except Exception:
        pass

DEBUG_MODE = os.getenv("DEBUG", "False").lower() in ("true", "1")

# Connection pool settings for reliable cloud connections
engine_kwargs = {
    "echo": DEBUG_MODE,
    "future": True,
    "pool_pre_ping": True,
}

if connect_args:
    engine_kwargs["connect_args"] = connect_args

if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


