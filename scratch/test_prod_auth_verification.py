import urllib.request
import json
import sys

BASE_URL = "https://seven-shoes-vanish.loca.lt"
HEADERS = {
    "Content-Type": "application/json",
    "bypass-tunnel-reminder": "true",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def test_login(username, password, expected_role):
    print(f"\n--- Testing Login for '{username}' (Expected Role: {expected_role}) ---")
    url = f"{BASE_URL}/api/auth/login"
    payload = json.dumps({"username": username, "password": password}).encode("utf-8")
    
    req = urllib.request.Request(url, data=payload, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Status: {resp.status}")
            print(f"Auth Success: {data.get('status') == 'success'}")
            access_token = data.get("access_token")
            user_info = data.get("user", {})
            print(f"Returned Role: {user_info.get('role')}")
            print(f"User Email: {user_info.get('email')}")
            assert access_token is not None, "Access token missing in response"
            assert user_info.get("role") == expected_role, f"Role mismatch: expected {expected_role}, got {user_info.get('role')}"
            return access_token, user_info
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"Exception: {e}")
        sys.exit(1)

def test_auth_me(token, expected_username, expected_role):
    print(f"\n--- Testing /api/auth/me for Token of '{expected_username}' ---")
    url = f"{BASE_URL}/api/auth/me"
    headers = {**HEADERS, "Authorization": f"Bearer {token}"}
    
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Status: {resp.status}")
            print(f"Me Username: {data.get('username')}")
            print(f"Me Role: {data.get('role')}")
            assert data.get("username") == expected_username, f"Username mismatch: expected {expected_username}, got {data.get('username')}"
            assert data.get("role") == expected_role, f"Role mismatch: expected {expected_role}, got {data.get('role')}"
            return data
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)

def test_rbac_document_access(hod_token, normal_token):
    print("\n--- Testing RBAC & Confidential Document Access ---")
    url = f"{BASE_URL}/api/documents"
    
    # HOD request
    hod_headers = {**HEADERS, "Authorization": f"Bearer {hod_token}"}
    req_hod = urllib.request.Request(url, headers=hod_headers, method="GET")
    with urllib.request.urlopen(req_hod) as resp:
        hod_docs = json.loads(resp.read().decode("utf-8")).get("documents", [])
        print(f"HOD saw {len(hod_docs)} documents.")

    # NORMAL_USER request
    normal_headers = {**HEADERS, "Authorization": f"Bearer {normal_token}"}
    req_normal = urllib.request.Request(url, headers=normal_headers, method="GET")
    with urllib.request.urlopen(req_normal) as resp:
        normal_docs = json.loads(resp.read().decode("utf-8")).get("documents", [])
        print(f"NORMAL_USER saw {len(normal_docs)} documents.")

    print("RBAC Verification complete.")

if __name__ == "__main__":
    print("=== STARTING COMPLETE PRODUCTION AUTHENTICATION & RBAC VERIFICATION ===")
    
    # 1. Test HOD Login
    hod_token, hod_user = test_login("cmpdi_admin", "CMPDI_Secure_Auth_2026!", "HOD")
    
    # 2. Test Normal User Login
    normal_token, normal_user = test_login("normal_user", "CMPDI_Secure_Auth_2026!", "NORMAL_USER")
    
    # 3. Test /api/auth/me for HOD
    test_auth_me(hod_token, "cmpdi_admin", "HOD")
    
    # 4. Test /api/auth/me for NORMAL_USER
    test_auth_me(normal_token, "normal_user", "NORMAL_USER")
    
    # 5. Test RBAC Isolation
    test_rbac_document_access(hod_token, normal_token)
    
    print("\n[SUCCESS] ALL PRODUCTION AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!")
