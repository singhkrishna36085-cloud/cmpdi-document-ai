"""
RAG Service Layer (STEP 9.1)
Provides context retrieval for AI Assistant using existing FAISS vector database
and PostgreSQL document chunk metadata with full source traceability.
"""

import logging
from typing import Dict, Any, List, Optional
from app.services.vector_search import search_knowledge_base

logger = logging.getLogger("rag_service")


def format_context_for_llm(chunks: List[Dict[str, Any]], max_total_chars: int = 18000) -> str:
    """
    Formats retrieved document chunks into a structured markdown context string
    suitable for downstream LLM prompt injection.
    Enforces a strict character budget (default: 18,000 chars ~ 4,500 tokens)
    so prompts never exceed Groq's 8,000 TPM rate limit.
    """
    if not chunks:
        return ""

    blocks = []
    current_chars = 0
    for idx, chunk in enumerate(chunks, 1):
        file_name = chunk.get("original_filename") or chunk.get("document_name") or "Unknown Document"
        src_ref = chunk.get("source_reference") or "N/A"
        doc_id = chunk.get("document_id")
        chunk_id = chunk.get("chunk_id")
        score = chunk.get("relevance_score", 0.0)
        content = (chunk.get("content") or "").strip()

        header = (
            f"[Context Block {idx}]\n"
            f"Source Document: {file_name} (Document ID: {doc_id}, Chunk ID: {chunk_id})\n"
            f"Reference: {src_ref} | Similarity Score: {score:.4f}"
        )
        block = f"{header}\nContent:\n{content}"

        if current_chars + len(block) > max_total_chars:
            remaining_chars = max_total_chars - current_chars - len(header) - 30
            if remaining_chars > 200:
                trimmed_content = content[:remaining_chars] + "... [context truncated to fit token quota]"
                block = f"{header}\nContent:\n{trimmed_content}"
                blocks.append(block)
            break

        blocks.append(block)
        current_chars += len(block) + 50

    return "\n\n" + ("\n\n" + "=" * 50 + "\n\n").join(blocks)


def retrieve_rag_context(query: str, top_k: int = 5, allowed_doc_ids: Optional[set] = None) -> Dict[str, Any]:
    """
    Retrieves top K matching chunks for a natural-language query from the FAISS vector index,
    preserves complete source traceability, and formats structured context.
    Enforces RBAC document filtering if allowed_doc_ids is specified.

    :param query: Natural language search query
    :param top_k: Maximum number of chunks to retrieve (default: 5)
    :param allowed_doc_ids: Optional set of allowed document IDs for RBAC filtering
    :return: Dict containing original query, total retrieved count, chunk array, formatted context, and status
    """
    query_str = (query or "").strip()
    if not query_str:
        return {
            "query": query,
            "total_retrieved": 0,
            "retrieved_chunks": [],
            "formatted_context": "",
            "status": "empty_query"
        }

    # Retrieve matching chunks using existing STEP 8 vector search
    search_k = top_k
    q_lower = query_str.lower()
    if any(k in q_lower for k in ["highest", "total", "summary", "compare", "production", "seam", "coal"]):
        search_k = max(top_k, 15)

    search_result = search_knowledge_base(query=query_str, top_k=search_k, allowed_doc_ids=allowed_doc_ids)
    retrieved_chunks = search_result.get("results", [])

    if not retrieved_chunks:
        return {
            "query": query_str,
            "total_retrieved": 0,
            "retrieved_chunks": [],
            "formatted_context": "",
            "status": "no_chunks_found"
        }

    # Format retrieved chunks for LLM context window
    formatted_context = format_context_for_llm(retrieved_chunks)

    return {
        "query": query_str,
        "total_retrieved": len(retrieved_chunks),
        "retrieved_chunks": retrieved_chunks,
        "formatted_context": formatted_context,
        "status": "success"
    }

