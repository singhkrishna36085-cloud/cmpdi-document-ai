"""
Automated Report Generation Router (STEP 10.1)
POST /api/reports/generate — Generates automated document reports
GET  /api/reports          — Lists all generated reports
GET  /api/reports/{id}     — Fetches complete details for a single report
"""

import json
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Report, Document, User
from app.core.dependencies import get_optional_user, get_allowed_document_ids
from app.services.report_generator import generate_automated_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportGenerateRequest(BaseModel):
    document_ids: List[int] = Field(..., description="List of source document IDs to generate report from")
    report_type: Optional[str] = Field(default="geological_summary", description="Report type (geological_summary, production_summary, audit_summary, general_summary)")
    title: Optional[str] = Field(default=None, description="Optional custom report title")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override")
    model: Optional[str] = Field(default=None, description="Optional LLM model identifier override")
    api_key: Optional[str] = Field(default=None, description="Optional LLM API key override")


def format_report_response(report: Report) -> Dict[str, Any]:
    """Helper to parse JSON fields for report responses."""
    def safe_json_parse(val):
        if not val:
            return None
        if isinstance(val, (dict, list)):
            return val
        try:
            return json.loads(val)
        except Exception:
            return val

    return {
        "id": report.id,
        "report_title": report.report_title,
        "report_type": report.report_type,
        "status": report.status,
        "created_by": report.created_by,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "completed_at": report.completed_at.isoformat() if report.completed_at else None,
        "source_document_ids": safe_json_parse(report.source_document_ids),
        "report_content": report.report_content,
        "source_references": safe_json_parse(report.source_references),
        "validation_summary": safe_json_parse(report.validation_summary),
        "generation_metadata": safe_json_parse(report.generation_metadata)
    }


def _report_contains_confidential(report: Report, confidential_ids: set) -> bool:
    """Helper to check if a report references any confidential documents."""
    if not confidential_ids:
        return False
    raw_ids = report.source_document_ids
    if not raw_ids:
        return False
    parsed_ids = []
    if isinstance(raw_ids, str):
        try:
            parsed_ids = json.loads(raw_ids)
        except Exception:
            pass
    elif isinstance(raw_ids, list):
        parsed_ids = raw_ids
    return any(doc_id in confidential_ids for doc_id in parsed_ids if isinstance(doc_id, int))


@router.post("/generate", status_code=status.HTTP_200_OK)
async def generate_report_endpoint(
    req: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Generates a grounded, automated Markdown report from selected document IDs.
    1. Verifies document IDs exist in PostgreSQL.
    2. Validates user RBAC permissions for requested document IDs.
    3. Fetches real extracted text chunks, structured extractions, validation findings, and conflicts.
    4. Uses LLM service to compile a structured Markdown report with source citations.
    5. Persists report record in PostgreSQL.
    """
    if not req.document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_ids list cannot be empty."
        )

    # Validate RBAC permissions for requested document IDs
    allowed_ids = await get_allowed_document_ids(db, user)
    if allowed_ids is not None:
        unauthorized_requested = set(req.document_ids) - allowed_ids
        if unauthorized_requested:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: one or more selected documents are confidential or restricted."
            )

    res = await generate_automated_report(
        db=db,
        document_ids=req.document_ids,
        report_type=req.report_type or "geological_summary",
        title=req.title,
        provider=req.provider,
        model=req.model,
        api_key=req.api_key
    )

    if res.get("code") != 200:
        raise HTTPException(
            status_code=res.get("code", 500),
            detail=res.get("error", "Failed to generate report.")
        )

    report_obj = res["report"]

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="REPORT_GENERATE",
        user=user,
        resource_type="REPORT",
        resource_id=report_obj.id,
        report_id=report_obj.id,
        status="SUCCESS",
        details={"report_title": report_obj.report_title, "report_type": report_obj.report_type, "source_document_ids": req.document_ids}
    )
    return format_report_response(report_obj)


@router.get("", status_code=status.HTTP_200_OK)
async def list_reports_endpoint(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns list of generated report records from PostgreSQL.
    Filters out reports generated from confidential documents for NORMAL_USER.
    """
    res = await db.execute(select(Report).order_by(Report.id.desc()))
    reports = res.scalars().all()

    allowed_ids = await get_allowed_document_ids(db, user)
    if allowed_ids is not None:
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_ids = set(conf_res.scalars().all())
        filtered_reports = [r for r in reports if not _report_contains_confidential(r, confidential_ids)]
        return [format_report_response(r) for r in filtered_reports]

    return [format_report_response(r) for r in reports]


@router.get("/{report_id}", status_code=status.HTTP_200_OK)
async def get_report_endpoint(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns complete details for a single report record by ID.
    Enforces RBAC document sensitivity checks.
    """
    res = await db.execute(select(Report).where(Report.id == report_id))
    report = res.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report ID {report_id} not found."
        )

    allowed_ids = await get_allowed_document_ids(db, user)
    if allowed_ids is not None:
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_ids = set(conf_res.scalars().all())
        if _report_contains_confidential(report, confidential_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Report ID {report_id} contains restricted confidential sources."
            )

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="REPORT_VIEW",
        user=user,
        resource_type="REPORT",
        resource_id=report.id,
        report_id=report.id,
        status="SUCCESS",
        details={"report_title": report.report_title, "report_type": report.report_type}
    )

    return format_report_response(report)

