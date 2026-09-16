"""
STEP 10.1 Verification Script: Automated Report Generation Backend
Tests report generation, PostgreSQL persistence, list/detail APIs, health regression, and real-data verification using REAL documents (IDs 11 & 12).
"""

import sys
import json
import requests

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def run_step10_verification():
    print("=" * 70)
    print("  STEP 10.1 VERIFICATION: AUTOMATED REPORT GENERATION BACKEND")
    print("=" * 70)

    # 1. System Health Endpoints
    print("\n1. CHECKING SYSTEM HEALTH ENDPOINTS...")
    r_health = requests.get(f"{BASE_URL}/api/health")
    assert r_health.status_code == 200, f"/api/health failed: {r_health.text}"
    print(f"  [OK] /api/health -> 200 OK | {r_health.json()}")

    r_db = requests.get(f"{BASE_URL}/api/health/db")
    assert r_db.status_code == 200, f"/api/health/db failed: {r_db.text}"
    print(f"  [OK] /api/health/db -> 200 OK | {r_db.json()}")

    # 2. STEP 8 & STEP 9 Regression Endpoints
    print("\n2. RUNNING REGRESSION CHECKS ON STEP 8 & STEP 9...")
    r_status = requests.get(f"{BASE_URL}/api/search/status")
    assert r_status.status_code == 200, f"/api/search/status failed: {r_status.text}"
    print(f"  [OK] /api/search/status -> status={r_status.json().get('status')}, vectors={r_status.json().get('total_vectors')}")

    r_search = requests.post(f"{BASE_URL}/api/search", json={"query": "coal production", "top_k": 3})
    assert r_search.status_code == 200, f"/api/search failed: {r_search.text}"
    print(f"  [OK] /api/search -> total_results={r_search.json().get('total_results')}")

    r_retrieve = requests.post(f"{BASE_URL}/api/assistant/retrieve", json={"query": "coal production", "top_k": 3})
    assert r_retrieve.status_code == 200, f"/api/assistant/retrieve failed: {r_retrieve.text}"
    print(f"  [OK] /api/assistant/retrieve -> total_retrieved={r_retrieve.json().get('total_retrieved')}")

    r_query = requests.post(f"{BASE_URL}/api/assistant/query", json={"query": "coal production", "top_k": 3})
    assert r_query.status_code == 200, f"/api/assistant/query failed: {r_query.text}"
    print(f"  [OK] /api/assistant/query -> status={r_query.json().get('status')}")

    # 3. Report API Input Validation Checks
    print("\n3. TESTING REPORT GENERATION INPUT VALIDATIONS...")
    # Empty document_ids list
    r_empty_doc = requests.post(f"{BASE_URL}/api/reports/generate", json={"document_ids": []})
    assert r_empty_doc.status_code == 400, f"Expected 400 for empty document_ids, got {r_empty_doc.status_code}"
    print(f"  [OK] Empty document_ids returned 400 Bad Request: {r_empty_doc.json().get('detail')}")

    # Non-existent document ID
    r_missing_doc = requests.post(f"{BASE_URL}/api/reports/generate", json={"document_ids": [999999]})
    assert r_missing_doc.status_code == 404, f"Expected 404 for missing document ID, got {r_missing_doc.status_code}"
    print(f"  [OK] Non-existent document ID returned 404 Not Found: {r_missing_doc.json().get('detail')}")

    # 4. Real-Data Report Generation Test (Documents 11 & 12)
    print("\n4. GENERATING REAL AUTOMATED REPORT FOR DOCUMENTS 11 & 12...")
    gen_payload = {
        "document_ids": [11, 12],
        "report_type": "geological_summary",
        "title": "CMPDI Geological Exploration Summary Report",
        "provider": "groq",
        "model": "openai/gpt-oss-20b"
    }
    r_gen = requests.post(f"{BASE_URL}/api/reports/generate", json=gen_payload)
    assert r_gen.status_code == 200, f"Report generation failed: {r_gen.text}"
    rep_data = r_gen.json()

    rep_id = rep_data.get("id")
    rep_status = rep_data.get("status")
    rep_title = rep_data.get("report_title")
    source_doc_ids = rep_data.get("source_document_ids")
    sources = rep_data.get("source_references") or []
    val_summary = rep_data.get("validation_summary")
    gen_meta = rep_data.get("generation_metadata")

    print(f"  Report ID             : {rep_id}")
    print(f"  Report Title          : {rep_title}")
    print(f"  Report Status         : {rep_status}")
    print(f"  Source Document IDs   : {source_doc_ids}")
    print(f"  Source References Count: {len(sources)}")
    print(f"  Validation Summary    : {val_summary}")
    print(f"  Generation Metadata   : {gen_meta}")

    assert rep_id is not None, "Report ID must be present"
    assert source_doc_ids == [11, 12], f"Source document IDs mismatch: expected [11, 12], got {source_doc_ids}"
    assert len(sources) > 0, "Source references should be non-empty"

    # Verify source traceability metadata
    sample_src = sources[0]
    for key in ["document_id", "chunk_id", "original_filename", "page_number", "source_reference"]:
        assert key in sample_src, f"Missing source key '{key}' in report source references"

    # 5. List Reports API Verification
    print("\n5. TESTING GET /api/reports...")
    r_list = requests.get(f"{BASE_URL}/api/reports")
    assert r_list.status_code == 200, f"List reports failed: {r_list.text}"
    report_list = r_list.json()
    print(f"  [OK] /api/reports returned {len(report_list)} report(s)")
    assert any(r.get("id") == rep_id for r in report_list), f"Report ID {rep_id} not found in list response"

    # 6. Get Single Report API Verification
    print("\n6. TESTING GET /api/reports/{id}...")
    r_single = requests.get(f"{BASE_URL}/api/reports/{rep_id}")
    assert r_single.status_code == 200, f"Get single report failed: {r_single.text}"
    single_data = r_single.json()
    print(f"  [OK] /api/reports/{rep_id} returned report status '{single_data.get('status')}'")
    assert single_data.get("id") == rep_id

    # Non-existent report ID check
    r_bad_rep = requests.get(f"{BASE_URL}/api/reports/999999")
    assert r_bad_rep.status_code == 404
    print(f"  [OK] Non-existent report ID 999999 returned 404 Not Found")

    print("\n" + "=" * 70)
    print("  [RESULT] STEP 10.1 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_step10_verification()
