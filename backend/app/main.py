import os
import logging
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .database import get_db, AsyncSessionLocal, engine, Base, get_sanitized_db_info
from .services.audit_service import ensure_audit_schema
from .core.seed import seed_initial_users
from .routers import documents as docs_router
from .routers import processing as processing_router
from .routers import validation as validation_router
from .routers import search as search_router
from .routers import assistant as assistant_router
from .routers import reports as reports_router
from .routers import topics as topics_router
from .routers import dashboard as dashboard_router
from .routers import auth as auth_router
from .routers import users as users_router
from .routers import audit as audit_router
from .routers import cross_document as cross_doc_router
from .routers import government_resources as govt_resources_router

logger = logging.getLogger("cmpdi_backend")

app = FastAPI(
    title="CMPDI / CIL DOCUMENT AI",
    description="AI-Assisted Geological, Mining & Production Reporting Platform",
    version="1.0.0",
)


@app.on_event("startup")
async def on_startup():
    # 1. Ensure all database tables exist (safe on fresh or existing databases)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_bytes BYTEA;"))
        logger.info("Database schema initialized and file_bytes column verified.")
    except Exception as exc:
        logger.warning(f"Database schema check notice: {exc}")

    # 2. Ensure schema additions and default user accounts
    try:
        async with AsyncSessionLocal() as session:
            await ensure_audit_schema(session)
            await seed_initial_users(session)
        logger.info("Audit schema verified and default seed users confirmed.")
    except Exception as exc:
        logger.warning(f"Startup maintenance notice: {exc}")

    # 3. Check FAISS vector index and auto-reindex from PostgreSQL if empty
    try:
        from app.services.vector_search import get_index_status
        v_status = get_index_status()
        if v_status.get("total_vectors", 0) == 0:
            from app.routers.documents import auto_reindex_background_task
            import asyncio
            asyncio.create_task(auto_reindex_background_task())
            logger.info("Triggered auto_reindex_background_task on startup to populate FAISS.")
    except Exception as exc:
        logger.warning(f"Startup vector index verification notice: {exc}")


# ── CORS: dynamic support for Vercel, Railway, Render, custom domains, and local dev ──
raw_origins = os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_PUBLIC_URL", ""))
explicit_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

# Default local & preview origins
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://sih-26023-flame.vercel.app",
    "https://khanijgyan-ai.vercel.app",
    "https://khanijgyan.ai",
]
for origin in default_origins:
    if origin not in explicit_origins:
        explicit_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=explicit_origins,
    allow_origin_regex=r"^https?://([a-zA-Z0-9_\-]+\.)*(vercel\.app|onrender\.com|railway\.app|loca\.lt|khanijgyan\.ai)(:[0-9]+)?$|^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler to mask stack traces in production ─────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    debug_mode = os.getenv("DEBUG", "False").lower() in ("true", "1")
    if debug_mode:
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    
    exc_type = type(exc).__name__
    exc_str = str(exc)
    if any(k in exc_type for k in ("InsufficientResourcesError", "PostgresConnectionError", "CannotConnectNowError", "OperationalError")):
        return JSONResponse(
            status_code=503,
            content={
                "detail": f"Database temporarily unavailable ({exc_type}: {exc_str}). Please check Neon cloud database compute quota or status.",
                "error_type": exc_type
            }
        )
    return JSONResponse(status_code=500, content={"detail": "An internal server error occurred."})


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(docs_router.router)
app.include_router(processing_router.router)
app.include_router(validation_router.router)
app.include_router(validation_router.validation_center_router)
app.include_router(validation_router.global_conflicts_router)
app.include_router(search_router.router)
app.include_router(assistant_router.router)
app.include_router(reports_router.router)
app.include_router(topics_router.router)
app.include_router(dashboard_router.router)
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(audit_router.router)
app.include_router(cross_doc_router.router)
app.include_router(govt_resources_router.router)


# ── Root & Health endpoints ──────────────────────────────────────────────────
@app.get("/", tags=["health"])
def root_index():
    return {
        "service": "CMPDI / CIL Document AI Backend",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/docs",
        "health_check": "/api/health/ready"
    }


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "message": "CMPDI backend is running."}


@app.get("/api/health/db", tags=["health"])
async def db_health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "detail": "PostgreSQL connection successful",
            "diagnostics": get_sanitized_db_info()
        }
    except Exception as exc:
        logger.error(f"Database health check failed (/api/health/db): {type(exc).__name__}: {exc}", exc_info=True)
        db_info = get_sanitized_db_info()
        hint = "Database connection error."
        if db_info.get("host") in ("localhost", "127.0.0.1"):
            hint = "DATABASE_URL is set to localhost. In production (Render), configure DATABASE_URL with your remote PostgreSQL connection string."
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Database connection failed",
                "error_type": type(exc).__name__,
                "error_detail": str(exc),
                "diagnostics": db_info,
                "hint": hint,
            }
        )


@app.get("/api/health/ready", tags=["health"])
async def ready_health_check(db: AsyncSession = Depends(get_db)):
    """
    Production operational readiness health check.
    Validates backend + database connection without leaking internal credentials.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "service": "cmpdi-document-ai",
            "diagnostics": get_sanitized_db_info()
        }
    except Exception as exc:
        logger.error(f"Operational readiness check failed (/api/health/ready): {type(exc).__name__}: {exc}", exc_info=True)
        db_info = get_sanitized_db_info()
        hint = "Database connection failed."
        if db_info.get("host") in ("localhost", "127.0.0.1"):
            hint = "DATABASE_URL points to localhost. On Render, add your remote PostgreSQL DATABASE_URL in Environment Variables."
        raise HTTPException(
            status_code=503,
            detail=f"Service not ready: database connection failed ({type(exc).__name__}: {hint})"
        )

