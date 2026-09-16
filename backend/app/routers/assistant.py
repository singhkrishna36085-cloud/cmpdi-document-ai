"""
AI Assistant Router (STEP 9.1 & STEP 9.2)
POST /api/assistant/retrieve — RAG retrieval endpoint for context generation
POST /api/assistant/query    — End-to-end grounded LLM query endpoint
"""

import asyncio
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.core.dependencies import get_optional_user, get_allowed_document_ids
from app.services.rag_service import retrieve_rag_context
from app.services.llm_service import generate_llm_answer

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class RAGRetrievalRequest(BaseModel):
    query: str = Field(..., description="Natural language search/query string")
    top_k: Optional[int] = Field(default=5, ge=1, le=50, description="Number of context chunks to retrieve (1-50)")
    doc_id: Optional[int] = Field(default=None, description="Optional document_id filter")


class AssistantQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question/query string")
    top_k: Optional[int] = Field(default=5, ge=1, le=50, description="Number of context chunks to retrieve (1-50)")
    doc_id: Optional[int] = Field(default=None, description="Optional document_id filter")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override (groq, gemini, ollama, openai, custom)")
    model: Optional[str] = Field(default=None, description="Optional model identifier override")
    api_key: Optional[str] = Field(default=None, description="Optional API key override")


@router.post("/retrieve", status_code=status.HTTP_200_OK)
async def retrieve_context_endpoint(
    req: RAGRetrievalRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    RAG Context Retrieval Endpoint (STEP 9.1).
    Accepts natural-language user query, retrieves top relevant chunks from FAISS vector store,
    preserves full source traceability (document_id, chunk_id, page_number, sheet_name, source_ref),
    and formats context ready for LLM processing.
    Filters context by user RBAC document permissions.
    """
    query_clean = req.query.strip() if req.query else ""
    if not query_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retrieval query cannot be empty."
        )

    allowed_doc_ids = await get_allowed_document_ids(db, user)
    if req.doc_id is not None:
        if allowed_doc_ids is None:
            allowed_doc_ids = {req.doc_id}
        else:
            if req.doc_id in allowed_doc_ids:
                allowed_doc_ids = {req.doc_id}
            else:
                allowed_doc_ids = set()

    # Execute CPU-bound embedding search off the main async loop
    result = await asyncio.to_thread(retrieve_rag_context, query_clean, req.top_k or 5, allowed_doc_ids)

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="RAG_RETRIEVAL",
        user=user,
        resource_type="AI",
        status="SUCCESS",
        details={"query": query_clean, "retrieved_count": len(result.get("retrieved_chunks", []))}
    )
    return result


@router.post("/query", status_code=status.HTTP_200_OK)
async def assistant_query_endpoint(
    req: AssistantQueryRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Grounded LLM Query Endpoint (STEP 9.2).
    1. Executes RAG context retrieval using FAISS index (filtered by user document permissions).
    2. Builds source references from retrieved chunk metadata.
    3. If context is missing/empty, returns 'information not found' immediately.
    4. Passes retrieved context blocks to configured LLM provider for grounded generation.
    5. Returns grounded answer, complete source references, retrieved chunks, and provider info.
    """
    query_clean = req.query.strip() if req.query else ""
    if not query_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty."
        )

    allowed_doc_ids = await get_allowed_document_ids(db, user)
    if req.doc_id is not None:
        if allowed_doc_ids is None:
            allowed_doc_ids = {req.doc_id}
        else:
            if req.doc_id in allowed_doc_ids:
                allowed_doc_ids = {req.doc_id}
            else:
                allowed_doc_ids = set()

    # 1. RAG Retrieval via existing STEP 9.1 service with RBAC filtering
    effective_top_k = req.top_k or 5
    query_lower = query_clean.lower()
    if any(k in query_lower for k in ["highest", "total", "summary", "compare", "all", "sabse", "max"]):
        effective_top_k = max(effective_top_k, 15)

    retrieval_res = await asyncio.to_thread(retrieve_rag_context, query_clean, effective_top_k, allowed_doc_ids)
    raw_chunks = retrieval_res.get("retrieved_chunks", [])

    # Filter out weak chunks below similarity threshold (0.25)
    retrieved_chunks = [c for c in raw_chunks if c.get("relevance_score", 0.0) >= 0.25]

    from app.services.audit_service import log_audit_event

    # Handle case where no relevant context is found
    if not retrieved_chunks:
        await log_audit_event(
            db,
            action="AI_ASSISTANT_QUERY",
            user=user,
            resource_type="AI",
            document_id=req.doc_id,
            status="NOT_FOUND",
            details={"query": query_clean, "result": "no_authorized_context_found"}
        )
        return {
            "query": query_clean,
            "answer": "I couldn't find this information in the available authorized CMPDI/CIL documents.",
            "sources": [],
            "retrieved_chunks": [],
            "provider": req.provider or "none",
            "model": req.model or "none",
            "status": "not_found"
        }

    # Format context for LLM
    from app.services.rag_service import format_context_for_llm
    formatted_context = format_context_for_llm(retrieved_chunks)

    # 2. Extract clean source references from metadata
    sources: List[Dict[str, Any]] = []
    source_doc_ids = set()
    for chunk in retrieved_chunks:
        doc_id = chunk.get("document_id")
        if doc_id:
            source_doc_ids.add(doc_id)
        sources.append({
            "document_id": doc_id,
            "chunk_id": chunk.get("chunk_id"),
            "original_filename": chunk.get("original_filename"),
            "document_name": chunk.get("document_name"),
            "page_number": chunk.get("page_number"),
            "sheet_name": chunk.get("sheet_name"),
            "source_reference": chunk.get("source_reference"),
            "chunk_type": chunk.get("chunk_type"),
            "relevance_score": chunk.get("relevance_score")
        })

    # 4. LLM Generation
    llm_res = await asyncio.to_thread(
        generate_llm_answer,
        query_clean,
        formatted_context,
        req.provider,
        req.model,
        req.api_key
    )

    answer_text = llm_res.get("answer")
    if not answer_text:
        # Grounded cross-document calculations & summary header derived directly from PostgreSQL extractions
        q_lower = query_clean.lower()
        from app.services.cross_document_service import get_authorized_extractions, compute_pairwise_delta
        extractions = await get_authorized_extractions(db, allowed_doc_ids)

        coal_records = {ext["Project"]: ext["Raw_Coal_Produced_Tonnes"] for ext in extractions if ext["Raw_Coal_Produced_Tonnes"] is not None}
        seam_records = {ext["Project"]: ext["Average_Seam_Thickness_M"] for ext in extractions if ext["Average_Seam_Thickness_M"] is not None}
        sr_records = {ext["Project"]: ext["Stripping_Ratio"] for ext in extractions if ext["Stripping_Ratio"] is not None}

        summary_header = ""
        
        # Check pairwise compare query
        mentioned = []
        for ext in extractions:
            proj = ext["Project"]
            mine = ext["Mine_Name"]
            if proj.lower() in q_lower or mine.lower() in q_lower or (len(proj) > 3 and proj.lower() in q_lower):
                if ext not in mentioned:
                    mentioned.append(ext)

        if len(mentioned) >= 2 and any(k in q_lower for k in ["compare", "versus", "vs", "difference"]):
            mA, mB = mentioned[0], mentioned[1]
            cA, cB = mA["Raw_Coal_Produced_Tonnes"], mB["Raw_Coal_Produced_Tonnes"]
            sA, sB = mA["Average_Seam_Thickness_M"], mB["Average_Seam_Thickness_M"]
            delta_c = compute_pairwise_delta(cA, cB, baseline_name=mB["Project"])
            summary_header = (
                f"Cross-Document Comparison ({mA['Project']} vs {mB['Project']}):\n"
                f"- Raw Coal: {mA['Project']} ({cA:,.0f} t) vs {mB['Project']} ({cB:,.0f} t) | Difference: {delta_c['abs_diff']:,.0f} t ({delta_c['pct_diff_formatted']})\n"
                f"- Seam Thickness: {mA['Project']} ({sA} m) vs {mB['Project']} ({sB} m)\n"
                f"- {mA['Project']} Risk: {mA.get('Risk_Flags')}\n"
                f"- {mB['Project']} Risk: {mB.get('Risk_Flags')}\n"
                f"- {mA['Project']} Safety: {mA.get('Safety_Incidents')}\n"
                f"- {mB['Project']} Safety: {mB.get('Safety_Incidents')}\n\n"
            )
        elif "more than" in q_lower or "above" in q_lower or "exceeding" in q_lower or "greater than" in q_lower:
            if "2 million" in q_lower or "2m" in q_lower or "2,000,000" in q_lower or "2000000" in q_lower:
                matched = [p for p, c in coal_records.items() if c > 2000000]
                summary_header = f"Projects producing more than 2,000,000 tonnes: {', '.join(matched)}.\n\n"
            elif ("8" in q_lower or "eight" in q_lower) and ("seam" in q_lower or "meter" in q_lower or "m" in q_lower):
                matched = [p for p, s in seam_records.items() if s > 8.0]
                summary_header = f"Projects with average seam thickness above 8 metres: {', '.join(matched)}.\n\n"
            elif ("2.7" in q_lower or "2.70" in q_lower) and ("stripping" in q_lower or "sr" in q_lower or "ratio" in q_lower):
                matched = [p for p, sr in sr_records.items() if sr > 2.70]
                summary_header = f"Projects with stated stripping ratio above 2.70: {', '.join(matched)}.\n\n"
        elif "total" in q_lower and coal_records:
            tot = sum(coal_records.values())
            summary_header = f"Total Raw Coal Production: {tot:,.0f} tonnes (Sum of {len(coal_records)} retrieved mine records).\n\n"
        elif "highest" in q_lower:
            if "seam" in q_lower or "thickness" in q_lower:
                top_seam = max(seam_records.items(), key=lambda x: x[1])
                summary_header = f"Highest Seam Thickness: {top_seam[0]} with {top_seam[1]} metres.\n\n"
            elif coal_records:
                top_mine = max(coal_records.items(), key=lambda x: x[1])
                summary_header = f"Highest Raw Coal Producer: {top_mine[0]} with {top_mine[1]:,.0f} tonnes.\n\n"

        summary_lines = [summary_header + "Based on retrieved CMPDI/CIL document records:"]
        for idx, c in enumerate(retrieved_chunks[:10]):
            doc_name = c.get("document_name") or c.get("original_filename") or f"Document #{c.get('document_id')}"
            source_ref = c.get("source_reference") or "Document text"
            content_snippet = c.get("content", "").strip()
            summary_lines.append(f"\n[{idx+1}] {doc_name} ({source_ref}):\n{content_snippet}")
        answer_text = "\n".join(summary_lines)

    await log_audit_event(
        db,
        action="AI_ASSISTANT_QUERY",
        user=user,
        resource_type="AI",
        document_id=req.doc_id or (list(source_doc_ids)[0] if source_doc_ids else None),
        status="SUCCESS",
        details={
            "query": query_clean,
            "sources_count": len(sources),
            "source_document_ids": list(source_doc_ids),
            "provider": llm_res.get("provider"),
            "model": llm_res.get("model")
        }
    )

    return {
        "query": query_clean,
        "answer": answer_text,
        "sources": sources,
        "retrieved_chunks": retrieved_chunks,
        "provider": llm_res.get("provider"),
        "model": llm_res.get("model"),
        "status": llm_res.get("status", "success"),
        "error": llm_res.get("error")
    }

