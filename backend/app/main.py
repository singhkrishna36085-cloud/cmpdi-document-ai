import os
import logging
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .database import get_db, AsyncSessionLocal
from .services.audit_service import ensure_audit_schema
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
    async with AsyncSessionLocal() as session:
        await ensure_audit_schema(session)


# ── CORS: allow environment-configured origins + dev server fallbacks ───────
raw_origins = os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_PUBLIC_URL", "https://sih-26023-flame.vercel.app,http://localhost:3000,http://127.0.0.1:3000"))
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if "https://sih-26023-flame.vercel.app" not in allowed_origins:
    allowed_origins.append("https://sih-26023-flame.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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


# ── Health endpoints ──────────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "message": "CMPDI backend is running."}


@app.get("/api/health/db", tags=["health"])
async def db_health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "detail": "PostgreSQL connection successful"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database connection failed")


@app.get("/api/health/ready", tags=["health"])
async def ready_health_check(db: AsyncSession = Depends(get_db)):
    """
    Production operational readiness health check.
    Validates backend + database connection without leaking internal details.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "service": "cmpdi-document-ai",
        }
    except Exception:
        raise HTTPException(status_code=503, detail="Service not ready: database connection failed")

