"""
Vector Search & Knowledge Base Service (STEP 8)
Generates embeddings using sentence-transformers (all-MiniLM-L6-v2),
stores vectors in FAISS index (faiss-cpu) on disk, and retrieves top K matching chunks
with full source traceability to PostgreSQL documents/chunks.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("vector_search")

_HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
VECTOR_STORE_DIR = os.path.join(_HERE, "vector_store")
INDEX_PATH = os.path.join(VECTOR_STORE_DIR, "faiss_index.bin")
METADATA_PATH = os.path.join(VECTOR_STORE_DIR, "vector_metadata.json")

os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading SentenceTransformer model '{MODEL_NAME}'...")
        _embedding_model = SentenceTransformer(MODEL_NAME)
    return _embedding_model


def index_chunks(chunk_dicts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Takes a list of chunk dictionaries, generates embeddings,
    builds/updates FAISS IndexFlatIP (cosine similarity with normalized vectors),
    and saves the index & metadata mapping to disk.
    """
    import faiss
    import numpy as np

    if not chunk_dicts:
        return {"status": "empty", "indexed_count": 0}

    texts = [c.get("content", "") for c in chunk_dicts]
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

    # Initialize FAISS IndexFlatIP (Inner Product = Cosine Similarity for normalized vectors)
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(np.array(embeddings, dtype=np.float32))

    # Save FAISS index to disk
    faiss.write_index(index, INDEX_PATH)

    # Save metadata mapping (vector_id -> chunk_meta)
    metadata_mapping = {}
    for idx, c in enumerate(chunk_dicts):
        page_num = c.get("page_number")
        sheet_name = c.get("sheet_name")
        if sheet_name:
            source_ref = f"Sheet: {sheet_name}"
        elif page_num:
            source_ref = f"Page {page_num}"
        else:
            source_ref = "Document text"

        metadata_mapping[str(idx)] = {
            "vector_id": idx,
            "chunk_id": c.get("id"),
            "document_id": c.get("document_id"),
            "original_filename": c.get("original_filename"),
            "document_name": c.get("document_name"),
            "page_number": page_num,
            "sheet_name": sheet_name,
            "chunk_type": c.get("chunk_type"),
            "source_reference": c.get("source_reference") or source_ref,
            "content": c.get("content", "")
        }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata_mapping, f, indent=2)

    logger.info(f"Successfully indexed {len(chunk_dicts)} chunks into FAISS index.")
    return {
        "status": "success",
        "indexed_count": len(chunk_dicts),
        "dimension": EMBEDDING_DIM,
        "index_path": INDEX_PATH
    }


_cached_index = None
_cached_metadata = None
_cached_index_mtime = 0.0
_cached_meta_mtime = 0.0


def _get_cached_faiss_and_metadata():
    global _cached_index, _cached_metadata, _cached_index_mtime, _cached_meta_mtime
    import faiss

    if not os.path.exists(INDEX_PATH) or not os.path.exists(METADATA_PATH):
        return None, None

    idx_mtime = os.path.getmtime(INDEX_PATH)
    meta_mtime = os.path.getmtime(METADATA_PATH)

    if (_cached_index is None or _cached_metadata is None or
            idx_mtime != _cached_index_mtime or meta_mtime != _cached_meta_mtime):
        logger.info("Loading FAISS index and vector metadata into memory cache...")
        _cached_index = faiss.read_index(INDEX_PATH)
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _cached_metadata = json.load(f)
        _cached_index_mtime = idx_mtime
        _cached_meta_mtime = meta_mtime

    return _cached_index, _cached_metadata


def search_knowledge_base(query: str, top_k: int = 5, allowed_doc_ids: Optional[set] = None) -> Dict[str, Any]:
    """
    Generates query embedding, searches FAISS index, and returns matching chunks
    sorted by relevance score with full source traceability.
    Filters out chunks from unauthorized documents if allowed_doc_ids is specified.
    """
    import numpy as np
    import time

    start_time = time.perf_counter()

    if not query or not query.strip():
        return {"query": query, "total_results": 0, "results": [], "search_latency_ms": 0.0}

    index, metadata_mapping = _get_cached_faiss_and_metadata()
    if index is None or metadata_mapping is None or index.ntotal == 0:
        return {
            "query": query,
            "total_results": 0,
            "results": [],
            "message": "Knowledge base index empty or not initialized yet."
        }

    # Encode query vector
    model = get_embedding_model()
    query_vector = model.encode([query.strip()], convert_to_numpy=True, normalize_embeddings=True)
    query_vector = np.array(query_vector, dtype=np.float32)

    # Search FAISS index — inspect candidate vectors before filtering by RBAC/top_k
    actual_k = min(max(top_k * 10, 100), index.ntotal)

    scores, indices = index.search(query_vector, actual_k)

    results = []
    seen_contents = set()
    for score, vec_id in zip(scores[0], indices[0]):
        if vec_id == -1:
            continue
        vec_key = str(vec_id)
        meta = metadata_mapping.get(vec_key)
        if meta:
            doc_id = meta.get("document_id")
            if allowed_doc_ids is not None and doc_id not in allowed_doc_ids:
                continue

            content_text = meta.get("content") or ""
            content_key = content_text.strip().lower()
            if content_key in seen_contents:
                continue
            seen_contents.add(content_key)

            relevance_score = float(round(float(score), 4))
            results.append({
                "relevance_score": relevance_score,
                "document_id": doc_id,
                "chunk_id": meta.get("chunk_id"),
                "original_filename": meta.get("original_filename"),
                "document_name": meta.get("document_name"),
                "page_number": meta.get("page_number"),
                "sheet_name": meta.get("sheet_name"),
                "chunk_type": meta.get("chunk_type"),
                "source_reference": meta.get("source_reference"),
                "content": content_text
            })

            if len(results) >= top_k:
                break

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return {
        "query": query,
        "total_results": len(results),
        "results": results,
        "search_latency_ms": latency_ms
    }



def get_index_status() -> Dict[str, Any]:
    """Returns vector store status metadata."""
    import faiss

    if not os.path.exists(INDEX_PATH):
        return {
            "status": "not_initialized",
            "total_vectors": 0,
            "dimension": EMBEDDING_DIM,
            "model_name": MODEL_NAME
        }
        
    index = faiss.read_index(INDEX_PATH)
    return {
        "status": "ready",
        "total_vectors": index.ntotal,
        "dimension": index.d,
        "model_name": MODEL_NAME,
        "index_path": INDEX_PATH
    }
