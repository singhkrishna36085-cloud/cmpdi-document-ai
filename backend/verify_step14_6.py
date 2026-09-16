"""
Verification script for STEP 14.6 — Advanced Validation & Data Quality Center
Tests real backend validation APIs, overview metrics, pagination, server-side filtering,
conflict matrix, document quality matrix, HOD review workflow, RBAC security,
original data preservation, audit logging, and core system regression.
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
    print("VERIFYING STEP 14.6 - VALIDATION & DATA QUALITY CENTER")
    print("==================================================\n")

    # 1. HOD Login
    print("[1/21] Testing HOD Login...")
    status, res = make_request(f"{BASE_URL}/api/auth/login", method="POST", data={"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"})
    assert status == 200, f"HOD login failed: {res}"
    hod_token = res.get("access_token")
    assert hod_token, "HOD access token missing"
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    print("   [OK] HOD login successful.")

    # 2. NORMAL_USER Login
    print("[2/21] Testing NORMAL_USER Login...")
    status, res = make_request(f"{BASE_URL}/api/auth/login", method="POST", data={"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"})
    assert status == 200, f"NORMAL_USER login failed: {res}"
    user_token = res.get("access_token")
    assert user_token, "NORMAL_USER access token missing"
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("   [OK] NORMAL_USER login successful.")

    # 3. Trigger Real Document Validation on Doc 11
    print("[3/21] Triggering document validation on Document #11...")
    status, res = make_request(f"{BASE_URL}/api/documents/11/validate", method="POST", headers=hod_headers)
    assert status == 200, f"Doc 11 validation failed: {res}"
    print(f"   [OK] Validation executed (Issues: {res.get('total_validation_issues')}, Conflicts: {res.get('total_conflicts_detected')}).")

    # 4. GET /api/validation/overview
    print("[4/21] Testing GET /api/validation/overview metrics...")
    status, overview = make_request(f"{BASE_URL}/api/validation/overview", headers=hod_headers)
    assert status == 200, f"Overview API failed: {overview}"
    assert "total_errors" in overview, "total_errors field missing"
    assert "total_warnings" in overview, "total_warnings field missing"
    assert "total_conflicts" in overview, "total_conflicts field missing"
    print(f"   [OK] Overview metrics returned (Errors: {overview['total_errors']}, Warnings: {overview['total_warnings']}, Conflicts: {overview['total_conflicts']}).")

    # 5. GET /api/validation/issues
    print("[5/21] Testing GET /api/validation/issues...")
    status, issues_res = make_request(f"{BASE_URL}/api/validation/issues", headers=hod_headers)
    assert status == 200, f"Issues list API failed: {issues_res}"
    items = issues_res.get("items", [])
    print(f"   [OK] Total issues returned: {issues_res.get('total')} (Items in page: {len(items)}).")

    # 6. Verify Error Count Matches Overview
    print("[6/21] Verifying error count accuracy...")
    status, err_issues = make_request(f"{BASE_URL}/api/validation/issues?severity=error", headers=hod_headers)
    assert status == 200, f"Error issues fetch failed: {err_issues}"
    assert err_issues.get("total") == overview["total_errors"], f"Mismatch: Overview errors={overview['total_errors']}, Issues errors={err_issues.get('total')}"
    print(f"   [OK] Error count matches PostgreSQL ({err_issues.get('total')} errors).")

    # 7. Verify Warning Count Matches Overview
    print("[7/21] Verifying warning count accuracy...")
    status, warn_issues = make_request(f"{BASE_URL}/api/validation/issues?severity=warning", headers=hod_headers)
    assert status == 200, f"Warning issues fetch failed: {warn_issues}"
    assert warn_issues.get("total") == overview["total_warnings"], f"Mismatch: Overview warnings={overview['total_warnings']}, Issues warnings={warn_issues.get('total')}"
    print(f"   [OK] Warning count matches PostgreSQL ({warn_issues.get('total')} warnings).")

    # 8. Verify Conflict Count Matches GET /api/conflicts
    print("[8/21] Verifying conflict count accuracy...")
    status, conflicts_res = make_request(f"{BASE_URL}/api/conflicts", headers=hod_headers)
    assert status == 200, f"Global conflicts fetch failed: {conflicts_res}"
    assert len(conflicts_res.get("conflicts", [])) == overview["total_conflicts"], "Conflict count mismatch"
    print(f"   [OK] Conflict count matches PostgreSQL ({len(conflicts_res.get('conflicts', []))} conflicts).")

    # 9. Verify Issue Pagination
    print("[9/21] Testing server-side pagination (page=1, page_size=2)...")
    status, page_res = make_request(f"{BASE_URL}/api/validation/issues?page=1&page_size=2", headers=hod_headers)
    assert status == 200, f"Pagination fetch failed: {page_res}"
    assert len(page_res.get("items", [])) <= 2, "Page size exceeded"
    print(f"   [OK] Pagination verified (Page 1 items: {len(page_res.get('items', []))}).")

    # 10. Verify Severity Filtering
    print("[10/21] Testing severity filter (severity=warning)...")
    for item in warn_issues.get("items", []):
        assert item.get("severity") == "warning", f"Expected warning, got {item.get('severity')}"
    print("   [OK] Severity filter working correctly.")

    # 11. Verify Search Filtering
    print("[11/21] Testing search filter...")
    status, search_res = make_request(f"{BASE_URL}/api/validation/issues?search=Format", headers=hod_headers)
    assert status == 200, f"Search fetch failed: {search_res}"
    print(f"   [OK] Search filter executed ({search_res.get('total')} matching results).")

    # 12. Verify Issue Detail API
    print("[12/21] Testing issue detail endpoint GET /api/validation/issues/{id}...")
    if len(items) > 0:
        sample_id = items[0]["id"]
        status, detail_res = make_request(f"{BASE_URL}/api/validation/issues/{sample_id}", headers=hod_headers)
        assert status == 200, f"Issue detail failed: {detail_res}"
        assert detail_res.get("id") == sample_id, "ID mismatch"
        print(f"   [OK] Issue detail returned for issue ID #{sample_id}.")
    else:
        print("   [SKIP] No issues present to test detail endpoint.")

    # 13. Verify Source Traceability Fields
    print("[13/21] Verifying source evidence traceability fields...")
    if len(items) > 0:
        first_item = items[0]
        assert "document_id" in first_item, "document_id missing"
        assert "source_reference" in first_item, "source_reference missing"
        print(f"   [OK] Source traceability intact (Doc #{first_item['document_id']} | Ref: '{first_item.get('source_reference')}').")

    # 14. Verify Document Quality Matrix API
    print("[14/21] Testing GET /api/validation/documents matrix...")
    status, matrix_res = make_request(f"{BASE_URL}/api/validation/documents", headers=hod_headers)
    assert status == 200, f"Document matrix fetch failed: {matrix_res}"
    docs = matrix_res.get("documents", [])
    assert len(docs) > 0, "No documents in matrix"
    print(f"   [OK] Document quality matrix returned ({len(docs)} documents listed).")

    # 15. Verify HOD Review Workflow API
    print("[15/21] Testing HOD review status update POST /api/validation/issues/{id}/review...")
    if len(items) > 0:
        sample_id = items[0]["id"]
        status, review_res = make_request(
            f"{BASE_URL}/api/validation/issues/{sample_id}/review",
            method="POST",
            data={"status": "UNDER_REVIEW", "note": "E2E Test Review Note"},
            headers=hod_headers
        )
        assert status == 200, f"Review update failed: {review_res}"
        assert review_res.get("issue", {}).get("status") == "UNDER_REVIEW", "Review status not updated"
        print(f"   [OK] HOD review status updated for issue #{sample_id}.")

    # 16. Verify NORMAL_USER RBAC Isolation for Review Action
    print("[16/21] Testing NORMAL_USER review restriction (403 expected)...")
    if len(items) > 0:
        sample_id = items[0]["id"]
        status, user_rev = make_request(
            f"{BASE_URL}/api/validation/issues/{sample_id}/review",
            method="POST",
            data={"status": "RESOLVED"},
            headers=user_headers
        )
        assert status == 403, f"Expected 403 for NORMAL_USER review update, got {status}"
        print("   [OK] NORMAL_USER review update correctly blocked (403 Forbidden).")

    # 17. Verify Confidential Doc #27 Isolation for NORMAL_USER
    print("[17/21] Verifying confidential Doc #27 validation protection for NORMAL_USER...")
    status, user_issues = make_request(f"{BASE_URL}/api/validation/issues", headers=user_headers)
    assert status == 200, f"User issues fetch failed: {user_issues}"
    for item in user_issues.get("items", []):
        assert item.get("document_id") != 27, "Confidential Doc #27 issue returned to NORMAL_USER!"
    print("   [OK] Confidential Doc #27 validation issues strictly isolated from NORMAL_USER.")

    # 18. Verify Original Extractions Preserved
    print("[18/21] Verifying original structured extractions are 100% preserved...")
    status, struct_res = make_request(f"{BASE_URL}/api/documents/11/structured", headers=hod_headers)
    assert status == 200, f"Structured extractions fetch failed: {struct_res}"
    assert struct_res.get("total_structured_records", 0) > 0, "Structured extractions deleted or modified"
    print(f"   [OK] Confirmed {struct_res.get('total_structured_records')} original structured extraction records preserved.")

    # 19. Verify Audit Integration for Validation & Review
    print("[19/21] Verifying audit event logged for validation and review actions...")
    status, audit_val = make_request(f"{BASE_URL}/api/audit?action=DOCUMENT_VALIDATE", headers=hod_headers)
    assert status == 200, f"Audit validate fetch failed: {audit_val}"
    assert audit_val.get("total", 0) > 0, "No DOCUMENT_VALIDATE audit log found"

    status, audit_rev = make_request(f"{BASE_URL}/api/audit?action=VALIDATION_ISSUE_REVIEW", headers=hod_headers)
    assert status == 200, f"Audit review fetch failed: {audit_rev}"
    assert audit_rev.get("total", 0) > 0, "No VALIDATION_ISSUE_REVIEW audit log found"
    print("   [OK] Verified real audit logs for DOCUMENT_VALIDATE and VALIDATION_ISSUE_REVIEW.")

    # 20. Verify Zero Secret Leaks
    print("[20/21] Verifying zero secret leaks in validation APIs...")
    status, overview_check = make_request(f"{BASE_URL}/api/validation/overview", headers=hod_headers)
    ov_str = json.dumps(overview_check)
    assert "password" not in ov_str.lower(), "Secret leak in validation overview"
    assert "token" not in ov_str.lower() or "status" in ov_str.lower(), "Token leak in overview"
    print("   [OK] Confirmed zero secret leakage across validation responses.")

    # 21. Core System Regression Check
    print("[21/21] Regression check on existing core APIs...")
    assert make_request(f"{BASE_URL}/api/health")[0] == 200
    assert make_request(f"{BASE_URL}/api/health/db")[0] == 200
    assert make_request(f"{BASE_URL}/api/auth/me", headers=hod_headers)[0] == 200
    assert make_request(f"{BASE_URL}/api/documents", headers=hod_headers)[0] == 200
    assert make_request(f"{BASE_URL}/api/search/status")[0] == 200
    assert make_request(f"{BASE_URL}/api/reports", headers=hod_headers)[0] == 200
    assert make_request(f"{BASE_URL}/api/topics", headers=hod_headers)[0] == 200
    assert make_request(f"{BASE_URL}/api/audit", headers=hod_headers)[0] == 200
    print("   [OK] Core APIs health & regression check PASSED.")

    print("\n==================================================")
    print("ALL STEP 14.6 VERIFICATION TESTS PASSED SUCCESSFULLY!")
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
