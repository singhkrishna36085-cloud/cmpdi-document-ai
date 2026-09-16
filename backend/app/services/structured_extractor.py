"""
Structured Data Extractor Service for STEP 6
Parses text and tabular DocumentChunks to produce deterministic structured data records.
Preserves source traceability: document_id, chunk_id, page_number, sheet_name, source_reference.
Zero fabrication or guessing — missing values remain None / null.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("structured_extractor")


def _clean_val(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val_str = str(val).strip()
    if val_str in ("", "-", "N/A", "n/a", "None", "null", "nan"):
        return None
    return val_str


def parse_key_value_lines(content: str) -> List[Dict[str, Any]]:
    """
    Extracts key-value pairs from text lines.
    Matches lines formatted like:
      Key: Value
      Key = Value
    """
    pairs = []
    lines = content.splitlines()
    for l_idx, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("---") or line_clean.startswith("["):
            continue
            
        # Match "Key: Value" or "Key = Value"
        match = re.match(r"^([A-Za-z0-9_\s\(\)\%/-]+)[:=]\s*(.+)$", line_clean)
        if match:
            k = match.group(1).strip()
            v = _clean_val(match.group(2))
            if k and v is not None:
                pairs.append({
                    "line_number": l_idx + 1,
                    "key": k,
                    "value": v
                })
    return pairs


def parse_table_chunk(content: str) -> List[Dict[str, Any]]:
    """
    Extracts structured rows from table chunks (from DOCX, XLSX, CSV).
    Handles:
    - Pipe-separated format: Col1 | Col2 | Col3
    - Pandas DataFrame format: Columns header + row lines
    """
    records = []
    lines = [l.strip() for l in content.splitlines() if l.strip()]
    if not lines:
        return records

    # 1. Pipe-separated tables (from DOCX or Markdown tables)
    pipe_lines = [l for l in lines if "|" in l and not l.startswith("[")]
    if pipe_lines:
        headers = [h.strip() for h in pipe_lines[0].split("|")]
        for r_idx, row_line in enumerate(pipe_lines[1:]):
            cols = [c.strip() for c in row_line.split("|")]
            if all(set(c) <= set("-:") for c in cols if c):
                continue
            row_dict = {}
            for h, c in zip(headers, cols):
                if h:
                    row_dict[h] = _clean_val(c)
            if row_dict:
                records.append({
                    "row_index": r_idx + 1,
                    "row_data": row_dict
                })
        return records

    # 2. Pandas tabular printout / CSV format
    col_line_idx = -1
    cols = []
    for idx, line in enumerate(lines):
        if line.startswith("Columns:"):
            col_line_idx = idx
            col_str = line.split("Columns:", 1)[1]
            cols = [c.strip() for c in col_str.split(",") if c.strip()]
            break

    if col_line_idx != -1 and cols:
        data_start_idx = -1
        for idx in range(col_line_idx + 1, len(lines)):
            if lines[idx].startswith("Rows"):
                data_start_idx = idx + 1
                break
                
        if data_start_idx != -1 and data_start_idx < len(lines):
            row_lines = lines[data_start_idx:]
            # Skip header row line if repeated
            if row_lines and all(c in row_lines[0] for c in cols[:2]):
                row_lines = row_lines[1:]
                
            for r_idx, r_line in enumerate(row_lines):
                tokens = r_line.split()
                if len(tokens) == len(cols):
                    row_dict = {h: _clean_val(t) for h, t in zip(cols, tokens)}
                    records.append({
                        "row_index": r_idx + 1,
                        "row_data": row_dict
                    })
                elif len(tokens) > len(cols):
                    first_col_val = " ".join(tokens[:len(tokens) - len(cols) + 1])
                    rest_vals = tokens[len(tokens) - len(cols) + 1:]
                    row_dict = {cols[0]: _clean_val(first_col_val)}
                    for h, t in zip(cols[1:], rest_vals):
                        row_dict[h] = _clean_val(t)
                    records.append({
                        "row_index": r_idx + 1,
                        "row_data": row_dict
                    })

    return records


def extract_structured_data(chunks: List[Any]) -> List[Dict[str, Any]]:
    """
    Extracts structured entities from a list of DocumentChunk model objects or dicts.
    Returns list of dicts suitable for insertion into StructuredExtraction model.
    """
    extractions = []
    
    for chunk in chunks:
        chunk_id = getattr(chunk, "id", None)
        document_id = getattr(chunk, "document_id", None)
        page_num = getattr(chunk, "page_number", None)
        sheet_name = getattr(chunk, "sheet_name", None)
        chunk_type = getattr(chunk, "chunk_type", "text")
        content = getattr(chunk, "content", "")
        
        if not content:
            continue
            
        if chunk_type in ("text", "ocr"):
            kv_pairs = parse_key_value_lines(content)
            for pair in kv_pairs:
                source_ref = f"Page {page_num or 1}, Line {pair['line_number']}"
                extractions.append({
                    "document_id": document_id,
                    "chunk_id": chunk_id,
                    "page_number": page_num,
                    "sheet_name": sheet_name,
                    "source_reference": source_ref,
                    "entity_type": "key_value",
                    "data": json.dumps({"key": pair["key"], "value": pair["value"]})
                })
                
        elif chunk_type == "table":
            table_records = parse_table_chunk(content)
            for rec in table_records:
                if sheet_name:
                    source_ref = f"Sheet: {sheet_name}, Row {rec['row_index']}"
                else:
                    source_ref = f"Page {page_num or 1}, Table Row {rec['row_index']}"
                    
                cols = set(rec["row_data"].keys())
                if "Lithology" in cols or "From_m" in cols:
                    entity_type = "core_log_record"
                elif "Mine_Name" in cols or "Target_MT" in cols or "Raw_Coal_Produced_Tonnes" in cols or "Subsidiary" in cols:
                    entity_type = "production_record"
                elif "Borehole_ID" in cols or "Collar_RL" in cols:
                    entity_type = "borehole_record"
                elif "Grade" in cols or "GCV_Band" in cols:
                    entity_type = "quality_grade_record"
                else:
                    entity_type = "table_record"
                    
                extractions.append({
                    "document_id": document_id,
                    "chunk_id": chunk_id,
                    "page_number": page_num,
                    "sheet_name": sheet_name,
                    "source_reference": source_ref,
                    "entity_type": entity_type,
                    "data": json.dumps(rec["row_data"])
                })
                
    return extractions
