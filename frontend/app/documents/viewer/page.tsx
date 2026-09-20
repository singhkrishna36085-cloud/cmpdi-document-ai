"use client";

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchWithAuth } from "@/lib/api";
import { 
  DocumentDetail, 
  DocumentChunkItem, 
  StructuredExtractionItem, 
  ValidationResultItem, 
  DocumentConflictItem, 
  ProcessingDetails 
} from "@/types/document";
import { 
  Eye, 
  ArrowLeft, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Database, 
  Layers, 
  Table as TableIcon, 
  Search, 
  Bot, 
  FileBarChart, 
  ExternalLink, 
  ChevronRight, 
  Info, 
  RefreshCw, 
  FolderOpen, 
  UploadCloud, 
  Trash2, 
  Loader2, 
  Download,
  Check
} from "lucide-react";

function DocumentViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawId = searchParams.get("id");
  const docId = rawId ? parseInt(rawId, 10) : null;

  // Document selection list (when no ID is selected or switching)
  const [docList, setDocList] = useState<DocumentDetail[]>([]);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"preview" | "overview" | "content" | "structured" | "validation" | "processing">(
    tabParam === "overview" || tabParam === "content" || tabParam === "structured" || tabParam === "validation" || tabParam === "processing" 
      ? tabParam 
      : "preview"
  );

  // Real backend data states
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [fullText, setFullText] = useState<string>("");
  const [structuredData, setStructuredData] = useState<StructuredExtractionItem[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResultItem[]>([]);
  const [conflicts, setConflicts] = useState<DocumentConflictItem[]>([]);
  const [processingDetails, setProcessingDetails] = useState<ProcessingDetails | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // File management states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reuploading, setReuploading] = useState<boolean>(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Load document list for selector dropdown
  useEffect(() => {
    async function loadDocList() {
      try {
        const res = await fetchWithAuth("/api/documents");
        if (res.ok) {
          const data = await res.json();
          const docs = data.documents || [];
          setDocList(docs);
          // If no docId specified and documents exist, auto-navigate to the first document
          if (!docId && docs.length > 0) {
            router.replace(`/documents/viewer?id=${docs[0].id}`);
          }
        }
      } catch (err) {
        // Silent catch for list dropdown
      }
    }
    loadDocList();
  }, [docId, router]);

  // Download document
  const handleDownload = async () => {
    if (!docId) return;
    setDownloading(true);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}/file?download=true`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Download failed. File may have been cleared from cloud temporary storage.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document?.original_filename || `document_${docId}`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(`Network error downloading: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // Fetch real document details
  const fetchDocumentData = useCallback(async () => {
    if (!docId || isNaN(docId)) {
      setDocument(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      // 1. Fetch Document Metadata
      const docRes = await fetchWithAuth(`/api/documents/${docId}`);
      if (!docRes.ok) {
        setErrorCode(docRes.status);
        if (docRes.status === 403) {
          setError("Access Denied: Confidential document restricted to HOD role.");
        } else if (docRes.status === 404) {
          setError(`Document ID #${docId} was not found in PostgreSQL.`);
        } else if (docRes.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError(`Failed to retrieve document metadata (${docRes.status}).`);
        }
        setLoading(false);
        return;
      }
      const docData: DocumentDetail = await docRes.json();
      setDocument(docData);

      // 2. Fetch Content & Chunks in parallel with Structured Data, Validation, Conflicts, Processing
      const [contentRes, structuredRes, valRes, confRes, procRes] = await Promise.allSettled([
        fetchWithAuth(`/api/documents/${docId}/content`),
        fetchWithAuth(`/api/documents/${docId}/structured`),
        fetchWithAuth(`/api/documents/${docId}/validation`),
        fetchWithAuth(`/api/documents/${docId}/conflicts`),
        fetchWithAuth(`/api/documents/${docId}/processing`),
      ]);

      // Process Content response
      if (contentRes.status === "fulfilled" && contentRes.value.ok) {
        const cData = await contentRes.value.json();
        setChunks(cData.chunks || []);
        setFullText(cData.extracted_text || "");
      }

      // Process Structured Data response
      if (structuredRes.status === "fulfilled" && structuredRes.value.ok) {
        const sData = await structuredRes.value.json();
        setStructuredData(sData.structured_data || []);
      }

      // Process Validation response
      if (valRes.status === "fulfilled" && valRes.value.ok) {
        const vData = await valRes.value.json();
        setValidationResults(vData.validation_results || []);
      }

      // Process Conflicts response
      if (confRes.status === "fulfilled" && confRes.value.ok) {
        const confData = await confRes.value.json();
        setConflicts(confData.conflicts || []);
      }

      // Process Processing details response
      if (procRes.status === "fulfilled" && procRes.value.ok) {
        const pData = await procRes.value.json();
        setProcessingDetails(pData);
      }

    } catch (err: any) {
      setError("Unable to connect to CMPDI backend server.");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  // Trigger load when docId changes
  useEffect(() => {
    fetchDocumentData();
  }, [fetchDocumentData]);

  // Handle file re-upload to replace or restore missing file
  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docId) return;
    setReuploading(true);
    setReuploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetchWithAuth(`/api/documents/${docId}/reupload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Re-upload failed on backend.");
      }
      await fetchDocumentData();
    } catch (err: any) {
      setReuploadError(err.message || "Failed to re-upload file.");
    } finally {
      setReuploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle document deletion
  const handleDelete = async () => {
    if (!docId) return;
    const docName = document?.name || document?.original_filename || `#${docId}`;
    if (!window.confirm(`Are you sure you want to permanently delete document "${docName}"? This will remove all chunks, structured extractions, and file references.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/documents");
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to delete document: ${errData.detail || "Server error"}`);
        setDeleting(false);
      }
    } catch (err: any) {
      alert(`Network error deleting document: ${err.message}`);
      setDeleting(false);
    }
  };

  // Handle retry processing
  const handleRetryProcess = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}/process`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDocumentData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Process retry: ${errData.detail || "File still missing or invalid."}`);
        await fetchDocumentData();
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
      setLoading(false);
    }
  };

  // Derived counts for KPI cards
  const valErrorsCount = useMemo(
    () => validationResults.filter((v) => v.severity === "error").length,
    [validationResults]
  );
  const valWarningsCount = useMemo(
    () => validationResults.filter((v) => v.severity === "warning").length,
    [validationResults]
  );

  // Helper formatting functions
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  // Filtered chunks based on search
  const filteredChunks = useMemo(() => {
    if (!searchTerm.trim()) return chunks;
    const term = searchTerm.toLowerCase();
    return chunks.filter(
      (c) =>
        c.content.toLowerCase().includes(term) ||
        (c.sheet_name && c.sheet_name.toLowerCase().includes(term)) ||
        (c.page_number && c.page_number.toString().includes(term))
    );
  }, [chunks, searchTerm]);

  // Render "No Document Selected" state
  if (!docId || isNaN(docId)) {
    return (
      <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
        <PageHeader
          title="Document Viewer"
          description="Inspect document preview, structured extractions, page traceability, and validation findings."
        />

        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Select a Document to View</h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose an uploaded report from the repository list below or navigate from the Documents page.
            </p>
          </div>

          {docList.length > 0 ? (
            <div className="space-y-2.5 text-left max-h-96 overflow-y-auto pr-1">
              {docList.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/documents/viewer?id=${doc.id}&tab=preview`)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-white hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                          ID #{doc.id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {doc.name || doc.original_filename}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{doc.original_filename}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          ) : (
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              Go to Document Repository
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Render Error / RBAC state
  if (error) {
    return (
      <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
        <div className="flex items-center gap-4">
          <Link
            href="/documents"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PageHeader
            title={`Document #${docId} Inspection`}
            description="Viewing document status, extractions, and validation findings."
          />
        </div>

        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-slate-900 space-y-4 max-w-3xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 text-rose-600">
            <ShieldAlert className="w-8 h-8 shrink-0" />
            <h3 className="text-lg font-bold">
              {errorCode === 403
                ? "403 Access Denied"
                : errorCode === 404
                ? "404 Document Not Found"
                : "Error Loading Document"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
          <div className="pt-4 border-t border-slate-200 flex gap-3">
            <Link
              href="/documents"
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors shadow-sm"
            >
              Back to Documents
            </Link>
            {errorCode === 403 && (
              <span className="text-xs text-amber-700 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Note: This document is flagged as confidential and requires HOD privilege.
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Loading state
  if (loading || !document) {
    return (
      <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
        <div className="flex items-center gap-4">
          <Link
            href="/documents"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PageHeader
            title={`Loading Document #${docId}...`}
            description="Fetching real PostgreSQL metadata, extracted text chunks, and structured extractions."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse p-4 shadow-sm" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse p-6 shadow-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-colors shrink-0"
            title="Back to Document Repository"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                ID #{document.id}
              </span>
              <h1 className="text-xl font-bold text-slate-900">{document.name || document.original_filename}</h1>
              {document.is_confidential && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5" /> HOD Confidential
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{document.original_filename}</p>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Document Switcher Dropdown */}
          {docList.length > 1 && (
            <select
              value={document.id}
              onChange={(e) => router.push(`/documents/viewer?id=${e.target.value}&tab=${activeTab}`)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {docList.map((d) => (
                <option key={d.id} value={d.id}>
                  Doc #{d.id}: {d.name || d.original_filename}
                </option>
              ))}
            </select>
          )}

          {/* Re-upload File Button */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png"
            onChange={handleReupload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={reuploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            title="Re-upload source file to restore or refresh OCR data"
          >
            {reuploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            {reuploading ? "Uploading..." : "Re-upload File"}
          </button>

          {/* Download Original File */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            title="Download source document file"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download
          </button>

          <Link
            href={`/assistant?doc_id=${document.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-sm transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" /> AI Assistant
          </Link>
          <Link
            href={`/search?query=${encodeURIComponent(document.name || document.original_filename)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-sm transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-blue-600" /> Search
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-sm transition-colors"
          >
            <FileBarChart className="w-3.5 h-3.5 text-blue-600" /> Reports
          </Link>

          {/* Delete Document Button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors disabled:opacity-50"
            title="Delete this document record"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Ephemeral Cloud Storage / Processing Error Recovery Banner */}
      {(document.processing_status === "failed" || document.error_message) && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <span>
                    {document.error_message?.includes("File missing")
                      ? "Notice: File Needs Re-upload (Cloud Storage Cleared)"
                      : "Document Processing Error"}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 uppercase tracking-wide font-semibold">
                    Action Available
                  </span>
                </h4>
                <p className="text-xs text-amber-800 font-mono break-all">
                  {document.error_message || "Document processing could not complete."}
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed max-w-3xl">
                  {document.error_message?.includes("File missing")
                    ? "In cloud hosting (Render), physical container files are cleared during redeployments. Re-upload the original file below to permanently store it in PostgreSQL, restore PDF preview, and refresh AI vectors."
                    : "The processing pipeline encountered an issue. You can re-upload the file or trigger a retry."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={reuploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all disabled:opacity-50"
              >
                {reuploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Processing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Re-upload File
                  </>
                )}
              </button>

              <button
                onClick={handleRetryProcess}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 shadow-sm transition-colors"
                title="Retry processing with existing file"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Retry
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs border border-rose-200 transition-colors"
                title="Delete this document record"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {reuploadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
              Re-upload error: {reuploadError}
            </div>
          )}
        </div>
      )}

      {/* KPI Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Status</span>
          <div className="pt-0.5">{getStatusBadge(document.processing_status)}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Pages</span>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {document.page_count ?? "N/A"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Extracted Chunks</span>
          <div className="text-lg font-bold text-blue-600 font-mono">{chunks.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Structured Data</span>
          <div className="text-lg font-bold text-cyan-600 font-mono">{structuredData.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Validation Issues</span>
          <div className="flex items-center gap-2 text-lg font-bold font-mono">
            <span className={valErrorsCount > 0 ? "text-rose-600" : "text-slate-700"}>
              {valErrorsCount} <span className="text-xs text-rose-600 font-normal">err</span>
            </span>
            <span className="text-slate-400">/</span>
            <span className={valWarningsCount > 0 ? "text-amber-600" : "text-slate-700"}>
              {valWarningsCount} <span className="text-xs text-amber-600 font-normal">warn</span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Conflicts</span>
          <div className={`text-lg font-bold font-mono ${conflicts.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {conflicts.length}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "preview"
              ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg"
          }`}
        >
          <Eye className="w-4 h-4" /> Document File Preview
        </button>

        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg"
          }`}
        >
          <FileText className="w-4 h-4" /> Overview & Metadata
        </button>

        <button
          onClick={() => setActiveTab("content")}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "content"
              ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg"
          }`}
        >
          <Layers className="w-4 h-4" /> Extracted Content ({chunks.length})
        </button>

        <button
          onClick={() => setActiveTab("structured")}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "structured"
              ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg"
          }`}
        >
          <TableIcon className="w-4 h-4" /> Structured Data ({structuredData.length})
        </button>

        <button
          onClick={() => setActiveTab("validation")}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "validation"
              ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Validation & Conflicts ({validationResults.length + conflicts.length})
        </button>

        <button
          onClick={() => setActiveTab("processing")}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "processing"
              ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg"
          }`}
        >
          <Clock className="w-4 h-4" /> Pipeline Timeline
        </button>
      </div>

      {/* Tab 0: ORIGINAL FILE / PDF PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
                {document.type || "DOCUMENT"}
              </span>
              <span className="text-sm font-semibold text-slate-900">{document.original_filename}</span>
              <span className="text-xs text-slate-500 font-mono">({formatFileSize(document.file_size)})</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/documents/${document.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-sm transition-colors"
                title="Open raw document in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
              </a>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
                title="Download original document"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download File
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={reuploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 transition-colors"
                title="Re-upload or replace this file"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Replace File
              </button>
            </div>
          </div>

          {document.processing_status === "failed" ? (
            <div className="space-y-6">
              <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">Original File Needs Re-upload</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {document.error_message || "The raw file is not present on server disk cache. Please re-upload the file to restore complete PDF viewer & tables."}
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={reuploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all"
                >
                  <UploadCloud className="w-4 h-4" /> Re-upload File Now
                </button>
              </div>

              {/* If extracted text exists in DB, render it as an in-page Document Reader */}
              {(fullText || chunks.length > 0) && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" /> Extracted Document Text Reader (From Database)
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">{chunks.length} Chunks Available</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-800 bg-slate-50 p-5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                    {fullText || chunks.map(c => `[Page ${c.page_number || 1}]\n${c.content}`).join("\n\n---\n\n")}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <iframe
                src={`/api/documents/${document.id}/file`}
                className="w-full h-[850px] bg-slate-50"
                title={document.name || document.original_filename}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 1: OVERVIEW & METADATA */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" /> Document Record Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Original Filename</span>
                <p className="text-slate-900 font-mono font-medium mt-1 break-all">{document.original_filename}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Document Name</span>
                <p className="text-slate-900 font-medium mt-1">{document.name}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Category</span>
                <p className="text-slate-900 font-medium mt-1">{document.category || "General"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Source / Department</span>
                <p className="text-slate-900 font-medium mt-1">{document.source || "CMPDI"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">File Type / Extension</span>
                <p className="text-slate-900 font-mono font-medium mt-1 uppercase">{document.type}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">File Size</span>
                <p className="text-slate-900 font-mono font-medium mt-1">{formatFileSize(document.file_size)}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Document Date</span>
                <p className="text-slate-900 font-mono font-medium mt-1">{document.doc_date || "Not specified"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Uploaded At</span>
                <p className="text-slate-900 font-mono font-medium mt-1">
                  {document.created_at ? new Date(document.created_at).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>

            {document.description && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Description</span>
                <p className="text-xs text-slate-700 leading-relaxed">{document.description}</p>
              </div>
            )}

            {document.error_message && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Processing Status / Error Details
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm transition-colors"
                  >
                    <UploadCloud className="w-3 h-3" /> Re-upload File
                  </button>
                </div>
                <p className="font-mono text-amber-800">{document.error_message}</p>
              </div>
            )}
          </div>

          {/* Side Summary Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 h-fit">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" /> Pipeline Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Processing Started</span>
                <span className="font-mono text-slate-800 font-medium">
                  {document.processing_started_at
                    ? new Date(document.processing_started_at).toLocaleTimeString()
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Processing Completed</span>
                <span className="font-mono text-slate-800 font-medium">
                  {document.processing_completed_at
                    ? new Date(document.processing_completed_at).toLocaleTimeString()
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500">FAISS Indexing</span>
                <span className="font-semibold text-emerald-600">
                  {chunks.length > 0 ? `${chunks.length} Vectors Indexed` : "Pending"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Confidentiality Role</span>
                <span className="font-semibold text-amber-700">
                  {document.is_confidential ? "HOD Only" : "Normal / Public"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block">Source Traceability</span>
              <p className="leading-relaxed">
                All extracted content, tables, and structured entity fields retain raw chunk references with page and sheet numbers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: EXTRACTED CONTENT */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter extracted chunks by keyword, page, or sheet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredChunks.length} of {chunks.length} chunks
            </span>
          </div>

          {filteredChunks.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-sm">
              No extracted content available for this document.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChunks.map((c, index) => (
                <div
                  key={c.id || index}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                        Chunk #{c.id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        Type: {c.chunk_type}
                      </span>
                      {c.page_number && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-cyan-700 font-medium border border-slate-200">
                          Page {c.page_number}
                        </span>
                      )}
                      {c.sheet_name && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-amber-700 font-medium border border-slate-200">
                          Sheet: {c.sheet_name}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      Source Ref: {c.source_reference || `Doc #${document.id} Chunk #${c.id}`}
                    </span>
                  </div>

                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
                    {c.content}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: STRUCTURED DATA */}
      {activeTab === "structured" && (
        <div className="space-y-6">
          {structuredData.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-sm">
              No structured data available for this document.
            </div>
          ) : (
            <div className="space-y-6">
              {structuredData.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold uppercase">
                        {item.entity_type}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Record ID #{item.id}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                      {item.page_number && <span className="text-cyan-700 font-medium">Page {item.page_number}</span>}
                      {item.sheet_name && <span className="text-amber-700 font-medium">Sheet: {item.sheet_name}</span>}
                      <span>Source: {item.source_reference || `Chunk #${item.chunk_id}`}</span>
                    </div>
                  </div>

                  {/* Render Key-Value or Tabular Extraction dynamically */}
                  {item.entity_type === "table" && Array.isArray(item.data?.rows) ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                          <tr>
                            {item.data.columns?.map((col: string, idx: number) => (
                              <th key={idx} className="p-3 font-semibold text-slate-800">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.data.rows.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                              {Array.isArray(row)
                                ? row.map((val: any, cIdx: number) => (
                                    <td key={cIdx} className="p-3 text-slate-800">
                                      {val?.toString() || ""}
                                    </td>
                                  ))
                                : Object.values(row).map((val: any, cIdx: number) => (
                                    <td key={cIdx} className="p-3 text-slate-800">
                                      {val?.toString() || ""}
                                    </td>
                                  ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(item.data || {}).map(([key, val]) => (
                        <div key={key} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">{key}</span>
                          <span className="text-xs font-mono font-semibold text-slate-800 mt-1 block break-all">
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: VALIDATION & CONFLICTS */}
      {activeTab === "validation" && (
        <div className="space-y-6">
          {/* Validation Findings */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Single-Document Validation Findings
              </span>
              <span className="text-xs font-mono text-slate-500">{validationResults.length} issues</span>
            </h3>

            {validationResults.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-emerald-700 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> No validation issues detected for this document.
              </div>
            ) : (
              <div className="space-y-3">
                {validationResults.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            v.severity === "error"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-amber-100 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {v.severity}
                        </span>
                        <span className="text-xs font-mono text-blue-700 font-semibold">{v.rule_type}</span>
                        {v.field_name && (
                          <span className="text-xs font-mono text-slate-500">Field: {v.field_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800">{v.message}</p>
                      {v.invalid_value && (
                        <p className="text-[11px] font-mono text-rose-700">
                          Value: <span className="underline font-semibold">{v.invalid_value}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                      {v.source_reference || (v.page_number ? `Page ${v.page_number}` : `Chunk #${v.chunk_id}`)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross-Document Conflicts */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Cross-Document Conflicts
              </span>
              <span className="text-xs font-mono text-slate-500">{conflicts.length} conflicts</span>
            </h3>

            {conflicts.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-emerald-700 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> No cross-document conflicts detected for this document.
              </div>
            ) : (
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-rose-700 font-semibold">
                        Conflict on {c.entity_identifier} ({c.field_name})
                      </span>
                      <span className="font-mono text-slate-400">Conflict ID #{c.id}</span>
                    </div>

                    <p className="text-xs text-slate-700">{c.message}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                      <div className="p-2.5 rounded bg-white border border-slate-200">
                        <span className="text-slate-500 text-[10px] block">Document #{c.doc_a_id} Value</span>
                        <span className="text-blue-600 font-bold block mt-0.5">{c.val_a}</span>
                        <span className="text-slate-400 text-[10px] block mt-1">{c.source_ref_a}</span>
                      </div>

                      <div className="p-2.5 rounded bg-white border border-slate-200">
                        <span className="text-slate-500 text-[10px] block">Document #{c.doc_b_id} Value</span>
                        <span className="text-rose-600 font-bold block mt-0.5">{c.val_b}</span>
                        <span className="text-slate-400 text-[10px] block mt-1">{c.source_ref_b}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: PROCESSING PIPELINE */}
      {activeTab === "processing" && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Document Processing Pipeline Timeline
          </h3>

          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
            {(processingDetails?.stages || []).map((stage) => (
              <div key={stage.stage_id} className="relative">
                {/* Timeline Node Dot */}
                <div
                  className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                    stage.status === "completed"
                      ? "bg-emerald-500 border-white"
                      : stage.status === "processing"
                      ? "bg-amber-500 border-white animate-ping"
                      : stage.status === "failed"
                      ? "bg-rose-500 border-white"
                      : "bg-slate-300 border-white"
                  }`}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-slate-900">
                      Stage {stage.stage_id}: {stage.name}
                    </h4>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                        stage.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : stage.status === "processing"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : stage.status === "failed"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{stage.details}</p>

                  {stage.timestamp && (
                    <span className="text-[11px] font-mono text-slate-400 block pt-0.5">
                      {new Date(stage.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentViewerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 bg-slate-50 min-h-screen">Loading Document Viewer...</div>}>
      <DocumentViewerContent />
    </Suspense>
  );
}
