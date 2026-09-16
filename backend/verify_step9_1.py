"""
STEP 9.1 Verification Script: Backend RAG Foundation & Context Retrieval
Tests RAG service and API endpoints using REAL document data in PostgreSQL and FAISS.
"""

import sys
import json
import logging
import requests

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def run_step9_1_verification():
    print("=" * 70)
    print("  STEP 9.1 VERIFICATION: RAG RETRIEVAL SERVICE & API ENDPOINT")
    print("=" * 70)

    # 1. Health Checks
    print("\n1. CHECKING BACKEND HEALTH ENDPOINTS...")
    r_health = requests.get(f"{BASE_URL}/api/health")
    assert r_health.status_code == 200, f"/api/health failed: {r_health.text}"
    print(f"  [OK] /api/health -> {r_health.status_code} | {r_health.json()}")

    r_db = requests.get(f"{BASE_URL}/api/health/db")
    assert r_db.status_code == 200, f"/api/health/db failed: {r_db.text}"
    print(f"  [OK] /api/health/db -> {r_db.status_code} | {r_db.json()}")

    # 2. Existing Search Status & Query Checks
    print("\n2. CHECKING STEP 8 SEARCH ENDPOINTS...")
    r_status = requests.get(f"{BASE_URL}/api/search/status")
    assert r_status.status_code == 200, f"/api/search/status failed: {r_status.text}"
    status_data = r_status.json()
    print(f"  [OK] /api/search/status -> status={status_data.get('status')}, vectors={status_data.get('total_vectors')}")

    r_search = requests.post(f"{BASE_URL}/api/search", json={"query": "coal production", "top_k": 3})
    assert r_search.status_code == 200, f"/api/search failed: {r_search.text}"
    search_data = r_search.json()
    print(f"  [OK] /api/search -> total_results={search_data.get('total_results')}")

    # 3. Test Validation on New RAG Retrieval Endpoint
    print("\n3. TESTING VALIDATION ON /api/assistant/retrieve...")
    # Empty query
    r_empty = requests.post(f"{BASE_URL}/api/assistant/retrieve", json={"query": "  "})
    assert r_empty.status_code == 400, f"Expected 400 for empty query, got {r_empty.status_code}"
    print(f"  [OK] Empty query returned 400 Bad Request: {r_empty.json().get('detail')}")

    # Invalid top_k
    r_bad_k = requests.post(f"{BASE_URL}/api/assistant/retrieve", json={"query": "coal production", "top_k": -1})
    assert r_bad_k.status_code == 422, f"Expected 422 for invalid top_k, got {r_bad_k.status_code}"
    print(f"  [OK] Invalid top_k (-1) returned 422 Unprocessable Entity")

    # 4. Real Data Retrieval Tests
    test_queries = [
        "coal production",
        "borehole depth seam",
        "geological coal seam"
    ]

    print("\n4. EXECUTING REAL-DATA RAG RETRIEVAL QUERIES...")
    for q in test_queries:
        print(f"\n  --- Query: '{q}' ---")
        res = requests.post(f"{BASE_URL}/api/assistant/retrieve", json={"query": q, "top_k": 3})
        assert res.status_code == 200, f"Retrieve failed for '{q}': {res.text}"
        data = res.json()

        query_out = data.get("query")
        total_retrieved = data.get("total_retrieved")
        chunks = data.get("retrieved_chunks", [])
        fmt_context = data.get("formatted_context", "")
        rag_status = data.get("status")

        print(f"  Status          : {rag_status}")
        print(f"  Total Retrieved : {total_retrieved}")
        print(f"  Context Length  : {len(fmt_context)} chars")

        assert query_out == q, f"Query mismatch: expected '{q}', got '{query_out}'"
        assert total_retrieved > 0, f"Expected retrieved chunks for query '{q}'"
        assert rag_status == "success", f"Expected status 'success', got '{rag_status}'"
        assert len(chunks) == total_retrieved

        # Verify chunk metadata traceability
        top_chunk = chunks[0]
        required_keys = [
            "document_id", "chunk_id", "original_filename",
            "page_number", "sheet_name", "source_reference",
            "chunk_type", "relevance_score", "content"
        ]
        for key in required_keys:
            assert key in top_chunk, f"Missing metadata key '{key}' in retrieved chunk"

        print(f"  Top Match:")
        print(f"    - Score       : {top_chunk['relevance_score']}")
        print(f"    - File        : {top_chunk['original_filename']}")
        print(f"    - Doc ID      : {top_chunk['document_id']}")
        print(f"    - Chunk ID    : {top_chunk['chunk_id']}")
        print(f"    - Source Ref  : {top_chunk['source_reference']}")

        # Ensure formatted_context contains document source references
        assert f"Document ID: {top_chunk['document_id']}" in fmt_context
        assert top_chunk['original_filename'] in fmt_context

    print("\n" + "=" * 70)
    print("  [RESULT] STEP 9.1 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_step9_1_verification()
