"""
Verification Script for STEP 12.1 — Real Dashboard & Analytics Backend
Cross-checks database table counts against GET /api/dashboard/overview response.
Runs regression tests on all existing system endpoints.
"""

import sys
import json
import urllib.request
import urllib.error
import psycopg2

BASE_URL = "http://127.0.0.1:8000"
DB_URI = "postgresql://postgres:Singh@localhost:5432/cmpdi_document_ai"


def db_count(query: str) -> int:
    """Helper to query PostgreSQL directly for verification."""
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()
    cur.execute(query)
    res = cur.fetchone()[0]
    cur.close()
    conn.close()
    return res or 0


def make_request(url: str, method: str = "GET", payload: dict = None) -> tuple:
    """Helper to make HTTP request to FastAPI server."""
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    data_bytes = json.dumps(payload).encode("utf-8") if payload else None
    
    try:
        with urllib.request.urlopen(req, data=data_bytes) as resp:
            status_code = resp.getcode()
            body = json.loads(resp.read().decode("utf-8"))
            return status_code, body
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode("utf-8")) if e.fp else {}
        return e.code, body


def main():
    print("=" * 70)
    print("  STEP 12.1 VERIFICATION: REAL DASHBOARD & ANALYTICS BACKEND")
    print("=" * 70)

    # 1. System Health
    print("\n1. CHECKING SYSTEM HEALTH...")
    status, body = make_request(f"{BASE_URL}/api/health")
    assert status == 200 and body.get("status") == "ok", f"Health failed: {body}"
    print(f"  [OK] /api/health -> 200 OK | {body}")

    status, body = make_request(f"{BASE_URL}/api/health/db")
    assert status == 200 and body.get("status") == "ok", f"DB health failed: {body}"
    print(f"  [OK] /api/health/db -> 200 OK | {body}")

    # 2. Test GET /api/dashboard/overview
    print("\n2. TESTING GET /api/dashboard/overview...")
    status, dash_data = make_request(f"{BASE_URL}/api/dashboard/overview")
    assert status == 200, f"GET /api/dashboard/overview returned {status}: {dash_data}"
    print("  [OK] GET /api/dashboard/overview -> 200 OK")

    overview = dash_data.get("overview", {})
    documents_analytics = dash_data.get("documents", {})
    validation_analytics = dash_data.get("validation", {})
    reports_analytics = dash_data.get("reports", {})
    topics_analytics = dash_data.get("topics", {})
    kb_analytics = dash_data.get("knowledge_base", {})
    recent_activity = dash_data.get("recent_activity", [])

    # 3. Cross-Check Database Counts Against Overview API
    print("\n3. CROSS-CHECKING SQL AGGREGATES AGAINST API RESPONSE...")

    sql_docs = db_count("SELECT COUNT(*) FROM documents;")
    sql_processed = db_count("SELECT COUNT(*) FROM documents WHERE processing_status = 'completed';")
    sql_chunks = db_count("SELECT COUNT(*) FROM document_chunks;")
    sql_extractions = db_count("SELECT COUNT(*) FROM structured_extractions;")
    sql_val_errors = db_count("SELECT COUNT(*) FROM validation_results WHERE severity = 'error';")
    sql_conflicts = db_count("SELECT COUNT(*) FROM document_conflicts;")
    sql_reports = db_count("SELECT COUNT(*) FROM reports;")
    sql_topics = db_count("SELECT COUNT(*) FROM topic_analyses;")

    print(f"  Documents Count        : SQL={sql_docs} | API={overview.get('total_documents')}")
    print(f"  Processed Docs Count   : SQL={sql_processed} | API={overview.get('processed_documents')}")
    print(f"  Chunks Count           : SQL={sql_chunks} | API={overview.get('total_chunks')}")
    print(f"  Extractions Count      : SQL={sql_extractions} | API={overview.get('total_extractions')}")
    print(f"  Validation Errors Count: SQL={sql_val_errors} | API={overview.get('total_validation_errors')}")
    print(f"  Conflicts Count        : SQL={sql_conflicts} | API={overview.get('total_conflicts')}")
    print(f"  Reports Count          : SQL={sql_reports} | API={overview.get('total_reports')}")
    print(f"  Topics Count           : SQL={sql_topics} | API={overview.get('total_topics')}")

    assert overview.get("total_documents") == sql_docs, "Document count mismatch!"
    assert overview.get("processed_documents") == sql_processed, "Processed document count mismatch!"
    assert overview.get("total_chunks") == sql_chunks, "Chunk count mismatch!"
    assert overview.get("total_extractions") == sql_extractions, "Extraction count mismatch!"
    assert overview.get("total_validation_errors") == sql_val_errors, "Validation error count mismatch!"
    assert overview.get("total_conflicts") == sql_conflicts, "Conflict count mismatch!"
    assert overview.get("total_reports") == sql_reports, "Report count mismatch!"
    assert overview.get("total_topics") == sql_topics, "Topic analysis count mismatch!"

    print("  [OK] ALL DATABASE COUNTS MATCH API METRICS PERFECTLY!")

    # 4. Check Knowledge Base Synchronization
    print("\n4. VERIFYING KNOWLEDGE BASE FAISS STATUS...")
    print(f"  KB Status        : {kb_analytics.get('status')}")
    print(f"  Total Chunks     : {kb_analytics.get('total_chunks')}")
    print(f"  Indexed Vectors  : {kb_analytics.get('indexed_vectors')}")
    print(f"  Vector Dimension : {kb_analytics.get('dimension')}")
    print(f"  Sync Status      : {kb_analytics.get('sync_status')}")

    assert kb_analytics.get("total_chunks") == sql_chunks, "KB total_chunks mismatch!"

    # 5. Check Document Analytics Distributions
    print("\n5. VERIFYING DOCUMENT DISTRIBUTIONS...")
    print(f"  Document Types   : {documents_analytics.get('document_types')}")
    print(f"  Document Statuses: {documents_analytics.get('statuses')}")
    print(f"  Upload Timeline  : {documents_analytics.get('timeline')}")
    print(f"  Departments      : {documents_analytics.get('departments')}")

    # 6. Check Recent Activity
    print("\n6. VERIFYING RECENT ACTIVITY STREAM...")
    print(f"  Recent Activity Items Count: {len(recent_activity)}")
    if recent_activity:
        for idx, act in enumerate(recent_activity[:3], 1):
            print(f"    [{idx}] {act.get('type').upper()} | {act.get('title')} ({act.get('status')}) - {act.get('timestamp')}")

    # 7. Regression Testing
    print("\n7. RUNNING REGRESSION CHECKS ON ALL EXISTING ENDPOINTS...")
    endpoints_to_test = [
        ("GET", "/api/search/status", None, 200),
        ("POST", "/api/search", {"query": "coal reserves", "top_k": 3}, 200),
        ("POST", "/api/assistant/retrieve", {"query": "drilling depth", "top_k": 3}, 200),
        ("POST", "/api/assistant/query", {"query": "summarize borehole data", "top_k": 3}, 200),
        ("GET", "/api/reports", None, 200),
        ("GET", "/api/topics", None, 200),
    ]

    for method, path, payload, expected_code in endpoints_to_test:
        code, resp = make_request(f"{BASE_URL}{path}", method, payload)
        print(f"  [{'OK' if code == expected_code else 'FAIL'}] {method} {path} -> {code}")
        assert code == expected_code, f"{method} {path} failed with code {code}: {resp}"

    print("\n" + "=" * 70)
    print("  [RESULT] STEP 12.1 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    main()
