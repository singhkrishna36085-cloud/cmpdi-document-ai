"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, X, RefreshCw, CheckCircle2, Cpu, FileText, Sparkles, Layers, ShieldCheck, Database, ArrowRight } from "lucide-react";
import { FileItem, DocumentMetadata, FileValidationStatus } from "@/types/upload";
import { FileItemRow } from "./FileItemRow";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { fetchWithAuth } from "@/lib/api";

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'csv', 'jpg', 'jpeg', 'png', 'zip'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const PIPELINE_STAGES = [
  { id: "UPLOAD", label: "Upload", icon: UploadCloud },
  { id: "OCR", label: "OCR Text", icon: FileText },
  { id: "EXTRACTION", label: "Extraction", icon: Cpu },
  { id: "VALIDATION", label: "Validation", icon: ShieldCheck },
  { id: "CHUNKING", label: "Chunking", icon: Layers },
  { id: "EMBEDDING", label: "Embedding", icon: Sparkles },
  { id: "FAISS", label: "FAISS Vector", icon: Database },
  { id: "READY", label: "Ready", icon: CheckCircle2 },
];

export function DocumentUploader() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activePipelineStage, setActivePipelineStage] = useState<number>(0);
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
            name: file.name.replace(/\.[^/.]+$/, ""),
            type: file.name.toLowerCase().includes("report") ? "Geological Report" : file.name.toLowerCase().includes("plan") ? "Mining Plan" : "Production Log",
            source: "CMPDI Central",
            category: "Operations",
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
  const clearAll   = () => { setFiles([]); setGlobalError(null); setActivePipelineStage(0); };

  const updateMetadata = (id: string, metadata: DocumentMetadata) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, metadata } : f));

  // ── Upload one file via real API ───────────────────────────────────────────
  const uploadSingle = async (item: FileItem): Promise<void> => {
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, uploadState: "processing" } : f));

    // Simulate pipeline stage progression visually during upload
    for (let s = 0; s <= 7; s++) {
      setActivePipelineStage(s);
      await new Promise(r => setTimeout(r, 120));
    }

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
      setActivePipelineStage(7);
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
      {/* ── 8-Stage Interactive Visual Pipeline Header ───────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Automated Document Ingestion & RAG Indexing Pipeline
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
            {isUploading ? "Pipeline Active" : "8 Stage Engine"}
          </span>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 pt-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = isUploading && activePipelineStage === idx;
            const isPassed = isUploading ? activePipelineStage > idx : allDone && successCount > 0;
            return (
              <div
                key={stage.id}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isActive
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/50 scale-105"
                    : isPassed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1 ${isActive ? "animate-pulse" : ""}`} />
                <span className="text-[10px] font-mono font-bold block">{stage.label}</span>
                <span className="text-[9px] font-mono opacity-60">Step {idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Drop zone ──────────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-10 transition-all duration-300 ${
          isDragging
            ? "border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-2xl shadow-cyan-500/20"
            : "border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:bg-slate-900"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />

        <div className="text-center relative z-10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
            <UploadCloud className={`h-8 w-8 ${isDragging ? "animate-bounce text-cyan-300" : ""}`} />
          </div>

          <div>
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer text-base font-bold text-slate-100 hover:text-cyan-400 transition-colors"
            >
              <span>Click to Browse Documents</span>
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
            <span className="text-slate-400 text-sm font-medium pl-1">or drag and drop files here</span>
          </div>

          <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
            Supports Geological Reports, Mining Plans, Production Logs & Survey Files (PDF, DOCX, XLSX, CSV, ZIP up to 50 MB)
          </p>
        </div>
      </div>

      {/* ── Global error banner ────────────────────────────────────────────── */}
      {globalError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 shadow-lg">
          <span className="shrink-0 text-base">⚠</span>
          <span className="flex-1">{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="shrink-0 text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {/* ── Success banner ─────────────────────────────────────────────────── */}
      {allDone && successCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-xs text-emerald-300 shadow-lg">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>
            <strong>{successCount} document{successCount > 1 ? 's' : ''}</strong> successfully ingested into PostgreSQL & FAISS vector store.
          </span>
        </div>
      )}

      {/* ── File list ──────────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <SectionCard
          title={`Selected Files (${files.length})`}
          action={
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading} className="text-slate-400 hover:text-slate-200">
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          }
        >
          <div className="space-y-3">
            {files.map(fileItem => (
              <FileItemRow
                key={fileItem.id}
                item={fileItem}
                onRemove={removeFile}
                onUpdateMetadata={updateMetadata}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
            <p className="text-xs font-mono text-slate-400">
              {validFilesReady} file{validFilesReady !== 1 ? 's' : ''} ready to process
            </p>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={validFilesReady === 0 || isUploading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-none shadow-lg shadow-cyan-500/20"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin text-slate-950" />
                  Running 8-Stage Pipeline…
                </>
              ) : (
                `Start Ingestion Pipeline (${validFilesReady})`
              )}
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

