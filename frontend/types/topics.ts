export interface WordFrequency {
  term: string;
  frequency: number;
}

export interface TopicSourceDoc {
  document_id: number;
  original_filename: string;
}

export interface TopicCluster {
  topic_id: number;
  topic_name: string;
  keywords: string[];
  document_count: number;
  source_documents: TopicSourceDoc[];
}

export interface AnalyzedDocInfo {
  document_id: number;
  original_filename: string;
  type: string;
  category?: string | null;
  chunk_count: number;
}

export interface TopicAnalysisResponse {
  analysis_id: number;
  documents_analyzed: number;
  word_frequencies: WordFrequency[];
  topics: TopicCluster[];
  wordcloud_image: string | null;
  generated_at: string;
  source_documents: AnalyzedDocInfo[];
}

export interface TopicAnalyzeRequest {
  document_ids?: number[] | null;
}
