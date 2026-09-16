export interface DocumentMetadata {
  name: string;
  type: string;
  source: string;
  category: string;
  date: string;
  description: string;
}

export type FileValidationStatus = "valid" | "invalid_type" | "invalid_size" | "duplicate";

export interface FileItem {
  id: string;
  file: File;
  status: FileValidationStatus;
  errorMessage?: string;
  metadata: DocumentMetadata;
  uploadState: "idle" | "ready" | "processing" | "success" | "error";
}
