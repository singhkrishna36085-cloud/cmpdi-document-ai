export interface DocumentItem {
  id: number;
  name: string;
  original_filename: string;
  type: string;
  source?: string | null;
  category?: string | null;
  doc_date?: string | null;
  processing_status?: string | null;
  page_count?: number | null;
}

export interface SourceReferenceItem {
  document_id: number | null;
  chunk_id: number | null;
  original_filename: string | null;
  page_number: number | null;
  sheet_name: string | null;
  source_reference: string | null;
}

export interface ValidationSummaryItem {
  total_validation_records: number;
  warning_count: number;
  error_count: number;
  conflict_count: number;
}

export interface GenerationMetadataItem {
  provider?: string | null;
  model?: string | null;
  source_document_count?: number | null;
  chunk_count?: number | null;
  validation_issue_count?: number | null;
  conflict_count?: number | null;
  generation_time_seconds?: number | null;
  status?: string | null;
  error_detail?: string | null;
}

export interface ReportItem {
  id: number;
  report_title: string;
  report_type: string;
  status: "pending" | "processing" | "completed" | "failed" | string;
  created_by?: string | null;
  created_at: string | null;
  completed_at?: string | null;
  source_document_ids: number[];
  report_content?: string | null;
  source_references?: SourceReferenceItem[] | null;
  validation_summary?: ValidationSummaryItem | null;
  generation_metadata?: GenerationMetadataItem | null;
}

export interface ReportGenerateRequest {
  document_ids: number[];
  report_type: string;
  title: string;
  provider?: string;
  model?: string;
}
