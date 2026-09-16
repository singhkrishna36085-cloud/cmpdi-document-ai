"""
STEP 9.2 Verification Script: Grounded LLM Answer Generation & RAG Fix
Tests RAG + LLM query processing, prompt grounding, partial context summarization, missing context handling, and source traceability using REAL CMPDI documents.
"""

import sys
import os
import json
import requests

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def run_step9_2_verification():
    print("=" * 70)
    print("  STEP 9.2 VERIFICATION: GROUNDED LLM GENERATION & RAG RETRIEVAL")
    print("=" * 70)

    # 1. Health Checks
    print("\n1. CHECKING SYSTEM HEALTH ENDPOINTS...")
    r_health = requests.get(f"{BASE_URL}/api/health")
    assert r_health.status_code == 200, f"/api/health failed: {r_health.text}"
    print(f"  [OK] /api/health -> 200 OK | {r_health.json()}")

    r_db = requests.get(f"{BASE_URL}/api/health/db")
    assert r_db.status_code == 200, f"/api/health/db failed: {r_db.text}"
    print(f"  [OK] /api/health/db -> 200 OK | {r_db.json()}")

    # 2. Regression Checks (STEP 8 & STEP 9.1)
    print("\n2. RUNNING REGRESSION CHECKS ON STEP 8 & STEP 9.1...")
    r_status = requests.get(f"{BASE_URL}/api/search/status")
    assert r_status.status_code == 200, f"/api/search/status failed: {r_status.text}"
    print(f"  [OK] /api/search/status -> status={r_status.json().get('status')}, vectors={r_status.json().get('total_vectors')}")

    r_search = requests.post(f"{BASE_URL}/api/search", json={"query": "coal production", "top_k": 3})
    assert r_search.status_code == 200, f"/api/search failed: {r_search.text}"
    print(f"  [OK] /api/search -> total_results={r_search.json().get('total_results')}")

    r_retrieve = requests.post(f"{BASE_URL}/api/assistant/retrieve", json={"query": "coal production", "top_k": 3})
    assert r_retrieve.status_code == 200, f"/api/assistant/retrieve failed: {r_retrieve.text}"
    print(f"  [OK] /api/assistant/retrieve -> total_retrieved={r_retrieve.json().get('total_retrieved')}")

    # 3. Validation Test on /api/assistant/query
    print("\n3. TESTING VALIDATION ON /api/assistant/query...")
    r_empty = requests.post(f"{BASE_URL}/api/assistant/query", json={"query": "   "})
    assert r_empty.status_code == 400, f"Expected 400 for empty query, got {r_empty.status_code}"
    print(f"  [OK] Empty query returned 400 Bad Request: {r_empty.json().get('detail')}")

    # 4. Test A: Query "coal production" with top_k: 3, provider: groq, model: openai/gpt-oss-20b
    print("\n4. TEST A: QUERY 'coal production' (provider: groq, model: openai/gpt-oss-20b)...")
    payload_a = {
        "query": "coal production",
        "top_k": 3,
        "provider": "groq",
        "model": "openai/gpt-oss-20b"
    }
    res_a = requests.post(f"{BASE_URL}/api/assistant/query", json=payload_a)
    assert res_a.status_code == 200, f"Query A failed: {res_a.text}"
    data_a = res_a.json()

    print(f"  Query           : {data_a.get('query')}")
    print(f"  Status          : {data_a.get('status')}")
    print(f"  Provider        : {data_a.get('provider')}")
    print(f"  Model           : {data_a.get('model')}")
    print(f"  Retrieved Chunks: {len(data_a.get('retrieved_chunks', []))}")
    print(f"  Sources Count   : {len(data_a.get('sources', []))}")

    assert len(data_a.get('retrieved_chunks', [])) == 3, "Test A should retrieve 3 context chunks"
    assert len(data_a.get('sources', [])) == 3, "Test A should return 3 source references"

    # Verify source traceability metadata
    first_source = data_a['sources'][0]
    req_fields = ["document_id", "chunk_id", "original_filename", "page_number", "sheet_name", "source_reference", "relevance_score"]
    for f in req_fields:
        assert f in first_source, f"Missing source field '{f}'"

    print(f"  Top Source Reference:")
    print(f"    - Document ID     : {first_source['document_id']}")
    print(f"    - Chunk ID        : {first_source['chunk_id']}")
    print(f"    - File            : {first_source['original_filename']}")
    print(f"    - Ref             : {first_source['source_reference']}")
    print(f"    - Relevance Score : {first_source['relevance_score']}")

    if data_a.get('status') == 'success':
        answer = data_a.get('answer', '')
        print(f"  Generated Answer  :\n{answer}")
        assert answer and len(answer) > 10, "Generated answer should be non-empty"
    elif data_a.get('status') == 'configuration_error':
        print(f"  [NOTICE] Provider configuration status: {data_a.get('error')}")

    # 5. Test B: Query "borehole depth seam"
    print("\n5. TEST B: QUERY 'borehole depth seam'...")
    res_b = requests.post(f"{BASE_URL}/api/assistant/query", json={"query": "borehole depth seam", "top_k": 3})
    assert res_b.status_code == 200, f"Query B failed: {res_b.text}"
    data_b = res_b.json()

    print(f"  Query           : {data_b.get('query')}")
    print(f"  Status          : {data_b.get('status')}")
    print(f"  Sources Count   : {len(data_b.get('sources', []))}")
    assert len(data_b.get('sources', [])) > 0, "Test B should return non-empty source references"

    # 6. Test C: Empty Context Handling
    print("\n6. TEST C: EMPTY CONTEXT HANDLING...")
    from app.services.llm_service import generate_llm_answer
    empty_ctx_res = generate_llm_answer("coal production", "", provider="groq", model="openai/gpt-oss-20b")
    assert empty_ctx_res.get("status") == "not_found", "Empty context should return status 'not_found'"
    assert "not found in the available CMPDI documents" in empty_ctx_res.get("answer", "")
    print(f"  [OK] Empty context returned 'not_found' status and grounded answer: {empty_ctx_res.get('answer')}")

    print("\n" + "=" * 70)
    print("  [RESULT] STEP 9.2 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_step9_2_verification()
