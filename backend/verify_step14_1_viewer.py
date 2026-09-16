import asyncio
import json
import httpx

BASE_URL = "http://localhost:8000"

async def main():
    print("==================================================")
    print("STEP 14.1 — REAL DOCUMENT VIEWER VERIFICATION")
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
        assert login_res.status_code == 200, "HOD Login failed"
        hod_token = login_res.json()["access_token"]
        hod_headers = {"Authorization": f"Bearer {hod_token}"}
        print("[OK] HOD login successful")

        # 3. Login Normal User
        login_normal = await client.post("/api/auth/login", json={"username": "normal_user", "password": "CMPDI_Secure_Auth_2026!"})
        assert login_normal.status_code == 200, "Normal user Login failed"
        normal_token = login_normal.json()["access_token"]
        normal_headers = {"Authorization": f"Bearer {normal_token}"}
        print("[OK] Normal user login successful")

        # 4. List Documents
        docs_res = await client.get("/api/documents", headers=hod_headers)
        assert docs_res.status_code == 200
        docs = docs_res.json()["documents"]
        print(f"[OK] GET /api/documents -> {len(docs)} documents returned for HOD")

        # Find test documents in DB
        doc_27 = next((d for d in docs if d["id"] == 27), None)
        doc_11 = next((d for d in docs if d["id"] == 11), None)
        doc_12 = next((d for d in docs if d["id"] == 12), docs[0] if docs else None)

        target_doc_id = 11 if doc_11 else (docs[0]["id"] if docs else 1)
        print(f"\n--- Testing Document Viewer Endpoints on Real Doc ID #{target_doc_id} ---")

        # 5. Document Metadata
        d_res = await client.get(f"/api/documents/{target_doc_id}", headers=hod_headers)
        assert d_res.status_code == 200
        d_data = d_res.json()
        print(f"[OK] Metadata: ID #{d_data['id']} | Name: '{d_data['name']}' | File: '{d_data['original_filename']}' | Status: {d_data['processing_status']}")

        # 6. Document Content & Chunks
        c_res = await client.get(f"/api/documents/{target_doc_id}/content", headers=hod_headers)
        assert c_res.status_code == 200
        c_data = c_res.json()
        chunks = c_data["chunks"]
        print(f"[OK] Content: {len(chunks)} chunks fetched | Text Preview: '{(c_data.get('extracted_text') or '')[:60]}...'")

        # 7. Dedicated Chunks Endpoint
        chk_res = await client.get(f"/api/documents/{target_doc_id}/chunks", headers=hod_headers)
        assert chk_res.status_code == 200
        chk_data = chk_res.json()
        print(f"[OK] GET /api/documents/{target_doc_id}/chunks -> {chk_data['total_chunks']} chunks returned")
        if chk_data["chunks"]:
            sample = chk_data["chunks"][0]
            print(f"   Sample Chunk #{sample['id']}: page={sample.get('page_number')}, sheet={sample.get('sheet_name')}, ref='{sample.get('source_reference')}'")

        # 8. Structured Extractions Endpoint
        s_res = await client.get(f"/api/documents/{target_doc_id}/structured", headers=hod_headers)
        assert s_res.status_code == 200
        s_data = s_res.json()
        print(f"[OK] GET /api/documents/{target_doc_id}/structured -> {s_data['total_structured_records']} records returned")
        if s_data["structured_data"]:
            sample_s = s_data["structured_data"][0]
            print(f"   Sample Extraction #{sample_s['id']}: type='{sample_s['entity_type']}', ref='{sample_s.get('source_reference')}'")

        # 9. Validation Results Endpoint
        v_res = await client.get(f"/api/documents/{target_doc_id}/validation", headers=hod_headers)
        assert v_res.status_code == 200
        v_data = v_res.json()
        print(f"[OK] GET /api/documents/{target_doc_id}/validation -> {v_data['total_issues']} issues returned")

        # 10. Conflicts Endpoint
        cf_res = await client.get(f"/api/documents/{target_doc_id}/conflicts", headers=hod_headers)
        assert cf_res.status_code == 200
        cf_data = cf_res.json()
        print(f"[OK] GET /api/documents/{target_doc_id}/conflicts -> {cf_data['total_conflicts']} conflicts returned")

        # 11. Dedicated Processing Pipeline Endpoint
        p_res = await client.get(f"/api/documents/{target_doc_id}/processing", headers=hod_headers)
        assert p_res.status_code == 200
        p_data = p_res.json()
        print(f"[OK] GET /api/documents/{target_doc_id}/processing -> Status: '{p_data['overall_status']}', Stages: {len(p_data['stages'])}")
        for st in p_data["stages"]:
            print(f"   Stage {st['stage_id']}: {st['name']} -> {st['status']} ({st['details']})")

        # 12. RBAC Verification on Confidential Document #27
        if doc_27 or any(d.get("is_confidential") for d in docs):
          conf_id = 27 if doc_27 else [d["id"] for d in docs if d.get("is_confidential")][0]
          print(f"\n--- RBAC Test on Confidential Document #{conf_id} ---")

          # Normal user attempt -> MUST be 403 Forbidden
          norm_meta = await client.get(f"/api/documents/{conf_id}", headers=normal_headers)
          assert norm_meta.status_code == 403, f"Expected 403 for Normal User metadata, got {norm_meta.status_code}"
          print(f"[OK] Normal User GET /api/documents/{conf_id} -> 403 Forbidden (Blocked as required)")

          norm_content = await client.get(f"/api/documents/{conf_id}/content", headers=normal_headers)
          assert norm_content.status_code == 403, f"Expected 403 for Normal User content, got {norm_content.status_code}"
          print(f"[OK] Normal User GET /api/documents/{conf_id}/content -> 403 Forbidden (Blocked as required)")

          norm_chunks = await client.get(f"/api/documents/{conf_id}/chunks", headers=normal_headers)
          assert norm_chunks.status_code == 403, f"Expected 403 for Normal User chunks, got {norm_chunks.status_code}"
          print(f"[OK] Normal User GET /api/documents/{conf_id}/chunks -> 403 Forbidden (Blocked as required)")

          norm_proc = await client.get(f"/api/documents/{conf_id}/processing", headers=normal_headers)
          assert norm_proc.status_code == 403, f"Expected 403 for Normal User processing, got {norm_proc.status_code}"
          print(f"[OK] Normal User GET /api/documents/{conf_id}/processing -> 403 Forbidden (Blocked as required)")

          # HOD attempt -> MUST be 200 OK
          hod_meta = await client.get(f"/api/documents/{conf_id}", headers=hod_headers)
          assert hod_meta.status_code == 200, f"Expected 200 for HOD metadata, got {hod_meta.status_code}"
          print(f"[OK] HOD User GET /api/documents/{conf_id} -> 200 OK (Permitted as required)")

        # 13. Core System Regression Checks
        print("\n--- System Regression Checks ---")
        assert (await client.get("/api/auth/me", headers=hod_headers)).status_code == 200
        print("[OK] /api/auth/me -> 200 OK")

        assert (await client.get("/api/dashboard/overview", headers=hod_headers)).status_code == 200
        print("[OK] /api/dashboard/overview -> 200 OK")

        assert (await client.get("/api/search/status", headers=hod_headers)).status_code == 200
        print("[OK] /api/search/status -> 200 OK")

        srch_res = await client.post("/api/search", json={"query": "coal production"}, headers=hod_headers)
        assert srch_res.status_code == 200
        print(f"[OK] /api/search -> 200 OK ({len(srch_res.json()['results'])} search results)")

        rag_res = await client.post("/api/assistant/query", json={"query": "What is the coal seam thickness?"}, headers=hod_headers)
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
    print("ALL STEP 14.1 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
