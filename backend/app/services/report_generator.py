"""
Automated Report Generation Service (STEP 10.1)
Assembles grounded document text, structured extractions, validation findings, and conflicts
from PostgreSQL for selected document IDs and uses LLM service to generate structured reports.
"""

import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, DocumentChunk, StructuredExtraction, ValidationResult, DocumentConflict, Report
from app.services.llm_service import generate_llm_answer

logger = logging.getLogger("report_generator")

REPORT_SYSTEM_PROMPT = """You are an Expert Automated Report Generation System for CMPDI (Central Mine Planning & Design Institute) / Coal India Limited.
Your task is to generate a comprehensive, professional, structured Markdown report based STRICTLY on the provided document data, structured extractions, and validation findings.

STRICT REPORT GENERATION RULES:
1. GROUNDED FACTS ONLY: Include ONLY metrics, seam names, lithology, reserves, boreholes, dates, and figures present in the provided document context. Do NOT invent or extrapolate facts, numbers, or dates.
2. MISSING DATA HANDLING: If a specific section or metric is absent in the selected documents, explicitly state: "Not available in the selected documents."
3. SEPARATION OF VALIDATION FINDINGS: Clearly distinguish raw document facts from validation warnings/errors. Format validation findings in a dedicated "Validation & Data Quality Findings" section.
4. CITATION MAPPING: Include clear source references for factual findings (e.g. `Source: step6_coal_report.pdf — Page 1`).
5. REPORT SECTIONS TO INCLUDE:
   # [Report Title]
   ## 1. Executive Summary
   ## 2. Source Documents Overview
   ## 3. Key Findings & Extracted Facts
   ## 4. Structured Data Summary
   ## 5. Technical & Geological Details
   ## 6. Validation & Data Quality Findings
   ## 7. Conflicts & Discrepancies (if applicable)
   ## 8. Conclusion
   ## 9. Source References
6. CONCISE & PROFESSIONAL: Use clear markdown tables, bullet points, and headers.
"""


async def fetch_report_context_data(db: AsyncSession, document_ids: List[int]) -> Dict[str, Any]:
    """
    Fetches real documents, chunks, structured extractions, validation findings, and conflicts
    from PostgreSQL for the requested document IDs.
    """
    # 1. Fetch Documents
    docs_res = await db.execute(
        select(Document).where(Document.id.in_(document_ids)).order_by(Document.id)
    )
    docs = docs_res.scalars().all()
    found_doc_ids = [d.id for d in docs]
    missing_ids = [did for did in document_ids if did not in found_doc_ids]

    if missing_ids:
        return {"error": f"Document ID(s) {missing_ids} not found in database.", "code": 404}

    # 2. Fetch Document Chunks
    chunks_res = await db.execute(
        select(DocumentChunk).where(DocumentChunk.document_id.in_(document_ids)).order_by(DocumentChunk.document_id, DocumentChunk.id)
    )
    chunks = chunks_res.scalars().all()

    if not chunks:
        return {"error": "Selected documents have no extracted content chunks.", "code": 400}

    # 3. Fetch Structured Extractions
    ext_res = await db.execute(
        select(StructuredExtraction).where(StructuredExtraction.document_id.in_(document_ids)).order_by(StructuredExtraction.id)
    )
    extractions = ext_res.scalars().all()

    # 4. Fetch Validation Results
    val_res = await db.execute(
        select(ValidationResult).where(ValidationResult.document_id.in_(document_ids)).order_by(ValidationResult.id)
    )
    validations = val_res.scalars().all()

    # 5. Fetch Conflicts involving any of these documents
    conflicts_res = await db.execute(
        select(DocumentConflict).where(
            or_(
                DocumentConflict.doc_a_id.in_(document_ids),
                DocumentConflict.doc_b_id.in_(document_ids)
            )
        ).order_by(DocumentConflict.id)
    )
    conflicts = conflicts_res.scalars().all()

    # 6. Assemble Grounded Context Strings & Metadata
    context_blocks = []
    source_refs = []

    for d in docs:
        doc_chunks = [c for c in chunks if c.document_id == d.id]
        doc_exts = [e for e in extractions if e.document_id == d.id]
        doc_vals = [v for v in validations if v.document_id == d.id]

        block = f"--- DOCUMENT ID {d.id}: {d.original_filename} (Type: {d.type}, Category: {d.category or 'Uncategorized'}) ---\n"
        
        # Add Chunk text
        block += "EXTRACTED TEXT & CHUNKS:\n"
        for c in doc_chunks:
            src_ref = f"Page {c.page_number}" if c.page_number else (f"Sheet: {c.sheet_name}" if c.sheet_name else "Document Text")
            block += f"[{src_ref} | Chunk ID: {c.id}]\n{c.content}\n\n"

            source_refs.append({
                "document_id": d.id,
                "chunk_id": c.id,
                "original_filename": d.original_filename,
                "page_number": c.page_number,
                "sheet_name": c.sheet_name,
                "source_reference": src_ref
            })

        # Add Structured Facts
        if doc_exts:
            block += "STRUCTURED EXTRACTED DATA:\n"
            for e in doc_exts:
                block += f"- Entity: {e.entity_type} | Ref: {e.source_reference or 'N/A'} | Data: {e.data}\n"
            block += "\n"

        # Add Validation Findings
        if doc_vals:
            block += "VALIDATION FINDINGS (DATA QUALITY):\n"
            for v in doc_vals:
                block += f"- Severity: {v.severity.upper()} | Rule: {v.rule_type} | Field: {v.field_name or 'General'} | Ref: {v.source_reference or 'N/A'} | Message: {v.message}\n"
            block += "\n"

        context_blocks.append(block)

    # Add Cross-Document Conflicts
    conflicts_summary = []
    if conflicts:
        conflict_block = "CROSS-DOCUMENT CONFLICTS DETECTED:\n"
        for conf in conflicts:
            c_entry = {
                "doc_a_id": conf.doc_a_id,
                "doc_b_id": conf.doc_b_id,
                "entity_type": conf.entity_type,
                "field_name": conf.field_name,
                "val_a": conf.val_a,
                "val_b": conf.val_b,
                "message": conf.message
            }
            conflicts_summary.append(c_entry)
            conflict_block += f"- Field '{conf.field_name}' Conflict: Doc {conf.doc_a_id} ({conf.val_a}) vs Doc {conf.doc_b_id} ({conf.val_b}) | Message: {conf.message}\n"
        context_blocks.append(conflict_block)

    validation_summary_data = {
        "total_validation_records": len(validations),
        "warning_count": len([v for v in validations if v.severity == "warning"]),
        "error_count": len([v for v in validations if v.severity == "error"]),
        "conflict_count": len(conflicts)
    }

    return {
        "docs": docs,
        "context_string": "\n\n".join(context_blocks),
        "source_references": source_refs,
        "validation_summary": validation_summary_data,
        "conflicts_summary": conflicts_summary,
        "doc_count": len(docs),
        "chunk_count": len(chunks)
    }


async def generate_automated_report(
    db: AsyncSession,
    document_ids: List[int],
    report_type: str = "geological_summary",
    title: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes automated report generation workflow and persists report record in PostgreSQL.
    """
    start_time = time.time()
    report_title = title or f"CMPDI Automated {report_type.replace('_', ' ').title()} Report"

    # 1. Fetch Grounded Context
    context_data = await fetch_report_context_data(db, document_ids)
    if "error" in context_data:
        return context_data

    # 2. Create Initial Pending/Processing Report Record in DB
    new_report = Report(
        report_title=report_title,
        report_type=report_type,
        status="processing",
        created_by="System / User",
        created_at=datetime.utcnow(),
        source_document_ids=json.dumps(document_ids),
        source_references=json.dumps(context_data["source_references"]),
        validation_summary=json.dumps(context_data["validation_summary"]),
        generation_metadata=json.dumps({
            "provider": provider or "groq",
            "model": model or "openai/gpt-oss-20b",
            "source_document_count": context_data["doc_count"],
            "chunk_count": context_data["chunk_count"],
            "conflict_count": context_data["validation_summary"]["conflict_count"]
        })
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    # 3. Construct LLM User Prompt
    user_prompt = (
        f"Report Title: {report_title}\n"
        f"Report Type: {report_type}\n"
        f"Source Document IDs: {document_ids}\n\n"
        f"Grounded Context Data & Extracted Documents:\n"
        f"{context_data['context_string']}\n\n"
        f"Please generate the complete structured Markdown report following all system rules."
    )

    # 4. Call LLM Generation Service
    llm_res = generate_llm_answer(
        query=f"Generate {report_type} report for documents {document_ids}",
        formatted_context=context_data["context_string"],
        provider=provider,
        model=model,
        api_key=api_key
    )

    elapsed_seconds = round(time.time() - start_time, 2)
    llm_status = llm_res.get("status")

    if llm_status in ["success", "not_found"] and llm_res.get("answer"):
        new_report.status = "completed"
        new_report.report_content = llm_res.get("answer")
        new_report.completed_at = datetime.utcnow()
        new_report.generation_metadata = json.dumps({
            "provider": llm_res.get("provider"),
            "model": llm_res.get("model"),
            "source_document_count": context_data["doc_count"],
            "chunk_count": context_data["chunk_count"],
            "validation_issue_count": context_data["validation_summary"]["total_validation_records"],
            "conflict_count": context_data["validation_summary"]["conflict_count"],
            "generation_time_seconds": elapsed_seconds,
            "status": "completed"
        })
    else:
        # Fallback to structured grounded report from PostgreSQL context data
        fallback_report = f"# {report_title}\n\n"
        fallback_report += f"**Report Type:** {report_type}\n"
        fallback_report += f"**Generated At:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        fallback_report += f"**Source Document IDs:** {document_ids}\n\n"
        fallback_report += "## 1. Executive Summary\n"
        fallback_report += f"Automated grounded operations report compiled from {context_data['doc_count']} document(s) containing {context_data['chunk_count']} content chunk(s).\n\n"
        fallback_report += "## 2. Grounded Document Context & Operational Facts\n"
        fallback_report += f"{context_data['context_string']}\n\n"
        fallback_report += "## 3. Validation & Data Quality Summary\n"
        val_sum = context_data['validation_summary']
        fallback_report += f"- Total Validation Records: {val_sum['total_validation_records']}\n"
        fallback_report += f"- Warnings: {val_sum['warning_count']}\n"
        fallback_report += f"- Errors: {val_sum['error_count']}\n"
        fallback_report += f"- Conflicts: {val_sum['conflict_count']}\n\n"
        fallback_report += "## 4. Operational Conclusion\n"
        fallback_report += "Report generated directly from grounded PostgreSQL database records.\n"

        new_report.status = "completed"
        new_report.report_content = fallback_report
        new_report.completed_at = datetime.utcnow()
        new_report.generation_metadata = json.dumps({
            "provider": llm_res.get("provider") or "grounded_context_fallback",
            "model": llm_res.get("model") or "context_compiler",
            "source_document_count": context_data["doc_count"],
            "chunk_count": context_data["chunk_count"],
            "validation_issue_count": context_data["validation_summary"]["total_validation_records"],
            "conflict_count": context_data["validation_summary"]["conflict_count"],
            "generation_time_seconds": elapsed_seconds,
            "status": "completed",
            "note": "Compiled from grounded evidence context"
        })

    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    return {
        "report": new_report,
        "code": 200
    }
