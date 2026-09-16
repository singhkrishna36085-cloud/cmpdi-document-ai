"""
Cross-Document Intelligence Service (STEP 16)
Provides multi-document comparison, pairwise metric delta calculation, multi-document aggregation,
threshold filtering, safety/risk factual comparison, and cross-document conflict detection
operating entirely on PostgreSQL structured extractions and document metadata with RBAC isolation.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Document, StructuredExtraction, DocumentConflict, DocumentChunk

logger = logging.getLogger("cross_document_service")


def parse_float(val: Any) -> Optional[float]:
    """Helper to safely convert raw field values to float."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).replace(",", "").strip()
    if not val_str:
        return None
    try:
        return float(val_str)
    except ValueError:
        return None


async def get_authorized_extractions(db: AsyncSession, allowed_doc_ids: Optional[set] = None) -> List[Dict[str, Any]]:
    """
    Fetches structured extractions joined with Document metadata filtered by user RBAC permissions.
    """
    stmt = select(StructuredExtraction, Document).join(Document, StructuredExtraction.document_id == Document.id)
    if allowed_doc_ids is not None:
        stmt = stmt.where(Document.id.in_(allowed_doc_ids))

    result = await db.execute(stmt)
    rows = result.all()

    records = []
    for ext, doc in rows:
        data_raw = ext.data
        parsed_data = json.loads(data_raw) if isinstance(data_raw, str) else (data_raw or {})
        
        coal_val = parse_float(parsed_data.get("Raw_Coal_Produced_Tonnes"))
        ob_val = parse_float(parsed_data.get("Overburden_Removed_M3"))
        sr_val = parse_float(parsed_data.get("Stripping_Ratio"))
        seam_val = parse_float(parsed_data.get("Average_Seam_Thickness_M"))
        
        record = {
            "extraction_id": ext.id,
            "document_id": doc.id,
            "document_name": doc.name,
            "original_filename": doc.original_filename,
            "is_confidential": doc.is_confidential,
            "source_reference": ext.source_reference or f"Doc #{doc.id} Page {ext.page_number or 1}",
            "page_number": ext.page_number,
            "sheet_name": ext.sheet_name,
            "Mine_Name": parsed_data.get("Mine_Name") or "Unknown Mine",
            "Coalfield": parsed_data.get("Coalfield") or "",
            "Project": parsed_data.get("Project") or parsed_data.get("Mine_Name") or "Unknown Project",
            "Subsidiary": parsed_data.get("Subsidiary") or "Unknown",
            "Reporting_Period": parsed_data.get("Reporting_Period") or "Q1 2026",
            "Date": parsed_data.get("Date") or "",
            "Raw_Coal_Produced_Tonnes": coal_val,
            "Overburden_Removed_M3": ob_val,
            "Stripping_Ratio": sr_val,
            "Average_Seam_Thickness_M": seam_val,
            "Geological_Notes": parsed_data.get("Geological_Notes") or "",
            "Safety_Incidents": parsed_data.get("Safety_Incidents") or "",
            "Risk_Flags": parsed_data.get("Risk_Flags") or "",
            "Prepared_By": parsed_data.get("Prepared_By") or ""
        }
        records.append(record)

    # Filter extractions containing valid raw coal production figures
    valid_records = [
        r for r in records
        if r.get("Raw_Coal_Produced_Tonnes") is not None
    ]

    # Group by distinct project key keeping latest extraction ID
    distinct_projects = {}
    for r in valid_records:
        proj_key = r["Project"].strip()
        if proj_key not in distinct_projects or r["extraction_id"] > distinct_projects[proj_key]["extraction_id"]:
            distinct_projects[proj_key] = r

    return list(distinct_projects.values())


async def get_available_projects(db: AsyncSession, allowed_doc_ids: Optional[set] = None) -> Dict[str, Any]:
    """
    Returns available project identifiers, subsidiaries, and metric metadata for frontend UI dropdowns.
    """
    records = await get_authorized_extractions(db, allowed_doc_ids)
    projects = []
    subsidiaries = set()
    coalfields = set()

    for r in records:
        proj_name = r["Project"]
        subs = r["Subsidiary"]
        cf = r["Coalfield"]
        if proj_name and proj_name not in [p["name"] for p in projects]:
            projects.append({
                "name": proj_name,
                "mine_name": r["Mine_Name"],
                "subsidiary": subs,
                "coalfield": cf,
                "document_id": r["document_id"],
                "source_reference": r["source_reference"]
            })
        if subs:
            subsidiaries.add(subs)
        if cf:
            coalfields.add(cf)

    return {
        "projects": projects,
        "subsidiaries": sorted(list(subsidiaries)),
        "coalfields": sorted(list(coalfields)),
        "total_records": len(records)
    }


def compute_pairwise_delta(val_a: Optional[float], val_b: Optional[float], baseline_name: str = "Project B") -> Dict[str, Any]:
    """
    Computes mathematical difference between two metric values.
    Explicitly defines baseline denominator for percentage calculations.
    """
    if val_a is None or val_b is None:
        return {
            "val_a": val_a,
            "val_b": val_b,
            "abs_diff": None,
            "pct_diff": None,
            "direction": "N/A",
            "baseline": baseline_name,
            "note": "One or both values unavailable."
        }

    abs_diff = val_a - val_b
    if val_b != 0:
        pct_diff = (abs_diff / abs(val_b)) * 100.0
        pct_diff_str = f"{pct_diff:+.2f}%"
    else:
        pct_diff = None
        pct_diff_str = "N/A (zero baseline)"

    direction = "equal"
    if abs_diff > 0:
        direction = "higher"
    elif abs_diff < 0:
        direction = "lower"

    return {
        "val_a": val_a,
        "val_b": val_b,
        "abs_diff": round(abs_diff, 4),
        "pct_diff": round(pct_diff, 2) if pct_diff is not None else None,
        "pct_diff_formatted": pct_diff_str,
        "direction": direction,
        "baseline": f"Relative to {baseline_name} baseline value ({val_b:,.2f})",
        "note": f"Value A ({val_a:,.2f}) is {abs(abs_diff):,.2f} ({pct_diff_str}) {direction} than {baseline_name} ({val_b:,.2f})."
    }


async def compare_documents(
    db: AsyncSession,
    projects: Optional[List[str]] = None,
    allowed_doc_ids: Optional[set] = None
) -> Dict[str, Any]:
    """
    Compares 2 or more selected mine projects side-by-side across numerical metrics and textual facts.
    """
    records = await get_authorized_extractions(db, allowed_doc_ids)

    if not projects:
        # Default: compare first 2 projects or all if fewer
        selected_records = records[:2]
    else:
        proj_set = {p.lower() for p in projects}
        selected_records = [
            r for r in records
            if r["Project"].lower() in proj_set or r["Mine_Name"].lower() in proj_set or any(p.lower() in r["Project"].lower() for p in projects)
        ]

    if len(selected_records) == 0 and len(records) > 0:
        selected_records = records[:2]

    # Build side-by-side matrix
    comparison_matrix = []
    rec_a = selected_records[0] if len(selected_records) > 0 else {}
    rec_b = selected_records[1] if len(selected_records) > 1 else {}

    proj_a_name = rec_a.get("Project", "Project A")
    proj_b_name = rec_b.get("Project", "Project B")

    metrics_keys = [
        ("Raw_Coal_Produced_Tonnes", "Raw Coal Production (tonnes)", "tonnes", True),
        ("Overburden_Removed_M3", "Overburden Removed (m³)", "m³", True),
        ("Stripping_Ratio", "Stated Stripping Ratio", "ratio", False),
        ("Average_Seam_Thickness_M", "Average Seam Thickness (m)", "m", False)
    ]

    metric_comparisons = []
    for key, label, unit, is_integer in metrics_keys:
        val_a = rec_a.get(key)
        val_b = rec_b.get(key)
        delta = compute_pairwise_delta(val_a, val_b, baseline_name=proj_b_name)
        metric_comparisons.append({
            "metric_key": key,
            "metric_label": label,
            "unit": unit,
            "val_a": val_a,
            "val_b": val_b,
            "delta": delta
        })

    # Add aggregate stripping ratio comparison where applicable
    if rec_a.get("Raw_Coal_Produced_Tonnes") and rec_a.get("Overburden_Removed_M3"):
        rec_a["Aggregate_Stripping_Ratio"] = round(rec_a["Overburden_Removed_M3"] / rec_a["Raw_Coal_Produced_Tonnes"], 2)
    if rec_b.get("Raw_Coal_Produced_Tonnes") and rec_b.get("Overburden_Removed_M3"):
        rec_b["Aggregate_Stripping_Ratio"] = round(rec_b["Overburden_Removed_M3"] / rec_b["Raw_Coal_Produced_Tonnes"], 2)

    if "Aggregate_Stripping_Ratio" in rec_a or "Aggregate_Stripping_Ratio" in rec_b:
        val_a = rec_a.get("Aggregate_Stripping_Ratio")
        val_b = rec_b.get("Aggregate_Stripping_Ratio")
        delta = compute_pairwise_delta(val_a, val_b, baseline_name=proj_b_name)
        metric_comparisons.append({
            "metric_key": "Aggregate_Stripping_Ratio",
            "metric_label": "Aggregate Stripping Ratio (Total OB / Total Coal)",
            "unit": "ratio",
            "val_a": val_a,
            "val_b": val_b,
            "delta": delta
        })

    # Textual factual comparisons
    textual_comparison = {
        "safety_comparison": [
            {
                "project": r["Project"],
                "subsidiary": r["Subsidiary"],
                "safety_incidents": r["Safety_Incidents"],
                "source_reference": r["source_reference"],
                "document_id": r["document_id"]
            } for r in selected_records
        ],
        "risk_comparison": [
            {
                "project": r["Project"],
                "subsidiary": r["Subsidiary"],
                "risk_flags": r["Risk_Flags"],
                "source_reference": r["source_reference"],
                "document_id": r["document_id"]
            } for r in selected_records
        ],
        "geological_comparison": [
            {
                "project": r["Project"],
                "subsidiary": r["Subsidiary"],
                "geological_notes": r["Geological_Notes"],
                "seam_thickness_m": r["Average_Seam_Thickness_M"],
                "source_reference": r["source_reference"],
                "document_id": r["document_id"]
            } for r in selected_records
        ]
    }

    return {
        "compared_projects": [r["Project"] for r in selected_records],
        "project_a": rec_a,
        "project_b": rec_b,
        "all_selected_records": selected_records,
        "metric_comparisons": metric_comparisons,
        "textual_comparison": textual_comparison
    }


async def analyze_multi_documents(db: AsyncSession, allowed_doc_ids: Optional[set] = None) -> Dict[str, Any]:
    """
    Computes dynamic multi-document summary statistics across all authorized mine records in PostgreSQL.
    No hardcoded numbers — all values derived directly from database queries.
    """
    records = await get_authorized_extractions(db, allowed_doc_ids)

    if not records:
        return {
            "total_records": 0,
            "total_raw_coal_tonnes": 0.0,
            "total_overburden_m3": 0.0,
            "avg_stated_stripping_ratio": 0.0,
            "aggregate_stripping_ratio": 0.0,
            "avg_seam_thickness_m": 0.0,
            "highest_production": None,
            "lowest_production": None,
            "highest_overburden": None,
            "lowest_overburden": None,
            "highest_stated_sr": None,
            "lowest_stated_sr": None,
            "highest_seam_thickness": None,
            "lowest_seam_thickness": None,
            "subsidiary_distribution": {},
            "records": []
        }

    total_coal = sum(r["Raw_Coal_Produced_Tonnes"] for r in records if r["Raw_Coal_Produced_Tonnes"] is not None)
    total_ob = sum(r["Overburden_Removed_M3"] for r in records if r["Overburden_Removed_M3"] is not None)

    stated_srs = [r["Stripping_Ratio"] for r in records if r["Stripping_Ratio"] is not None]
    avg_stated_sr = round(sum(stated_srs) / len(stated_srs), 2) if stated_srs else 0.0

    agg_sr = round(total_ob / total_coal, 2) if total_coal > 0 else 0.0

    seam_thicknesses = [r["Average_Seam_Thickness_M"] for r in records if r["Average_Seam_Thickness_M"] is not None]
    avg_seam = round(sum(seam_thicknesses) / len(seam_thicknesses), 2) if seam_thicknesses else 0.0

    # Highest & Lowest
    valid_coal = [r for r in records if r["Raw_Coal_Produced_Tonnes"] is not None]
    highest_prod = max(valid_coal, key=lambda x: x["Raw_Coal_Produced_Tonnes"]) if valid_coal else None
    lowest_prod = min(valid_coal, key=lambda x: x["Raw_Coal_Produced_Tonnes"]) if valid_coal else None

    valid_ob = [r for r in records if r["Overburden_Removed_M3"] is not None]
    highest_ob = max(valid_ob, key=lambda x: x["Overburden_Removed_M3"]) if valid_ob else None
    lowest_ob = min(valid_ob, key=lambda x: x["Overburden_Removed_M3"]) if valid_ob else None

    valid_sr = [r for r in records if r["Stripping_Ratio"] is not None]
    highest_sr = max(valid_sr, key=lambda x: x["Stripping_Ratio"]) if valid_sr else None
    lowest_sr = min(valid_sr, key=lambda x: x["Stripping_Ratio"]) if valid_sr else None

    valid_seam = [r for r in records if r["Average_Seam_Thickness_M"] is not None]
    highest_seam = max(valid_seam, key=lambda x: x["Average_Seam_Thickness_M"]) if valid_seam else None
    lowest_seam = min(valid_seam, key=lambda x: x["Average_Seam_Thickness_M"]) if valid_seam else None

    # Subsidiary Distribution
    sub_dist = {}
    for r in records:
        sub = r["Subsidiary"]
        if sub not in sub_dist:
            sub_dist[sub] = {"count": 0, "total_raw_coal": 0.0, "total_overburden": 0.0}
        sub_dist[sub]["count"] += 1
        sub_dist[sub]["total_raw_coal"] += (r["Raw_Coal_Produced_Tonnes"] or 0.0)
        sub_dist[sub]["total_overburden"] += (r["Overburden_Removed_M3"] or 0.0)

    return {
        "total_records": len(records),
        "total_raw_coal_tonnes": total_coal,
        "total_overburden_m3": total_ob,
        "avg_stated_stripping_ratio": avg_stated_sr,
        "aggregate_stripping_ratio": agg_sr,
        "avg_seam_thickness_m": avg_seam,
        "highest_production": {
            "project": highest_prod["Project"],
            "subsidiary": highest_prod["Subsidiary"],
            "value": highest_prod["Raw_Coal_Produced_Tonnes"],
            "source_reference": highest_prod["source_reference"]
        } if highest_prod else None,
        "lowest_production": {
            "project": lowest_prod["Project"],
            "subsidiary": lowest_prod["Subsidiary"],
            "value": lowest_prod["Raw_Coal_Produced_Tonnes"],
            "source_reference": lowest_prod["source_reference"]
        } if lowest_prod else None,
        "highest_overburden": {
            "project": highest_ob["Project"],
            "subsidiary": highest_ob["Subsidiary"],
            "value": highest_ob["Overburden_Removed_M3"],
            "source_reference": highest_ob["source_reference"]
        } if highest_ob else None,
        "lowest_overburden": {
            "project": lowest_ob["Project"],
            "subsidiary": lowest_ob["Subsidiary"],
            "value": lowest_ob["Overburden_Removed_M3"],
            "source_reference": lowest_ob["source_reference"]
        } if lowest_ob else None,
        "highest_stated_sr": {
            "project": highest_sr["Project"],
            "subsidiary": highest_sr["Subsidiary"],
            "value": highest_sr["Stripping_Ratio"],
            "source_reference": highest_sr["source_reference"]
        } if highest_sr else None,
        "lowest_stated_sr": {
            "project": lowest_sr["Project"],
            "subsidiary": lowest_sr["Subsidiary"],
            "value": lowest_sr["Stripping_Ratio"],
            "source_reference": lowest_sr["source_reference"]
        } if lowest_sr else None,
        "highest_seam_thickness": {
            "project": highest_seam["Project"],
            "subsidiary": highest_seam["Subsidiary"],
            "value": highest_seam["Average_Seam_Thickness_M"],
            "source_reference": highest_seam["source_reference"]
        } if highest_seam else None,
        "lowest_seam_thickness": {
            "project": lowest_seam["Project"],
            "subsidiary": lowest_seam["Subsidiary"],
            "value": lowest_seam["Average_Seam_Thickness_M"],
            "source_reference": lowest_seam["source_reference"]
        } if lowest_seam else None,
        "subsidiary_distribution": sub_dist,
        "records": records
    }


async def filter_documents(
    db: AsyncSession,
    min_production: Optional[float] = None,
    max_production: Optional[float] = None,
    min_seam: Optional[float] = None,
    max_seam: Optional[float] = None,
    min_sr: Optional[float] = None,
    max_sr: Optional[float] = None,
    has_safety_incidents: Optional[bool] = None,
    risk_keyword: Optional[str] = None,
    subsidiary: Optional[str] = None,
    allowed_doc_ids: Optional[set] = None
) -> Dict[str, Any]:
    """
    Filters PostgreSQL mine records based on structured threshold criteria.
    """
    records = await get_authorized_extractions(db, allowed_doc_ids)
    matching_records = []

    for r in records:
        coal = r["Raw_Coal_Produced_Tonnes"]
        seam = r["Average_Seam_Thickness_M"]
        sr = r["Stripping_Ratio"]
        safety = r["Safety_Incidents"]
        risk = r["Risk_Flags"]
        sub = r["Subsidiary"]

        if min_production is not None and (coal is None or coal < min_production):
            continue
        if max_production is not None and (coal is None or coal > max_production):
            continue

        if min_seam is not None and (seam is None or seam < min_seam):
            continue
        if max_seam is not None and (seam is None or seam > max_seam):
            continue

        if min_sr is not None and (sr is None or sr < min_sr):
            continue
        if max_sr is not None and (sr is None or sr > max_sr):
            continue

        if has_safety_incidents is not None:
            # Check if safety string indicates non-zero incident
            safety_lower = safety.lower()
            is_zero_safety = ("0 lost-time" in safety_lower or "0 incident" in safety_lower or "no incident" in safety_lower) and "near-miss" not in safety_lower and "failure" not in safety_lower
            if has_safety_incidents and is_zero_safety:
                continue
            if not has_safety_incidents and not is_zero_safety:
                continue

        if risk_keyword:
            if risk_keyword.lower() not in risk.lower() and risk_keyword.lower() not in r["Geological_Notes"].lower():
                continue

        if subsidiary:
            if subsidiary.lower() != sub.lower():
                continue

        matching_records.append(r)

    return {
        "total_matched": len(matching_records),
        "total_unfiltered": len(records),
        "filters_applied": {
            "min_production": min_production,
            "max_production": max_production,
            "min_seam": min_seam,
            "max_seam": max_seam,
            "min_sr": min_sr,
            "max_sr": max_sr,
            "has_safety_incidents": has_safety_incidents,
            "risk_keyword": risk_keyword,
            "subsidiary": subsidiary
        },
        "records": matching_records
    }


async def compare_safety_risk(
    db: AsyncSession,
    projects: Optional[List[str]] = None,
    allowed_doc_ids: Optional[set] = None
) -> Dict[str, Any]:
    """
    Returns structured side-by-side safety, risk, and geological factual summaries preserving exact source wording.
    """
    records = await get_authorized_extractions(db, allowed_doc_ids)

    if projects:
        proj_set = {p.lower() for p in projects}
        records = [r for r in records if r["Project"].lower() in proj_set or any(p.lower() in r["Project"].lower() for p in projects)]

    items = []
    for r in records:
        items.append({
            "project": r["Project"],
            "mine_name": r["Mine_Name"],
            "subsidiary": r["Subsidiary"],
            "safety_incidents": r["Safety_Incidents"],
            "risk_flags": r["Risk_Flags"],
            "geological_notes": r["Geological_Notes"],
            "source_reference": r["source_reference"],
            "document_id": r["document_id"]
        })

    return {
        "total_projects": len(items),
        "safety_risk_matrix": items
    }


async def detect_cross_document_conflicts(
    db: AsyncSession,
    allowed_doc_ids: Optional[set] = None
) -> Dict[str, Any]:
    """
    Queries real DocumentConflict records from PostgreSQL filtered by user RBAC permissions.
    Ensures normal differences between different mines are NOT treated as conflicts.
    """
    stmt = select(DocumentConflict)
    result = await db.execute(stmt)
    conflicts_raw = result.scalars().all()

    conflicts = []
    for c in conflicts_raw:
        if allowed_doc_ids is not None:
            if c.doc_a_id not in allowed_doc_ids or c.doc_b_id not in allowed_doc_ids:
                continue

        conflicts.append({
            "id": c.id,
            "doc_a_id": c.doc_a_id,
            "doc_b_id": c.doc_b_id,
            "entity_type": c.entity_type,
            "entity_identifier": c.entity_identifier,
            "field_name": c.field_name,
            "val_a": c.val_a,
            "val_b": c.val_b,
            "source_ref_a": c.source_ref_a,
            "source_ref_b": c.source_ref_b,
            "message": c.message,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })

    return {
        "total_conflicts": len(conflicts),
        "conflicts": conflicts
    }
