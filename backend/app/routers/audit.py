"""
Audit & Activity History API Router (STEP 14.5)
GET /api/audit — Fetch paginated, server-side filtered audit logs with RBAC visibility controls
GET /api/audit/{id} — Fetch single audit event details
GET /api/audit/document-history/{document_id} — Fetch chronological lifecycle events for a document
"""

import math
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AuditLog, User, Document
from app.core.dependencies import get_current_user, get_allowed_document_ids

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _format_audit_log(log: AuditLog) -> Dict[str, Any]:
    """Helper to convert AuditLog model instance into safe JSON dictionary."""
    details_parsed = None
    if log.details:
        try:
            details_parsed = json.loads(log.details)
        except Exception:
            details_parsed = log.details

    return {
        "id": log.id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "user_id": log.user_id,
        "username": log.username or (log.user.username if log.user else "System"),
        "user_role": log.user_role or (log.user.role if log.user else "NORMAL_USER"),
        "action": log.action,
        "resource_type": log.resource_type or "SYSTEM",
        "resource_id": log.resource_id,
        "document_id": log.document_id,
        "report_id": log.report_id,
        "status": log.status or "SUCCESS",
        "ip_address": log.ip_address,
        "details": details_parsed
    }


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get paginated system activity & audit logs with server-side filtering"
)
async def get_audit_logs_endpoint(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=25, ge=1, le=100, description="Page size"),
    action: Optional[str] = Query(default=None, description="Filter by action string"),
    role: Optional[str] = Query(default=None, description="Filter by user role"),
    resource_type: Optional[str] = Query(default=None, description="Filter by resource type"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status (SUCCESS, FAILURE, NOT_FOUND)"),
    search: Optional[str] = Query(default=None, description="Search term in action, username, or details"),
    document_id: Optional[int] = Query(default=None, description="Filter by document_id"),
    report_id: Optional[int] = Query(default=None, description="Filter by report_id"),
    start_date: Optional[str] = Query(default=None, description="ISO start date filter"),
    end_date: Optional[str] = Query(default=None, description="ISO end date filter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns PostgreSQL-backed audit logs:
    - HOD -> Full organizational audit history
    - NORMAL_USER -> Only user's own activity history & strictly filtered non-confidential events
    """
    conditions = []

    # 1. Base RBAC filter
    if current_user.role != "HOD":
        # NORMAL_USER can only see their own audit records
        conditions.append(AuditLog.user_id == current_user.id)
        
        # Exclude confidential document logs for NORMAL_USER
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_doc_ids = set(conf_res.scalars().all())
        if confidential_doc_ids:
            conditions.append(or_(AuditLog.document_id == None, AuditLog.document_id.not_in(list(confidential_doc_ids))))

    # 2. Filter criteria
    if action:
        conditions.append(AuditLog.action == action)
    if role:
        conditions.append(AuditLog.user_role == role)
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type)
    if status_filter:
        conditions.append(AuditLog.status == status_filter)
    if document_id:
        conditions.append(AuditLog.document_id == document_id)
    if report_id:
        conditions.append(AuditLog.report_id == report_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.username.ilike(term),
                AuditLog.resource_type.ilike(term),
                AuditLog.details.ilike(term)
            )
        )

    if start_date:
        try:
            dt_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            conditions.append(AuditLog.timestamp >= dt_start)
        except Exception:
            pass

    if end_date:
        try:
            dt_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            conditions.append(AuditLog.timestamp <= dt_end)
        except Exception:
            pass

    where_clause = and_(*conditions) if conditions else True

    # Total count query
    count_stmt = select(func.count(AuditLog.id)).where(where_clause)
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one() or 0

    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size

    # Fetch paginated records
    items_stmt = (
        select(AuditLog)
        .where(where_clause)
        .order_by(desc(AuditLog.timestamp), desc(AuditLog.id))
        .offset(offset)
        .limit(page_size)
    )
    items_res = await db.execute(items_stmt)
    logs = items_res.scalars().all()

    # Real metric counts (PostgreSQL backed)
    metrics_stmt = select(
        func.count(AuditLog.id).label("total"),
        func.count(func.nullif(AuditLog.status != "SUCCESS", True)).label("successful"),
        func.count(func.nullif(AuditLog.status == "SUCCESS", True)).label("failed"),
        func.count(func.distinct(AuditLog.user_id)).label("unique_users")
    ).where(where_clause)
    
    metrics_res = await db.execute(metrics_stmt)
    m_row = metrics_res.first()

    return {
        "items": [_format_audit_log(l) for l in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "user_role": current_user.role,
        "metrics": {
            "total_events": m_row.total if m_row else total,
            "successful_events": m_row.successful if m_row else 0,
            "failed_events": m_row.failed if m_row else 0,
            "unique_users": m_row.unique_users if m_row else 1
        }
    }


@router.get(
    "/document-history/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Get real chronological lifecycle history for a document"
)
async def get_document_history_endpoint(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real chronological audit history for a specific document.
    Enforces confidential document RBAC checks.
    """
    doc_res = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.is_confidential and current_user.role != "HOD":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Restricted confidential document."
        )

    stmt = (
        select(AuditLog)
        .where(AuditLog.document_id == document_id)
        .order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return {
        "document_id": doc.id,
        "document_name": doc.name,
        "is_confidential": doc.is_confidential,
        "total_events": len(logs),
        "history": [_format_audit_log(l) for l in logs]
    }


@router.get(
    "/{audit_id}",
    status_code=status.HTTP_200_OK,
    summary="Get detailed audit event metadata by ID"
)
async def get_audit_detail_endpoint(
    audit_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full details of a specific audit log entry by ID.
    Enforces RBAC confidentiality restrictions.
    """
    res = await db.execute(select(AuditLog).where(AuditLog.id == audit_id))
    log = res.scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=404, detail="Audit log entry not found")

    if current_user.role != "HOD":
        if log.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Cannot view another user's audit log entry")
        
        if log.document_id:
            doc_res = await db.execute(select(Document).where(Document.id == log.document_id))
            doc = doc_res.scalar_one_or_none()
            if doc and doc.is_confidential:
                raise HTTPException(status_code=403, detail="Access denied: Restricted confidential document audit event.")

    return _format_audit_log(log)
