"""
Dashboard Analytics Pydantic Schemas (STEP 12.1 & STEP 12.3)
Defines structured response models for GET /api/dashboard/overview.
Includes date range filtering metadata and future 4-year coal data analytics readiness.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class OverviewMetrics(BaseModel):
    total_documents: int
    processed_documents: int
    processing_documents: int
    failed_documents: int
    pending_documents: int
    total_chunks: int
    total_extractions: int
    total_validation_errors: int
    total_validation_warnings: int
    total_conflicts: int
    total_reports: int
    total_topics: int
    total_ai_queries: int


class TypeDistribution(BaseModel):
    type: str
    count: int


class StatusDistribution(BaseModel):
    status: str
    count: int


class TimelinePoint(BaseModel):
    date: str
    count: int


class DepartmentDistribution(BaseModel):
    department: str
    count: int


class DocumentAnalytics(BaseModel):
    document_types: List[TypeDistribution]
    statuses: List[StatusDistribution]
    timeline: List[TimelinePoint]
    departments: List[DepartmentDistribution]


class ConflictSummary(BaseModel):
    id: int
    doc_a_id: int
    doc_b_id: int
    entity_type: str
    field_name: str
    val_a: Optional[str] = None
    val_b: Optional[str] = None
    source_ref_a: Optional[str] = None
    source_ref_b: Optional[str] = None
    message: str
    created_at: datetime


class ValidationAnalytics(BaseModel):
    total_validation_results: int
    errors: int
    warnings: int
    valid_results: int
    total_conflicts: int
    recent_conflicts: List[ConflictSummary]


class ReportSummary(BaseModel):
    id: int
    report_title: str
    report_type: str
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class ReportTypeDistribution(BaseModel):
    type: str
    count: int


class ReportAnalytics(BaseModel):
    total_reports: int
    completed_reports: int
    failed_reports: int
    pending_reports: int
    by_type: List[ReportTypeDistribution]
    recent_reports: List[ReportSummary]


class TopicAnalysisSummary(BaseModel):
    id: int
    created_at: datetime
    document_count: int
    topic_count: int
    top_terms: List[str]


class TopicAnalytics(BaseModel):
    total_analyses: int
    documents_analyzed: int
    recent_analyses: List[TopicAnalysisSummary]
    dominant_topics: List[Dict[str, Any]]


class KnowledgeBaseAnalytics(BaseModel):
    status: str
    total_chunks: int
    indexed_vectors: int
    dimension: int
    model_name: str
    sync_status: str


class ActivityItem(BaseModel):
    type: str
    title: str
    timestamp: datetime
    status: str
    id: Optional[int] = None
    details: Optional[str] = None


class CoalProductionMetric(BaseModel):
    period: str
    target_mt: float
    actual_mt: float
    achievement_pct: float
    ash_pct: Optional[float] = None
    gcv_kcal: Optional[float] = None


class CoalAnalytics(BaseModel):
    has_coal_data: bool = False
    total_production_mt: float = 0.0
    total_production_tonnes: Optional[float] = 0.0
    total_overburden_m3: Optional[float] = 0.0
    avg_stripping_ratio: Optional[float] = 0.0
    aggregate_stripping_ratio: Optional[float] = 0.0
    avg_seam_thickness_m: Optional[float] = 0.0
    avg_gcv: Optional[float] = None
    avg_ash: Optional[float] = None
    metrics: List[Dict[str, Any]] = []
    by_subsidiary: List[Dict[str, Any]] = []
    by_mine: List[Dict[str, Any]] = []
    risk_flags_summary: List[Dict[str, Any]] = []
    safety_incidents_summary: List[Dict[str, Any]] = []
    geological_notes_summary: List[Dict[str, Any]] = []


class DashboardOverviewResponse(BaseModel):
    date_range_applied: str = "all"
    overview: OverviewMetrics
    documents: DocumentAnalytics
    validation: ValidationAnalytics
    reports: ReportAnalytics
    topics: TopicAnalytics
    knowledge_base: KnowledgeBaseAnalytics
    recent_activity: List[ActivityItem]
    coal_analytics: Optional[Dict[str, Any]] = None
