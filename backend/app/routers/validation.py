"""
Validation & Data Quality Center API Router (STEP 14.6)
GET /api/validation/overview — Real PostgreSQL data quality metrics & overview
GET /api/validation/issues — Paginated list of validation issues with server-side filtering
GET /api/validation/issues/{id} — Detailed validation issue evidence & metadata
POST /api/validation/issues/{id}/review — Governance review workflow (HOD role, status update, audit logging)
GET /api/validation/documents — Document Data Quality Matrix
GET /api/conflicts — System-wide cross-document conflicts with traceability
"""

import math
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_, delete, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, DocumentChunk, StructuredExtraction, ValidationResult, DocumentConflict, User
from app.core.dependencies import get_optional_user, get_allowed_document_ids, require_hod, get_current_user
from app.services.validator import validate_single_extraction, detect_cross_document_conflicts
from app.services.structured_extractor import extract_structured_data
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/documents", tags=["validation"])
validation_center_router = APIRouter(prefix="/api/validation", tags=["validation"])
global_conflicts_router = APIRouter(prefix="/api/conflicts", tags=["validation"])


class ReviewIssueRequest(BaseModel):
    status: str = Field(..., description="Review status: OPEN, UNDER_REVIEW, RESOLVED, DISMISSED")
    note: Optional[str] = Field(default=None, description="Optional reviewer notes")


def _check_doc_access(doc: Document, user: Optional[User]):
    """Helper to check document access permissions."""
    if doc.is_confidential:
        if not user or user.role != "HOD":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Document ID {doc.id} is confidential."
            )


def _format_validation_issue(f: ValidationResult, doc_name: Optional[str] = None) -> Dict[str, Any]:
    """Helper to convert ValidationResult model instance into safe JSON dictionary."""
    doc_obj = getattr(f, "document", None)
    reviewer_obj = getattr(f, "reviewed_by", None)

    return {
        "id": f.id,
        "document_id": f.document_id,
        "document_name": doc_name or (doc_obj.name if doc_obj else f"Document #{f.document_id}"),
        "is_confidential": doc_obj.is_confidential if doc_obj else False,
        "extraction_id": f.extraction_id,
        "chunk_id": f.chunk_id,
        "rule_type": f.rule_type,
        "severity": f.severity,
        "field_name": f.field_name,
        "invalid_value": f.invalid_value,
        "message": f.message,
        "page_number": f.page_number,
        "sheet_name": f.sheet_name,
        "source_reference": f.source_reference,
        "status": getattr(f, "status", "OPEN") or "OPEN",
        "reviewed_by_id": getattr(f, "reviewed_by_id", None),
        "reviewed_by_name": reviewer_obj.username if reviewer_obj else None,
        "reviewed_at": f.reviewed_at.isoformat() if getattr(f, "reviewed_at", None) else None,
        "review_note": getattr(f, "review_note", None),
        "created_at": f.created_at.isoformat() if f.created_at else None
    }


# ── Document Specific Validation Endpoints ─────────────────────────────────────

@router.post("/{document_id}/validate", status_code=status.HTTP_200_OK)
async def validate_document_endpoint(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Runs Completeness, Data Format, Unit, Logical Math validation, and Cross-Document Conflict Detection.
    Persists findings in PostgreSQL without modifying original extracted values.
    Enforces RBAC document permissions.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    _check_doc_access(doc, user)

    # Fetch extractions for this document
    ext_res = await db.execute(
        select(StructuredExtraction).where(StructuredExtraction.document_id == document_id)
    )
    doc_extractions = ext_res.scalars().all()

    # If no structured extractions exist yet, auto-generate them from chunks
    if not doc_extractions:
        chunks_res = await db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )
        chunks = chunks_res.scalars().all()
        if chunks:
            structured_items = extract_structured_data(chunks)
            for item in structured_items:
                s_record = StructuredExtraction(
                    document_id=doc.id,
                    chunk_id=item.get("chunk_id"),
                    page_number=item.get("page_number"),
                    sheet_name=item.get("sheet_name"),
                    source_reference=item.get("source_reference"),
                    entity_type=item.get("entity_type", "key_value"),
                    data=item.get("data", "{}")
                )
                db.add(s_record)
            await db.flush()

            ext_res = await db.execute(
                select(StructuredExtraction).where(StructuredExtraction.document_id == document_id)
            )
            doc_extractions = ext_res.scalars().all()

    # Convert to list of dicts
    doc_ext_dicts = []
    for ext in doc_extractions:
        doc_ext_dicts.append({
            "id": ext.id,
            "document_id": ext.document_id,
            "chunk_id": ext.chunk_id,
            "page_number": ext.page_number,
            "sheet_name": ext.sheet_name,
            "source_reference": ext.source_reference,
            "entity_type": ext.entity_type,
            "data": ext.data
        })

    # Clear old validation results for this document
    await db.execute(delete(ValidationResult).where(ValidationResult.document_id == document_id))

    # 1. Run single-extraction validation rules
    val_findings = []
    for item in doc_ext_dicts:
        findings = validate_single_extraction(item)
        for f in findings:
            vr = ValidationResult(
                document_id=doc.id,
                extraction_id=f.get("extraction_id"),
                chunk_id=f.get("chunk_id"),
                rule_type=f.get("rule_type", "completeness"),
                severity=f.get("severity", "warning"),
                field_name=f.get("field_name"),
                invalid_value=f.get("invalid_value"),
                message=f.message if hasattr(f, "message") else f.get("message", ""),
                page_number=f.get("page_number"),
                sheet_name=f.get("sheet_name"),
                source_reference=f.get("source_reference"),
                status="OPEN"
            )
            db.add(vr)
            val_findings.append(vr)

    # 2. Run cross-document conflict detection against all extractions
    all_ext_res = await db.execute(select(StructuredExtraction))
    all_extractions = all_ext_res.scalars().all()
    all_ext_dicts = [
        {
            "id": e.id,
            "document_id": e.document_id,
            "chunk_id": e.chunk_id,
            "page_number": e.page_number,
            "sheet_name": e.sheet_name,
            "source_reference": e.source_reference,
            "entity_type": e.entity_type,
            "data": e.data
        }
        for e in all_extractions
    ]

    detected_conflicts = detect_cross_document_conflicts(all_ext_dicts)

    # Clear old conflicts for this document
    await db.execute(
        delete(DocumentConflict).where(
            or_(DocumentConflict.doc_a_id == document_id, DocumentConflict.doc_b_id == document_id)
        )
    )

    saved_conflicts = []
    for c in detected_conflicts:
        if c.get("doc_a_id") == document_id or c.get("doc_b_id") == document_id:
            dc = DocumentConflict(
                doc_a_id=c.get("doc_a_id"),
                doc_b_id=c.get("doc_b_id"),
                extraction_a_id=c.get("extraction_a_id"),
                extraction_b_id=c.get("extraction_b_id"),
                entity_type=c.get("entity_type", "entity"),
                entity_identifier=c.get("entity_identifier", ""),
                field_name=c.get("field_name", ""),
                val_a=c.get("val_a"),
                val_b=c.get("val_b"),
                source_ref_a=c.get("source_ref_a"),
                source_ref_b=c.get("source_ref_b"),
                message=c.get("message", "")
            )
            db.add(dc)
            saved_conflicts.append(dc)

    await db.commit()

    await log_audit_event(
        db,
        action="DOCUMENT_VALIDATE",
        user=user,
        resource_type="DOCUMENT",
        resource_id=doc.id,
        document_id=doc.id,
        status="SUCCESS",
        details={"validation_issues": len(val_findings), "conflicts_detected": len(saved_conflicts)}
    )

    return {
        "status": "completed",
        "document_id": doc.id,
        "total_validation_issues": len(val_findings),
        "total_conflicts_detected": len(saved_conflicts),
        "summary": {
            "warnings": sum(1 for v in val_findings if v.severity == "warning"),
            "errors": sum(1 for v in val_findings if v.severity == "error"),
            "conflicts": len(saved_conflicts)
        }
    }


@router.get("/{document_id}/validation", status_code=status.HTTP_200_OK)
async def get_document_validation_results(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Retrieves validation issues for a document with source traceability."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    _check_doc_access(doc, user)

    res = await db.execute(
        select(ValidationResult)
        .options(selectinload(ValidationResult.document), selectinload(ValidationResult.reviewed_by))
        .where(ValidationResult.document_id == document_id)
        .order_by(ValidationResult.id)
    )
    findings = res.scalars().all()

    return {
        "document_id": doc.id,
        "name": doc.name,
        "total_issues": len(findings),
        "validation_results": [_format_validation_issue(f, doc.name) for f in findings]
    }


@router.get("/{document_id}/conflicts", status_code=status.HTTP_200_OK)
async def get_document_conflicts(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Retrieves cross-document conflicts involving a specific document."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    _check_doc_access(doc, user)

    res = await db.execute(
        select(DocumentConflict)
        .where(or_(DocumentConflict.doc_a_id == document_id, DocumentConflict.doc_b_id == document_id))
        .order_by(DocumentConflict.id)
    )
    conflicts = res.scalars().all()

    return {
        "document_id": doc.id,
        "total_conflicts": len(conflicts),
        "conflicts": [
            {
                "id": c.id,
                "doc_a_id": c.doc_a_id,
                "doc_b_id": c.doc_b_id,
                "entity_type": c.entity_type,
                "entity_identifier": c.entity_identifier,
                "field_name": c.field_name,
                "val_a": c.val_a,
                "val_b": c.val_b,
                "source_ref_a": c.source_ref_a,
                "source_ref_b": c.source_ref_b,
                "message": c.message,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in conflicts
        ]
    }


# ── Global Validation Center API Router (/api/validation) ─────────────────────

@validation_center_router.get("/overview", status_code=status.HTTP_200_OK)
async def get_validation_overview(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns real PostgreSQL database-derived validation metrics for the validation overview dashboard.
    Enforces RBAC document sensitivity boundaries.
    """
    allowed_ids = await get_allowed_document_ids(db, user)

    # 1. Base conditions for ValidationResult
    val_conditions = []
    if allowed_ids is not None:
        val_conditions.append(ValidationResult.document_id.in_(list(allowed_ids)))

    val_where = and_(*val_conditions) if val_conditions else True

    # Counts
    err_res = await db.execute(select(func.count(ValidationResult.id)).where(and_(val_where, ValidationResult.severity == "error")))
    total_errors = err_res.scalar_one() or 0

    warn_res = await db.execute(select(func.count(ValidationResult.id)).where(and_(val_where, ValidationResult.severity == "warning")))
    total_warnings = warn_res.scalar_one() or 0

    # Conflicts
    conf_stmt = select(DocumentConflict)
    conf_res = await db.execute(conf_stmt)
    all_conflicts = conf_res.scalars().all()
    if allowed_ids is not None:
        conf_res_conf = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_ids = set(conf_res_conf.scalars().all())
        all_conflicts = [
            c for c in all_conflicts
            if c.doc_a_id not in confidential_ids and c.doc_b_id not in confidential_ids
        ]
    total_conflicts = len(all_conflicts)

    # Affected documents query
    aff_val_doc_ids = set((await db.execute(select(ValidationResult.document_id).where(val_where).distinct())).scalars().all())
    for c in all_conflicts:
        aff_val_doc_ids.add(c.doc_a_id)
        aff_val_doc_ids.add(c.doc_b_id)

    # Clean documents query
    doc_stmt = select(Document)
    if allowed_ids is not None:
        doc_stmt = doc_stmt.where(Document.id.in_(list(allowed_ids)))
    all_docs = (await db.execute(doc_stmt)).scalars().all()
    total_allowed_docs = len(all_docs)

    clean_docs_count = max(0, total_allowed_docs - len(aff_val_doc_ids))

    # Rule Type Breakdown
    rule_res = await db.execute(
        select(ValidationResult.rule_type, func.count(ValidationResult.id))
        .where(val_where)
        .group_by(ValidationResult.rule_type)
    )
    rule_type_distribution = {row[0]: row[1] for row in rule_res.all()}

    # Status Breakdown
    status_res = await db.execute(
        select(ValidationResult.status, func.count(ValidationResult.id))
        .where(val_where)
        .group_by(ValidationResult.status)
    )
    status_distribution = {row[0]: row[1] for row in status_res.all()}

    # Recent issues (top 5)
    rec_res = await db.execute(
        select(ValidationResult)
        .options(selectinload(ValidationResult.document), selectinload(ValidationResult.reviewed_by))
        .where(val_where)
        .order_by(desc(ValidationResult.id))
        .limit(5)
    )
    recent_issues = rec_res.scalars().all()

    return {
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "total_conflicts": total_conflicts,
        "affected_documents_count": len(aff_val_doc_ids),
        "clean_documents_count": clean_docs_count,
        "total_documents": total_allowed_docs,
        "severity_distribution": {
            "error": total_errors,
            "warning": total_warnings
        },
        "rule_type_distribution": rule_type_distribution,
        "status_distribution": status_distribution,
        "recent_issues": [_format_validation_issue(r) for r in recent_issues]
    }


@validation_center_router.get("/issues", status_code=status.HTTP_200_OK)
async def get_validation_issues(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=25, ge=1, le=100, description="Page size"),
    severity: Optional[str] = Query(default=None, description="Filter by severity (error, warning)"),
    rule_type: Optional[str] = Query(default=None, description="Filter by rule_type"),
    document_id: Optional[int] = Query(default=None, description="Filter by document_id"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by review status (OPEN, UNDER_REVIEW, RESOLVED, DISMISSED)"),
    search: Optional[str] = Query(default=None, description="Search term in message, field_name, invalid_value, source_reference"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns paginated list of validation issues with server-side filtering and RBAC data protection.
    """
    allowed_ids = await get_allowed_document_ids(db, user)

    conditions = []
    if allowed_ids is not None:
        conditions.append(ValidationResult.document_id.in_(list(allowed_ids)))

    if severity:
        conditions.append(ValidationResult.severity == severity)
    if rule_type:
        conditions.append(ValidationResult.rule_type == rule_type)
    if document_id:
        conditions.append(ValidationResult.document_id == document_id)
    if status_filter:
        conditions.append(ValidationResult.status == status_filter)

    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                ValidationResult.message.ilike(term),
                ValidationResult.field_name.ilike(term),
                ValidationResult.invalid_value.ilike(term),
                ValidationResult.source_reference.ilike(term)
            )
        )

    where_clause = and_(*conditions) if conditions else True

    # Total count query
    count_stmt = select(func.count(ValidationResult.id)).where(where_clause)
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one() or 0

    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size

    # Fetch paginated items with selectinload for relationships
    items_stmt = (
        select(ValidationResult)
        .options(selectinload(ValidationResult.document), selectinload(ValidationResult.reviewed_by))
        .where(where_clause)
        .order_by(desc(ValidationResult.id))
        .offset(offset)
        .limit(page_size)
    )
    items_res = await db.execute(items_stmt)
    issues = items_res.scalars().all()

    return {
        "items": [_format_validation_issue(i) for i in issues],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@validation_center_router.get("/documents", status_code=status.HTTP_200_OK)
async def get_document_quality_matrix(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns document data quality matrix detailing errors, warnings, conflicts, and calculated quality status for each document.
    """
    allowed_ids = await get_allowed_document_ids(db, user)

    doc_stmt = select(Document).order_by(Document.created_at.desc())
    if allowed_ids is not None:
        doc_stmt = doc_stmt.where(Document.id.in_(list(allowed_ids)))

    res = await db.execute(doc_stmt)
    docs = res.scalars().all()

    # Fetch all conflicts
    conf_res = await db.execute(select(DocumentConflict))
    conflicts = conf_res.scalars().all()

    matrix = []
    for doc in docs:
        # Errors & Warnings
        val_res = await db.execute(select(ValidationResult).where(ValidationResult.document_id == doc.id))
        val_issues = val_res.scalars().all()

        err_cnt = sum(1 for v in val_issues if v.severity == "error")
        warn_cnt = sum(1 for v in val_issues if v.severity == "warning")

        # Conflicts involving doc
        doc_conflicts = [c for c in conflicts if c.doc_a_id == doc.id or c.doc_b_id == doc.id]
        conf_cnt = len(doc_conflicts)

        # Quality status determination
        if conf_cnt > 0:
            quality_status = "Conflicts"
        elif err_cnt > 0:
            quality_status = "Errors"
        elif warn_cnt > 0:
            quality_status = "Warnings"
        else:
            quality_status = "Clean"

        matrix.append({
            "document_id": doc.id,
            "name": doc.name,
            "type": doc.type,
            "original_filename": doc.original_filename,
            "is_confidential": doc.is_confidential,
            "processing_status": doc.processing_status,
            "errors_count": err_cnt,
            "warnings_count": warn_cnt,
            "conflicts_count": conf_cnt,
            "quality_status": quality_status,
            "created_at": doc.created_at.isoformat() if doc.created_at else None
        })

    return {"total": len(matrix), "documents": matrix}


@validation_center_router.get("/issues/{issue_id}", status_code=status.HTTP_200_OK)
async def get_validation_issue_detail(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Retrieves full details and evidence for a specific validation issue by ID.
    Enforces RBAC confidentiality restrictions.
    """
    res = await db.execute(
        select(ValidationResult)
        .options(selectinload(ValidationResult.document), selectinload(ValidationResult.reviewed_by))
        .where(ValidationResult.id == issue_id)
    )
    issue = res.scalar_one_or_none()

    if not issue:
        raise HTTPException(status_code=404, detail="Validation issue not found")

    # Check RBAC
    doc = issue.document
    if doc and doc.is_confidential and (not user or user.role != "HOD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Restricted confidential document validation issue."
        )

    await log_audit_event(
        db,
        action="VALIDATION_ISSUE_VIEW",
        user=user,
        resource_type="DOCUMENT",
        resource_id=issue.document_id,
        document_id=issue.document_id,
        status="SUCCESS",
        details={"issue_id": issue.id, "severity": issue.severity, "rule_type": issue.rule_type}
    )

    return _format_validation_issue(issue, doc.name if doc else None)


@validation_center_router.post("/issues/{issue_id}/review", status_code=status.HTTP_200_OK)
async def review_validation_issue(
    issue_id: int,
    req: ReviewIssueRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hod)
):
    """
    Governance review workflow endpoint for validation issues.
    Allows HOD roles to mark an issue as OPEN, UNDER_REVIEW, RESOLVED, or DISMISSED with reviewer notes.
    Original extracted values are strictly preserved.
    """
    if req.status not in ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Allowed: OPEN, UNDER_REVIEW, RESOLVED, DISMISSED"
        )

    res = await db.execute(
        select(ValidationResult)
        .options(selectinload(ValidationResult.document), selectinload(ValidationResult.reviewed_by))
        .where(ValidationResult.id == issue_id)
    )
    issue = res.scalar_one_or_none()

    if not issue:
        raise HTTPException(status_code=404, detail="Validation issue not found")

    issue.status = req.status
    issue.reviewed_by_id = user.id
    issue.reviewed_at = datetime.utcnow()
    if req.note is not None:
        issue.review_note = req.note

    await db.commit()
    await db.refresh(issue)

    await log_audit_event(
        db,
        action="VALIDATION_ISSUE_REVIEW",
        user=user,
        resource_type="DOCUMENT",
        resource_id=issue.document_id,
        document_id=issue.document_id,
        status="SUCCESS",
        details={"issue_id": issue.id, "new_status": req.status, "reviewer": user.username}
    )

    return {
        "status": "success",
        "message": f"Validation issue #{issue.id} status updated to '{req.status}'",
        "issue": _format_validation_issue(issue)
    }


# ── Global Conflicts Router (/api/conflicts) ──────────────────────────────────

@global_conflicts_router.get("", status_code=status.HTTP_200_OK)
async def get_all_conflicts(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Retrieves all system-wide cross-document conflicts.
    Filters out conflicts involving confidential documents for non-HOD users.
    """
    res = await db.execute(select(DocumentConflict).order_by(DocumentConflict.id.desc()))
    conflicts = res.scalars().all()

    allowed_ids = await get_allowed_document_ids(db, user)
    if allowed_ids is not None:
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_ids = set(conf_res.scalars().all())
        conflicts = [
            c for c in conflicts
            if c.doc_a_id not in confidential_ids and c.doc_b_id not in confidential_ids
        ]

    await log_audit_event(
        db,
        action="VALIDATION_CONFLICT_VIEW",
        user=user,
        resource_type="DOCUMENT",
        status="SUCCESS",
        details={"conflicts_returned": len(conflicts)}
    )

    return {
        "total_conflicts": len(conflicts),
        "conflicts": [
            {
                "id": c.id,
                "doc_a_id": c.doc_a_id,
                "doc_b_id": c.doc_b_id,
                "entity_type": c.entity_type,
                "entity_identifier": c.entity_identifier,
                "field_name": c.field_name,
                "val_a": c.val_a,
                "val_b": c.val_b,
                "source_ref_a": c.source_ref_a,
                "source_ref_b": c.source_ref_b,
                "message": c.message,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in conflicts
        ]
    }
