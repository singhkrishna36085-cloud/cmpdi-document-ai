"""
Document Upload & Listing API
POST /api/documents/upload  — upload one file with metadata
GET  /api/documents          — list all uploaded documents
GET  /api/documents/{id}     — get a single document record
"""

import os
import uuid
import asyncio
import aiofiles
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, DocumentChunk, StructuredExtraction, User
from app.services.processor import process_document_file
from app.services.structured_extractor import extract_structured_data
from app.core.dependencies import get_optional_user, require_hod

router = APIRouter(prefix="/api/documents", tags=["documents"])

# ── Storage directory ──────────────────────────────────────────────────────────
# Resolve to  <project-root>/uploads/  regardless of working directory
_HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
UPLOAD_DIR = os.path.join(_HERE, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "csv", "jpg", "jpeg", "png", "zip"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _doc_to_dict(doc: Document) -> dict:
    return {
        "id": doc.id,
        "name": doc.name,
        "original_filename": doc.original_filename,
        "type": doc.type,
        "source": doc.source,
        "category": doc.category,
        "doc_date": doc.doc_date.isoformat() if doc.doc_date else None,
        "description": doc.description,
        "file_path": doc.file_path,
        "file_size": doc.file_size,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "processing_status": getattr(doc, "processing_status", "pending") or "pending",
        "processing_started_at": doc.processing_started_at.isoformat() if getattr(doc, "processing_started_at", None) else None,
        "processing_completed_at": doc.processing_completed_at.isoformat() if getattr(doc, "processing_completed_at", None) else None,
        "error_message": getattr(doc, "error_message", None),
        "page_count": getattr(doc, "page_count", None),
        "is_confidential": getattr(doc, "is_confidential", False) or False,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    type: str = Form(...),
    source: str = Form(...),
    category: str = Form(...),
    date: str = Form(...),
    description: Optional[str] = Form(default=""),
    is_confidential: Optional[bool] = Form(default=False),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Accept a single file upload with metadata form fields.
    Saves the file to disk and records it in the database.
    """
    # ── Validate extension ──────────────────────────────────────────────────
    ext = _get_ext(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # ── Read file into memory (enforce size limit) ──────────────────────────
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the 50 MB limit ({file_size / 1024 / 1024:.1f} MB uploaded).",
        )

    # ── Generate a unique filename and save to disk ────────────────────────
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(contents)

    # ── Parse doc_date ─────────────────────────────────────────────────────
    doc_date: Optional[datetime] = None
    try:
        doc_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        pass  # leave as None if parsing fails

    # ── Insert record into PostgreSQL ──────────────────────────────────────
    doc = Document(
        name=name,
        original_filename=file.filename or safe_name,
        type=type,
        source=source,
        category=category,
        doc_date=doc_date,
        description=description or "",
        file_path=safe_name,   # relative; reconstruct full path when needed
        file_size=file_size,
        processing_status="pending",
        is_confidential=bool(is_confidential),
        owner_id=user.id if user else None
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="DOCUMENT_UPLOAD",
        user=user,
        resource_type="DOCUMENT",
        resource_id=doc.id,
        document_id=doc.id,
        status="SUCCESS",
        details={"name": doc.name, "filename": doc.original_filename, "is_confidential": doc.is_confidential}
    )

    # ── Auto-process uploaded document ─────────────────────────────────────
    try:
        doc.processing_status = "processing"
        doc.processing_started_at = datetime.utcnow()
        await db.commit()

        extraction_res = await asyncio.to_thread(process_document_file, file_path, doc.original_filename)
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

        await db.flush()

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
            
        doc.processing_status = "completed"
        doc.processing_completed_at = datetime.utcnow()
        doc.extracted_text = extraction_res.get("full_text", "")
        doc.page_count = extraction_res.get("page_count", 1)
        doc.meta_info = extraction_res.get("meta_info", "{}")
        doc.error_message = None
        await db.commit()
        await db.refresh(doc)

        await log_audit_event(
            db,
            action="DOCUMENT_PROCESS",
            user=user,
            resource_type="DOCUMENT",
            resource_id=doc.id,
            document_id=doc.id,
            status="SUCCESS",
            details={"page_count": doc.page_count, "chunks_count": len(saved_chunks)}
        )
    except Exception as exc:
        doc.processing_status = "failed"
        doc.error_message = str(exc)
        await db.commit()
        await db.refresh(doc)

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

    return JSONResponse(status_code=201, content={"status": "uploaded", "document": _doc_to_dict(doc)})


@router.get("", status_code=200)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Return a paginated list of uploaded documents, filtered by user confidentiality permissions."""
    stmt = select(Document)
    
    # NORMAL_USER (or unauthenticated) can only list non-confidential documents
    if not user or user.role != "HOD":
        stmt = stmt.where(Document.is_confidential == False)
        
    stmt = stmt.order_by(Document.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return {"total": len(docs), "documents": [_doc_to_dict(d) for d in docs]}


@router.get("/{document_id}", status_code=200)
async def get_document(
    document_id: int, 
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Return a single document record by ID with confidentiality RBAC enforcement."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Confidentiality Access Control
    if doc.is_confidential and (not user or user.role != "HOD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Confidential document restricted to HOD role."
        )

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        action="DOCUMENT_VIEW",
        user=user,
        resource_type="DOCUMENT",
        resource_id=doc.id,
        document_id=doc.id,
        status="SUCCESS",
        details={"name": doc.name, "is_confidential": doc.is_confidential}
    )

    return _doc_to_dict(doc)
