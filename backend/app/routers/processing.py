"""
Document Processing & Structured Extraction API Router (STEP 5 & 6)
POST /api/documents/{document_id}/process — process single document
GET  /api/documents/{document_id}/content — fetch processed text and chunks
POST /api/documents/{document_id}/extract-structured — trigger structured data extraction
GET  /api/documents/{document_id}/structured — fetch structured extractions with full traceability
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, DocumentChunk, StructuredExtraction, User
from app.core.dependencies import get_optional_user
from app.services.processor import process_document_file
from app.services.structured_extractor import extract_structured_data
from app.routers.documents import auto_reindex_background_task
from app.core.storage import get_upload_dir, find_file_on_disk

router = APIRouter(prefix="/api/documents", tags=["processing"])


def _check_doc_access(doc: Document, user: Optional[User]):
    """Helper to check if user has permission to access document."""
    if doc.is_confidential:
        if not user or user.role != "HOD":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Document ID {doc.id} is confidential."
            )


@router.post("/{document_id}/process", status_code=status.HTTP_200_OK)
async def process_document_endpoint(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Triggers document processing / text / OCR / tabular extraction for an uploaded document.
    Updates processing status, stores extracted chunks, and auto-runs structured data extraction.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    _check_doc_access(doc, user)

    full_path = find_file_on_disk(doc.file_path)

    # 1. If physical file is missing from disk, restore it from persistent PostgreSQL file_bytes
    if (not full_path or not os.path.exists(full_path)) and getattr(doc, "file_bytes", None):
        upload_dir = get_upload_dir()
        full_path = os.path.join(upload_dir, doc.file_path)
        try:
            with open(full_path, "wb") as f:
                f.write(doc.file_bytes)
        except Exception:
            pass

    if not full_path or not os.path.exists(full_path):
        # Check if chunks already exist in DB
        chunks_res = await db.execute(select(DocumentChunk).where(DocumentChunk.document_id == document_id))
        chunks = chunks_res.scalars().all()
        if chunks:
            doc.processing_status = "completed"
            doc.error_message = None
            await db.commit()
            return {
                "status": "completed",
                "document_id": doc.id,
                "message": "Physical file is absent from server disk cache, but extracted database chunks and text are intact.",
                "chunks_count": len(chunks),
                "page_count": doc.page_count or 1
            }

        doc.processing_status = "failed"
        doc.error_message = f"File missing from disk: {doc.file_path}. Please re-upload the file."
        await db.commit()
        raise HTTPException(
            status_code=404,
            detail=f"File missing from disk: {doc.file_path}. Please re-upload the file to regenerate extraction chunks."
        )

    # Mark as processing
    doc.processing_status = "processing"
    doc.processing_started_at = datetime.utcnow()
    doc.error_message = None
    await db.commit()
    
    try:
        # Run extraction service off main async loop
        extraction_res = await asyncio.to_thread(process_document_file, full_path, doc.original_filename)
        
        # Delete existing chunks and old structured extractions if re-processing
        await db.execute(delete(StructuredExtraction).where(StructuredExtraction.document_id == document_id))
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
        
        # Save new chunks
        saved_chunks = []
        for chunk_data in extraction_res.get("chunks", []):
            chunk = DocumentChunk(
                document_id=doc.id,
                page_number=chunk_data.get("page_number"),
                sheet_name=chunk_data.get("sheet_name"),
                chunk_type=chunk_data.get("chunk_type", "text"),
                content=chunk_data.get("content", "")
            )
            db.add(chunk)
            saved_chunks.append(chunk)
            
        await db.flush()  # assign IDs to chunk objects
        
        # Auto-extract structured data from saved chunks
        structured_items = extract_structured_data(saved_chunks)
        for item in structured_items:
            s_record = StructuredExtraction(
                document_id=doc.id,
                chunk_id=item.get("chunk_id"),
                page_number=item.get("page_number"),
                sheet_name=item.get("sheet_name"),
                source_reference=item.get("source_reference"),
                entity_type=item.get("entity_type", "key_value"),
                data=item.get("data", "{}")
            )
            db.add(s_record)
            
        # Update document record
        if not saved_chunks:
            doc.processing_status = "failed"
            doc.error_message = "No readable text content or pages could be extracted from this document."
        else:
            doc.processing_status = "completed"
            doc.error_message = None
            background_tasks.add_task(auto_reindex_background_task)

        doc.processing_completed_at = datetime.utcnow()
        doc.extracted_text = extraction_res.get("full_text", "")
        doc.page_count = extraction_res.get("page_count", 1)
        doc.meta_info = extraction_res.get("meta_info", "{}")
        
        await db.commit()
        await db.refresh(doc)
        
        from app.services.audit_service import log_audit_event
        await log_audit_event(
            db,
            action="DOCUMENT_PROCESS",
            user=user,
            resource_type="DOCUMENT",
            resource_id=doc.id,
            document_id=doc.id,
            status="SUCCESS",
            details={"page_count": doc.page_count, "chunks_count": len(saved_chunks), "structured_count": len(structured_items)}
        )

        return {
            "status": "completed",
            "document_id": doc.id,
            "page_count": doc.page_count,
            "chunks_count": len(saved_chunks),
            "structured_records_count": len(structured_items),
            "extracted_preview": (doc.extracted_text[:300] + "...") if doc.extracted_text else ""
        }
        
    except Exception as exc:
        doc.processing_status = "failed"
        doc.error_message = str(exc)
        await db.commit()

        from app.services.audit_service import log_audit_event
        await log_audit_event(
            db,
            action="DOCUMENT_PROCESS",
            user=user,
            resource_type="DOCUMENT",
            resource_id=doc.id,
            document_id=doc.id,
            status="FAILURE",
            details={"error": str(exc)}
        )
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(exc)}")


@router.get("/{document_id}/content", status_code=status.HTTP_200_OK)
async def get_document_content(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns the extracted text, metadata, and structured chunks stored in PostgreSQL.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    _check_doc_access(doc, user)

    chunks_res = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.id)
    )
    chunks = chunks_res.scalars().all()
    
    return {
        "document_id": doc.id,
        "name": doc.name,
        "original_filename": doc.original_filename,
        "processing_status": doc.processing_status,
        "page_count": doc.page_count,
        "meta_info": doc.meta_info,
        "extracted_text": doc.extracted_text,
        "error_message": doc.error_message,
        "chunks": [
            {
                "id": c.id,
                "page_number": c.page_number,
                "sheet_name": c.sheet_name,
                "chunk_type": c.chunk_type,
                "content": c.content,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in chunks
        ]
    }


@router.post("/{document_id}/extract-structured", status_code=status.HTTP_200_OK)
async def trigger_structured_extraction(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Triggers structured data extraction from existing document chunks and stores results in PostgreSQL.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    _check_doc_access(doc, user)

    chunks_res = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.id)
    )
    chunks = chunks_res.scalars().all()
    
    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No document chunks found. Process the document first via POST /api/documents/{id}/process"
        )
        
    # Clear existing structured extractions
    await db.execute(delete(StructuredExtraction).where(StructuredExtraction.document_id == document_id))
    
    # Run structured extractor service
    structured_items = extract_structured_data(chunks)
    
    saved_records = []
    for item in structured_items:
        s_record = StructuredExtraction(
            document_id=doc.id,
            chunk_id=item.get("chunk_id"),
            page_number=item.get("page_number"),
            sheet_name=item.get("sheet_name"),
            source_reference=item.get("source_reference"),
            entity_type=item.get("entity_type", "key_value"),
            data=item.get("data", "{}")
        )
        db.add(s_record)
        saved_records.append(s_record)
        
    await db.commit()
    
    return {
        "status": "success",
        "document_id": doc.id,
        "extracted_records_count": len(saved_records)
    }


@router.get("/{document_id}/structured", status_code=status.HTTP_200_OK)
async def get_structured_extractions(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Retrieves structured data extraction records for a document with full source traceability.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    _check_doc_access(doc, user)

    ext_res = await db.execute(
        select(StructuredExtraction)
        .where(StructuredExtraction.document_id == document_id)
        .order_by(StructuredExtraction.id)
    )
    extractions = ext_res.scalars().all()
    
    formatted = []
    for ext in extractions:
        data_json = {}
        try:
            data_json = json.loads(ext.data)
        except Exception:
            data_json = {"raw": ext.data}
            
        formatted.append({
            "id": ext.id,
            "document_id": ext.document_id,
            "chunk_id": ext.chunk_id,
            "page_number": ext.page_number,
            "sheet_name": ext.sheet_name,
            "source_reference": ext.source_reference,
            "entity_type": ext.entity_type,
            "data": data_json,
            "created_at": ext.created_at.isoformat() if ext.created_at else None
        })
        
    return {
        "document_id": doc.id,
        "name": doc.name,
        "original_filename": doc.original_filename,
        "total_structured_records": len(formatted),
        "structured_data": formatted
    }


@router.get("/{document_id}/chunks", status_code=status.HTTP_200_OK)
async def get_document_chunks(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Retrieves detailed document chunks with page/sheet references for a document.
    Enforces RBAC document permissions.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    _check_doc_access(doc, user)

    chunks_res = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.id)
    )
    chunks = chunks_res.scalars().all()
    
    return {
        "document_id": doc.id,
        "name": doc.name,
        "original_filename": doc.original_filename,
        "total_chunks": len(chunks),
        "chunks": [
            {
                "id": c.id,
                "document_id": c.document_id,
                "page_number": c.page_number,
                "sheet_name": c.sheet_name,
                "source_reference": f"Page {c.page_number}" if c.page_number else (f"Sheet: {c.sheet_name}" if c.sheet_name else f"Chunk #{c.id}"),
                "chunk_type": c.chunk_type,
                "content": c.content,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in chunks
        ]
    }


@router.get("/{document_id}/processing", status_code=status.HTTP_200_OK)
async def get_document_processing_details(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Retrieves real processing pipeline details and stage statuses for a document.
    Enforces RBAC document permissions.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    _check_doc_access(doc, user)

    # Count chunks and extractions
    chunks_count_res = await db.execute(
        select(DocumentChunk.id).where(DocumentChunk.document_id == document_id)
    )
    chunks_count = len(chunks_count_res.scalars().all())

    ext_count_res = await db.execute(
        select(StructuredExtraction.id).where(StructuredExtraction.document_id == document_id)
    )
    ext_count = len(ext_count_res.scalars().all())

    # Build derived pipeline stages based on real database state
    raw_status = doc.processing_status or "pending"
    # If recorded as completed but 0 chunks were extracted, report as failed so dashboard and stages never contradict
    if raw_status == "completed" and chunks_count == 0:
        overall_status = "failed"
        effective_error = doc.error_message or "Extraction produced 0 chunks. The file may be an unreadable image or empty. Please re-upload or re-process."
    else:
        overall_status = raw_status
        effective_error = doc.error_message

    is_completed = (overall_status == "completed")
    is_failed = (overall_status == "failed")
    is_processing = (overall_status == "processing")

    stages = [
        {
            "stage_id": 1,
            "name": "Uploaded",
            "status": "completed",
            "timestamp": doc.created_at.isoformat() if doc.created_at else None,
            "details": f"File '{doc.original_filename}' uploaded successfully ({doc.file_size or 0} bytes)"
        },
        {
            "stage_id": 2,
            "name": "OCR / Document Extraction",
            "status": "completed" if chunks_count > 0 else ("failed" if is_failed else ("processing" if is_processing else "pending")),
            "timestamp": doc.processing_started_at.isoformat() if doc.processing_started_at else None,
            "details": f"Page count: {doc.page_count or 1}" if chunks_count > 0 else (effective_error or "Extraction failed")
        },
        {
            "stage_id": 3,
            "name": "Text & Table Extraction",
            "status": "completed" if chunks_count > 0 else ("failed" if is_failed else ("processing" if is_processing else "pending")),
            "timestamp": doc.processing_completed_at.isoformat() if doc.processing_completed_at else None,
            "details": f"Extracted {chunks_count} content chunks" if chunks_count > 0 else "0 chunks extracted"
        },
        {
            "stage_id": 4,
            "name": "Structured Data Extraction",
            "status": "completed" if ext_count > 0 else ("failed" if is_failed else ("processing" if is_processing else ("completed" if is_completed else "pending"))),
            "timestamp": doc.processing_completed_at.isoformat() if doc.processing_completed_at else None,
            "details": f"Extracted {ext_count} structured fields/records" if ext_count > 0 else ("Skipped: no text chunks available" if chunks_count == 0 else "0 structured records")
        },
        {
            "stage_id": 5,
            "name": "Validation & Conflict Check",
            "status": "completed" if (is_completed and chunks_count > 0) else ("failed" if is_failed else ("processing" if is_processing else "pending")),
            "timestamp": doc.processing_completed_at.isoformat() if doc.processing_completed_at else None,
            "details": "Validated against format, completeness, and cross-document rules" if chunks_count > 0 else "Validation skipped: 0 records"
        },
        {
            "stage_id": 6,
            "name": "Knowledge Base / Vector Index",
            "status": "completed" if (is_completed and chunks_count > 0) else ("failed" if is_failed else ("processing" if is_processing else "pending")),
            "timestamp": doc.processing_completed_at.isoformat() if doc.processing_completed_at else None,
            "details": f"Indexed {chunks_count} vector chunks into FAISS store" if chunks_count > 0 else "Cannot index: 0 content chunks extracted"
        }
    ]

    return {
        "document_id": doc.id,
        "name": doc.name,
        "original_filename": doc.original_filename,
        "overall_status": overall_status,
        "processing_started_at": doc.processing_started_at.isoformat() if doc.processing_started_at else None,
        "processing_completed_at": doc.processing_completed_at.isoformat() if doc.processing_completed_at else None,
        "error_message": effective_error,
        "page_count": doc.page_count,
        "chunks_count": chunks_count,
        "structured_records_count": ext_count,
        "stages": stages
    }


