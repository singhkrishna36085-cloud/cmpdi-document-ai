"""
Cross-Document Intelligence Router (STEP 16)
POST /api/cross-document/compare — Side-by-side multi-document/project comparison with metric deltas
POST /api/cross-document/analyze — Multi-document dynamic statistical summary
POST /api/cross-document/filter  — Structured threshold criteria filtering
GET  /api/cross-document/metrics — Projects metadata & available metrics options
GET  /api/cross-document/conflicts — Cross-document conflicts list
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.core.dependencies import get_current_user, get_optional_user, get_allowed_document_ids
from app.services import cross_document_service
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/cross-document", tags=["cross-document"])


class CompareRequest(BaseModel):
    projects: Optional[List[str]] = Field(default=None, description="List of project names or mine identifiers to compare")


class FilterRequest(BaseModel):
    min_production: Optional[float] = Field(default=None, description="Minimum raw coal production in tonnes")
    max_production: Optional[float] = Field(default=None, description="Maximum raw coal production in tonnes")
    min_seam: Optional[float] = Field(default=None, description="Minimum average seam thickness in metres")
    max_seam: Optional[float] = Field(default=None, description="Maximum average seam thickness in metres")
    min_sr: Optional[float] = Field(default=None, description="Minimum stripping ratio")
    max_sr: Optional[float] = Field(default=None, description="Maximum stripping ratio")
    has_safety_incidents: Optional[bool] = Field(default=None, description="Filter by presence of non-zero safety incidents")
    risk_keyword: Optional[str] = Field(default=None, description="Keyword search string in risk flags or geological notes")
    subsidiary: Optional[str] = Field(default=None, description="Subsidiary code filter (e.g., SECL, NCL, WCL, ECL, CCL, BCCL, NEC)")


@router.get("/metrics", status_code=status.HTTP_200_OK)
async def get_metrics_metadata_endpoint(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns available project identifiers, subsidiaries, coalfields, and metrics metadata.
    Enforces RBAC document permissions.
    """
    allowed_doc_ids = await get_allowed_document_ids(db, user)
    result = await cross_document_service.get_available_projects(db, allowed_doc_ids)

    await log_audit_event(
        db,
        action="CROSS_DOCUMENT_METRICS_VIEW",
        user=user,
        resource_type="CROSS_DOCUMENT",
        status="SUCCESS",
        details={"total_projects": len(result.get("projects", []))}
    )
    return result


@router.post("/compare", status_code=status.HTTP_200_OK)
async def compare_documents_endpoint(
    req: CompareRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Side-by-side comparison of 2 or more projects across numerical metrics and factual summaries.
    Calculates pairwise metric deltas with explicit baseline references.
    """
    allowed_doc_ids = await get_allowed_document_ids(db, user)
    result = await cross_document_service.compare_documents(db, req.projects, allowed_doc_ids)

    await log_audit_event(
        db,
        action="CROSS_DOCUMENT_COMPARE",
        user=user,
        resource_type="CROSS_DOCUMENT",
        status="SUCCESS",
        details={"compared_projects": result.get("compared_projects", [])}
    )
    return result


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_multi_documents_endpoint(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Multi-document statistical summary dynamically aggregated from PostgreSQL extractions.
    Calculates total production, total overburden, stated avg SR, aggregate SR, seam thickness, highest/lowest metrics.
    """
    allowed_doc_ids = await get_allowed_document_ids(db, user)
    result = await cross_document_service.analyze_multi_documents(db, allowed_doc_ids)

    await log_audit_event(
        db,
        action="CROSS_DOCUMENT_ANALYZE",
        user=user,
        resource_type="CROSS_DOCUMENT",
        status="SUCCESS",
        details={
            "total_records": result.get("total_records", 0),
            "total_raw_coal_tonnes": result.get("total_raw_coal_tonnes", 0.0)
        }
    )
    return result


@router.post("/filter", status_code=status.HTTP_200_OK)
async def filter_documents_endpoint(
    req: FilterRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Filters PostgreSQL mine records based on production, seam thickness, stripping ratio thresholds, safety flags, and risk keywords.
    """
    allowed_doc_ids = await get_allowed_document_ids(db, user)
    result = await cross_document_service.filter_documents(
        db,
        min_production=req.min_production,
        max_production=req.max_production,
        min_seam=req.min_seam,
        max_seam=req.max_seam,
        min_sr=req.min_sr,
        max_sr=req.max_sr,
        has_safety_incidents=req.has_safety_incidents,
        risk_keyword=req.risk_keyword,
        subsidiary=req.subsidiary,
        allowed_doc_ids=allowed_doc_ids
    )

    await log_audit_event(
        db,
        action="CROSS_DOCUMENT_FILTER",
        user=user,
        resource_type="CROSS_DOCUMENT",
        status="SUCCESS",
        details={
            "total_matched": result.get("total_matched", 0),
            "filters_applied": result.get("filters_applied", {})
        }
    )
    return result


@router.get("/conflicts", status_code=status.HTTP_200_OK)
async def get_cross_document_conflicts_endpoint(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns real cross-document conflicts filtered by user RBAC permissions.
    """
    allowed_doc_ids = await get_allowed_document_ids(db, user)
    result = await cross_document_service.detect_cross_document_conflicts(db, allowed_doc_ids)

    await log_audit_event(
        db,
        action="CROSS_DOCUMENT_CONFLICT_VIEW",
        user=user,
        resource_type="CROSS_DOCUMENT",
        status="SUCCESS",
        details={"total_conflicts": result.get("total_conflicts", 0)}
    )
    return result
