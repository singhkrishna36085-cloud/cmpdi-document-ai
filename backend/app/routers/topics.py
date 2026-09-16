"""
Word Cloud & Topic Identification Router (STEP 11)
POST /api/topics/analyze — Executes real NLP word frequency, wordcloud PNG, and topic extraction
GET  /api/topics         — Returns historical topic analysis records
GET  /api/topics/{id}    — Returns complete details for a single topic analysis
"""

import json
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import TopicAnalysis, Document, User
from app.core.dependencies import get_optional_user, get_allowed_document_ids
from app.services.topic_analyzer import run_topic_analysis

router = APIRouter(prefix="/api/topics", tags=["topics"])


class TopicAnalyzeRequest(BaseModel):
    document_ids: Optional[List[int]] = Field(
        default=None,
        description="List of target document IDs to analyze. If omitted or empty, analyzes all processed documents in PostgreSQL."
    )


def format_topic_analysis_response(analysis: TopicAnalysis) -> Dict[str, Any]:
    """Helper to parse JSON fields for topic analysis API responses."""
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
        "analysis_id": analysis.id,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "source_document_ids": safe_json_parse(analysis.source_document_ids),
        "word_frequencies": safe_json_parse(analysis.word_frequencies),
        "topics": safe_json_parse(analysis.topics),
        "wordcloud_image": analysis.wordcloud_image,
        "metadata_info": safe_json_parse(analysis.metadata_info)
    }


def _topic_contains_confidential(analysis: TopicAnalysis, confidential_ids: set) -> bool:
    """Helper to check if a topic analysis references any confidential documents."""
    if not confidential_ids:
        return False
    raw_ids = analysis.source_document_ids
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


@router.post("/analyze", status_code=status.HTTP_200_OK)
@router.post("/run", status_code=status.HTTP_200_OK)
async def analyze_topics_endpoint(
    req: TopicAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Executes real NLP Word Cloud & Topic Identification on PostgreSQL document chunks.
    Calculates word frequencies, generates a real Base64 WordCloud PNG, and extracts topic clusters using TF-IDF.
    Enforces RBAC document sensitivity restrictions.
    """
    allowed_ids = await get_allowed_document_ids(db, user)

    target_ids = req.document_ids
    if allowed_ids is not None:
        if target_ids:
            unauthorized_requested = set(target_ids) - allowed_ids
            if unauthorized_requested:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: one or more selected documents are confidential."
                )
        else:
            # If no document_ids specified, default target_ids to non-confidential documents
            target_ids = list(allowed_ids)

    res = await run_topic_analysis(db, target_ids)

    if "error" in res:
        raise HTTPException(
            status_code=res.get("code", 500),
            detail=res.get("error", "Topic analysis failed.")
        )

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="TOPIC_ANALYSIS",
        user=user,
        resource_type="TOPICS",
        resource_id=res.get("analysis_id"),
        status="SUCCESS",
        details={"source_document_ids": target_ids, "topic_count": len(res.get("topics", []))}
    )

    return res


@router.get("", status_code=status.HTTP_200_OK)
async def list_topic_analyses_endpoint(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns list of saved topic analysis records from PostgreSQL.
    Filters out analyses derived from confidential documents for non-HOD users.
    """
    res = await db.execute(select(TopicAnalysis).order_by(TopicAnalysis.id.desc()))
    records = res.scalars().all()

    allowed_ids = await get_allowed_document_ids(db, user)
    if allowed_ids is not None:
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_ids = set(conf_res.scalars().all())
        filtered_records = [r for r in records if not _topic_contains_confidential(r, confidential_ids)]
        return [format_topic_analysis_response(r) for r in filtered_records]

    return [format_topic_analysis_response(r) for r in records]


@router.get("/{analysis_id}", status_code=status.HTTP_200_OK)
async def get_topic_analysis_endpoint(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns single topic analysis record by ID from PostgreSQL.
    Enforces RBAC document sensitivity checks.
    """
    res = await db.execute(select(TopicAnalysis).where(TopicAnalysis.id == analysis_id))
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic Analysis ID {analysis_id} not found."
        )

    allowed_ids = await get_allowed_document_ids(db, user)
    if allowed_ids is not None:
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_ids = set(conf_res.scalars().all())
        if _topic_contains_confidential(record, confidential_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Topic Analysis ID {analysis_id} contains restricted confidential sources."
            )

    return format_topic_analysis_response(record)

