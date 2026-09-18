"""
Dashboard Analytics Service (STEP 12.1 & STEP 12.3)
Executes SQL aggregation queries against PostgreSQL database to compile real analytics
for the CMPDI/CIL Document AI system.
Supports interactive date filtering (7d, 30d, 90d, all) and 4-year coal data readiness.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Document,
    DocumentChunk,
    StructuredExtraction,
    ValidationResult,
    DocumentConflict,
    Report,
    TopicAnalysis,
    AuditLog
)
from app.services.vector_search import get_index_status

logger = logging.getLogger("dashboard_service")

import re

def _safe_float(val: Any, default: float = 0.0) -> float:
    if not val:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).replace(",", "").strip()
    match = re.search(r"[-+]?\d*\.\d+|\d+", val_str)
    if match:
        return float(match.group(0))
    return default


def get_cutoff_date(date_range: str) -> Optional[datetime]:
    """Calculates UTC cutoff datetime based on requested date range string."""
    now = datetime.utcnow()
    if date_range == "7d":
        return now - timedelta(days=7)
    elif date_range == "30d":
        return now - timedelta(days=30)
    elif date_range == "90d":
        return now - timedelta(days=90)
    return None


async def get_dashboard_analytics(db: AsyncSession, date_range: str = "all", user: Optional[Any] = None) -> Dict[str, Any]:
    """
    Queries PostgreSQL for real-time aggregated metrics across all Document AI tables.
    Supports optional date filtering (all, 7d, 30d, 90d) and RBAC role filtering.
    Returns a structured dictionary matching DashboardOverviewResponse schema.
    """
    cutoff = get_cutoff_date(date_range)
    is_hod = user and getattr(user, "role", None) == "HOD"

    # Fetch confidential document IDs if not HOD
    confidential_doc_ids: set = set()
    if not is_hod:
        conf_res = await db.execute(select(Document.id).where(Document.is_confidential == True))
        confidential_doc_ids = set(conf_res.scalars().all())

    # Helper function to filter queries by non-confidential documents for non-HOD users
    def apply_doc_filter(stmt, doc_model=Document):
        if not is_hod:
            stmt = stmt.where(doc_model.is_confidential == False)
        if cutoff:
            stmt = stmt.where(doc_model.created_at >= cutoff)
        return stmt

    # ── 1. OVERVIEW METRICS ──────────────────────────────────────────────────
    doc_base = apply_doc_filter(select(func.count(Document.id)))
    total_docs = (await db.execute(doc_base)).scalar() or 0

    proc_base = apply_doc_filter(select(func.count(Document.id)).where(Document.processing_status == "completed"))
    completed_docs = (await db.execute(proc_base)).scalar() or 0

    ing_base = apply_doc_filter(select(func.count(Document.id)).where(Document.processing_status == "processing"))
    processing_docs = (await db.execute(ing_base)).scalar() or 0

    fail_base = apply_doc_filter(select(func.count(Document.id)).where(Document.processing_status == "failed"))
    failed_docs = (await db.execute(fail_base)).scalar() or 0

    pend_base = apply_doc_filter(select(func.count(Document.id)).where(Document.processing_status == "pending"))
    pending_docs = (await db.execute(pend_base)).scalar() or 0


    # Chunks and Extractions
    chunk_base = select(func.count(DocumentChunk.id))
    if cutoff:
        chunk_base = chunk_base.where(DocumentChunk.created_at >= cutoff)
    total_chunks = (await db.execute(chunk_base)).scalar() or 0

    ext_base = select(func.count(StructuredExtraction.id))
    if cutoff:
        ext_base = ext_base.where(StructuredExtraction.created_at >= cutoff)
    total_extractions = (await db.execute(ext_base)).scalar() or 0

    # Validation & Conflicts
    err_base = select(func.count(ValidationResult.id)).where(ValidationResult.severity == "error")
    if cutoff:
        err_base = err_base.where(ValidationResult.created_at >= cutoff)
    val_errors = (await db.execute(err_base)).scalar() or 0

    warn_base = select(func.count(ValidationResult.id)).where(ValidationResult.severity == "warning")
    if cutoff:
        warn_base = warn_base.where(ValidationResult.created_at >= cutoff)
    val_warnings = (await db.execute(warn_base)).scalar() or 0

    conf_base = select(func.count(DocumentConflict.id))
    if cutoff:
        conf_base = conf_base.where(DocumentConflict.created_at >= cutoff)
    total_conflicts = (await db.execute(conf_base)).scalar() or 0

    rep_base = select(func.count(Report.id))
    if cutoff:
        rep_base = rep_base.where(Report.created_at >= cutoff)
    total_reports = (await db.execute(rep_base)).scalar() or 0

    top_base = select(func.count(TopicAnalysis.id))
    if cutoff:
        top_base = top_base.where(TopicAnalysis.created_at >= cutoff)
    total_topics = (await db.execute(top_base)).scalar() or 0

    audit_base = select(func.count(AuditLog.id)).where(AuditLog.action.ilike("%query%"))
    if cutoff:
        audit_base = audit_base.where(AuditLog.timestamp >= cutoff)
    ai_queries = (await db.execute(audit_base)).scalar() or 0

    overview = {
        "total_documents": total_docs,
        "processed_documents": completed_docs,
        "processing_documents": processing_docs,
        "failed_documents": failed_docs,
        "pending_documents": pending_docs,
        "total_chunks": total_chunks,
        "total_extractions": total_extractions,
        "total_validation_errors": val_errors,
        "total_validation_warnings": val_warnings,
        "total_conflicts": total_conflicts,
        "total_reports": total_reports,
        "total_topics": total_topics,
        "total_ai_queries": ai_queries
    }

    # ── 2. DOCUMENT ANALYTICS ────────────────────────────────────────────────
    type_stmt = select(Document.type, func.count(Document.id)).group_by(Document.type)
    if cutoff:
        type_stmt = type_stmt.where(Document.created_at >= cutoff)
    type_res = await db.execute(type_stmt)
    doc_types = [{"type": row[0] or "Unknown", "count": row[1]} for row in type_res.all()]

    status_stmt = select(Document.processing_status, func.count(Document.id)).group_by(Document.processing_status)
    if cutoff:
        status_stmt = status_stmt.where(Document.created_at >= cutoff)
    status_res = await db.execute(status_stmt)
    statuses = [{"status": row[0] or "pending", "count": row[1]} for row in status_res.all()]

    if cutoff:
        timeline_res = await db.execute(
            text("SELECT to_char(created_at, 'YYYY-MM-DD') AS day_str, COUNT(id) AS count FROM documents WHERE created_at >= :cutoff GROUP BY 1 ORDER BY 1;"),
            {"cutoff": cutoff}
        )
    else:
        timeline_res = await db.execute(
            text("SELECT to_char(created_at, 'YYYY-MM') AS month_str, COUNT(id) AS count FROM documents GROUP BY 1 ORDER BY 1;")
        )
    timeline = [{"date": row[0] or "Unknown", "count": row[1]} for row in timeline_res.all()]

    dept_stmt = select(Document.source, func.count(Document.id)).group_by(Document.source)
    if cutoff:
        dept_stmt = dept_stmt.where(Document.created_at >= cutoff)
    dept_res = await db.execute(dept_stmt)
    departments = [{"department": row[0] if row[0] else "Unspecified", "count": row[1]} for row in dept_res.all()]

    documents_analytics = {
        "document_types": doc_types,
        "statuses": statuses,
        "timeline": timeline,
        "departments": departments
    }

    # ── 3. VALIDATION & CONFLICT ANALYTICS ───────────────────────────────────
    val_tot_stmt = select(func.count(ValidationResult.id))
    if cutoff:
        val_tot_stmt = val_tot_stmt.where(ValidationResult.created_at >= cutoff)
    total_val_results = (await db.execute(val_tot_stmt)).scalar() or 0

    val_valid_stmt = select(func.count(ValidationResult.id)).where(ValidationResult.severity.notin_(["error", "warning"]))
    if cutoff:
        val_valid_stmt = val_valid_stmt.where(ValidationResult.created_at >= cutoff)
    valid_val_results = (await db.execute(val_valid_stmt)).scalar() or 0

    conf_stmt = select(DocumentConflict).order_by(DocumentConflict.id.desc()).limit(10)
    if cutoff:
        conf_stmt = select(DocumentConflict).where(DocumentConflict.created_at >= cutoff).order_by(DocumentConflict.id.desc()).limit(10)
    conflict_res = await db.execute(conf_stmt)
    recent_conflicts_objs = conflict_res.scalars().all()
    recent_conflicts = [
        {
            "id": c.id,
            "doc_a_id": c.doc_a_id,
            "doc_b_id": c.doc_b_id,
            "entity_type": c.entity_type,
            "field_name": c.field_name,
            "val_a": c.val_a,
            "val_b": c.val_b,
            "source_ref_a": c.source_ref_a,
            "source_ref_b": c.source_ref_b,
            "message": c.message,
            "created_at": c.created_at
        }
        for c in recent_conflicts_objs
    ]

    validation_analytics = {
        "total_validation_results": total_val_results,
        "errors": val_errors,
        "warnings": val_warnings,
        "valid_results": valid_val_results,
        "total_conflicts": total_conflicts,
        "recent_conflicts": recent_conflicts
    }

    # ── 4. REPORT ANALYTICS ──────────────────────────────────────────────────
    rep_comp_stmt = select(func.count(Report.id)).where(Report.status == "completed")
    if cutoff:
        rep_comp_stmt = rep_comp_stmt.where(Report.created_at >= cutoff)
    completed_reports = (await db.execute(rep_comp_stmt)).scalar() or 0

    rep_fail_stmt = select(func.count(Report.id)).where(Report.status == "failed")
    if cutoff:
        rep_fail_stmt = rep_fail_stmt.where(Report.created_at >= cutoff)
    failed_reports = (await db.execute(rep_fail_stmt)).scalar() or 0

    rep_pend_stmt = select(func.count(Report.id)).where(Report.status == "pending")
    if cutoff:
        rep_pend_stmt = rep_pend_stmt.where(Report.created_at >= cutoff)
    pending_reports = (await db.execute(rep_pend_stmt)).scalar() or 0

    report_type_stmt = select(Report.report_type, func.count(Report.id)).group_by(Report.report_type)
    if cutoff:
        report_type_stmt = report_type_stmt.where(Report.created_at >= cutoff)
    report_type_res = await db.execute(report_type_stmt)
    report_by_type = [{"type": row[0] or "general_summary", "count": row[1]} for row in report_type_res.all()]

    recent_rep_stmt = select(Report).order_by(Report.id.desc()).limit(5)
    if cutoff:
        recent_rep_stmt = select(Report).where(Report.created_at >= cutoff).order_by(Report.id.desc()).limit(5)
    recent_report_res = await db.execute(recent_rep_stmt)
    recent_reports_objs = recent_report_res.scalars().all()
    recent_reports = [
        {
            "id": r.id,
            "report_title": r.report_title,
            "report_type": r.report_type,
            "status": r.status,
            "created_by": r.created_by,
            "created_at": r.created_at,
            "completed_at": r.completed_at
        }
        for r in recent_reports_objs
    ]

    report_analytics = {
        "total_reports": total_reports,
        "completed_reports": completed_reports,
        "failed_reports": failed_reports,
        "pending_reports": pending_reports,
        "by_type": report_by_type,
        "recent_reports": recent_reports
    }

    # ── 5. TOPIC ANALYTICS ───────────────────────────────────────────────────
    topics_stmt = select(TopicAnalysis).order_by(TopicAnalysis.id.desc()).limit(5)
    if cutoff:
        topics_stmt = select(TopicAnalysis).where(TopicAnalysis.created_at >= cutoff).order_by(TopicAnalysis.id.desc()).limit(5)
    topics_res = await db.execute(topics_stmt)
    recent_topic_objs = topics_res.scalars().all()

    all_analyzed_doc_ids = set()
    recent_analyses = []
    dominant_topics = []

    for ta in recent_topic_objs:
        doc_ids = []
        if ta.source_document_ids:
            try:
                doc_ids = json.loads(ta.source_document_ids) if isinstance(ta.source_document_ids, str) else ta.source_document_ids
                if isinstance(doc_ids, list):
                    for d in doc_ids:
                        all_analyzed_doc_ids.add(d)
            except Exception:
                pass

        word_freqs = []
        if ta.word_frequencies:
            try:
                word_freqs = json.loads(ta.word_frequencies) if isinstance(ta.word_frequencies, str) else ta.word_frequencies
            except Exception:
                pass
        top_terms = [wf.get("term") for wf in word_freqs[:5]] if isinstance(word_freqs, list) else []

        t_clusters = []
        if ta.topics:
            try:
                t_clusters = json.loads(ta.topics) if isinstance(ta.topics, str) else ta.topics
            except Exception:
                pass

        if isinstance(t_clusters, list):
            for t in t_clusters:
                if isinstance(t, dict):
                    dominant_topics.append(t)

        recent_analyses.append({
            "id": ta.id,
            "created_at": ta.created_at,
            "document_count": len(doc_ids) if isinstance(doc_ids, list) else 0,
            "topic_count": len(t_clusters) if isinstance(t_clusters, list) else 0,
            "top_terms": top_terms
        })

    topic_analytics = {
        "total_analyses": total_topics,
        "documents_analyzed": len(all_analyzed_doc_ids),
        "recent_analyses": recent_analyses,
        "dominant_topics": dominant_topics[:10]
    }

    # ── 6. KNOWLEDGE BASE ANALYTICS ──────────────────────────────────────────
    try:
        faiss_status = get_index_status()
    except Exception as exc:
        logger.error(f"Error reading FAISS status: {exc}")
        faiss_status = {"status": "error", "total_vectors": 0, "dimension": 384, "model_name": "all-MiniLM-L6-v2"}

    indexed_vectors = faiss_status.get("total_vectors", 0)
    sync_status = "synchronized" if (total_chunks == indexed_vectors and total_chunks > 0) else ("empty" if total_chunks == 0 else "desynchronized")

    knowledge_base = {
        "status": faiss_status.get("status", "unknown"),
        "total_chunks": total_chunks,
        "indexed_vectors": indexed_vectors,
        "dimension": faiss_status.get("dimension", 384),
        "model_name": faiss_status.get("model_name", "all-MiniLM-L6-v2"),
        "sync_status": sync_status
    }

    # ── 7. RECENT ACTIVITY ───────────────────────────────────────────────────
    activity_items = []

    # Documents activity
    latest_docs_stmt = select(Document).order_by(Document.id.desc()).limit(5)
    if cutoff:
        latest_docs_stmt = select(Document).where(Document.created_at >= cutoff).order_by(Document.id.desc()).limit(5)
    latest_docs = (await db.execute(latest_docs_stmt)).scalars().all()
    for d in latest_docs:
        activity_items.append({
            "type": "document",
            "title": f"Document Upload: {d.original_filename}",
            "timestamp": d.created_at or datetime.utcnow(),
            "status": d.processing_status or "uploaded",
            "id": d.id,
            "details": f"Type: {d.type.upper()}, Source: {d.source or 'N/A'}"
        })

    # Reports activity
    latest_rep_stmt = select(Report).order_by(Report.id.desc()).limit(5)
    if cutoff:
        latest_rep_stmt = select(Report).where(Report.created_at >= cutoff).order_by(Report.id.desc()).limit(5)
    latest_reports = (await db.execute(latest_rep_stmt)).scalars().all()
    for r in latest_reports:
        activity_items.append({
            "type": "report",
            "title": f"Report Generated: {r.report_title}",
            "timestamp": r.created_at or datetime.utcnow(),
            "status": r.status or "completed",
            "id": r.id,
            "details": f"Type: {r.report_type.replace('_', ' ').title()}"
        })

    # Topics activity
    latest_top_stmt = select(TopicAnalysis).order_by(TopicAnalysis.id.desc()).limit(5)
    if cutoff:
        latest_top_stmt = select(TopicAnalysis).where(TopicAnalysis.created_at >= cutoff).order_by(TopicAnalysis.id.desc()).limit(5)
    latest_topics_res = (await db.execute(latest_top_stmt)).scalars().all()
    for t in latest_topics_res:
        activity_items.append({
            "type": "topic_analysis",
            "title": f"Topic Intelligence Run #{t.id}",
            "timestamp": t.created_at or datetime.utcnow(),
            "status": "completed",
            "id": t.id,
            "details": f"Source Docs: {t.source_document_ids}"
        })

    # Audit log activity
    latest_aud_stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(5)
    if cutoff:
        latest_aud_stmt = select(AuditLog).where(AuditLog.timestamp >= cutoff).order_by(AuditLog.id.desc()).limit(5)
    latest_audits = (await db.execute(latest_aud_stmt)).scalars().all()
    for a in latest_audits:
        activity_items.append({
            "type": "audit",
            "title": f"Audit Action: {a.action}",
            "timestamp": a.timestamp or datetime.utcnow(),
            "status": "logged",
            "id": a.id,
            "details": a.details or ""
        })

    # Sort activity items by timestamp descending
    activity_items.sort(key=lambda x: x["timestamp"] if x["timestamp"] else datetime.min, reverse=True)
    recent_activity = activity_items[:10]

    # ── 8. COAL PRODUCTION & MINE OPERATIONS ANALYTICS ──────────────────────
    coal_ext_stmt = select(StructuredExtraction).where(
        StructuredExtraction.entity_type.in_(["production_record", "coal_production", "production_metrics", "mining_summary"])
    )
    if not is_hod:
        coal_ext_stmt = coal_ext_stmt.join(Document, StructuredExtraction.document_id == Document.id).where(Document.is_confidential == False)

    coal_ext_res = await db.execute(coal_ext_stmt)
    coal_rows = coal_ext_res.scalars().all()

    coal_analytics = {
        "has_coal_data": False,
        "total_production_tonnes": 0.0,
        "total_production_mt": 0.0,
        "total_overburden_m3": 0.0,
        "avg_stripping_ratio": 0.0,
        "avg_seam_thickness_m": 0.0,
        "mine_records_count": 0,
        "metrics": [],
        "by_subsidiary": [],
        "by_mine": [],
        "risk_flags_summary": [],
        "safety_incidents_summary": [],
        "geological_notes_summary": []
    }

    if coal_rows:
        mine_list = []
        parsed_metrics = []
        total_coal = 0.0
        total_ob = 0.0
        seam_thicknesses = []
        stripping_ratios = []
        subsidiary_map = {}
        risk_flags = []
        safety_incidents = []
        geological_notes = []

        # Deduplicate to keep latest record per distinct mine
        latest_mine_rows = {}
        for row in coal_rows:
            try:
                p_data = json.loads(row.data) if isinstance(row.data, str) else row.data
                if isinstance(p_data, dict):
                    mine_name = p_data.get("Mine_Name") or p_data.get("mine_name") or p_data.get("period", f"Record #{row.id}")
                    # Later row IDs are newer records
                    latest_mine_rows[mine_name] = (row, p_data)
            except Exception:
                pass

        for mine_name, (row, p_data) in latest_mine_rows.items():
            try:
                subsidiary = p_data.get("Subsidiary") or "CIL"
                
                # Parse numeric values cleanly
                coal_raw = p_data.get("Raw_Coal_Produced_Tonnes") or p_data.get("actual_mt") or 0.0
                coal_t = _safe_float(coal_raw)
                
                ob_raw = p_data.get("Overburden_Removed_M3") or 0.0
                ob_m3 = _safe_float(ob_raw)

                sr_raw = p_data.get("Stripping_Ratio") or (round(ob_m3 / coal_t, 2) if coal_t > 0 else 0.0)
                sr = _safe_float(sr_raw)

                seam_raw = p_data.get("Average_Seam_Thickness_M") or 0.0
                seam = _safe_float(seam_raw)

                total_coal += coal_t
                total_ob += ob_m3
                if sr > 0: stripping_ratios.append(sr)
                if seam > 0: seam_thicknesses.append(seam)

                if subsidiary not in subsidiary_map:
                    subsidiary_map[subsidiary] = {
                        "subsidiary": subsidiary,
                        "raw_coal_tonnes": 0.0,
                        "overburden_m3": 0.0,
                        "mine_count": 0
                    }
                subsidiary_map[subsidiary]["raw_coal_tonnes"] += coal_t
                subsidiary_map[subsidiary]["overburden_m3"] += ob_m3
                subsidiary_map[subsidiary]["mine_count"] += 1

                mine_record = {
                    "mine_name": mine_name,
                    "coalfield": p_data.get("Coalfield", ""),
                    "project": p_data.get("Project", ""),
                    "subsidiary": subsidiary,
                    "raw_coal_tonnes": coal_t,
                    "overburden_m3": ob_m3,
                    "stripping_ratio": sr,
                    "seam_thickness_m": seam,
                    "reporting_period": p_data.get("Reporting_Period", "Q1 2026"),
                    "date": p_data.get("Date", ""),
                    "prepared_by": p_data.get("Prepared_By", "")
                }
                mine_list.append(mine_record)

                target_mt = _safe_float(p_data.get("Target_MT", coal_t / 1000000.0 if coal_t > 0 else 0.0))
                actual_mt = _safe_float(p_data.get("Actual_MT", coal_t / 1000000.0 if coal_t > 0 else 0.0))
                ach = (actual_mt / target_mt * 100.0) if target_mt > 0 else 100.0
                parsed_metrics.append({
                    "period": mine_name,
                    "target_mt": round(target_mt, 2),
                    "actual_mt": round(actual_mt, 2),
                    "achievement_pct": round(ach, 1),
                    "stripping_ratio": sr,
                    "seam_thickness_m": seam
                })

                if p_data.get("Risk_Flags"):
                    risk_flags.append({"mine": mine_name, "subsidiary": subsidiary, "risk_flag": p_data.get("Risk_Flags")})
                if p_data.get("Safety_Incidents"):
                    safety_incidents.append({"mine": mine_name, "subsidiary": subsidiary, "safety_incident": p_data.get("Safety_Incidents")})
                if p_data.get("Geological_Notes"):
                    geological_notes.append({"mine": mine_name, "subsidiary": subsidiary, "geological_note": p_data.get("Geological_Notes")})
            except Exception as exc:
                logger.warning(f"Error parsing production extraction row #{row.id}: {exc}")

        if mine_list:
            # A) Average of the stated stripping-ratio values (e.g. mean of 2.52, 2.66, 2.58, 2.78, 2.59, 2.78, 2.29 = 2.60)
            avg_sr = round(sum(stripping_ratios) / len(stripping_ratios), 2) if stripping_ratios else 0.0
            # B) Aggregate overburden / raw coal ratio (e.g. 39,880,000 / 15,167,000 = 2.63)
            agg_sr = round(total_ob / total_coal, 2) if total_coal > 0 else 0.0
            
            avg_seam = round(sum(seam_thicknesses) / len(seam_thicknesses), 2) if seam_thicknesses else 0.0

            sub_list = list(subsidiary_map.values())
            for sub in sub_list:
                sub["raw_coal_tonnes"] = round(sub["raw_coal_tonnes"], 2)
                sub["overburden_m3"] = round(sub["overburden_m3"], 2)

            coal_analytics = {
                "has_coal_data": True,
                "total_production_tonnes": round(total_coal, 2),
                "total_production_mt": round(total_coal / 1000000.0, 3) if total_coal > 10000 else round(total_coal, 2),
                "total_overburden_m3": round(total_ob, 2),
                "avg_stripping_ratio": avg_sr,
                "aggregate_stripping_ratio": agg_sr,
                "avg_seam_thickness_m": avg_seam,
                "mine_records_count": len(mine_list),
                "metrics": parsed_metrics,
                "by_subsidiary": sub_list,
                "by_mine": mine_list,
                "risk_flags_summary": risk_flags,
                "safety_incidents_summary": safety_incidents,
                "geological_notes_summary": geological_notes
            }

    return {
        "date_range_applied": date_range,
        "overview": overview,
        "documents": documents_analytics,
        "validation": validation_analytics,
        "reports": report_analytics,
        "topics": topic_analytics,
        "knowledge_base": knowledge_base,
        "recent_activity": recent_activity,
        "coal_analytics": coal_analytics
    }
