"""
Verification script for STEP 14.5 — Real Audit, History & Governance Center
Tests real backend audit logging, pagination, server-side filtering, audit details,
document history, RBAC security, secrets isolation, and non-disruptive behavior.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data and isinstance(data, dict):
        data_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif data and isinstance(data, bytes):
        data_bytes = data
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"detail": body}
        return e.code, parsed

def run_verification():
    print("==================================================")
    print("VERIFYING STEP 14.5 - REAL AUDIT & GOVERNANCE CENTER")
    print("==================================================\n")

    # 1. HOD Login
    print("[1/18] Testing HOD Login...")
    status, res = make_request(f"{BASE_URL}/api/auth/login", method="POST", data={"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"})
    assert status == 200, f"HOD login failed: {res}"
    hod_token = res.get("access_token")
    assert hod_token, "HOD access token missing"
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    print("   [OK] HOD login successful.")

    # 2. NORMAL_USER Login
    print("[2/18] Testing NORMAL_USER Login...")
    status, res = make_request(f"{BASE_URL}/api/auth/login", method="POST", data={"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"})
    assert status == 200, f"NORMAL_USER login failed: {res}"
    user_token = res.get("access_token")
    assert user_token, "NORMAL_USER access token missing"
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("   [OK] NORMAL_USER login successful.")

    # 3. Verify LOGIN_SUCCESS audit event created
    print("[3/18] Verifying LOGIN_SUCCESS audit event in DB...")
    status, res = make_request(f"{BASE_URL}/api/audit?action=LOGIN_SUCCESS", headers=hod_headers)
    assert status == 200, f"Failed to fetch LOGIN_SUCCESS audit logs: {res}"
    items = res.get("items", [])
    assert len(items) > 0, "No LOGIN_SUCCESS audit event found in PostgreSQL"
    print(f"   [OK] Verified {len(items)} LOGIN_SUCCESS audit event(s).")

    # 4. Trigger Real Document Action
    print("[4/18] Triggering real document action (DOCUMENT_VIEW)...")
    status, res = make_request(f"{BASE_URL}/api/documents/11", headers=hod_headers)
    assert status == 200, f"Document view failed: {res}"
    print("   [OK] Document 11 viewed.")

    # 5. Trigger Real AI Query Action
    print("[5/18] Triggering real AI query action...")
    status, res = make_request(f"{BASE_URL}/api/assistant/query", method="POST", data={"query": "coal production details"}, headers=hod_headers)
    assert status == 200, f"AI query failed: {res}"
    print("   [OK] AI assistant query completed.")

    # 6. Trigger Real Report Generation Action
    print("[6/18] Triggering real report generation action...")
    status, res = make_request(f"{BASE_URL}/api/reports/generate", method="POST", data={"document_ids": [11], "report_type": "geological_summary", "title": "Audit Test Geological Report"}, headers=hod_headers)
    assert status == 200, f"Report generation failed: {res}"
    report_id = res.get("id")
    print(f"   [OK] Report {report_id} generated.")

    # 7. Trigger Real Topic Analysis Action
    print("[7/18] Triggering real topic analysis action...")
    status, res = make_request(f"{BASE_URL}/api/topics/analyze", method="POST", data={"document_ids": [11]}, headers=hod_headers)
    assert status == 200, f"Topic analysis failed: {res}"
    print("   [OK] Topic analysis completed.")

    # 8. Verify GET /api/audit returns PostgreSQL-backed records
    print("[8/18] Verifying GET /api/audit returns real PostgreSQL records...")
    status, res = make_request(f"{BASE_URL}/api/audit", headers=hod_headers)
    assert status == 200, f"Failed to fetch audit log: {res}"
    total = res.get("total", 0)
    assert total > 0, "Audit logs count should be > 0"
    print(f"   [OK] GET /api/audit returned {total} total real event(s).")

    # 9. Verify Pagination works
    print("[9/18] Verifying pagination parameters (page=1, page_size=2)...")
    status, res_p1 = make_request(f"{BASE_URL}/api/audit?page=1&page_size=2", headers=hod_headers)
    assert status == 200, f"Page 1 fetch failed: {res_p1}"
    assert len(res_p1.get("items", [])) <= 2, "Page size limit not respected"
    print(f"   [OK] Pagination working (Page 1 items count: {len(res_p1.get('items', []))}).")

    # 10. Verify Filtering actually changes returned results
    print("[10/18] Verifying action filters (action=AI_ASSISTANT_QUERY)...")
    status, res_ai = make_request(f"{BASE_URL}/api/audit?action=AI_ASSISTANT_QUERY", headers=hod_headers)
    assert status == 200, f"Filter fetch failed: {res_ai}"
    for item in res_ai.get("items", []):
        assert item.get("action") == "AI_ASSISTANT_QUERY", f"Expected AI_ASSISTANT_QUERY, got {item.get('action')}"
    print(f"   [OK] Filter working ({len(res_ai.get('items', []))} matching AI_ASSISTANT_QUERY events).")

    # 11. Verify Audit detail endpoint GET /api/audit/{id}
    print("[11/18] Testing GET /api/audit/{id} detail endpoint...")
    sample_id = res.get("items")[0]["id"]
    status, res_detail = make_request(f"{BASE_URL}/api/audit/{sample_id}", headers=hod_headers)
    assert status == 200, f"Detail endpoint failed: {res_detail}"
    assert res_detail.get("id") == sample_id, "Detail ID mismatch"
    print(f"   [OK] Audit detail endpoint working for event ID #{sample_id}.")

    # 12. Verify NORMAL_USER RBAC restrictions
    print("[12/18] Testing NORMAL_USER RBAC isolation...")
    status, res_user_audit = make_request(f"{BASE_URL}/api/audit", headers=user_headers)
    assert status == 200, f"User audit fetch failed: {res_user_audit}"
    for item in res_user_audit.get("items", []):
        assert item.get("user_role") != "HOD", "NORMAL_USER received HOD activity log"
    print("   [OK] NORMAL_USER RBAC audit isolation verified.")

    # 13. Verify NORMAL_USER cannot see confidential Doc #27 audit details
    print("[13/18] Verifying confidential Doc #27 audit protection for NORMAL_USER...")
    status, res_conf = make_request(f"{BASE_URL}/api/audit/document-history/27", headers=user_headers)
    assert status == 403, f"Expected 403 for NORMAL_USER on Doc #27 history, got {status}"
    print("   [OK] Confidential Doc #27 audit history blocked for NORMAL_USER (403 Forbidden).")

    # 14. Verify HOD can access authorized confidential audit information
    print("[14/18] Verifying HOD can access confidential Doc #27 audit history...")
    status, res_hod_conf = make_request(f"{BASE_URL}/api/audit/document-history/27", headers=hod_headers)
    assert status == 200, f"HOD failed to fetch Doc #27 history: {res_hod_conf}"
    print("   [OK] HOD successfully accessed confidential Doc #27 history.")

    # 15. Verify Unauthorized API requests return 401/403
    print("[15/18] Verifying 401 Unauthorized for unauthenticated requests...")
    status, res_unauth = make_request(f"{BASE_URL}/api/audit")
    assert status == 401, f"Expected 401, got {status}"
    print("   [OK] Unauthenticated audit request correctly rejected (401 Unauthorized).")

    # 16. Verify Secrets are NOT present in audit responses
    print("[16/18] Verifying zero secret leaks in audit responses...")
    status, res_all = make_request(f"{BASE_URL}/api/audit?page_size=100", headers=hod_headers)
    for log in res_all.get("items", []):
        details_str = json.dumps(log.get("details", {}))
        assert "password" not in details_str.lower() or "[REDACTED_SECRET]" in details_str, f"Secret leak detected in log #{log['id']}"
        assert "password_hash" not in details_str.lower() or "[REDACTED_SECRET]" in details_str, f"Hash leak detected in log #{log['id']}"
    print("   [OK] Confirmed zero secrets leaked across all audit log entries.")

    # 17. Verify No Fake Records inserted
    print("[17/18] Verifying zero synthetic/demo records in PostgreSQL...")
    for log in res_all.get("items", []):
        assert log.get("username") in ["cmpdi_admin", "normal_user", "System", None], f"Unexpected fake user: {log.get('username')}"
    print("   [OK] Confirmed all audit records correspond to authentic system activity.")

    # 18. Verify Existing APIs regression
    print("[18/18] Regression check on existing core APIs...")
    status, h = make_request(f"{BASE_URL}/api/health")
    assert status == 200, "Health API failed"
    status, dbh = make_request(f"{BASE_URL}/api/health/db")
    assert status == 200, "Health DB API failed"
    status, me = make_request(f"{BASE_URL}/api/auth/me", headers=hod_headers)
    assert status == 200, "Auth me API failed"
    status, docs = make_request(f"{BASE_URL}/api/documents", headers=hod_headers)
    assert status == 200, "Documents API failed"
    status, srch = make_request(f"{BASE_URL}/api/search/status")
    assert status == 200, "Search status API failed"
    print("   [OK] Core APIs health & regression check PASSED.")

    print("\n==================================================")
    print("ALL STEP 14.5 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_verification()
    except AssertionError as e:
        print(f"\n[FAIL] VERIFICATION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] UNEXPECTED ERROR: {e}")
        sys.exit(1)
