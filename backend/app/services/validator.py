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

# Fields that must be numeric
NUMERIC_FIELDS = {
    "Target_MT", "Actual_MT", "Achievement_Pct", "From_m", "To_m",
    "Total_Depth_m", "Collar_RL", "Dispatch_MT", "Thickness", "Ash Content", "Reserves",
    "Raw_Coal_Produced_Tonnes", "Overburden_Removed_M3", "Stripping_Ratio", "Average_Seam_Thickness_M"
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

    # 4. Logical Validation (Math consistency check for production records)
    if entity_type == "production_record":
        target = _to_float(data.get("Target_MT"))
        actual = _to_float(data.get("Actual_MT"))
        reported_pct = _to_float(data.get("Achievement_Pct"))
        mine_name = data.get("Mine_Name", "Unknown Mine")
        
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

        # Stripping ratio consistency check: Overburden / Raw Coal
        raw_coal = _to_float(data.get("Raw_Coal_Produced_Tonnes"))
        ob_removed = _to_float(data.get("Overburden_Removed_M3"))
        reported_sr = _to_float(data.get("Stripping_Ratio"))

        if raw_coal is not None and ob_removed is not None and reported_sr is not None and raw_coal > 0:
            expected_sr = round(ob_removed / raw_coal, 2)
            if abs(expected_sr - reported_sr) > 0.05:
                results.append({
                    **base_info,
                    "rule_type": "logical",
                    "severity": "warning",
                    "field_name": "Stripping_Ratio",
                    "invalid_value": str(reported_sr),
                    "message": f"Stripping ratio mismatch for '{mine_name}': Overburden ({ob_removed} m³) / Coal ({raw_coal} t) = {expected_sr}, but reported Stripping_Ratio is {reported_sr}"
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
