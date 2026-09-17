import urllib.request
import json
import re

def run_browser_verification():
    print("=== TESTING REAL PROD BROWSER ENDPOINTS ON VERCEL DEPLOYMENT ===")

    # 1. Fetch login HTML from Vercel
    login_url = "https://sih-26023-flame.vercel.app/login"
    req = urllib.request.Request(login_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8")
        js_files = re.findall(r'src="([^"]+\.js)"', html)

    # 2. Inspect deployed chunk for API URL
    api_url = None
    for js_file in js_files:
        js_url = f"https://sih-26023-flame.vercel.app{js_file}" if js_file.startswith("/") else js_file
        with urllib.request.urlopen(urllib.request.Request(js_url, headers={"User-Agent": "Mozilla/5.0"})) as js_resp:
            js_text = js_resp.read().decode("utf-8")
            if "loca.lt" in js_text:
                m = re.search(r'https://[a-zA-Z0-9\.\-]+\.loca\.lt', js_text)
                if m:
                    api_url = m.group(0)
                    print(f"1. Discovered inlined NEXT_PUBLIC_API_URL in chunk {js_file}: {api_url}")
                    break

    assert api_url is not None, "API URL not found in Vercel bundle"

    # 3. Test POST /api/auth/login as executed by client JS in AuthContext.tsx
    print("\n2. Executing browser POST /api/auth/login call...")
    login_endpoint = f"{api_url}/api/auth/login"
    login_headers = {
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    login_payload = json.dumps({"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}).encode("utf-8")
    login_req = urllib.request.Request(login_endpoint, data=login_payload, headers=login_headers, method="POST")

    with urllib.request.urlopen(login_req) as login_resp:
        print(f"   HTTP Status: {login_resp.status}")
        data = json.loads(login_resp.read().decode("utf-8"))
        print("   Response Type: JSON")
        print(f"   Access Token Received: {bool(data.get('access_token'))}")
        token = data.get("access_token")

    # 4. Test GET /api/auth/me as executed immediately after login in AuthContext.tsx
    print("\n3. Executing browser GET /api/auth/me call...")
    me_endpoint = f"{api_url}/api/auth/me"
    me_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    me_req = urllib.request.Request(me_endpoint, headers=me_headers, method="GET")
    with urllib.request.urlopen(me_req) as me_resp:
        print(f"   HTTP Status: {me_resp.status}")
        user_data = json.loads(me_resp.read().decode("utf-8"))
        print(f"   Profile Received: username={user_data.get('username')}, role={user_data.get('role')}")

    print("\n[REAL BROWSER DEPLOYED FLOW VERIFICATION COMPLETED SUCCESSFULLY!]")

if __name__ == "__main__":
    run_browser_verification()
