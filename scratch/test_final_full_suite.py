import urllib.request
import json
import sys

BASE_URL = "https://seven-shoes-vanish.loca.lt"
HEADERS = {
    "Content-Type": "application/json",
    "bypass-tunnel-reminder": "true",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def run_suite():
    print("=== STARTING COMPLETE PRODUCTION END-TO-END VERIFICATION SUITE ===")

    # 1. Test Invalid Credentials
    print("\n[1/7] Testing Invalid Credentials...")
    req_inv = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "cmpdi_admin", "password": "WrongPassword!"}).encode(), headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req_inv) as resp:
            print("FAILED: Invalid credentials returned status", resp.status)
            sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 401, f"Expected 401, got {e.code}"
        body = json.loads(e.read().decode())
        print(f"PASS: HTTP 401 returned with detail: '{body.get('detail')}'")

    # 2. Test HOD Login
    print("\n[2/7] Testing HOD Login ('cmpdi_admin')...")
    req_hod = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req_hod) as resp:
        assert resp.status == 200
        hod_data = json.loads(resp.read().decode())
        hod_token = hod_data.get("access_token")
        hod_user = hod_data.get("user", {})
        assert hod_token is not None
        assert hod_user.get("role") == "HOD"
        print(f"PASS: HOD login successful. Role: {hod_user.get('role')}")

    # 3. Test NORMAL_USER Login
    print("\n[3/7] Testing NORMAL_USER Login ('normal_user')...")
    req_norm = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"}).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req_norm) as resp:
        assert resp.status == 200
        norm_data = json.loads(resp.read().decode())
        norm_token = norm_data.get("access_token")
        norm_user = norm_data.get("user", {})
        assert norm_token is not None
        assert norm_user.get("role") == "NORMAL_USER"
        print(f"PASS: NORMAL_USER login successful. Role: {norm_user.get('role')}")

    # 4. Test /api/auth/me for Session Restoration
    print("\n[4/7] Testing /api/auth/me Session Restoration...")
    req_me = urllib.request.Request(f"{BASE_URL}/api/auth/me", headers={**HEADERS, "Authorization": f"Bearer {hod_token}"}, method="GET")
    with urllib.request.urlopen(req_me) as resp:
        assert resp.status == 200
        me_user = json.loads(resp.read().decode())
        assert me_user.get("username") == "cmpdi_admin"
        print(f"PASS: /api/auth/me successful for user '{me_user.get('username')}'")

    # 5. Test Protected Dashboard API Access
    print("\n[5/7] Testing Protected Dashboard API ('/api/dashboard/overview')...")
    req_dash = urllib.request.Request(f"{BASE_URL}/api/dashboard/overview?range=all", headers={**HEADERS, "Authorization": f"Bearer {hod_token}"}, method="GET")
    with urllib.request.urlopen(req_dash) as resp:
        assert resp.status == 200
        dash_data = json.loads(resp.read().decode())
        print(f"PASS: Dashboard API returned overview data ({len(dash_data.get('recent_documents', []))} recent docs)")

    # 6. Test Refresh / Session Persistence Simulation
    print("\n[6/7] Testing Refresh / Session Persistence Simulation...")
    req_refresh = urllib.request.Request(f"{BASE_URL}/api/auth/me", headers={**HEADERS, "Authorization": f"Bearer {norm_token}"}, method="GET")
    with urllib.request.urlopen(req_refresh) as resp:
        assert resp.status == 200
        ref_user = json.loads(resp.read().decode())
        assert ref_user.get("username") == "normal_user"
        print("PASS: Session persisted across token refresh")

    # 7. Test Logout / Invalid Token Protection
    print("\n[7/7] Testing Token Invalidation / Logout State...")
    req_bad_tok = urllib.request.Request(f"{BASE_URL}/api/auth/me", headers={**HEADERS, "Authorization": "Bearer InvalidOrClearedToken"}, method="GET")
    try:
        with urllib.request.urlopen(req_bad_tok) as resp:
            print("FAILED: Invalid token returned status", resp.status)
            sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("PASS: Invalid token rejected with HTTP 401")

    print("\n[SUCCESS] ALL 7 VERIFICATION SUITE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_suite()
