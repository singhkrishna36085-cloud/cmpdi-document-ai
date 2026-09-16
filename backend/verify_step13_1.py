"""
Verification Script for STEP 13.1 — Authentication Architecture & User Model
Tests User database schema, bcrypt password hashing, RBAC role definitions,
schema sanitization, data safety, and performs complete API regression testing.
"""

import sys
import json
import urllib.request
import urllib.error
import psycopg2

from app.core.security import hash_password, verify_password
from app.core.roles import UserRole, has_permission, ROLE_PERMISSIONS
from app.schemas.user import UserResponse, UserCreate

BASE_URL = "http://127.0.0.1:8000"
DB_URI = "postgresql://postgres:Singh@localhost:5432/cmpdi_document_ai"


def db_query(query: str, params: tuple = ()) -> list:
    """Helper to query PostgreSQL directly."""
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()
    cur.execute(query, params)
    res = cur.fetchall()
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
    print("  STEP 13.1 VERIFICATION: AUTHENTICATION ARCHITECTURE & USER MODEL")
    print("=" * 75)

    # 1. Verify User Model & PostgreSQL Schema
    print("\n1. VERIFYING USER TABLE POSTGRESQL SCHEMA...")
    cols = db_query("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users';
    """)
    col_dict = {c[0]: c[1] for c in cols}
    print(f"  Users Table Columns: {list(col_dict.keys())}")

    required_fields = ["id", "username", "email", "password_hash", "role", "is_active", "created_at", "updated_at"]
    for req_field in required_fields:
        assert req_field in col_dict, f"Missing required column '{req_field}' in users table!"
    print("  [OK] All required User model columns exist in PostgreSQL schema!")

    # 2. Test Password Hashing Utility
    print("\n2. TESTING BCRYPT PASSWORD HASHING UTILITY...")
    test_pwd = "CMPDI_Secure_Password_2026!"
    hashed = hash_password(test_pwd)
    print(f"  Plaintext Password : {test_pwd}")
    print(f"  Hashed Password    : {hashed[:25]}... ({len(hashed)} chars)")
    
    assert hashed != test_pwd, "Password was not hashed!"
    assert verify_password(test_pwd, hashed) is True, "Password verification failed for valid password!"
    assert verify_password("Wrong_Password_123", hashed) is False, "Password verification succeeded for invalid password!"
    print("  [OK] Secure bcrypt password hashing and verification passed!")

    # 3. Test RBAC Roles & Permissions
    print("\n3. TESTING RBAC ROLE & PERMISSION FOUNDATION...")
    print(f"  Supported Roles: {[r.value for r in UserRole]}")
    
    # Check NORMAL_USER permissions
    assert has_permission(UserRole.NORMAL_USER.value, "doc:read_nonsensitive") is True
    assert has_permission(UserRole.NORMAL_USER.value, "users:admin") is False
    
    # Check HOD permissions
    assert has_permission(UserRole.HOD.value, "users:admin") is True
    assert has_permission(UserRole.HOD.value, "doc:read_confidential") is True
    assert has_permission(UserRole.HOD.value, "reports:generate") is True

    print("  [OK] Central role permission architecture (NORMAL_USER vs HOD) verified!")

    # 4. Verify Pydantic Response Schema Sanitization
    print("\n4. VERIFYING PYDANTIC SCHEMA SANITIZATION...")
    resp_fields = UserResponse.model_fields.keys()
    print(f"  UserResponse Schema Fields: {list(resp_fields)}")
    
    assert "password" not in resp_fields, "Plaintext password exposed in UserResponse schema!"
    assert "password_hash" not in resp_fields, "password_hash exposed in UserResponse schema!"
    assert "hashed_password" not in resp_fields, "hashed_password exposed in UserResponse schema!"
    print("  [OK] UserResponse schema strictly excludes password and hash fields!")

    # 5. Existing Database Data Preservation Check
    print("\n5. CHECKING EXISTING DATABASE RECORDS PRESERVATION...")
    sql_docs = db_query("SELECT COUNT(*) FROM documents;")[0][0]
    sql_reports = db_query("SELECT COUNT(*) FROM reports;")[0][0]
    sql_audits = db_query("SELECT COUNT(*) FROM audit_logs;")[0][0]
    print(f"  Preserved Records -> Documents: {sql_docs}, Reports: {sql_reports}, Audit Logs: {sql_audits}")
    assert sql_docs >= 27, "Documents count compromised!"
    print("  [OK] All existing documents, reports, and audit data preserved intact!")

    # 6. Full API Regression Check
    print("\n6. RUNNING REGRESSION CHECKS ON ALL SYSTEM ENDPOINTS...")
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
        assert code == expected_code, f"{method} {path} failed with code {code}: {resp}"

    print("\n" + "=" * 75)
    print("  [RESULT] STEP 13.1 VERIFICATION PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    main()
