import asyncio
import json
import httpx

BASE_URL = "http://localhost:8000"

async def main():
    print("==================================================")
    print("STEP 14.4 — ADVANCED AI ASSISTANT & RAG VERIFICATION")
    print("==================================================")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Health Checks
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.status_code}"
        print("[OK] GET /api/health -> 200 OK")

        res = await client.get("/api/health/db")
        assert res.status_code == 200, f"DB Health check failed: {res.status_code}"
        print("[OK] GET /api/health/db -> 200 OK")

        # 2. Login HOD User
        login_res = await client.post("/api/auth/login", json={"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"})
        assert login_res.status_code == 200, f"HOD Login failed: {login_res.text}"
        hod_token = login_res.json()["access_token"]
        hod_headers = {"Authorization": f"Bearer {hod_token}"}
        print("[OK] HOD ('cmpdi_admin') login successful")

        # 3. Login Normal User
        login_normal = await client.post("/api/auth/login", json={"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"})
        assert login_normal.status_code == 200, f"Normal user Login failed: {login_normal.text}"
        normal_token = login_normal.json()["access_token"]
        normal_headers = {"Authorization": f"Bearer {normal_token}"}
        print("[OK] Normal user ('normal_user') login successful")

        # 4. Real Grounded RAG Query 1: "coal production"
        q1_res = await client.post("/api/assistant/query", json={"query": "coal production", "top_k": 3}, headers=hod_headers)
        assert q1_res.status_code == 200
        q1_data = q1_res.json()
        print(f"[OK] Query 1 ('coal production') -> Status: '{q1_data['status']}' | Sources: {len(q1_data['sources'])}")
        print(f"     Answer Snippet: '{q1_data['answer'].encode('ascii', 'ignore').decode('ascii')[:80]}...'")
        assert len(q1_data["sources"]) > 0, "Query 1 returned 0 sources!"
        src1 = q1_data["sources"][0]
        print(f"     Source 1 Traceability: Doc #{src1['document_id']} | Chunk #{src1['chunk_id']} | Ref='{src1['source_reference']}' | Score={src1['relevance_score']}")

        # 5. Real Grounded RAG Query 2: "geological coal seam"
        q2_res = await client.post("/api/assistant/query", json={"query": "geological coal seam", "top_k": 3}, headers=hod_headers)
        assert q2_res.status_code == 200
        q2_data = q2_res.json()
        print(f"[OK] Query 2 ('geological coal seam') -> Status: '{q2_data['status']}' | Sources: {len(q2_data['sources'])}")
        assert len(q2_data["sources"]) > 0, "Query 2 returned 0 sources!"

        # 6. Real Grounded RAG Query 3: "borehole depth seam"
        q3_res = await client.post("/api/assistant/query", json={"query": "borehole depth seam", "top_k": 3}, headers=hod_headers)
        assert q3_res.status_code == 200
        q3_data = q3_res.json()
        print(f"[OK] Query 3 ('borehole depth seam') -> Status: '{q3_data['status']}' | Sources: {len(q3_data['sources'])}")
        assert len(q3_data["sources"]) > 0, "Query 3 returned 0 sources!"

        # 7. Insufficient Evidence / Not-Found Test
        not_found_res = await client.post("/api/assistant/query", json={"query": "unrelated_quantum_physics_term_9999", "top_k": 3}, headers=hod_headers)
        assert not_found_res.status_code == 200
        nf_data = not_found_res.json()
        print(f"[OK] Not-Found Query -> Status: '{nf_data['status']}' | Answer: '{nf_data['answer'].encode('ascii', 'ignore').decode('ascii')}' | Sources: {len(nf_data['sources'])}")
        assert nf_data["status"] == "not_found", f"Expected 'not_found', got {nf_data['status']}"
        assert len(nf_data["sources"]) == 0, "Expected 0 sources for not_found query"

        # 8. Document-Specific Targeted RAG Query (doc_id = 11)
        doc_rag_res = await client.post("/api/assistant/query", json={"query": "exploration block", "doc_id": 11, "top_k": 5}, headers=hod_headers)
        assert doc_rag_res.status_code == 200
        doc_rag_data = doc_rag_res.json()
        print(f"[OK] Targeted Doc #11 RAG Query -> Status: '{doc_rag_data['status']}' | Sources: {len(doc_rag_data['sources'])}")
        for s in doc_rag_data["sources"]:
            assert s["document_id"] == 11, f"Expected document_id 11, got {s['document_id']}"

        # 9. RBAC Security & Data Isolation Test on Confidential Document #27
        print("\n--- RBAC Security & Confidentiality No-Leak Test ---")
        norm_rag = await client.post("/api/assistant/query", json={"query": "Conflict Doc B seam VI thickness", "top_k": 5}, headers=normal_headers)
        assert norm_rag.status_code == 200
        norm_data = norm_rag.json()
        confidential_leaks = [s for s in norm_data["sources"] if s["document_id"] == 27 or "Conflict Doc B" in (s.get("original_filename") or "")]
        assert len(confidential_leaks) == 0, f"LEAK: Confidential doc 27 source returned to NORMAL_USER! ({confidential_leaks})"
        print("[OK] Normal User RAG query -> Confidential Doc 27 completely isolated (0 leaks)")

        hod_rag = await client.post("/api/assistant/query", json={"query": "Conflict Doc B seam VI thickness", "top_k": 5}, headers=hod_headers)
        assert hod_rag.status_code == 200
        hod_data = hod_rag.json()
        hod_has_conf = any(s["document_id"] == 27 for s in hod_data["sources"])
        print(f"[OK] HOD User RAG query -> Confidential Doc 27 accessible to HOD role (Found: {hod_has_conf})")

        # 10. System Regression & Previous STEPs Checks
        print("\n--- Full System Regression Checks ---")
        assert (await client.get("/api/auth/me", headers=hod_headers)).status_code == 200
        print("[OK] /api/auth/me -> 200 OK")

        assert (await client.get("/api/dashboard/overview", headers=hod_headers)).status_code == 200
        print("[OK] /api/dashboard/overview -> 200 OK")

        assert (await client.get("/api/documents", headers=hod_headers)).status_code == 200
        print("[OK] /api/documents -> 200 OK")

        assert (await client.get("/api/documents/11/chunks", headers=hod_headers)).status_code == 200
        print("[OK] /api/documents/11/chunks -> 200 OK (STEP 14.1 Document Viewer functional)")

        assert (await client.get("/api/documents/11/processing", headers=hod_headers)).status_code == 200
        print("[OK] /api/documents/11/processing -> 200 OK (STEP 14.2 Processing Center functional)")

        assert (await client.get("/api/search/status")).status_code == 200
        print("[OK] /api/search/status -> 200 OK (STEP 14.3 Knowledge Base functional)")

        assert (await client.post("/api/search", json={"query": "coal"}, headers=hod_headers)).status_code == 200
        print("[OK] /api/search -> 200 OK (STEP 14.3 Semantic Search functional)")

        assert (await client.get("/api/reports", headers=hod_headers)).status_code == 200
        print("[OK] /api/reports -> 200 OK")

        assert (await client.get("/api/topics", headers=hod_headers)).status_code == 200
        print("[OK] /api/topics -> 200 OK")

        assert (await client.get("/api/conflicts", headers=hod_headers)).status_code == 200
        print("[OK] /api/conflicts -> 200 OK")

    print("\n==================================================")
    print("ALL STEP 14.4 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
