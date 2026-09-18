/**
 * TypeScript definitions for Khani Gyan AI Dashboard Analytics (STEP 12.2 & STEP 12.3)
 * Matches GET /api/dashboard/overview backend API response schema.
 */

export interface OverviewMetrics {
  total_documents: number;
  processed_documents: number;
  processing_documents: number;
  failed_documents: number;
  pending_documents: number;
  total_chunks: number;
  total_extractions: number;
  total_validation_errors: number;
  total_validation_warnings: number;
  total_conflicts: number;
  total_reports: number;
  total_topics: number;
  total_ai_queries: number;
}

export interface TypeDistribution {
  type: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface DepartmentDistribution {
  department: string;
  count: number;
}

export interface DocumentAnalytics {
  document_types: TypeDistribution[];
  statuses: StatusDistribution[];
  timeline: TimelinePoint[];
  departments: DepartmentDistribution[];
}

export interface ConflictSummary {
  id: number;
  doc_a_id: number;
  doc_b_id: number;
  entity_type: string;
  field_name: string;
  val_a?: string | null;
  val_b?: string | null;
  source_ref_a?: string | null;
  source_ref_b?: string | null;
  message: string;
  created_at: string;
}

export interface ValidationAnalytics {
  total_validation_results: number;
  errors: number;
  warnings: number;
  valid_results: number;
  total_conflicts: number;
  recent_conflicts: ConflictSummary[];
}

export interface ReportSummary {
  id: number;
  report_title: string;
  report_type: string;
  status: string;
  created_by?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface ReportTypeDistribution {
  type: string;
  count: number;
}

export interface ReportAnalytics {
  total_reports: number;
  completed_reports: number;
  failed_reports: number;
  pending_reports: number;
  by_type: ReportTypeDistribution[];
  recent_reports: ReportSummary[];
}

export interface TopicAnalysisSummary {
  id: number;
  created_at: string;
  document_count: number;
  topic_count: number;
  top_terms: string[];
}

export interface DominantTopicItem {
  topic_id?: number;
  topic_name?: string;
  keywords?: string[];
  document_count?: number;
  source_documents?: any[];
}

export interface TopicAnalytics {
  total_analyses: number;
  documents_analyzed: number;
  recent_analyses: TopicAnalysisSummary[];
  dominant_topics: DominantTopicItem[];
}

export interface KnowledgeBaseAnalytics {
  status: string;
  total_chunks: number;
  indexed_vectors: number;
  dimension: number;
  model_name: string;
  sync_status: string;
}

export interface ActivityItem {
  type: string;
  title: string;
  timestamp: string;
  status: string;
  id?: number | null;
  details?: string | null;
}

export interface CoalProductionMetric {
  period: string;
  target_mt: number;
  actual_mt: number;
  achievement_pct: number;
  ash_pct?: number | null;
  gcv_kcal?: number | null;
}

export interface CoalAnalytics {
  has_coal_data: boolean;
  total_production_mt: number;
  avg_gcv?: number | null;
  avg_ash?: number | null;
  metrics: CoalProductionMetric[];
}

export interface DashboardOverviewResponse {
  date_range_applied: string;
  overview: OverviewMetrics;
  documents: DocumentAnalytics;
  validation: ValidationAnalytics;
  reports: ReportAnalytics;
  topics: TopicAnalytics;
  knowledge_base: KnowledgeBaseAnalytics;
  recent_activity: ActivityItem[];
  coal_analytics?: CoalAnalytics;
}
