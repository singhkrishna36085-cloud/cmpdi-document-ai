from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)
    role = Column(String, nullable=False, default="NORMAL_USER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship("Document", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable until auth is implemented
    name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    type = Column(String, nullable=False)
    source = Column(String, nullable=True)
    category = Column(String, nullable=True)
    doc_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)      # relative path inside uploads/
    file_size = Column(Integer, nullable=True)       # bytes
    created_at = Column(DateTime, default=datetime.utcnow)

    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    extracted_text = Column(Text, nullable=True)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True)
    meta_info = Column(Text, nullable=True)  # JSON string with extra details (e.g., sheet names, headers)
    is_confidential = Column(Boolean, default=False)

    owner = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    structured_extractions = relationship("StructuredExtraction", back_populates="document", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="document", cascade="all, delete-orphan")
    conflicts_as_a = relationship("DocumentConflict", foreign_keys="[DocumentConflict.doc_a_id]", cascade="all, delete-orphan")
    conflicts_as_b = relationship("DocumentConflict", foreign_keys="[DocumentConflict.doc_b_id]", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=True)
    sheet_name = Column(String, nullable=True)
    chunk_type = Column(String, nullable=False, default="text")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")

class StructuredExtraction(Base):
    __tablename__ = "structured_extractions"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(Integer, ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True)
    page_number = Column(Integer, nullable=True)
    sheet_name = Column(String, nullable=True)
    source_reference = Column(String, nullable=True)
    entity_type = Column(String, nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="structured_extractions")
    chunk = relationship("DocumentChunk")

class ValidationResult(Base):
    __tablename__ = "validation_results"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    extraction_id = Column(Integer, ForeignKey("structured_extractions.id", ondelete="CASCADE"), nullable=True)
    chunk_id = Column(Integer, ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True)
    rule_type = Column(String, nullable=False)  # completeness, format, unit, logical, conflict
    severity = Column(String, nullable=False)   # warning, error
    field_name = Column(String, nullable=True)
    invalid_value = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    sheet_name = Column(String, nullable=True)
    source_reference = Column(String, nullable=True)
    status = Column(String, nullable=False, default="OPEN", index=True)  # OPEN, UNDER_REVIEW, RESOLVED, DISMISSED
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    document = relationship("Document", back_populates="validation_results")
    extraction = relationship("StructuredExtraction")
    chunk = relationship("DocumentChunk")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

class DocumentConflict(Base):
    __tablename__ = "document_conflicts"
    id = Column(Integer, primary_key=True, index=True)
    doc_a_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    doc_b_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    extraction_a_id = Column(Integer, ForeignKey("structured_extractions.id", ondelete="CASCADE"), nullable=True)
    extraction_b_id = Column(Integer, ForeignKey("structured_extractions.id", ondelete="CASCADE"), nullable=True)
    entity_type = Column(String, nullable=False)
    entity_identifier = Column(String, nullable=False)  # e.g., "Mine_Name: Amrapali OCP"
    field_name = Column(String, nullable=False)
    val_a = Column(String, nullable=True)
    val_b = Column(String, nullable=True)
    source_ref_a = Column(String, nullable=True)
    source_ref_b = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    doc_a = relationship("Document", foreign_keys=[doc_a_id], back_populates="conflicts_as_a")
    doc_b = relationship("Document", foreign_keys=[doc_b_id], back_populates="conflicts_as_b")
    extraction_a = relationship("StructuredExtraction", foreign_keys=[extraction_a_id])
    extraction_b = relationship("StructuredExtraction", foreign_keys=[extraction_b_id])

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    report_title = Column(String, nullable=False)
    report_type = Column(String, nullable=False, default="geological_summary")  # geological_summary, production_summary, audit_summary, general_summary
    status = Column(String, nullable=False, default="pending")  # pending, processing, completed, failed
    created_by = Column(String, default="System / User")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    source_document_ids = Column(Text, nullable=False)  # JSON string of document IDs list [11, 12]
    report_content = Column(Text, nullable=True)       # Generated report markdown text
    source_references = Column(Text, nullable=True)     # JSON string of source citations list
    validation_summary = Column(Text, nullable=True)   # JSON string of validation findings summary
    generation_metadata = Column(Text, nullable=True)  # JSON string of LLM provider, model, stats, errors

class TopicAnalysis(Base):
    __tablename__ = "topic_analyses"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    source_document_ids = Column(Text, nullable=False)  # JSON list of doc IDs
    word_frequencies = Column(Text, nullable=False)     # JSON array of {term, frequency}
    topics = Column(Text, nullable=False)               # JSON array of topic cluster objects
    wordcloud_image = Column(Text, nullable=True)       # Data URI base64 string
    metadata_info = Column(Text, nullable=True)         # JSON metadata stats

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=True, index=True)
    resource_id = Column(Integer, nullable=True)
    document_id = Column(Integer, nullable=True, index=True)
    report_id = Column(Integer, nullable=True, index=True)
    status = Column(String, nullable=False, default="SUCCESS", index=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    details = Column(Text, nullable=True)

    user = relationship("User", back_populates="audit_logs")
