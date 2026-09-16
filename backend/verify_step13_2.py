"""
Verification Test Suite for STEP 13.2 — Login API + Password Authentication
Tests POST /api/auth/login endpoint for:
1. Database User Inspection & Creation
2. Successful authentication with valid username / email & password
3. Invalid password -> 401
4. Non-existent username/email -> 401
5. Disabled account -> 401
6. Missing/empty fields -> 422
7. Response security inspection (verifying zero credential/hash exposure)
8. Complete API regression testing
"""

import sys
import json
import urllib.request
import urllib.error
import psycopg2

from app.core.security import hash_password

BASE_URL = "http://127.0.0.1:8000"
DB_URI = "postgresql://postgres:Singh@localhost:5432/cmpdi_document_ai"


def db_execute(query: str, params: tuple = ()) -> list:
    """Helper to query PostgreSQL directly."""
    conn = psycopg2.connect(DB_URI)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(query, params)
    try:
        res = cur.fetchall()
    except Exception:
        res = []
    cur.close()
    conn.close()
    return res


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
    print("=" * 75)
    print("  STEP 13.2 VERIFICATION: LOGIN API & PASSWORD AUTHENTICATION")
    print("=" * 75)

    # 1. Inspect Existing User Table
    print("\n1. INSPECTING POSTGRESQL USER TABLE...")
    existing_users = db_execute("SELECT id, username, email, role, is_active FROM users;")
    print(f"  Existing Users Count in Database: {len(existing_users)}")
    
    test_username = "cmpdi_admin"
    test_email = "admin@cmpdi.co.in"
    test_pass = "CMPDI_Secure_Auth_2026!"
    
    # Ensure test active account exists in database for testing
    existing_test_user = db_execute("SELECT id, username FROM users WHERE username = %s OR email = %s;", (test_username, test_email))
    if not existing_test_user:
        print("  Inserting real active user account for authentication testing...")
        pwd_hash = hash_password(test_pass)
        db_execute(
            """INSERT INTO users (username, email, full_name, password_hash, hashed_password, role, is_active, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW());""",
            (test_username, test_email, "CMPDI Admin", pwd_hash, pwd_hash, "HOD")
        )
    
    # Ensure test disabled account exists for testing
    inactive_username = "disabled_user"
    inactive_email = "disabled@cmpdi.co.in"
    existing_inactive = db_execute("SELECT id FROM users WHERE username = %s;", (inactive_username,))
    if not existing_inactive:
        pwd_hash = hash_password(test_pass)
        db_execute(
            """INSERT INTO users (username, email, full_name, password_hash, hashed_password, role, is_active, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, FALSE, NOW(), NOW());""",
            (inactive_username, inactive_email, "Disabled User", pwd_hash, pwd_hash, "NORMAL_USER")
        )

    # 2. Test Successful Login (via Username & Email)
    print("\n2. TESTING SUCCESSFUL LOGIN (USERNAME & EMAIL)...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": test_username,
        "password": test_pass
    })
    print(f"  [OK] Login via Username -> HTTP {status_code} | User: {body.get('user', {}).get('username')}")
    assert status_code == 200 and body.get("status") == "success"

    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": test_email,
        "password": test_pass
    })
    print(f"  [OK] Login via Email -> HTTP {status_code} | User: {body.get('user', {}).get('email')}")
    assert status_code == 200 and body.get("status") == "success"

    # 3. Test Invalid Password (HTTP 401)
    print("\n3. TESTING INVALID PASSWORD (HTTP 401)...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": test_username,
        "password": "Wrong_Password_123!"
    })
    print(f"  [OK] Invalid Password -> HTTP {status_code} | Detail: {body.get('detail')}")
    assert status_code == 401 and "Invalid" in body.get("detail", "")

    # 4. Test Non-Existent Username/Email (HTTP 401)
    print("\n4. TESTING NON-EXISTENT USER (HTTP 401)...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": "non_existent_user_99999",
        "password": test_pass
    })
    print(f"  [OK] Non-Existent User -> HTTP {status_code} | Detail: {body.get('detail')}")
    assert status_code == 401 and "Invalid" in body.get("detail", "")

    # 5. Test Disabled Account (HTTP 401)
    print("\n5. TESTING DISABLED ACCOUNT (HTTP 401)...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": inactive_username,
        "password": test_pass
    })
    print(f"  [OK] Disabled Account -> HTTP {status_code} | Detail: {body.get('detail')}")
    assert status_code == 401 and "disabled" in body.get("detail", "").lower()

    # 6. Test Validation Errors (HTTP 422)
    print("\n6. TESTING VALIDATION ERRORS (HTTP 422)...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": "",
        "password": test_pass
    })
    print(f"  [OK] Empty Username -> HTTP {status_code}")
    assert status_code == 422

    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": test_username,
        "password": ""
    })
    print(f"  [OK] Empty Password -> HTTP {status_code}")
    assert status_code == 422

    # 7. Response Security Test
    print("\n7. RESPONSE SECURITY INSPECTION...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": test_username,
        "password": test_pass
    })
    body_str = json.dumps(body)
    forbidden_terms = ["password_hash", "hashed_password", "secret", "api_key", test_pass]
    for term in forbidden_terms:
        assert term not in body_str, f"FORBIDDEN TERM '{term}' EXPOSED IN LOGIN RESPONSE JSON!"
    print("  [OK] Login response JSON strictly clean — 0 passwords or hashes exposed!")

    # 8. Full API Regression Check
    print("\n8. RUNNING FULL REGRESSION CHECKS ON ALL SYSTEM ENDPOINTS...")
    endpoints_to_test = [
        ("GET", "/api/health", None, 200),
        ("GET", "/api/health/db", None, 200),
        ("GET", "/api/dashboard/overview", None, 200),
        ("GET", "/api/search/status", None, 200),
        ("POST", "/api/search", {"query": "geological seam", "top_k": 3}, 200),
        ("POST", "/api/assistant/retrieve", {"query": "core log lithology", "top_k": 3}, 200),
        ("POST", "/api/assistant/query", {"query": "summarize borehole data", "top_k": 3}, 200),
        ("GET", "/api/reports", None, 200),
        ("GET", "/api/topics", None, 200),
    ]

    for method, path, payload, expected_code in endpoints_to_test:
        code, resp = make_request(f"{BASE_URL}{path}", method, payload)
        print(f"  [{'OK' if code == expected_code else 'FAIL'}] {method} {path} -> {code}")
        assert code == expected_code, f"{method} {path} failed with code {code}"

    print("\n" + "=" * 75)
    print("  [RESULT] STEP 13.2 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    main()
