"""
Comprehensive Verification Script for Core Mining & Geological Audit Engine:
1. Stripping Ratio Math & Spatial Anomaly Detection (SR = Waste / Ore)
2. Seam Thickness Bounds & Geometric Inversion Checks (t = z1 - z2 corrected)
3. Negative Overburden Flags & Topography Elevation Validations (Topography Z - Unit Top Z >= 0)
4. Topological Integrity & Chronological Stratigraphic Stacking (From_m(next) >= To_m(prev))
"""

import sys
import os
import json

# Ensure backend directory is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.validator import validate_single_extraction, validate_document_topological_integrity

def test_core_audit_categories():
    print("======================================================================")
    print("RUNNING AUTOMATED VERIFICATION: GEOLOGICAL & MINING CORE AUDIT ENGINE")
    print("======================================================================")
    
    # -------------------------------------------------------------------------
    # TEST 1: Stripping Ratio Math & Spatial Anomalies
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Testing Stripping Ratio Math & Spatial Anomaly Detection...")
    
    # Case 1A: High coal with 0 waste overburden (Spatial anomaly in opencast block)
    item_1a = {
        "document_id": 101,
        "id": 1,
        "chunk_id": 10,
        "page_number": 2,
        "entity_type": "production_record",
        "data": {
            "Mine_Name": "Gevra Deep Pit Block 4",
            "Raw_Coal_Produced_Tonnes": 2500000.0,
            "Overburden_Removed_M3": 0.0,
            "Stripping_Ratio": 0.0
        }
    }
    findings_1a = validate_single_extraction(item_1a)
    sr_anomalies_1a = [f for f in findings_1a if f["rule_type"] == "stripping_ratio"]
    assert len(sr_anomalies_1a) >= 1, "Expected spatial anomaly flag for high coal with zero waste!"
    print(f"  [PASS] Case 1A Caught: {sr_anomalies_1a[0]['message']}")

    # Case 1B: Deep block (80m) reporting negligible waste (SR = 0.04 < 0.10)
    item_1b = {
        "document_id": 101,
        "id": 2,
        "chunk_id": 11,
        "page_number": 3,
        "entity_type": "production_record",
        "data": {
            "Mine_Name": "Nigahi South Block",
            "Total_Depth_m": 85.0,
            "Raw_Coal_Produced_Tonnes": 1500000.0,
            "Overburden_Removed_M3": 60000.0,
            "Stripping_Ratio": 0.04
        }
    }
    findings_1b = validate_single_extraction(item_1b)
    sr_anomalies_1b = [f for f in findings_1b if "Spatial Depth Anomaly" in f["message"]]
    assert len(sr_anomalies_1b) >= 1, "Expected spatial depth anomaly flag for deep block with near-zero waste!"
    print(f"  [PASS] Case 1B Caught: {sr_anomalies_1b[0]['message']}")

    # Case 1C: Stripping ratio math mismatch (Overburden / Coal != Reported SR)
    item_1c = {
        "document_id": 101,
        "id": 3,
        "chunk_id": 12,
        "page_number": 4,
        "entity_type": "production_record",
        "data": {
            "Mine_Name": "Ukni Deep",
            "Raw_Coal_Produced_Tonnes": 1000000.0,
            "Overburden_Removed_M3": 3000000.0,
            "Stripping_Ratio": 1.50  # Should be 3.00!
        }
    }
    findings_1c = validate_single_extraction(item_1c)
    sr_mismatch_1c = [f for f in findings_1c if "Stripping ratio math mismatch" in f["message"]]
    assert len(sr_mismatch_1c) >= 1, "Expected stripping ratio mismatch!"
    print(f"  [PASS] Case 1C Caught: {sr_mismatch_1c[0]['message']}")

    # -------------------------------------------------------------------------
    # TEST 2: Seam Thickness Bounds & Geometric Inversion
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Testing Seam Thickness Bounds & Geometric Inversion...")

    # Case 2A: Geometric Inversion (Floor logged above Roof: From=45m, To=30m)
    item_2a = {
        "document_id": 102,
        "id": 4,
        "chunk_id": 20,
        "page_number": 1,
        "entity_type": "core_log_record",
        "data": {
            "Borehole_ID": "BH-CMPDI-04",
            "Lithology": "Seam IV Top",
            "From_m": 45.0,
            "To_m": 30.0  # Inverted!
        }
    }
    findings_2a = validate_single_extraction(item_2a)
    inversion_2a = [f for f in findings_2a if "Geometric Inversion" in f["message"]]
    assert len(inversion_2a) >= 1, "Expected geometric inversion error!"
    print(f"  [PASS] Case 2A Caught: {inversion_2a[0]['message']}")

    # Case 2B: Typo making coal seam 100 meters thick instead of 1.0 meter
    item_2b = {
        "document_id": 102,
        "id": 5,
        "chunk_id": 21,
        "page_number": 2,
        "entity_type": "core_log_record",
        "data": {
            "Borehole_ID": "BH-CMPDI-04",
            "Lithology": "Coal Seam V",
            "From_m": 12.0,
            "To_m": 112.0  # 100 meters thickness!
        }
    }
    findings_2b = validate_single_extraction(item_2b)
    bounds_2b = [f for f in findings_2b if "Seam Thickness Out of Bounds" in f["message"]]
    assert len(bounds_2b) >= 1, "Expected thickness bounds typo catch!"
    print(f"  [PASS] Case 2B Caught: {bounds_2b[0]['message']}")

    # -------------------------------------------------------------------------
    # TEST 3: Negative Overburden Flags & Topography Elevation
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Testing Negative Overburden Flags & Topography Checks...")

    # Case 3A: Unit starting at negative depth (From_m = -4.5m)
    item_3a = {
        "document_id": 103,
        "id": 6,
        "chunk_id": 30,
        "page_number": 1,
        "entity_type": "core_log_record",
        "data": {
            "Borehole_ID": "BH-SURVEY-09",
            "Lithology": "Weathered Sandstone",
            "From_m": -4.5,
            "To_m": 10.0
        }
    }
    findings_3a = validate_single_extraction(item_3a)
    neg_ob_3a = [f for f in findings_3a if f["rule_type"] == "negative_overburden"]
    assert len(neg_ob_3a) >= 1, "Expected negative depth overburden error!"
    print(f"  [PASS] Case 3A Caught: {neg_ob_3a[0]['message']}")

    # Case 3B: Topography Z - Unit Top Z < 0 (Unit floating above the sky)
    item_3b = {
        "document_id": 103,
        "id": 7,
        "chunk_id": 31,
        "page_number": 2,
        "entity_type": "core_log_record",
        "data": {
            "Borehole_ID": "BH-SURVEY-09",
            "Lithology": "Soil & Alluvium",
            "Topography_Z": 240.0,
            "Unit_Top_Z": 255.0  # 15 meters higher than ground surface!
        }
    }
    findings_3b = validate_single_extraction(item_3b)
    neg_ob_3b = [f for f in findings_3b if "exist above the sky" in f["message"]]
    assert len(neg_ob_3b) >= 1, "Expected floating unit / above the sky error!"
    print(f"  [PASS] Case 3B Caught: {neg_ob_3b[0]['message']}")

    # -------------------------------------------------------------------------
    # TEST 4: Topological Integrity (Stratigraphic Layer Stacking Order)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Testing Topological Integrity & Layer Stacking...")

    # Successive drillhole units that overlap: Layer 1 ends at 25m, but Layer 2 starts at 20m!
    doc_extractions_4 = [
        {
            "id": 11,
            "document_id": 104,
            "chunk_id": 40,
            "page_number": 1,
            "data": {
                "Borehole_ID": "BH-104",
                "Lithology": "Top Sandstone",
                "From_m": 0.0,
                "To_m": 25.0
            }
        },
        {
            "id": 12,
            "document_id": 104,
            "chunk_id": 40,
            "page_number": 1,
            "data": {
                "Borehole_ID": "BH-104",
                "Lithology": "Main Coal Seam",
                "From_m": 20.0,  # Overlaps with previous unit ending at 25.0!
                "To_m": 28.0
            }
        }
    ]
    topo_findings = validate_document_topological_integrity(doc_extractions_4)
    assert len(topo_findings) >= 1, "Expected topological integrity overlap error!"
    print(f"  [PASS] Case 4 Caught: {topo_findings[0]['message']}")

    print("\n======================================================================")
    print("ALL 4 CORE AUDIT TEST SUITES PASSED WITH 100% COMPLIANCE ACCURACY!")
    print("======================================================================\n")

if __name__ == "__main__":
    test_core_audit_categories()
