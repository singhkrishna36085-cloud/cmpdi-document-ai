"""
STEP 10.2 Integration Test Script
Tests end-to-end API communication between Frontend Report Generator and Backend.
"""

import sys
import json
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def test_frontend_integration():
    print("=" * 70)
    print("  STEP 10.2 INTEGRATION TEST: REPORT FRONTEND & BACKEND API")
    print("=" * 70)

    # 1. Fetch available real documents (GET /api/documents)
    print("\n1. FETCHING REAL DOCUMENTS (GET /api/documents)...")
    r_docs = requests.get(f"{BASE_URL}/api/documents")
    assert r_docs.status_code == 200, f"GET /api/documents failed: {r_docs.text}"
    docs_data = r_docs.json()
    docs = docs_data.get("documents", [])
    print(f"  [OK] GET /api/documents returned {len(docs)} documents")
    assert len(docs) >= 2, "Expected at least 2 real documents in PostgreSQL"

    doc_ids = [docs[0]["id"], docs[1]["id"]]
    print(f"  Selected Document IDs for Report: {doc_ids}")

    # 2. Generate Real Report (POST /api/reports/generate)
    print("\n2. SUBMITTING REPORT GENERATION REQUEST (POST /api/reports/generate)...")
    gen_payload = {
        "document_ids": doc_ids,
        "report_type": "geological_summary",
        "title": "CMPDI Executive Geological Audit Report 2026",
        "provider": "groq",
        "model": "openai/gpt-oss-20b"
    }
    r_gen = requests.post(f"{BASE_URL}/api/reports/generate", json=gen_payload)
    assert r_gen.status_code == 200, f"POST /api/reports/generate failed: {r_gen.text}"
    rep = r_gen.json()

    rep_id = rep.get("id")
    rep_status = rep.get("status")
    sources = rep.get("source_references") or []
    val_summary = rep.get("validation_summary")

    print(f"  [OK] Generated Report ID: #{rep_id}")
    print(f"  Status        : {rep_status}")
    print(f"  Title         : {rep.get('report_title')}")
    print(f"  Sources Count : {len(sources)}")
    print(f"  Validation    : {val_summary}")

    assert rep_id is not None
    assert rep_status == "completed"
    assert len(sources) > 0

    # 3. List Reports (GET /api/reports)
    print("\n3. FETCHING REPORTS DASHBOARD LIST (GET /api/reports)...")
    r_list = requests.get(f"{BASE_URL}/api/reports")
    assert r_list.status_code == 200
    rep_list = r_list.json()
    print(f"  [OK] GET /api/reports returned {len(rep_list)} reports")
    assert any(r["id"] == rep_id for r in rep_list)

    # 4. Fetch Report Detail (GET /api/reports/{id})
    print(f"\n4. FETCHING REPORT DETAIL VIEW (GET /api/reports/{rep_id})...")
    r_detail = requests.get(f"{BASE_URL}/api/reports/{rep_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()

    print(f"  [OK] Report Title : {detail.get('report_title')}")
    print(f"  [OK] Content Length: {len(detail.get('report_content', '') or '')} chars")
    print(f"  [OK] Sources Count : {len(detail.get('source_references', []) or [])}")

    # Verify source traceability detail
    top_source = detail['source_references'][0]
    print(f"  Top Source Traceability:")
    print(f"    - File      : {top_source.get('original_filename')}")
    print(f"    - Doc ID    : {top_source.get('document_id')}")
    print(f"    - Ref       : {top_source.get('source_reference')}")

    print("\n" + "=" * 70)
    print("  [RESULT] STEP 10.2 FRONTEND-BACKEND INTEGRATION TEST PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    test_frontend_integration()
