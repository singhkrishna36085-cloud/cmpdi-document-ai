"""
Verification Test Suite for STEP 13.3 — JWT Authentication & Protected API Foundation
Tests:
1. JWT Access Token Generation on POST /api/auth/login
2. GET /api/auth/me with valid Bearer JWT
3. Invalid / Malformed / Expired / Inactive / Non-existent user tokens -> HTTP 401
4. JWT Payload security inspection (verifying zero credential / sensitive data inside payload)
5. Full API regression testing across existing endpoints
"""

import sys
import json
import jwt
import urllib.request
import urllib.error
import psycopg2
from datetime import datetime, timedelta

from app.core.jwt import create_access_token
from app.core.config import JWT_SECRET, JWT_ALGORITHM

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


def make_request(url: str, method: str = "GET", payload: dict = None, headers: dict = None) -> tuple:
    """Helper to make HTTP request to FastAPI server."""
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
            
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
    print("  STEP 13.3 VERIFICATION: JWT AUTHENTICATION & PROTECTED API FOUNDATION")
    print("=" * 75)

    test_username = "cmpdi_admin"
    test_pass = "CMPDI_Secure_Auth_2026!"

    # 1. Test JWT Generation on POST /api/auth/login
    print("\n1. TESTING JWT ACCESS TOKEN GENERATION ON LOGIN...")
    status_code, body = make_request(f"{BASE_URL}/api/auth/login", method="POST", payload={
        "username": test_username,
        "password": test_pass
    })
    
    assert status_code == 200, f"Login failed: {body}"
    token = body.get("access_token")
    token_type = body.get("token_type")
    print(f"  [OK] Login Returned JWT Token: {token[:30]}... (Type: {token_type})")
    assert token is not None and len(token) > 20
    assert token_type == "bearer"

    # 2. Inspect JWT Payload Security
    print("\n2. INSPECTING JWT TOKEN PAYLOAD SECURITY...")
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    print(f"  Decoded Token Payload: {payload}")
    
    assert "sub" in payload, "Missing 'sub' claim in JWT payload!"
    assert "role" in payload, "Missing 'role' claim in JWT payload!"
    assert "exp" in payload, "Missing 'exp' claim in JWT payload!"
    
    forbidden_claims = ["password", "password_hash", "hashed_password", "secret", "api_key"]
    for fc in forbidden_claims:
        assert fc not in payload, f"FORBIDDEN CLAIM '{fc}' FOUND INSIDE JWT PAYLOAD!"
    print("  [OK] JWT Token payload is strictly clean — 0 passwords, hashes, or secrets contained!")

    # 3. Test Protected GET /api/auth/me with Valid Token
    print("\n3. TESTING PROTECTED GET /api/auth/me WITH VALID BEARER TOKEN...")
    status_code, body = make_request(
        f"{BASE_URL}/api/auth/me",
        method="GET",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"  [OK] GET /api/auth/me -> HTTP {status_code} | Authenticated User: {body.get('username')} ({body.get('role')})")
    assert status_code == 200
    assert body.get("username") == test_username

    # 4. Test Invalid / Malformed / Expired / Inactive / Missing Token Cases (HTTP 401)
    print("\n4. TESTING PROTECTED ENDPOINT SECURITY CASES (HTTP 401)...")

    # Case A: No Authorization header
    status_code, body = make_request(f"{BASE_URL}/api/auth/me", method="GET")
    print(f"  [OK] No Auth Header -> HTTP {status_code}")
    assert status_code == 401

    # Case B: Malformed token
    status_code, body = make_request(f"{BASE_URL}/api/auth/me", method="GET", headers={"Authorization": "Bearer malformed_jwt_token_123"})
    print(f"  [OK] Malformed Token -> HTTP {status_code}")
    assert status_code == 401

    # Case C: Expired token
    expired_token = create_access_token(user_id=1, role="HOD", expires_delta=timedelta(seconds=-10))
    status_code, body = make_request(f"{BASE_URL}/api/auth/me", method="GET", headers={"Authorization": f"Bearer {expired_token}"})
    print(f"  [OK] Expired Token -> HTTP {status_code}")
    assert status_code == 401

    # Case D: Token for non-existent user ID
    fake_user_token = create_access_token(user_id=999999, role="NORMAL_USER")
    status_code, body = make_request(f"{BASE_URL}/api/auth/me", method="GET", headers={"Authorization": f"Bearer {fake_user_token}"})
    print(f"  [OK] Non-existent User Token -> HTTP {status_code}")
    assert status_code == 401

    # Case E: Token for inactive user ID
    inactive_user_res = db_execute("SELECT id FROM users WHERE is_active = FALSE LIMIT 1;")
    if inactive_user_res:
        inactive_id = inactive_user_res[0][0]
        inactive_token = create_access_token(user_id=inactive_id, role="NORMAL_USER")
        status_code, body = make_request(f"{BASE_URL}/api/auth/me", method="GET", headers={"Authorization": f"Bearer {inactive_token}"})
        print(f"  [OK] Inactive User Token -> HTTP {status_code}")
        assert status_code == 401

    # 5. Full API Regression Check
    print("\n5. RUNNING FULL REGRESSION CHECKS ON ALL SYSTEM ENDPOINTS...")
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
    print("  [RESULT] STEP 13.3 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    main()
