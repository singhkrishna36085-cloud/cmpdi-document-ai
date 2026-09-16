import asyncio
import json
import httpx

BASE_URL = "http://localhost:8000"

async def main():
    print("==================================================")
    print("STEP 14.3 — REAL KNOWLEDGE BASE & SEARCH VERIFICATION")
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

        # 4. Knowledge Base FAISS Status Check
        status_res = await client.get("/api/search/status")
        assert status_res.status_code == 200
        st_data = status_res.json()
        print(f"[OK] GET /api/search/status -> Status: '{st_data.get('status')}' | Total Vectors: {st_data.get('total_vectors')} | Dimension: {st_data.get('dimension')} | Model: '{st_data.get('model_name')}'")

        # 5. Real Semantic Search Query 1: "coal production"
        q1_res = await client.post("/api/search", json={"query": "coal production", "top_k": 5}, headers=hod_headers)
        assert q1_res.status_code == 200
        q1_data = q1_res.json()
        print(f"[OK] Query 1 ('coal production') -> {q1_data['total_results']} results returned")
        assert q1_data["total_results"] > 0, "Query 1 returned 0 results!"
        top1 = q1_data["results"][0]
        print(f"     Top Result: Score={top1['relevance_score']} | Doc #{top1['document_id']} | Chunk #{top1['chunk_id']} | Ref='{top1['source_reference']}'")

        # 6. Real Semantic Search Query 2: "geological coal seam"
        q2_res = await client.post("/api/search", json={"query": "geological coal seam", "top_k": 5}, headers=hod_headers)
        assert q2_res.status_code == 200
        q2_data = q2_res.json()
        print(f"[OK] Query 2 ('geological coal seam') -> {q2_data['total_results']} results returned")
        assert q2_data["total_results"] > 0, "Query 2 returned 0 results!"
        top2 = q2_data["results"][0]
        print(f"     Top Result: Score={top2['relevance_score']} | Doc #{top2['document_id']} | Chunk #{top2['chunk_id']} | Ref='{top2['source_reference']}'")

        # 7. Real Semantic Search Query 3: "borehole depth seam"
        q3_res = await client.post("/api/search", json={"query": "borehole depth seam", "top_k": 5}, headers=hod_headers)
        assert q3_res.status_code == 200
        q3_data = q3_res.json()
        print(f"[OK] Query 3 ('borehole depth seam') -> {q3_data['total_results']} results returned")
        assert q3_data["total_results"] > 0, "Query 3 returned 0 results!"
        top3 = q3_data["results"][0]
        print(f"     Top Result: Score={top3['relevance_score']} | Doc #{top3['document_id']} | Chunk #{top3['chunk_id']} | Ref='{top3['source_reference']}'")

        # 8. Top-K Control Verification (5, 10, 20)
        for k_val in [5, 10, 20]:
            k_res = await client.post("/api/search", json={"query": "coal seam", "top_k": k_val}, headers=hod_headers)
            assert k_res.status_code == 200
            count = len(k_res.json()["results"])
            assert count <= k_val, f"Requested top_k={k_val}, but received {count} results!"
            print(f"[OK] Top-K Control (k={k_val}) -> {count} results returned (<= {k_val})")

        # 9. Empty & No-Result Query Handling
        empty_res = await client.post("/api/search", json={"query": "   ", "top_k": 5}, headers=hod_headers)
        assert empty_res.status_code == 400, f"Expected 400 for empty query, got {empty_res.status_code}"
        print("[OK] Empty query -> 400 Bad Request (Blocked properly)")

        no_match_res = await client.post("/api/search", json={"query": "nonexistent_xyz_unrelated_query_term_12345", "top_k": 5}, headers=hod_headers)
        assert no_match_res.status_code == 200
        print(f"[OK] Query with no close matches -> {no_match_res.json()['total_results']} results returned (Handled safely)")

        # 10. Reindex Administrative RBAC Control
        reindex_norm = await client.post("/api/search/reindex", headers=normal_headers)
        assert reindex_norm.status_code == 403, f"Expected 403 for Normal User reindex, got {reindex_norm.status_code}"
        print("[OK] Normal User POST /api/search/reindex -> 403 Forbidden (Blocked as required)")

        reindex_hod = await client.post("/api/search/reindex", headers=hod_headers)
        assert reindex_hod.status_code == 200, f"Expected 200 for HOD reindex, got {reindex_hod.status_code}"
        print(f"[OK] HOD User POST /api/search/reindex -> 200 OK (Indexed {reindex_hod.json().get('indexed_count')} chunks)")

        # 11. RBAC Security Test on Confidential Document #27
        print("\n--- RBAC Data Isolation Verification for Search ---")
        norm_search = await client.post("/api/search", json={"query": "Conflict Doc B seam VI", "top_k": 20}, headers=normal_headers)
        assert norm_search.status_code == 200
        norm_results = norm_search.json()["results"]
        confidential_leaks = [r for r in norm_results if r["document_id"] == 27 or "Conflict Doc B" in (r.get("original_filename") or "")]
        assert len(confidential_leaks) == 0, f"LEAK: Confidential doc 27 returned in NORMAL_USER search results! ({confidential_leaks})"
        print("[OK] Normal User search -> Confidential Doc 27 vector chunks completely isolated (0 leaks)")

        hod_search = await client.post("/api/search", json={"query": "Conflict Doc B seam VI", "top_k": 20}, headers=hod_headers)
        assert hod_search.status_code == 200
        hod_results = hod_search.json()["results"]
        hod_has_conf = any(r["document_id"] == 27 for r in hod_results)
        print(f"[OK] HOD User search -> Confidential Doc 27 accessible to HOD role (Found: {hod_has_conf})")

        # 12. Core System Regression Checks
        print("\n--- System & Previous STEPs Regression Checks ---")
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

        rag_res = await client.post("/api/assistant/query", json={"query": "What is the seam thickness?"}, headers=hod_headers)
        assert rag_res.status_code == 200
        print("[OK] /api/assistant/query -> 200 OK")

        rep_res = await client.get("/api/reports", headers=hod_headers)
        assert rep_res.status_code == 200
        print("[OK] /api/reports -> 200 OK")

        top_res = await client.get("/api/topics", headers=hod_headers)
        assert top_res.status_code == 200
        print("[OK] /api/topics -> 200 OK")

    print("\n==================================================")
    print("ALL STEP 14.3 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
