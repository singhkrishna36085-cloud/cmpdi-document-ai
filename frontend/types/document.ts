export interface DocumentDetail {
  id: number;
  name: string;
  original_filename: string;
  type: string;
  source: string;
  category: string;
  doc_date: string | null;
  description: string;
  file_path: string;
  file_size: number | null;
  created_at: string | null;
  processing_status: "pending" | "processing" | "completed" | "failed";
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  page_count: number | null;
  is_confidential: boolean;
}

export interface DocumentChunkItem {
  id: number;
  document_id: number;
  page_number: number | null;
  sheet_name: string | null;
  source_reference?: string | null;
  chunk_type: string;
  content: string;
  created_at?: string | null;
}

export interface StructuredExtractionItem {
  id: number;
  document_id: number;
  chunk_id: number | null;
  page_number: number | null;
  sheet_name: string | null;
  source_reference: string | null;
  entity_type: string;
  data: Record<string, any>;
  created_at: string | null;
}

export interface ValidationResultItem {
  id: number;
  rule_type: string;
  severity: "error" | "warning" | "info";
  field_name: string | null;
  invalid_value: string | null;
  message: string;
  chunk_id?: number | null;
  page_number?: number | null;
  sheet_name?: string | null;
  source_reference?: string | null;
  created_at?: string | null;
}

export interface DocumentConflictItem {
  id: number;
  doc_a_id: number;
  doc_b_id: number;
  entity_type: string;
  entity_identifier: string;
  field_name: string;
  val_a: string;
  val_b: string;
  source_ref_a: string;
  source_ref_b: string;
  message: string;
  created_at?: string | null;
}

export interface ProcessingStage {
  stage_id: number;
  name: string;
  status: "completed" | "processing" | "pending" | "failed";
  timestamp: string | null;
  details: string;
}

export interface ProcessingDetails {
  document_id: number;
  name: string;
  original_filename: string;
  overall_status: "completed" | "processing" | "pending" | "failed";
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  page_count: number | null;
  chunks_count: number;
  structured_records_count: number;
  stages: ProcessingStage[];
}

export interface AuditEventItem {
  id: number;
  user_id: number | null;
  action: string;
  timestamp: string | null;
  details: string | null;
}

