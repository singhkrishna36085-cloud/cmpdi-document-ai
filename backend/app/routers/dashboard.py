"""
Dashboard Analytics API Router (STEP 12.1 & STEP 12.3)
GET /api/dashboard/overview — Consolidated real-time analytics endpoint
Supports interactive date range filtering (?range=all|7d|30d|90d).
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.core.dependencies import get_optional_user
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import get_dashboard_analytics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get(
    "/overview",
    response_model=DashboardOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get consolidated CMPDI/CIL Document AI dashboard analytics"
)
async def get_dashboard_overview(
    range: str = Query(default="all", description="Date range filter: 'all', '7d', '30d', '90d'"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns real-time aggregated metrics from PostgreSQL database:
    - Overview Metrics (Total docs, processed, chunks, extractions, validation errors, conflicts, reports, topics)
    - Document Analytics (Distribution by type, status, creation timeline, source/department)
    - Validation & Conflicts Analytics
    - Reports Analytics
    - Topic Intelligence Analytics
    - Knowledge Base (FAISS Vector Index) Status & Sync Check
    - Recent System Activity Stream
    - Prepared Coal Production & Quality Analytics (when real 4-year coal PDFs exist)
    Enforces RBAC role visibility restrictions.
    """
    try:
        data = await get_dashboard_analytics(db, date_range=range, user=user)
        return data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate dashboard analytics: {str(exc)}"
        )

