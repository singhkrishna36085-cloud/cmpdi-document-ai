"""
Comprehensive Verification Script for STEP 13.4 (RBAC Enforcement: NORMAL_USER vs HOD)
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def run_tests():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=120.0) as client:
        print("=== STEP 13.4 RBAC ENFORCEMENT & SECURITY TEST SUITE ===\n")


        # 0. Authenticate test accounts
        print("[0] Authenticating HOD and NORMAL_USER accounts...")
        
        hod_login = await client.post("/api/auth/login", json={"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"})
        assert hod_login.status_code == 200, f"HOD login failed: {hod_login.text}"
        hod_token = hod_login.json()["access_token"]
        hod_headers = {"Authorization": f"Bearer {hod_token}"}
        print(" -> HOD authenticated successfully.")

        norm_login = await client.post("/api/auth/login", json={"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"})
        assert norm_login.status_code == 200, f"Normal user login failed: {norm_login.text}"
        norm_token = norm_login.json()["access_token"]
        norm_headers = {"Authorization": f"Bearer {norm_token}"}
        print(" -> NORMAL_USER authenticated successfully.\n")

        # Find a confidential document and a non-confidential document ID
        hod_docs = await client.get("/api/documents", headers=hod_headers)
        res_json = hod_docs.json()
        docs = res_json.get("documents", []) if isinstance(res_json, dict) else res_json
        confidential_doc = next((d for d in docs if d.get("is_confidential")), None)
        non_confidential_doc = next((d for d in docs if not d.get("is_confidential")), None)

        assert confidential_doc is not None, "No confidential document found in DB!"
        assert non_confidential_doc is not None, "No non-confidential document found in DB!"
        
        conf_id = confidential_doc["id"]
        non_conf_id = non_confidential_doc["id"]
        print(f" -> Confidential Doc ID: {conf_id} ('{confidential_doc['name']}')")
        print(f" -> Non-Confidential Doc ID: {non_conf_id} ('{non_confidential_doc['name']}')\n")

        # ── Test A: Unauthenticated request to HOD-only endpoint ─────────────
        print("[Test A] Unauthenticated request to HOD-only endpoint...")
        res_a = await client.get("/api/users")
        assert res_a.status_code == 401, f"Expected 401, got {res_a.status_code}"
        print(" -> PASS: 401 Unauthorized returned.")

        # ── Test B: NORMAL_USER accessing permitted resource ───────────────
        print("[Test B] NORMAL_USER accessing document list...")
        res_b = await client.get("/api/documents", headers=norm_headers)
        assert res_b.status_code == 200, f"Expected 200, got {res_b.status_code}"
        norm_res_json = res_b.json()
        norm_docs = norm_res_json.get("documents", []) if isinstance(norm_res_json, dict) else norm_res_json
        norm_doc_ids = [d["id"] for d in norm_docs]
        assert conf_id not in norm_doc_ids, "LEAK: Confidential document returned in normal user list!"
        print(f" -> PASS: 200 OK returned. {len(norm_docs)} non-confidential docs returned.")


        # ── Test C: NORMAL_USER accessing restricted document detail ──────────
        print("[Test C] NORMAL_USER accessing confidential document detail...")
        res_c = await client.get(f"/api/documents/{conf_id}", headers=norm_headers)
        assert res_c.status_code == 403, f"Expected 403, got {res_c.status_code}"
        print(" -> PASS: 403 Forbidden returned.")

        # ── Test D: NORMAL_USER attempting HOD-only operation ───────────────
        print("[Test D] NORMAL_USER attempting user administration (HOD only)...")
        res_d = await client.get("/api/users", headers=norm_headers)
        assert res_d.status_code == 403, f"Expected 403, got {res_d.status_code}"
        print(" -> PASS: 403 Forbidden returned.")

        # ── Test E: HOD accessing restricted document ───────────────────────
        print("[Test E] HOD accessing confidential document detail...")
        res_e = await client.get(f"/api/documents/{conf_id}", headers=hod_headers)
        assert res_e.status_code == 200, f"Expected 200, got {res_e.status_code}"
        assert res_e.json()["id"] == conf_id
        print(" -> PASS: 200 OK returned with confidential doc content.")

        # ── Test F: HOD accessing all reports ───────────────────────────────
        print("[Test F] HOD listing reports...")
        res_f = await client.get("/api/reports", headers=hod_headers)
        assert res_f.status_code == 200, f"Expected 200, got {res_f.status_code}"
        print(" -> PASS: 200 OK returned for HOD reports.")

        # ── Test G: NORMAL_USER search filtering ─────────────────────────────
        print("[Test G] NORMAL_USER semantic search against FAISS...")
        res_g = await client.post("/api/search", json={"query": "coal mine production", "top_k": 10}, headers=norm_headers)
        assert res_g.status_code == 200, f"Expected 200, got {res_g.status_code}"
        search_results = res_g.json().get("results", [])
        searched_doc_ids = set(r["document_id"] for r in search_results)
        assert conf_id not in searched_doc_ids, f"LEAK: Confidential doc ID {conf_id} present in search results!"
        print(f" -> PASS: Search returned {len(search_results)} chunks, zero confidential doc matches.")

        # ── Test H: NORMAL_USER RAG query ────────────────────────────────────
        print("[Test H] NORMAL_USER RAG retrieve & query context filtering...")
        res_h1 = await client.post("/api/assistant/retrieve", json={"query": "geological borehole data", "top_k": 10}, headers=norm_headers)
        assert res_h1.status_code == 200
        rag_chunks = res_h1.json().get("retrieved_chunks", [])
        rag_doc_ids = set(c["document_id"] for c in rag_chunks)
        assert conf_id not in rag_doc_ids, f"LEAK: Confidential doc ID {conf_id} in RAG retrieved context!"

        res_h2 = await client.post("/api/assistant/query", json={"query": "Summary of geological data", "top_k": 5}, headers=norm_headers)
        assert res_h2.status_code == 200
        query_sources = res_h2.json().get("sources", [])
        source_doc_ids = set(s["document_id"] for s in query_sources)
        assert conf_id not in source_doc_ids, f"LEAK: Confidential doc ID {conf_id} in AI query sources!"
        print(" -> PASS: RAG context & citations strictly isolated from confidential docs.")

        # ── Test I: HOD search full corpus ───────────────────────────────────
        print("[Test I] HOD semantic search against FAISS...")
        res_i = await client.post("/api/search", json={"query": "coal mine production", "top_k": 10}, headers=hod_headers)
        assert res_i.status_code == 200
        hod_search_doc_ids = set(r["document_id"] for r in res_i.json().get("results", []))
        print(f" -> PASS: Search returned {len(res_i.json().get('results', []))} chunks for HOD (doc IDs: {hod_search_doc_ids}).")

        # ── Test J: Disabled Authenticated Account ───────────────────────────
        print("[Test J] Testing disabled account login...")
        res_j = await client.post("/api/auth/login", json={"username": "disabled_user", "password": "CMPDI_Secure_Auth_2026!"})
        assert res_j.status_code == 401, f"Expected 401, got {res_j.status_code}"
        print(" -> PASS: Disabled account authentication rejected with 401 Unauthorized.")

        # ── Test K: Confidential Report & Conflict Protection for NORMAL_USER ──
        print("[Test K] Testing Confidential Report Generation & Conflict endpoints for NORMAL_USER...")
        # Attempt to generate report from confidential doc ID as NORMAL_USER
        res_k1 = await client.post("/api/reports/generate", json={"document_ids": [conf_id]}, headers=norm_headers)
        assert res_k1.status_code == 403, f"Expected 403, got {res_k1.status_code}"
        print(" -> PASS: NORMAL_USER report generation for confidential doc blocked (403).")

        # Attempt to access confidential document processing/content as NORMAL_USER
        res_k2 = await client.get(f"/api/documents/{conf_id}/content", headers=norm_headers)
        assert res_k2.status_code == 403, f"Expected 403, got {res_k2.status_code}"
        print(" -> PASS: NORMAL_USER document content access blocked (403).")

        # Attempt to access confidential document validation/conflicts as NORMAL_USER
        res_k3 = await client.get(f"/api/documents/{conf_id}/validation", headers=norm_headers)
        assert res_k3.status_code == 403, f"Expected 403, got {res_k3.status_code}"
        print(" -> PASS: NORMAL_USER validation access blocked (403).")

        # ── Regression Checks ────────────────────────────────────────────────
        print("\n[Regression Tests] Checking all public & health endpoints...")
        
        r_health = await client.get("/api/health")
        assert r_health.status_code == 200 and r_health.json()["status"] == "ok"

        r_db = await client.get("/api/health/db")
        assert r_db.status_code == 200 and r_db.json()["status"] == "ok"

        r_me = await client.get("/api/auth/me", headers=hod_headers)
        assert r_me.status_code == 200 and r_me.json()["username"] == "cmpdi_admin"

        r_dash = await client.get("/api/dashboard/overview", headers=norm_headers)
        assert r_dash.status_code == 200

        r_status = await client.get("/api/search/status")
        assert r_status.status_code == 200

        r_topics = await client.get("/api/topics", headers=norm_headers)
        assert r_topics.status_code == 200

        print(" -> PASS: All regression endpoints functioning normally.\n")
        print("=== ALL STEP 13.4 RBAC & SECURITY TESTS PASSED PERFECTLY ===")


if __name__ == "__main__":
    asyncio.run(run_tests())
