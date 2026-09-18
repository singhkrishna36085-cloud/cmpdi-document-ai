import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def verify():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Root index
        print("\n--- 1. Testing GET / ---")
        res = await client.get("/")
        print(f"Status: {res.status_code}, Body: {res.json()}")
        assert res.status_code == 200

        # 2. Health check
        print("\n--- 2. Testing GET /api/health/ready ---")
        res = await client.get("/api/health/ready")
        print(f"Status: {res.status_code}, Body: {res.json()}")
        assert res.status_code == 200

        # 3. Dynamic CORS on arbitrary Vercel preview domain
        print("\n--- 3. Testing CORS for Vercel preview domain ---")
        res = await client.options(
            "/api/health",
            headers={
                "Origin": "https://cmpdi-frontend-preview-7x9q.vercel.app",
                "Access-Control-Request-Method": "GET"
            }
        )
        print(f"OPTIONS Status: {res.status_code}")
        print(f"Access-Control-Allow-Origin: {res.headers.get('access-control-allow-origin')}")
        assert res.headers.get("access-control-allow-origin") == "https://cmpdi-frontend-preview-7x9q.vercel.app"

        # 4. Auth Login
        print("\n--- 4. Testing POST /api/auth/login (Admin) ---")
        res = await client.post(
            "/api/auth/login",
            json={"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}
        )
        print(f"Status: {res.status_code}")
        data = res.json()
        token = data.get("access_token")
        print(f"Login success: {data.get('status')}, Role: {data.get('user', {}).get('role')}")
        assert token is not None

        # 5. Documents list with Auth
        print("\n--- 5. Testing GET /api/documents ---")
        res = await client.get("/api/documents", headers={"Authorization": f"Bearer {token}"})
        print(f"Status: {res.status_code}, Document count: {len(res.json().get('documents', []))}")
        assert res.status_code == 200

        # 6. AI Assistant Query
        print("\n--- 6. Testing POST /api/assistant/query (General query) ---")
        res = await client.post(
            "/api/assistant/query",
            headers={"Authorization": f"Bearer {token}"},
            json={"query": "What is CMPDI?", "conversation_history": []}
        )
        print(f"Status: {res.status_code}")
        ai_data = res.json()
        print(f"Provider: {ai_data.get('provider')}, Model: {ai_data.get('model')}")
        print(f"Answer snippet: {str(ai_data.get('answer'))[:120]}...")
        assert res.status_code == 200

    print("\n==========================================")
    print("ALL PRODUCTION BACKEND API CHECKS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(verify())
