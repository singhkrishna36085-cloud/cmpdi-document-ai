import asyncio
import json
import httpx

BASE_URL = "http://localhost:8000"

async def main():
    print("==================================================")
    print("STEP 14.2 — REAL DOCUMENT PROCESSING CENTER VERIFICATION")
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

        # 4. List Documents Processing Queue
        docs_res = await client.get("/api/documents", headers=hod_headers)
        assert docs_res.status_code == 200
        docs = docs_res.json()["documents"]
        print(f"[OK] GET /api/documents -> {len(docs)} document processing records returned for HOD")

        # Select test document
        doc_27 = next((d for d in docs if d["id"] == 27), None)
        doc_11 = next((d for d in docs if d["id"] == 11), None)
        target_doc_id = 11 if doc_11 else (docs[0]["id"] if docs else 1)

        print(f"\n--- Testing Processing Center Endpoints on Real Doc ID #{target_doc_id} ---")

        # 5. Document Processing Details
        p_res = await client.get(f"/api/documents/{target_doc_id}/processing", headers=hod_headers)
        assert p_res.status_code == 200
        p_data = p_res.json()
        print(f"[OK] Processing Details: Overall Status='{p_data['overall_status']}' | Chunks={p_data['chunks_count']} | Structured Records={p_data['structured_records_count']}")
        print(f"     Stages Breakdown ({len(p_data['stages'])} stages):")
        for st in p_data["stages"]:
            print(f"       Stage {st['stage_id']}: {st['name']} -> status='{st['status']}' ({st['details']})")

        # 6. Content & Chunks Traceability
        c_res = await client.get(f"/api/documents/{target_doc_id}/chunks", headers=hod_headers)
        assert c_res.status_code == 200
        c_data = c_res.json()
        print(f"[OK] Chunks Traceability: {c_data['total_chunks']} chunks returned")
        if c_data["chunks"]:
            sample_c = c_data["chunks"][0]
            print(f"     Sample Chunk #{sample_c['id']}: page={sample_c.get('page_number')}, sheet={sample_c.get('sheet_name')}, ref='{sample_c.get('source_reference')}'")

        # 7. Structured Data Traceability
        s_res = await client.get(f"/api/documents/{target_doc_id}/structured", headers=hod_headers)
        assert s_res.status_code == 200
        s_data = s_res.json()
        print(f"[OK] Structured Traceability: {s_data['total_structured_records']} extractions returned")

        # 8. Validation & Conflicts
        v_res = await client.get(f"/api/documents/{target_doc_id}/validation", headers=hod_headers)
        assert v_res.status_code == 200
        v_data = v_res.json()
        print(f"[OK] Validation Findings: {v_data['total_issues']} issues returned")

        cf_res = await client.get(f"/api/documents/{target_doc_id}/conflicts", headers=hod_headers)
        assert cf_res.status_code == 200
        cf_data = cf_res.json()
        print(f"[OK] Cross-Document Conflicts: {cf_data['total_conflicts']} conflicts returned")

        # 9. Audit Logs / Processing History
        a_res = await client.get("/api/audit", headers=hod_headers)
        assert a_res.status_code == 200
        a_data = a_res.json()
        print(f"[OK] System Audit History: {a_data['total_logs']} audit event logs returned for role {a_data['user_role']}")

        # 10. RBAC Security Test on Confidential Document #27
        if doc_27 or any(d.get("is_confidential") for d in docs):
            conf_id = 27 if doc_27 else [d["id"] for d in docs if d.get("is_confidential")][0]
            print(f"\n--- RBAC Security Verification on Confidential Document #{conf_id} ---")

            # Normal User attempt -> MUST return 403 Forbidden
            norm_proc = await client.get(f"/api/documents/{conf_id}/processing", headers=normal_headers)
            assert norm_proc.status_code == 403, f"Expected 403, got {norm_proc.status_code}"
            print(f"[OK] Normal User GET /api/documents/{conf_id}/processing -> 403 Forbidden (Blocked as required)")

            norm_chk = await client.get(f"/api/documents/{conf_id}/chunks", headers=normal_headers)
            assert norm_chk.status_code == 403, f"Expected 403, got {norm_chk.status_code}"
            print(f"[OK] Normal User GET /api/documents/{conf_id}/chunks -> 403 Forbidden (Blocked as required)")

            # HOD User attempt -> MUST return 200 OK
            hod_proc = await client.get(f"/api/documents/{conf_id}/processing", headers=hod_headers)
            assert hod_proc.status_code == 200, f"Expected 200, got {hod_proc.status_code}"
            print(f"[OK] HOD User GET /api/documents/{conf_id}/processing -> 200 OK (Permitted as required)")

        # 11. Core System Regression Checks
        print("\n--- System Regression & STEP 14.1 Checks ---")
        assert (await client.get("/api/auth/me", headers=hod_headers)).status_code == 200
        print("[OK] /api/auth/me -> 200 OK")

        assert (await client.get("/api/dashboard/overview", headers=hod_headers)).status_code == 200
        print("[OK] /api/dashboard/overview -> 200 OK")

        assert (await client.get("/api/search/status", headers=hod_headers)).status_code == 200
        print("[OK] /api/search/status -> 200 OK")

        srch_res = await client.post("/api/search", json={"query": "coal seam thickness"}, headers=hod_headers)
        assert srch_res.status_code == 200
        print(f"[OK] /api/search -> 200 OK ({len(srch_res.json()['results'])} search results)")

        rag_res = await client.post("/api/assistant/query", json={"query": "summarize boreholes"}, headers=hod_headers)
        assert rag_res.status_code == 200
        print("[OK] /api/assistant/query -> 200 OK")

        rep_res = await client.get("/api/reports", headers=hod_headers)
        assert rep_res.status_code == 200
        print("[OK] /api/reports -> 200 OK")

        top_res = await client.get("/api/topics", headers=hod_headers)
        assert top_res.status_code == 200
        print("[OK] /api/topics -> 200 OK")

        conf_res = await client.get("/api/conflicts", headers=hod_headers)
        assert conf_res.status_code == 200
        print("[OK] /api/conflicts -> 200 OK")

    print("\n==================================================")
    print("ALL STEP 14.2 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
