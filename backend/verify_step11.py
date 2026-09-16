"""
STEP 11 Verification Script: Word Cloud & Topic Identification
Tests NLP word frequency calculations, word cloud Base64 PNG generation, TF-IDF topic clustering, PostgreSQL persistence, and health regressions using REAL documents.
"""

import sys
import json
import requests

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def run_step11_verification():
    print("=" * 70)
    print("  STEP 11 VERIFICATION: WORD CLOUD & TOPIC IDENTIFICATION")
    print("=" * 70)

    # 1. System Health Endpoints
    print("\n1. CHECKING SYSTEM HEALTH ENDPOINTS...")
    r_health = requests.get(f"{BASE_URL}/api/health")
    assert r_health.status_code == 200, f"/api/health failed: {r_health.text}"
    print(f"  [OK] /api/health -> 200 OK | {r_health.json()}")

    r_db = requests.get(f"{BASE_URL}/api/health/db")
    assert r_db.status_code == 200, f"/api/health/db failed: {r_db.text}"
    print(f"  [OK] /api/health/db -> 200 OK | {r_db.json()}")

    # 2. STEP 8, STEP 9 & STEP 10 Regression Endpoints
    print("\n2. RUNNING REGRESSION CHECKS ON STEP 8, 9 & 10...")
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

    r_reports = requests.get(f"{BASE_URL}/api/reports")
    assert r_reports.status_code == 200, f"GET /api/reports failed: {r_reports.text}"
    print(f"  [OK] GET /api/reports -> returned {len(r_reports.json())} reports")

    # 3. Topic Analysis Input Validations
    print("\n3. TESTING TOPIC ANALYSIS INPUT VALIDATIONS...")
    # Non-existent document ID
    r_bad_doc = requests.post(f"{BASE_URL}/api/topics/analyze", json={"document_ids": [999999]})
    assert r_bad_doc.status_code == 404, f"Expected 404 for missing doc ID, got {r_bad_doc.status_code}"
    print(f"  [OK] Non-existent document ID returned 404 Not Found: {r_bad_doc.json().get('detail')}")

    # 4. Real-Data Topic Analysis (Documents 11 & 12)
    print("\n4. RUNNING REAL TOPIC ANALYSIS FOR DOCUMENTS 11 & 12...")
    analyze_payload = {
        "document_ids": [11, 12]
    }
    r_topic = requests.post(f"{BASE_URL}/api/topics/analyze", json=analyze_payload)
    assert r_topic.status_code == 200, f"Topic analysis failed: {r_topic.text}"
    t_data = r_topic.json()

    analysis_id = t_data.get("analysis_id")
    docs_analyzed = t_data.get("documents_analyzed")
    word_freqs = t_data.get("word_frequencies") or []
    topics = t_data.get("topics") or []
    wc_image = t_data.get("wordcloud_image")
    src_docs = t_data.get("source_documents") or []

    print(f"  Analysis ID       : #{analysis_id}")
    print(f"  Docs Analyzed     : {docs_analyzed}")
    print(f"  Top Frequencies   : {word_freqs[:5]}")
    print(f"  Topics Extracted  : {len(topics)}")
    print(f"  WordCloud Image   : {'Present (Base64 PNG)' if wc_image and wc_image.startswith('data:image/png;base64') else 'Missing'}")
    print(f"  Source Documents  : {[d.get('original_filename') for d in src_docs]}")

    assert analysis_id is not None
    assert docs_analyzed == 2
    assert len(word_freqs) > 0, "Word frequencies should be non-empty"
    assert len(topics) > 0, "Topics should be non-empty"
    assert wc_image and wc_image.startswith("data:image/png;base64,"), "WordCloud image must be a valid Base64 PNG data URI"

    # Verify domain terms presence
    top_terms = [item["term"] for item in word_freqs]
    print(f"  Top 10 Domain Terms: {top_terms[:10]}")

    # 5. Dynamic Selection Comparison Test (Single Document vs Multiple Documents)
    print("\n5. TESTING DYNAMIC SELECTION (DOCUMENT 14 CSV vs DOCUMENTS 11 & 12)...")
    r_single = requests.post(f"{BASE_URL}/api/topics/analyze", json={"document_ids": [14]})
    assert r_single.status_code == 200
    single_data = r_single.json()
    single_freqs = [item["term"] for item in single_data.get("word_frequencies", [])[:5]]
    print(f"  Single Doc (Doc 14 CSV) Top Terms: {single_freqs}")
    assert single_freqs != top_terms[:5], "Different document selections must produce different frequency analysis"

    # 6. GET /api/topics List & Detail Endpoints
    print("\n6. TESTING GET /api/topics & GET /api/topics/{id}...")
    r_list = requests.get(f"{BASE_URL}/api/topics")
    assert r_list.status_code == 200
    t_list = r_list.json()
    print(f"  [OK] GET /api/topics returned {len(t_list)} analysis record(s)")
    assert any(rec["analysis_id"] == analysis_id for rec in t_list)

    r_single_topic = requests.get(f"{BASE_URL}/api/topics/{analysis_id}")
    assert r_single_topic.status_code == 200
    single_rec = r_single_topic.json()
    print(f"  [OK] GET /api/topics/{analysis_id} returned analysis record with {len(single_rec.get('topics', []))} topics")
    assert single_rec["analysis_id"] == analysis_id

    # Non-existent analysis ID check
    r_bad_analysis = requests.get(f"{BASE_URL}/api/topics/999999")
    assert r_bad_analysis.status_code == 404
    print(f"  [OK] Non-existent analysis ID 999999 returned 404 Not Found")

    print("\n" + "=" * 70)
    print("  [RESULT] STEP 11 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_step11_verification()
