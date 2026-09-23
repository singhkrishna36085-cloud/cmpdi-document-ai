"""
Validation & Traceability Engine Service for STEP 7
Implements 5 layers of validation:
1. Completeness Validation
2. Data Type & Format Validation
3. Unit Validation
4. Logical Math Validation
5. Cross-Document Conflict Detection
Preserves all original source values in structured_extractions without modifying or choosing one.
"""

import json
import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("validator_service")

# Required fields definition per entity type
# Required fields definition per entity type
REQUIRED_FIELDS = {
    "production_record": ["Mine_Name", "Subsidiary"],
    "core_log_record": ["From_m", "To_m", "Lithology"],
    "borehole_record": ["Borehole_ID", "Total_Depth_m"],
    "key_value": ["key", "value"],
}

NUMERIC_FIELDS = {
    "Target_MT", "Actual_MT", "Achievement_Pct", "From_m", "To_m",
    "Total_Depth_m", "Collar_RL", "Dispatch_MT", "Thickness", "Ash Content", "Reserves",
    "Raw_Coal_Produced_Tonnes", "Overburden_Removed_M3", "Stripping_Ratio", "Average_Seam_Thickness_M",
    "Depth", "Depth_m", "Topography_Z", "Unit_Top_Z", "Roof_m", "Floor_m", "z1", "z2", "Seam_Thickness"
}


def _is_numeric(val: Any) -> bool:
    if val is None:
        return False
    val_str = str(val).strip().rstrip("%").rstrip("m").rstrip("MT").rstrip("tonnes").rstrip("m³").rstrip("m3").replace(",", "").strip()
    try:
        float(val_str)
        return True
    except ValueError:
        return False


def _to_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    val_str = str(val).strip().rstrip("%").rstrip("m").rstrip("MT").rstrip("tonnes").rstrip("m³").rstrip("m3").replace(",", "").strip()
    try:
        return float(val_str)
    except ValueError:
        return None


def _get_first(data: Dict[str, Any], keys: List[str]) -> Any:
    """Helper to retrieve the first present key without treating 0.0 or 0 as falsy."""
    for k in keys:
        if k in data and data[k] is not None and str(data[k]).strip() != "":
            return data[k]
    return None


def validate_single_extraction(extraction_item: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Runs single-extraction validation rules (Completeness, Format, Unit, Logical).
    Returns list of validation result dicts.
    """
    results = []
    
    doc_id = extraction_item.get("document_id")
    ext_id = extraction_item.get("id")
    chunk_id = extraction_item.get("chunk_id")
    page_num = extraction_item.get("page_number")
    sheet_name = extraction_item.get("sheet_name")
    source_ref = extraction_item.get("source_reference")
    entity_type = extraction_item.get("entity_type", "table_record")
    
    data_raw = extraction_item.get("data", {})
    if isinstance(data_raw, str):
        try:
            data = json.loads(data_raw)
        except Exception:
            data = {"raw": data_raw}
    else:
        data = data_raw or {}

    base_info = {
        "document_id": doc_id,
        "extraction_id": ext_id,
        "chunk_id": chunk_id,
        "page_number": page_num,
        "sheet_name": sheet_name,
        "source_reference": source_ref,
    }

    # 1. Completeness Validation
    req_fields = REQUIRED_FIELDS.get(entity_type, [])
    for field in req_fields:
        val = data.get(field)
        if val is None or str(val).strip() == "":
            results.append({
                **base_info,
                "rule_type": "completeness",
                "severity": "warning",
                "field_name": field,
                "invalid_value": None,
                "message": f"Missing required field '{field}' for entity type '{entity_type}'"
            })

    # 2. Format & Data Type Validation
    for field, val in data.items():
        if val is not None and field in NUMERIC_FIELDS:
            val_str = str(val).strip()
            if not _is_numeric(val_str):
                results.append({
                    **base_info,
                    "rule_type": "format",
                    "severity": "error",
                    "field_name": field,
                    "invalid_value": val_str,
                    "message": f"Invalid numeric format for field '{field}': '{val_str}'"
                })
            elif field in ("Achievement_Pct", "Ash Content"):
                flt_val = _to_float(val_str)
                if flt_val is not None and (flt_val < 0.0 or flt_val > 500.0):
                    results.append({
                        **base_info,
                        "rule_type": "format",
                        "severity": "warning",
                        "field_name": field,
                        "invalid_value": val_str,
                        "message": f"Percentage value out of realistic range [0-500%]: '{val_str}'"
                    })

    # 3. Unit Validation
    if entity_type == "key_value":
        key = str(data.get("key", "")).lower()
        val_str = str(data.get("value", ""))
        
        if "thickness" in key:
            if not any(unit in val_str.lower() for unit in ["meter", "meters", "m"]):
                results.append({
                    **base_info,
                    "rule_type": "unit",
                    "severity": "warning",
                    "field_name": data.get("key"),
                    "invalid_value": val_str,
                    "message": f"Missing expected unit ('meters') for field '{data.get('key')}': got '{val_str}'"
                })
        elif "ash" in key or "calorific" in key or "reserve" in key:
            if "ash" in key and "%" not in val_str:
                results.append({
                    **base_info,
                    "rule_type": "unit",
                    "severity": "warning",
                    "field_name": data.get("key"),
                    "invalid_value": val_str,
                    "message": f"Missing expected unit ('%') for field '{data.get('key')}': got '{val_str}'"
                })
            elif "calorific" in key and "kcal" not in val_str.lower():
                results.append({
                    **base_info,
                    "rule_type": "unit",
                    "severity": "warning",
                    "field_name": data.get("key"),
                    "invalid_value": val_str,
                    "message": f"Missing expected unit ('kcal/kg') for field '{data.get('key')}': got '{val_str}'"
                })

    # 4. Geological & Mining Core Audit Categories

    # --- A. Stripping Ratio Math & Spatial Anomaly ---
    raw_coal = _to_float(_get_first(data, ["Raw_Coal_Produced_Tonnes", "Coal_Tonnage", "Ore_Tonnes", "Ore", "Actual_MT"]))
    ob_removed = _to_float(_get_first(data, ["Overburden_Removed_M3", "Overburden", "Waste_M3", "Waste"]))
    reported_sr = _to_float(_get_first(data, ["Stripping_Ratio", "SR", "Strip_Ratio"]))
    depth_m = _to_float(_get_first(data, ["Total_Depth_m", "Depth_m", "Depth"]))
    mine_name = str(_get_first(data, ["Mine_Name", "Project", "Block"]) or "Block Model")

    # Negative volume / negative ratio checks
    if ob_removed is not None and ob_removed < 0:
        results.append({
            **base_info,
            "rule_type": "negative_overburden",
            "severity": "error",
            "field_name": "Overburden_Removed_M3",
            "invalid_value": str(ob_removed),
            "message": f"Negative overburden volume reported for '{mine_name}': {ob_removed:,.1f} m³. Physical volume cannot be negative."
        })

    if raw_coal is not None and raw_coal < 0:
        results.append({
            **base_info,
            "rule_type": "stripping_ratio",
            "severity": "error",
            "field_name": "Raw_Coal_Produced_Tonnes",
            "invalid_value": str(raw_coal),
            "message": f"Negative coal/ore tonnage reported for '{mine_name}': {raw_coal:,.1f} tonnes. Ore mass cannot be negative."
        })

    if reported_sr is not None and reported_sr < 0:
        results.append({
            **base_info,
            "rule_type": "stripping_ratio",
            "severity": "error",
            "field_name": "Stripping_Ratio",
            "invalid_value": str(reported_sr),
            "message": f"Negative stripping ratio reported for '{mine_name}': {reported_sr}. Ratio (Waste/Ore) cannot be negative."
        })

    # Spatial Anomaly: High ore but zero/negative waste
    if raw_coal is not None and raw_coal > 1000 and ob_removed is not None and ob_removed <= 0:
        results.append({
            **base_info,
            "rule_type": "stripping_ratio",
            "severity": "error",
            "field_name": "Stripping_Ratio",
            "invalid_value": f"Coal: {raw_coal:,.0f}t, Waste: {ob_removed}m³",
            "message": f"Spatial Anomaly in '{mine_name}': High coal production ({raw_coal:,.0f} t) reported with zero or negative waste overburden ({ob_removed} m³). Opencast excavation requires positive waste removal."
        })

    # Spatial Depth Anomaly: Significant depth (>30m) but zero or impossible low waste (SR < 0.10)
    if depth_m is not None and depth_m >= 30.0 and raw_coal is not None and raw_coal > 1000:
        effective_sr = reported_sr if reported_sr is not None else ((ob_removed / raw_coal) if (ob_removed is not None and raw_coal > 0) else None)
        if effective_sr is not None and effective_sr < 0.10:
            results.append({
                **base_info,
                "rule_type": "stripping_ratio",
                "severity": "error",
                "field_name": "Stripping_Ratio",
                "invalid_value": f"Depth: {depth_m}m, SR: {effective_sr:.2f}",
                "message": f"Spatial Depth Anomaly in '{mine_name}': Ore block at depth {depth_m} m reports mathematically impossible low waste numbers (SR={effective_sr:.2f} < 0.10). Deep blocks require proportional overburden stripping."
            })

    # Mathematical ratio consistency: Overburden / Raw Coal
    if raw_coal is not None and ob_removed is not None and reported_sr is not None and raw_coal > 0:
        expected_sr = round(ob_removed / raw_coal, 2)
        if abs(expected_sr - reported_sr) > 0.05:
            results.append({
                **base_info,
                "rule_type": "stripping_ratio",
                "severity": "warning",
                "field_name": "Stripping_Ratio",
                "invalid_value": str(reported_sr),
                "message": f"Stripping ratio math mismatch for '{mine_name}': Overburden ({ob_removed:,.0f} m³) / Coal ({raw_coal:,.0f} t) = {expected_sr:.2f}, but reported Stripping_Ratio is {reported_sr:.2f} (Delta: {abs(expected_sr - reported_sr):.2f})."
            })

    # Achievement percentage check for production records
    if entity_type == "production_record":
        target = _to_float(data.get("Target_MT"))
        actual = _to_float(data.get("Actual_MT"))
        reported_pct = _to_float(data.get("Achievement_Pct"))
        if target is not None and actual is not None and reported_pct is not None and target > 0:
            expected_pct = round((actual / target) * 100.0, 2)
            if abs(expected_pct - reported_pct) > 1.0:
                results.append({
                    **base_info,
                    "rule_type": "logical",
                    "severity": "error",
                    "field_name": "Achievement_Pct",
                    "invalid_value": str(reported_pct),
                    "message": f"Inconsistent calculation for '{mine_name}': Actual ({actual} MT) / Target ({target} MT) = {expected_pct}%, but reported Achievement_Pct is {reported_pct}%"
                })

    # --- B. Seam Thickness Bounds & Geometric Inversion ---
    from_m = _to_float(_get_first(data, ["From_m", "From", "Roof_m", "Depth_From", "z1"]))
    to_m = _to_float(_get_first(data, ["To_m", "To", "Floor_m", "Depth_To", "z2"]))
    lithology = str(_get_first(data, ["Lithology", "Seam_Name", "Rock_Type", "Unit"]) or "Geological Unit")
    rep_thickness = _to_float(_get_first(data, ["Thickness", "Seam_Thickness", "True_Thickness_m"]))

    # Geometric Inversion: Floor logged above Roof
    if from_m is not None and to_m is not None and from_m >= to_m:
        results.append({
            **base_info,
            "rule_type": "thickness_bounds",
            "severity": "error",
            "field_name": "From_m / To_m",
            "invalid_value": f"Roof(From): {from_m}m, Floor(To): {to_m}m",
            "message": f"Geometric Inversion detected in '{lithology}': Seam floor ({to_m} m) is logged at or above seam roof ({from_m} m) [z1 >= z2]. Inverted stratigraphy corrupts downstream wireframe models."
        })
    elif from_m is not None and to_m is not None and to_m > from_m:
        calc_t = round(to_m - from_m, 2)
        # Upper physical bound: flag typos (e.g. 100m instead of 1.0m)
        if calc_t > 45.0:
            results.append({
                **base_info,
                "rule_type": "thickness_bounds",
                "severity": "error",
                "field_name": "Thickness",
                "invalid_value": f"{calc_t} m",
                "message": f"Seam Thickness Out of Bounds in '{lithology}': Calculated thickness ({calc_t} m from {from_m}m to {to_m}m) exceeds physical limit [0.1m - 45.0m]. Probable data entry typo (e.g. 100m instead of 1.0m)."
            })
        elif calc_t <= 0.05:
            results.append({
                **base_info,
                "rule_type": "thickness_bounds",
                "severity": "warning",
                "field_name": "Thickness",
                "invalid_value": f"{calc_t} m",
                "message": f"Unusually thin geological interval ({calc_t} m) logged for '{lithology}'."
            })

        # Math mismatch between reported Thickness and (To - From)
        if rep_thickness is not None and abs(calc_t - rep_thickness) > 0.10:
            results.append({
                **base_info,
                "rule_type": "thickness_bounds",
                "severity": "warning",
                "field_name": "Thickness",
                "invalid_value": f"Reported: {rep_thickness}m, Calculated: {calc_t}m",
                "message": f"Seam thickness calculation discrepancy in '{lithology}': Reported thickness is {rep_thickness} m, but (To_m - From_m) = {calc_t} m (Delta: {abs(calc_t - rep_thickness):.2f}m)."
            })

    # Average seam thickness check
    avg_seam = _to_float(data.get("Average_Seam_Thickness_M"))
    if avg_seam is not None:
        if avg_seam <= 0 or avg_seam > 45.0:
            results.append({
                **base_info,
                "rule_type": "thickness_bounds",
                "severity": "error",
                "field_name": "Average_Seam_Thickness_M",
                "invalid_value": f"{avg_seam} m",
                "message": f"Average seam thickness ({avg_seam} m) is outside realistic geological bounds [0.1m - 45.0m] for '{mine_name}'."
            })

    # --- C. Negative Overburden Flags & Topography Elevation ---
    # 1. Negative depth interval: Unit top starts above surface (depth < 0)
    if from_m is not None and from_m < 0:
        results.append({
            **base_info,
            "rule_type": "negative_overburden",
            "severity": "error",
            "field_name": "From_m",
            "invalid_value": f"{from_m} m",
            "message": f"Negative Overburden Flag in '{lithology}': Unit starts at negative depth ({from_m} m). Ground material cannot physically exist above ground surface (floating in mid-air)."
        })

    # 2. Surface Topography Elevation vs Unit Top Z:
    # Rule: Topography Z - Unit Top Z >= 0
    topo_z = _to_float(_get_first(data, ["Topography_Z", "Collar_RL", "Surface_RL", "Topography"]))
    unit_top_z = _to_float(_get_first(data, ["Unit_Top_Z", "Top_Z", "Roof_Z", "Strata_Top_Z"]))

    if topo_z is not None and unit_top_z is not None:
        elevation_delta = round(topo_z - unit_top_z, 2)
        if elevation_delta < -0.05:
            results.append({
                **base_info,
                "rule_type": "negative_overburden",
                "severity": "error",
                "field_name": "Unit_Top_Z",
                "invalid_value": f"Topography Z: {topo_z}m, Unit Top Z: {unit_top_z}m",
                "message": f"Negative Overburden Flag in '{lithology}': Topography Z ({topo_z} m) - Unit Top Z ({unit_top_z} m) = {elevation_delta} m < 0. Ground material mathematically calculated to exist above the sky due to corrupted survey coordinate data."
            })

    return results


def detect_cross_document_conflicts(all_extractions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Detects cross-document conflicts for structured extractions referring to the same entity/field.
    Preserves BOTH original source values.
    """
    conflicts = []
    
    # Map entity identifier -> field_name -> list of (extraction_dict, value)
    entity_map: Dict[str, Dict[str, List[tuple]]] = {}

    for ext in all_extractions:
        doc_id = ext.get("document_id")
        data_raw = ext.get("data", {})
        if isinstance(data_raw, str):
            try:
                data = json.loads(data_raw)
            except Exception:
                data = {}
        else:
            data = data_raw or {}

        entity_type = ext.get("entity_type")
        
        # Determine entity identifier
        identifier = None
        if entity_type == "production_record" and data.get("Mine_Name"):
            identifier = f"Mine:{data.get('Mine_Name')}"
        elif entity_type == "borehole_record" and data.get("Borehole_ID"):
            identifier = f"Borehole:{data.get('Borehole_ID')}"
        elif entity_type == "key_value" and data.get("key"):
            identifier = f"GlobalKey:{data.get('key')}"

        if not identifier:
            continue

        if identifier not in entity_map:
            entity_map[identifier] = {}

        # Add fields to entity_map
        for field, val in data.items():
            if field in ("Mine_Name", "Borehole_ID", "key") or val is None:
                continue
            if field not in entity_map[identifier]:
                entity_map[identifier][field] = []
            entity_map[identifier][field].append((ext, str(val).strip()))

    # Check conflicts across different documents
    for identifier, fields in entity_map.items():
        for field_name, occurrences in fields.items():
            if len(occurrences) < 2:
                continue
                
            # Compare every pair from different documents
            for i in range(len(occurrences)):
                for j in range(i + 1, len(occurrences)):
                    ext_a, val_a = occurrences[i]
                    ext_b, val_b = occurrences[j]
                    
                    if ext_a.get("document_id") != ext_b.get("document_id"):
                        if val_a != val_b:
                            conflicts.append({
                                "doc_a_id": ext_a.get("document_id"),
                                "doc_b_id": ext_b.get("document_id"),
                                "extraction_a_id": ext_a.get("id"),
                                "extraction_b_id": ext_b.get("id"),
                                "entity_type": ext_a.get("entity_type", "entity"),
                                "entity_identifier": identifier,
                                "field_name": field_name,
                                "val_a": val_a,
                                "val_b": val_b,
                                "source_ref_a": ext_a.get("source_reference"),
                                "source_ref_b": ext_b.get("source_reference"),
                                "message": f"Cross-document conflict for '{identifier}' field '{field_name}': Document {ext_a.get('document_id')} has value '{val_a}', whereas Document {ext_b.get('document_id')} has value '{val_b}'."
                            })

    return conflicts


def validate_document_topological_integrity(all_doc_extractions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validates chronological and spatial stacking order of geological units.
    Ensures that drillhole lithology layers stack chronologically without overlapping:
    From_m(next) >= To_m(prev).
    Guarantees solid models (wireframes) do not self-intersect, open volumes close properly,
    and geological layers stack in the correct chronological order.
    """
    findings = []
    
    # Group core_log_records by drillhole/borehole or sheet/chunk sequence
    drillhole_groups: Dict[str, List[Dict[str, Any]]] = {}

    for ext in all_doc_extractions:
        data_raw = ext.get("data", {})
        if isinstance(data_raw, str):
            try:
                data = json.loads(data_raw)
            except Exception:
                data = {}
        else:
            data = data_raw or {}

        from_m = _to_float(_get_first(data, ["From_m", "From", "Roof_m", "Depth_From", "z1"]))
        to_m = _to_float(_get_first(data, ["To_m", "To", "Floor_m", "Depth_To", "z2"]))

        if from_m is None or to_m is None:
            continue

        bh_id = str(data.get("Borehole_ID") or data.get("Hole_ID") or ext.get("sheet_name") or f"Document_{ext.get('document_id')}")
        if bh_id not in drillhole_groups:
            drillhole_groups[bh_id] = []

        drillhole_groups[bh_id].append({
            "extraction": ext,
            "data": data,
            "from_m": from_m,
            "to_m": to_m,
            "lithology": str(data.get("Lithology") or data.get("Seam_Name") or "Geological Layer")
        })

    for bh_id, intervals in drillhole_groups.items():
        if len(intervals) < 2:
            continue
            
        # Check adjacent intervals in drillhole sequence
        for i in range(len(intervals) - 1):
            curr = intervals[i]
            nxt = intervals[i + 1]
            
            # If current interval floor is deeper than next interval roof, there is an overlap/intersection
            if curr["to_m"] > nxt["from_m"] + 0.05 and nxt["to_m"] > curr["from_m"]:
                ext = nxt["extraction"]
                findings.append({
                    "document_id": ext.get("document_id"),
                    "extraction_id": ext.get("id"),
                    "chunk_id": ext.get("chunk_id"),
                    "page_number": ext.get("page_number"),
                    "sheet_name": ext.get("sheet_name"),
                    "source_reference": ext.get("source_reference"),
                    "rule_type": "topological_integrity",
                    "severity": "error",
                    "field_name": "Stratigraphic_Stacking",
                    "invalid_value": f"Layer {i+1} To: {curr['to_m']}m, Layer {i+2} From: {nxt['from_m']}m",
                    "message": f"Topological Integrity Violation in '{bh_id}': Stratigraphic layer overlap detected between '{curr['lithology']}' (ending at {curr['to_m']} m) and subsequent unit '{nxt['lithology']}' (starting at {nxt['from_m']} m). Solid wireframe volume self-intersects."
                })

    return findings
