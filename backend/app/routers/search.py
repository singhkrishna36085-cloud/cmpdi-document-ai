"""
Semantic Search & Knowledge Base API Router (STEP 8)
POST /api/search — Semantic search query endpoint
GET  /api/search — Semantic search query endpoint (GET)
POST /api/search/reindex — Re-indexes all PostgreSQL document chunks into FAISS
GET  /api/search/status — FAISS index status & vector count
"""

import asyncio
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, DocumentChunk, User
from app.services.vector_search import search_knowledge_base, index_chunks, get_index_status
from app.core.dependencies import get_optional_user, get_allowed_document_ids, require_hod

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


@router.post("", status_code=status.HTTP_200_OK)
async def search_endpoint(
    req: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Executes a natural-language semantic search against the FAISS vector database.
    Returns matching document chunks sorted by relevance score with full source traceability.
    Filters out confidential document results for unauthorized users.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    allowed_doc_ids = await get_allowed_document_ids(db, user)

    # Run vector search off main async loop
    results = await asyncio.to_thread(search_knowledge_base, req.query, req.top_k or 5, allowed_doc_ids)

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="SEMANTIC_SEARCH",
        user=user,
        resource_type="SEARCH",
        status="SUCCESS",
        details={"query": req.query, "results_count": results.get("total_results", 0)}
    )
    return results


@router.get("", status_code=status.HTTP_200_OK)
async def search_get_endpoint(
    q: str = Query(..., description="Search query string"),
    limit: int = Query(default=5, description="Number of results to return"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    GET endpoint for semantic search with RBAC permissions filtering.
    """
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Search query parameter 'q' cannot be empty.")

    allowed_doc_ids = await get_allowed_document_ids(db, user)

    results = await asyncio.to_thread(search_knowledge_base, q, limit, allowed_doc_ids)

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="SEMANTIC_SEARCH",
        user=user,
        resource_type="SEARCH",
        status="SUCCESS",
        details={"query": q, "results_count": results.get("total_results", 0)}
    )
    return results


@router.post("/reindex", status_code=status.HTTP_200_OK)
async def reindex_knowledge_base_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_hod)
):
    """
    Fetches all document chunks from PostgreSQL and re-indexes them into FAISS.
    HOD-only operation.
    """
    res = await db.execute(
        select(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
        .order_by(DocumentChunk.id)
    )
    rows = res.all()

    chunk_dicts = []
    for chunk, doc in rows:
        chunk_dicts.append({
            "id": chunk.id,
            "document_id": chunk.document_id,
            "original_filename": doc.original_filename,
            "document_name": doc.name,
            "page_number": chunk.page_number,
            "sheet_name": chunk.sheet_name,
            "chunk_type": chunk.chunk_type,
            "source_reference": f"Page {chunk.page_number}" if chunk.page_number else (f"Sheet: {chunk.sheet_name}" if chunk.sheet_name else "Document text"),
            "content": chunk.content
        })

    if not chunk_dicts:
        return {
            "status": "empty",
            "indexed_count": 0,
            "message": "No document chunks found in PostgreSQL to index."
        }

    # Run indexing off main async loop
    result = await asyncio.to_thread(index_chunks, chunk_dicts)

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="KNOWLEDGE_BASE_REINDEX",
        user=user,
        resource_type="KNOWLEDGE_BASE",
        status="SUCCESS",
        details={"indexed_count": result.get("indexed_count", len(chunk_dicts))}
    )
    return result


@router.get("/status", status_code=status.HTTP_200_OK)
def get_search_status_endpoint():
    """
    Returns FAISS vector database status, vector count, and embedding model details.
    """
    return get_index_status()

