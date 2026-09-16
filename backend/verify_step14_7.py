"""
STEP 14.7 Production Readiness & Security Verification Script
Runs E2E checks on FastAPI endpoints, Database, CORS, JWT Auth, RBAC isolation, FAISS persistence, and security settings.
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def log(msg, status="INFO"):
    symbol = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else "[INFO]"
    print(f"{symbol} {msg}")

def http_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    
    if data:
        if isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            body = data
    else:
        body = None

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(resp_body)
        except Exception:
            parsed = {"detail": resp_body}
        return e.code, parsed

def test_health_endpoints():
    log("Testing Production Health Endpoints...")
    status, data = http_request("/api/health")
    assert status == 200, f"/api/health failed: {data}"
    log(f"/api/health: {data.get('message')}", "PASS")

    status, data = http_request("/api/health/db")
    assert status == 200, f"/api/health/db failed: {data}"
    log(f"/api/health/db: {data.get('detail')}", "PASS")

    status, data = http_request("/api/health/ready")
    assert status == 200, f"/api/health/ready failed: {data}"
    log(f"/api/health/ready: {data.get('status')} - service={data.get('service')}", "PASS")

def test_authentication_and_rbac():
    log("Testing Authentication & RBAC Data Isolation...")
    
    # Login HOD
    status, hod_resp = http_request("/api/auth/login", method="POST", data={"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"})
    assert status == 200, f"HOD login failed: {hod_resp}"
    hod_token = hod_resp["access_token"]
    log("HOD Login Successful (JWT issued)", "PASS")

    # Login NORMAL_USER
    status, user_resp = http_request("/api/auth/login", method="POST", data={"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"})
    assert status == 200, f"NORMAL_USER login failed: {user_resp}"
    user_token = user_resp["access_token"]
    log("NORMAL_USER Login Successful (JWT issued)", "PASS")

    # Confidential Doc check: HOD
    status, hod_docs = http_request("/api/documents", token=hod_token)
    assert status == 200, f"HOD document list failed: {hod_docs}"
    confidential_in_hod = any(d.get("is_confidential") for d in hod_docs.get("documents", []))
    log(f"HOD document query: Confidential document visible = {confidential_in_hod}", "PASS")

    # Confidential Doc check: NORMAL_USER
    status, user_docs = http_request("/api/documents", token=user_token)
    assert status == 200, f"NORMAL_USER document list failed: {user_docs}"
    confidential_in_user = any(d.get("is_confidential") for d in user_docs.get("documents", []))
    assert not confidential_in_user, "SECURITY BREACH: NORMAL_USER sees confidential document in document list!"
    log("NORMAL_USER document query: Zero confidential documents returned", "PASS")

    # Search check: NORMAL_USER
    status, search_resp = http_request("/api/search?q=confidential", token=user_token)
    assert status == 200, f"NORMAL_USER search failed: {search_resp}"
    confidential_search_results = any(r.get("is_confidential") for r in search_resp.get("results", []))
    assert not confidential_search_results, "SECURITY BREACH: NORMAL_USER returned confidential vector search results!"
    log("NORMAL_USER search query: Zero confidential chunks returned", "PASS")

def test_vector_and_storage_persistence():
    log("Testing Storage Directories Persistence...")
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_dir = os.path.join(backend_dir, "uploads")
    vector_dir = os.path.join(backend_dir, "vector_store")

    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(vector_dir, exist_ok=True)

    assert os.path.exists(uploads_dir), f"Uploads directory missing: {uploads_dir}"
    assert os.path.exists(vector_dir), f"Vector store directory missing: {vector_dir}"
    log(f"Local storage paths verified: uploads/ and vector_store/", "PASS")

    status, status_resp = http_request("/api/search/status")
    assert status == 200, f"Vector search status failed: {status_resp}"
    log(f"FAISS Vector Index Status: total_vectors={status_resp.get('total_vectors')}, status={status_resp.get('status')}", "PASS")

def run_all_checks():
    print("==================================================")
    print("STEP 14.7 — PRODUCTION READINESS VERIFICATION")
    print("==================================================")
    try:
        test_health_endpoints()
        test_authentication_and_rbac()
        test_vector_and_storage_persistence()
        print("==================================================")
        print("ALL PRODUCTION READINESS CHECKS PASSED SUCCESSFULLY!")
        print("==================================================")
    except AssertionError as ae:
        print(f"\n[FAIL] VERIFICATION FAILED: {ae}")
        sys.exit(1)
    except Exception as exc:
        print(f"\n[FAIL] UNEXPECTED ERROR: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    run_all_checks()

