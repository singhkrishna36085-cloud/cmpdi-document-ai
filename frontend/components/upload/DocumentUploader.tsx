"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { FileItem, DocumentMetadata, FileValidationStatus } from "@/types/upload";
import { FileItemRow } from "./FileItemRow";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { fetchWithAuth } from "@/lib/api";

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'csv', 'jpg', 'jpeg', 'png', 'zip'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function DocumentUploader() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateFile = (file: File, currentFiles: FileItem[]): { status: FileValidationStatus; errorMessage?: string } => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext))
      return { status: "invalid_type", errorMessage: "Unsupported file type" };
    if (file.size > MAX_FILE_SIZE)
      return { status: "invalid_size", errorMessage: "File exceeds 50 MB limit" };
    if (currentFiles.some(f => f.file.name === file.name))
      return { status: "duplicate", errorMessage: "File already added" };
    return { status: "valid" };
  };

  // ── Add files ──────────────────────────────────────────────────────────────
  const handleFiles = (newFiles: File[]) => {
    setGlobalError(null);
    setFiles(prev => {
      const added: FileItem[] = [];
      const tempPrev = [...prev];
      newFiles.forEach(file => {
        const { status, errorMessage } = validateFile(file, tempPrev);
        const item: FileItem = {
          id: Math.random().toString(36).substring(7),
          file,
          status,
          errorMessage,
          uploadState: "idle",
          metadata: {
            name: file.name,
            type: "",
            source: "",
            category: "",
            date: new Date().toISOString().split('T')[0],
            description: "",
          },
        };
        added.push(item);
        tempPrev.push(item);
      });
      return [...prev, ...added];
    });
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
  }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
  }, [files]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const clearAll   = () => { setFiles([]); setGlobalError(null); };

  const updateMetadata = (id: string, metadata: DocumentMetadata) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, metadata } : f));

  // ── Upload one file via real API ───────────────────────────────────────────
  const uploadSingle = async (item: FileItem): Promise<void> => {
    // Mark as processing
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, uploadState: "processing" } : f));

    const form = new FormData();
    form.append("file", item.file);
    form.append("name", item.metadata.name);
    form.append("type", item.metadata.type);
    form.append("source", item.metadata.source);
    form.append("category", item.metadata.category);
    form.append("date", item.metadata.date);
    form.append("description", item.metadata.description || "");

    try {
      const res = await fetchWithAuth("/api/documents/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, uploadState: "success" } : f));
    } catch (err: any) {
      setFiles(prev =>
        prev.map(f =>
          f.id === item.id
            ? { ...f, uploadState: "idle", errorMessage: err.message, status: "invalid_type" }
            : f
        )
      );
      throw err;
    }
  };

  // ── Upload all valid files sequentially ───────────────────────────────────
  const handleUpload = async () => {
    setGlobalError(null);

    // Validate metadata completeness first
    const readyItems = files.filter(f => f.status === "valid" && f.uploadState !== "success");
    const incomplete = readyItems.filter(({ metadata: { name, type, source, category, date } }) =>
      !name || !type || !source || !category || !date
    );

    if (incomplete.length > 0) {
      setGlobalError(`${incomplete.length} file(s) have missing required metadata. Please fill in all fields marked with *.`);
      return;
    }

    if (readyItems.length === 0) return;

    let failed = 0;
    for (const item of readyItems) {
      try {
        await uploadSingle(item);
      } catch {
        failed++;
      }
    }

    if (failed > 0) {
      setGlobalError(`${failed} file(s) failed to upload. Check the highlighted files.`);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const validFilesReady   = files.filter(f => f.status === "valid" && f.uploadState !== "success").length;
  const isUploading       = files.some(f => f.uploadState === "processing");
  const allDone           = files.length > 0 && files.every(f => f.uploadState === "success" || f.status !== "valid");
  const successCount      = files.filter(f => f.uploadState === "success").length;

  return (
    <div className="space-y-6">
      {/* ── Drop zone ──────────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mt-2 flex justify-center rounded-xl border-2 border-dashed px-6 py-16 transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <div className="text-center">
          <UploadCloud className={`mx-auto h-12 w-12 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-300'}`} />
          <div className="mt-4 flex justify-center text-sm leading-6 text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
            >
              <span>Browse files</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                multiple
                className="sr-only"
                ref={fileInputRef}
                onChange={onFileInputChange}
                accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.zip"
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs leading-5 text-gray-500 mt-2">
            PDF, DOCX, XLSX, CSV, JPG, JPEG, PNG and ZIP · Max 50 MB per file
          </p>
        </div>
      </div>

      {/* ── Global error banner ────────────────────────────────────────────── */}
      {globalError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Success banner ─────────────────────────────────────────────────── */}
      {allDone && successCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            <strong>{successCount} document{successCount > 1 ? 's' : ''}</strong> uploaded and recorded in the database successfully.
          </span>
        </div>
      )}

      {/* ── File list ──────────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <SectionCard
          title={`Selected Files (${files.length})`}
          action={
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          }
        >
          <div className="space-y-2">
            {files.map(fileItem => (
              <FileItemRow
                key={fileItem.id}
                item={fileItem}
                onRemove={removeFile}
                onUpdateMetadata={updateMetadata}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {validFilesReady} file{validFilesReady !== 1 ? 's' : ''} ready to upload
            </p>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={validFilesReady === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading…
                </>
              ) : (
                `Upload ${validFilesReady > 0 ? `(${validFilesReady})` : ''} Document${validFilesReady !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
