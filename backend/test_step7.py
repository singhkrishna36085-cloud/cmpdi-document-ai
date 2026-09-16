"""
STEP 7 Verification & End-to-End Test Script
Starts real Uvicorn server, creates test documents covering valid data, missing/invalid fields,
inconsistent math, and cross-document conflicts.
Verifies PostgreSQL persistence, source traceability, preservation of original values, and APIs.
"""

import os
import sys
import time
import subprocess
import json
import pandas as pd
import httpx

BASE_URL = "http://127.0.0.1:8000"
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_files")
os.makedirs(TEST_DIR, exist_ok=True)


def create_valid_xlsx():
    path = os.path.join(TEST_DIR, "step7_valid_prod.xlsx")
    df = pd.DataFrame({
        "Mine_Name": ["Magadh OCP"],
        "Target_MT": [10.0],
        "Actual_MT": [9.8],
        "Achievement_Pct": [98.0]
    })
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Production_Summary", index=False)
    return path


def create_invalid_format_csv():
    path = os.path.join(TEST_DIR, "step7_invalid_format.csv")
    # Non-numeric format in Target_MT ("12.5abc") and missing required field Total_Depth_m in row 2
    df = pd.DataFrame({
        "Mine_Name": ["Amrapali OCP", "Ashoka OCP"],
        "Target_MT": ["12.5abc", "8.5"],
        "Actual_MT": ["13.1", "8.7"],
        "Achievement_Pct": ["104.80", "102.35"]
    })
    df.to_csv(path, index=False)
    return path


def create_logical_math_error_xlsx():
    path = os.path.join(TEST_DIR, "step7_math_error.xlsx")
    # Math error: Actual=5.0, Target=10.0 (expected 50%), but reported Achievement_Pct=150.0%
    df = pd.DataFrame({
        "Mine_Name": ["Piparwar OCP"],
        "Target_MT": [10.0],
        "Actual_MT": [5.0],
        "Achievement_Pct": [150.0]
    })
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Production_Summary", index=False)
    return path


def create_conflict_doc_a():
    path = os.path.join(TEST_DIR, "step7_conflict_doc_a.csv")
    df = pd.DataFrame({
        "Mine_Name": ["Conflict Mine Alpha"],
        "Target_MT": [12.5],
        "Actual_MT": [13.1],
        "Achievement_Pct": [104.8]
    })
    df.to_csv(path, index=False)
    return path


def create_conflict_doc_b():
    path = os.path.join(TEST_DIR, "step7_conflict_doc_b.csv")
    # Conflicting Target_MT value (25.0 MT vs 12.5 MT in Doc A)
    df = pd.DataFrame({
        "Mine_Name": ["Conflict Mine Alpha"],
        "Target_MT": [25.0],
        "Actual_MT": [13.1],
        "Achievement_Pct": [104.8]
    })
    df.to_csv(path, index=False)
    return path


def run_tests():
    print("=== STARTING REAL UVICORN BACKEND PROCESS FOR STEP 7 TEST ===", flush=True)
    
    python_bin = sys.executable
    server_proc = subprocess.Popen(
        [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    time.sleep(3)
    
    try:
        with httpx.Client(base_url=BASE_URL, timeout=60.0) as client:
            # 1. Health checks
            r = client.get("/api/health")
            assert r.status_code == 200, f"Health failed: {r.text}"
            print("[PASS] GET /api/health:", r.json(), flush=True)
            
            r_db = client.get("/api/health/db")
            assert r_db.status_code == 200, f"DB Health failed: {r_db.text}"
            print("[PASS] GET /api/health/db:", r_db.json(), flush=True)
            
            # 2. Test 1: Valid Record
            print("\n--- Test 1: Valid Structured Record ---", flush=True)
            valid_path = create_valid_xlsx()
            with open(valid_path, "rb") as f:
                res1 = client.post(
                    "/api/documents/upload",
                    files={"file": (os.path.basename(valid_path), f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                    data={"name": "Valid Prod Report", "type": "xlsx", "source": "Test", "category": "Prod", "date": "2026-09-16"}
                )
            assert res1.status_code == 201
            doc1_id = res1.json()["document"]["id"]
            
            # Validate
            val1_res = client.post(f"/api/documents/{doc1_id}/validate")
            assert val1_res.status_code == 200
            val1_data = val1_res.json()
            print(f"[PASS] Valid document {doc1_id} validation result: {val1_data['summary']}", flush=True)
            assert val1_data["summary"]["errors"] == 0
            
            # 3. Test 2: Missing / Invalid Format Record
            print("\n--- Test 2: Invalid Data Format Record ---", flush=True)
            inv_path = create_invalid_format_csv()
            with open(inv_path, "rb") as f:
                res2 = client.post(
                    "/api/documents/upload",
                    files={"file": (os.path.basename(inv_path), f, "text/csv")},
                    data={"name": "Invalid Format CSV", "type": "csv", "source": "Test", "category": "Prod", "date": "2026-09-16"}
                )
            assert res2.status_code == 201
            doc2_id = res2.json()["document"]["id"]
            
            val2_res = client.post(f"/api/documents/{doc2_id}/validate")
            assert val2_res.status_code == 200
            val2_data = val2_res.json()
            print(f"[PASS] Invalid format doc {doc2_id} validation result: {val2_data['summary']}", flush=True)
            assert val2_data["summary"]["errors"] >= 1, "Format error not detected!"
            
            # Fetch validation findings
            get_val2 = client.get(f"/api/documents/{doc2_id}/validation")
            assert get_val2.status_code == 200
            fmt_issue = [i for i in get_val2.json()["validation_results"] if i["rule_type"] == "format"][0]
            print(f"  - Detected Format Issue: field='{fmt_issue['field_name']}', invalid_val='{fmt_issue['invalid_value']}', source_ref='{fmt_issue['source_reference']}'", flush=True)
            assert fmt_issue["source_reference"] is not None
            
            # 4. Test 3: Inconsistent Calculation Record
            print("\n--- Test 3: Inconsistent Math Calculation ---", flush=True)
            math_path = create_logical_math_error_xlsx()
            with open(math_path, "rb") as f:
                res3 = client.post(
                    "/api/documents/upload",
                    files={"file": (os.path.basename(math_path), f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                    data={"name": "Math Error Report", "type": "xlsx", "source": "Test", "category": "Prod", "date": "2026-09-16"}
                )
            assert res3.status_code == 201
            doc3_id = res3.json()["document"]["id"]
            
            val3_res = client.post(f"/api/documents/{doc3_id}/validate")
            assert val3_res.status_code == 200
            val3_data = val3_res.json()
            print(f"[PASS] Math error doc {doc3_id} validation result: {val3_data['summary']}", flush=True)
            assert val3_data["summary"]["errors"] >= 1
            
            get_val3 = client.get(f"/api/documents/{doc3_id}/validation")
            math_issue = [i for i in get_val3.json()["validation_results"] if i["rule_type"] == "logical"][0]
            print(f"  - Detected Logical Math Issue: {math_issue['message']}", flush=True)
            
            # 5. Test 4: Cross-Document Conflict Detection
            print("\n--- Test 4: Cross-Document Conflict Detection ---", flush=True)
            conf_a_path = create_conflict_doc_a()
            conf_b_path = create_conflict_doc_b()
            
            with open(conf_a_path, "rb") as f:
                res_a = client.post(
                    "/api/documents/upload",
                    files={"file": (os.path.basename(conf_a_path), f, "text/csv")},
                    data={"name": "Conflict Doc A", "type": "csv", "source": "Test A", "category": "Prod", "date": "2026-09-16"}
                )
            doc_a_id = res_a.json()["document"]["id"]
            
            with open(conf_b_path, "rb") as f:
                res_b = client.post(
                    "/api/documents/upload",
                    files={"file": (os.path.basename(conf_b_path), f, "text/csv")},
                    data={"name": "Conflict Doc B", "type": "csv", "source": "Test B", "category": "Prod", "date": "2026-09-16"}
                )
            doc_b_id = res_b.json()["document"]["id"]
            
            # Validate Doc B (will run conflict check against Doc A)
            val_b_res = client.post(f"/api/documents/{doc_b_id}/validate")
            assert val_b_res.status_code == 200
            val_b_data = val_b_res.json()
            print(f"[PASS] Conflict detection result: {val_b_data['summary']}", flush=True)
            assert val_b_data["summary"]["conflicts"] >= 1, "Cross-document conflict not detected!"
            
            # Fetch document conflicts API
            get_conf = client.get(f"/api/documents/{doc_b_id}/conflicts")
            assert get_conf.status_code == 200
            conflicts_list = get_conf.json()["conflicts"]
            assert len(conflicts_list) >= 1
            conf_item = conflicts_list[0]
            
            print(f"[PASS] GET /api/documents/{doc_b_id}/conflicts returned conflict record:", flush=True)
            print(f"  - Entity: {conf_item['entity_identifier']}")
            print(f"  - Field: {conf_item['field_name']}")
            print(f"  - Value in Doc A ({conf_item['doc_a_id']}): '{conf_item['val_a']}' ({conf_item['source_ref_a']})")
            print(f"  - Value in Doc B ({conf_item['doc_b_id']}): '{conf_item['val_b']}' ({conf_item['source_ref_b']})")
            
            # Verify BOTH source structured extraction values remain preserved in DB
            struct_a = client.get(f"/api/documents/{doc_a_id}/structured").json()["structured_data"][0]
            struct_b = client.get(f"/api/documents/{doc_b_id}/structured").json()["structured_data"][0]
            
            assert struct_a["data"]["Target_MT"] == "12.5", "Document A original extracted value was modified!"
            assert struct_b["data"]["Target_MT"] == "25.0", "Document B original extracted value was modified!"
            print(f"[PASS] Verified BOTH original extracted source values remain 100% untouched in PostgreSQL (Doc A='12.5', Doc B='25.0').", flush=True)
            
            # Test global conflicts API GET /api/conflicts
            global_conf = client.get("/api/conflicts")
            assert global_conf.status_code == 200
            assert global_conf.json()["total_conflicts"] >= 1
            print(f"[PASS] GET /api/conflicts returned {global_conf.json()['total_conflicts']} total system conflicts.", flush=True)
            
            print("\n=== ALL STEP 7 VALIDATION & TRACEABILITY ENGINE TESTS PASSED ===", flush=True)


    finally:
        server_proc.terminate()
        server_proc.wait()
        print("\nUvicorn backend test process terminated cleanly.", flush=True)


if __name__ == "__main__":
    run_tests()
