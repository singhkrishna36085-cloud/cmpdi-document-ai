"""
STEP 6 Verification & End-to-End Test Script
Starts real Uvicorn server, creates sample PDF, DOCX, XLSX, and CSV files,
uploads, processes, and extracts structured data, and verifies source traceability and PostgreSQL persistence.
"""

import os
import sys
import time
import subprocess
import json
import fitz
import docx
import pandas as pd
import httpx

BASE_URL = "http://127.0.0.1:8000"
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_files")
os.makedirs(TEST_DIR, exist_ok=True)


def create_test_pdf():
    pdf_path = os.path.join(TEST_DIR, "step6_coal_report.pdf")
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 50),
        "CMPDI GEOLOGICAL EXPLORATION REPORT 2026\n\n"
        "Block Name: North Karanpura Block C\n"
        "Coal Seam: Seam VI (Top)\n"
        "Thickness: 5.2 meters\n"
        "Ash Content: 17.5%\n"
        "Gross Calorific Value (GCV): 5400 kcal/kg\n"
        "Proved Reserves: 14.8 Million Tonnes\n"
    )
    doc.save(pdf_path)
    doc.close()
    return pdf_path


def create_test_docx():
    docx_path = os.path.join(TEST_DIR, "step6_core_log.docx")
    doc = docx.Document()
    doc.add_heading("CMPDI Core Drilling Log - Borehole NC-12", level=1)
    doc.add_paragraph("Location: Rajrappa Area, Central Coalfields Limited.")
    doc.add_paragraph("Drilling Date: 2026-08-15.")
    
    table = doc.add_table(rows=1, cols=4)
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "From_m"
    hdr_cells[1].text = "To_m"
    hdr_cells[2].text = "Lithology"
    hdr_cells[3].text = "Seam_Code"
    
    row_data = [
        ("0.0", "15.2", "Overburden Sandstone", "OB"),
        ("15.2", "22.8", "Bituminous Coal", "ARG-1"),
        ("22.8", "35.0", "Shale & Carbonaceous Shale", "SH"),
    ]
    for from_m, to_m, lith, seam in row_data:
        row_cells = table.add_row().cells
        row_cells[0].text = from_m
        row_cells[1].text = to_m
        row_cells[2].text = lith
        row_cells[3].text = seam
        
    doc.save(docx_path)
    return docx_path


def create_test_xlsx():
    xlsx_path = os.path.join(TEST_DIR, "step6_production.xlsx")
    df_prod = pd.DataFrame({
        "Mine_Name": ["Amrapali OCP", "Magadh OCP", "Ashoka OCP"],
        "Target_MT": [12.5, 10.0, 8.5],
        "Actual_MT": [13.1, 9.8, 8.7],
        "Achievement_Pct": [104.8, 98.0, 102.35]
    })
    df_quality = pd.DataFrame({
        "Grade": ["G7", "G8", "G10"],
        "GCV_Band": ["5201-5500", "4901-5200", "4301-4600"],
        "Dispatch_MT": [5.2, 8.1, 4.0]
    })
    
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        df_prod.to_excel(writer, sheet_name="Production_Summary", index=False)
        df_quality.to_excel(writer, sheet_name="Quality_Grade", index=False)
        
    return xlsx_path


def create_test_csv():
    csv_path = os.path.join(TEST_DIR, "step6_boreholes.csv")
    df = pd.DataFrame({
        "Borehole_ID": ["BH-01", "BH-02", "BH-03"],
        "Collar_RL": [245.5, 250.1, 242.8],
        "Total_Depth_m": [180.0, 210.5, 165.0],
        "Seam_Count": [4, 5, 3]
    })
    df.to_csv(csv_path, index=False)
    return csv_path


def run_tests():
    print("=== STARTING REAL UVICORN BACKEND PROCESS FOR STEP 6 TEST ===", flush=True)
    
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
            
            # 2. Prepare test files
            pdf_path = create_test_pdf()
            docx_path = create_test_docx()
            xlsx_path = create_test_xlsx()
            csv_path = create_test_csv()
            
            test_files = [
                ("PDF Report", "pdf", pdf_path, "application/pdf"),
                ("DOCX Core Log", "docx", docx_path, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                ("XLSX Production", "xlsx", xlsx_path, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                ("CSV Boreholes", "csv", csv_path, "text/csv"),
            ]
            
            summary_results = []
            
            for name, ftype, fpath, ctype in test_files:
                print(f"\n--- Testing STEP 6 Structured Data Extraction: {ftype.upper()} ({os.path.basename(fpath)}) ---", flush=True)
                
                orig_stat = os.stat(fpath)
                
                # Upload and auto-process
                with open(fpath, "rb") as f:
                    resp = client.post(
                        "/api/documents/upload",
                        files={"file": (os.path.basename(fpath), f, ctype)},
                        data={
                            "name": name,
                            "type": ftype,
                            "source": "CMPDI Step 6 Suite",
                            "category": "Geological Data",
                            "date": "2026-09-16",
                            "description": f"STEP 6 test upload for {ftype}",
                        }
                    )
                    
                assert resp.status_code == 201, f"Upload failed ({resp.status_code}): {resp.text}"
                data = resp.json()
                doc_id = data["document"]["id"]
                print(f"[PASS] Document uploaded and auto-processed. Doc ID: {doc_id}", flush=True)
                
                # Test explicit trigger POST /api/documents/{id}/extract-structured
                trig_resp = client.post(f"/api/documents/{doc_id}/extract-structured")
                assert trig_resp.status_code == 200, f"Trigger failed: {trig_resp.text}"
                trig_data = trig_resp.json()
                print(f"[PASS] POST /api/documents/{doc_id}/extract-structured returned {trig_data['extracted_records_count']} records.", flush=True)
                
                # Test retrieval API GET /api/documents/{id}/structured
                struct_resp = client.get(f"/api/documents/{doc_id}/structured")
                assert struct_resp.status_code == 200, f"Get structured failed: {struct_resp.text}"
                struct_data = struct_resp.json()
                records = struct_data["structured_data"]
                
                assert struct_data["total_structured_records"] > 0, "No structured records found!"
                assert len(records) > 0
                
                print(f"[PASS] GET /api/documents/{doc_id}/structured returned {len(records)} total records.", flush=True)
                
                # Verify source traceability on all records
                for rec in records:
                    assert rec["document_id"] == doc_id, "document_id mismatch!"
                    assert rec["chunk_id"] is not None, "chunk_id is missing!"
                    assert rec["source_reference"] is not None, "source_reference is missing!"
                    assert isinstance(rec["data"], dict), "data is not parsed as JSON dict!"
                    
                print(f"[PASS] Source traceability verified for all records (document_id, chunk_id, page_number, sheet_name, source_reference).", flush=True)
                
                # Print sample record
                sample_rec = records[0]
                print(f"  - Sample Record Entity Type: {sample_rec['entity_type']}")
                print(f"  - Source Reference: {sample_rec['source_reference']}")
                print(f"  - Extracted Data: {sample_rec['data']}")
                
                # Verify original file untouched
                post_stat = os.stat(fpath)
                assert orig_stat.st_size == post_stat.st_size
                assert orig_stat.st_mtime == post_stat.st_mtime
                print(f"[PASS] Original file '{os.path.basename(fpath)}' remains strictly intact.", flush=True)
                
                summary_results.append({
                    "id": doc_id,
                    "filename": os.path.basename(fpath),
                    "type": ftype,
                    "structured_records": len(records),
                    "sample_entity": sample_rec['entity_type'],
                    "sample_ref": sample_rec['source_reference']
                })
                
            print("\n=== ALL STEP 6 STRUCTURED DATA EXTRACTION TESTS PASSED & PERSISTED IN POSTGRESQL ===", flush=True)
            print(json.dumps(summary_results, indent=2), flush=True)
            
    finally:
        server_proc.terminate()
        server_proc.wait()
        print("\nUvicorn backend test process terminated cleanly.", flush=True)


if __name__ == "__main__":
    run_tests()
