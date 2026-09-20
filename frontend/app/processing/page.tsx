"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchWithAuth } from "@/lib/api";
import { 
  DocumentDetail, 
  ProcessingDetails, 
  AuditEventItem, 
  ValidationResultItem, 
  DocumentConflictItem 
} from "@/types/document";
import { 
  Cpu, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Layers, 
  Database, 
  FileText, 
  Eye, 
  Play, 
  ChevronRight, 
  ArrowRight, 
  Info, 
  Upload, 
  Activity, 
  Table as TableIcon,
  UploadCloud,
  Trash2,
  Loader2
} from "lucide-react";

export default function ProcessingPage() {
  const [documents, setDocuments] = useState<DocumentDetail[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected document processing & traceability details
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [processingDetails, setProcessingDetails] = useState<ProcessingDetails | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResultItem[]>([]);
  const [conflicts, setConflicts] = useState<DocumentConflictItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Search status overview (vector count)
  const [totalVectors, setTotalVectors] = useState<number | null>(null);

  // Polling ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Core document list loader
  const loadDocuments = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/documents");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError(`Failed to load document processing queue (${res.status})`);
        }
        return;
      }
      const data = await res.json();
      const docs: DocumentDetail[] = data.documents || [];
      setDocuments(docs);

      // Auto-select first document if none selected
      if (docs.length > 0 && selectedDocId === null) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err: any) {
      if (!isSilent) setError("Unable to connect to CMPDI backend server.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedDocId]);

  // Load vector count status from FAISS
  const loadVectorStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/search/status");
      if (res.ok) {
        const data = await res.json();
        setTotalVectors(data.total_vectors ?? null);
      }
    } catch (err) {
      // Silent catch
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDocuments();
    loadVectorStatus();
  }, [loadDocuments, loadVectorStatus]);

  // Controlled polling: Poll every 5s ONLY if any document is actively processing
  const isProcessingActive = useMemo(
    () => documents.some((d) => d.processing_status === "processing"),
    [documents]
  );

  useEffect(() => {
    if (isProcessingActive) {
      pollingRef.current = setInterval(() => {
        loadDocuments(true);
      }, 5000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isProcessingActive, loadDocuments]);

  // Load details when selectedDocId changes
  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setProcessingDetails(null);
      setValidationResults([]);
      setConflicts([]);
      setAuditLogs([]);
      return;
    }

    const foundDoc = documents.find((d) => d.id === selectedDocId) || null;
    setSelectedDoc(foundDoc);

    async function fetchDocDetails() {
      setDetailsLoading(true);
      try {
        const [procRes, valRes, confRes, auditRes] = await Promise.allSettled([
          fetchWithAuth(`/api/documents/${selectedDocId}/processing`),
          fetchWithAuth(`/api/documents/${selectedDocId}/validation`),
          fetchWithAuth(`/api/documents/${selectedDocId}/conflicts`),
          fetchWithAuth(`/api/audit`),
        ]);

        if (procRes.status === "fulfilled" && procRes.value.ok) {
          const pData = await procRes.value.json();
          setProcessingDetails(pData);
        }

        if (valRes.status === "fulfilled" && valRes.value.ok) {
          const vData = await valRes.value.json();
          setValidationResults(vData.validation_results || []);
        }

        if (confRes.status === "fulfilled" && confRes.value.ok) {
          const cData = await confRes.value.json();
          setConflicts(cData.conflicts || []);
        }

        if (auditRes.status === "fulfilled" && auditRes.value.ok) {
          const aData = await auditRes.value.json();
          setAuditLogs(aData.logs || []);
        }
      } catch (err) {
        // Silent catch for details panel
      } finally {
        setDetailsLoading(false);
      }
    }

    fetchDocDetails();
  }, [selectedDocId, documents]);

  // Trigger real backend re-processing endpoint
  const handleReprocess = async (docId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReprocessingId(docId);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}/process`, {
        method: "POST",
      });
      if (res.ok) {
        await loadDocuments(true);
      } else {
        const errData = await res.json();
        alert(`Processing trigger failed: ${errData.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Network error triggering re-process: ${err.message}`);
    } finally {
      setReprocessingId(null);
    }
  };

  const [drawerReuploading, setDrawerReuploading] = useState<boolean>(false);

  const handleReuploadDoc = async (docId: number, file: File) => {
    setDrawerReuploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetchWithAuth(`/api/documents/${docId}/reupload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Re-upload error: ${err.detail || "Upload failed"}`);
      } else {
        await loadDocuments(true);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setDrawerReuploading(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this document and its pipeline data?")) return;
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedDocId(null);
        await loadDocuments(true);
      } else {
        alert("Failed to delete document.");
      }
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  // KPI Calculations
  const totalCount = documents.length;
  const completedCount = useMemo(
    () => documents.filter((d) => d.processing_status === "completed").length,
    [documents]
  );
  const inPipelineCount = useMemo(
    () => documents.filter((d) => d.processing_status === "processing" || d.processing_status === "pending").length,
    [documents]
  );
  const failedCount = useMemo(
    () => documents.filter((d) => d.processing_status === "failed").length,
    [documents]
  );

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.source && doc.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.category && doc.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || doc.processing_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  // Format helper
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
      {/* Header Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Processing Monitoring Center</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Real-time document ingestion queue, OCR extraction status, stage breakdowns, and vector store indexing.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadDocuments()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-300 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            Refresh Queue
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-sm shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Link>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Total Ingested</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">{totalCount}</div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Completed</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{completedCount}</div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">In Pipeline</span>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            {inPipelineCount}
            {isProcessingActive && (
              <span className="ml-2 text-xs font-normal text-amber-600 animate-pulse">● Live polling</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Failed</span>
          <div className={`text-2xl font-bold font-mono ${failedCount > 0 ? "text-rose-600" : "text-slate-700"}`}>
            {failedCount}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Indexed Vectors</span>
          <div className="text-2xl font-bold text-blue-600 font-mono">
            {totalVectors !== null ? totalVectors : "Ready"}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          {["all", "completed", "processing", "pending", "failed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search document name or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Layout: Table/List + Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Processing List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-white border border-slate-200 animate-pulse p-4 shadow-sm" />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
              <EmptyState
                icon={<Cpu className="h-full w-full text-slate-400" />}
                title={searchQuery || statusFilter !== "all" ? "No matching documents found" : "Processing queue is empty"}
                description={
                  searchQuery || statusFilter !== "all"
                    ? "Try changing your status filter or search keywords."
                    : "Upload a CMPDI report to trigger processing."
                }
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDocs.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                const isReprocessing = reprocessingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer space-y-3 shadow-sm ${
                      isSelected
                        ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                          ID #{doc.id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {doc.name || doc.original_filename}
                        </h4>
                        {doc.is_confidential && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0 font-medium">
                            HOD Confidential
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(doc.processing_status)}
                      </div>
                    </div>

                    <p className="text-xs font-mono text-slate-500 line-clamp-1">{doc.original_filename}</p>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-4 font-mono">
                        <span>Pages: <strong className="text-slate-800">{doc.page_count ?? "1"}</strong></span>
                        <span>Category: <strong className="text-slate-800">{doc.category || "General"}</strong></span>
                        <span>Size: <strong className="text-slate-800">{formatFileSize(doc.file_size)}</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleReprocess(doc.id, e)}
                          disabled={isReprocessing}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                          title="Re-run processing pipeline"
                        >
                          <Play className={`w-3 h-3 text-blue-600 ${isReprocessing ? "animate-spin" : ""}`} />
                          {isReprocessing ? "Processing..." : "Re-process"}
                        </button>

                        <Link
                          href={`/documents/viewer?id=${doc.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium flex items-center gap-1 border border-blue-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Viewer
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Document Processing Inspection Panel */}
        <div className="lg:col-span-5 space-y-6">
          {!selectedDoc ? (
            <div className="p-8 rounded-lg bg-white border border-slate-200 text-center text-slate-500 text-xs shadow-sm">
              Select a document from the queue list to inspect processing stage details.
            </div>
          ) : detailsLoading ? (
            <div className="p-6 rounded-lg bg-white border border-slate-200 space-y-4 animate-pulse shadow-sm">
              <div className="h-6 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100/80 rounded w-1/2" />
              <div className="h-48 bg-slate-100/60 rounded w-full mt-4" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Document Overview Panel */}
              <div className="p-6 rounded-lg bg-white border border-slate-200 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                        ID #{selectedDoc.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedDoc.name || selectedDoc.original_filename}
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedDoc.original_filename}</p>
                  </div>

                  <Link
                    href={`/documents/viewer?id=${selectedDoc.id}`}
                    className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shrink-0"
                    title="Open in Document Viewer"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>

                {/* Status & Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-semibold">Overall Status</span>
                    <div className="mt-1">{getStatusBadge(selectedDoc.processing_status)}</div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-semibold">Page Count</span>
                    <span className="text-slate-900 font-mono font-bold mt-1 block text-sm">
                      {selectedDoc.page_count ?? "1"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-semibold">Extracted Chunks</span>
                    <span className="text-blue-600 font-mono font-bold mt-1 block text-sm">
                      {processingDetails?.chunks_count ?? "0"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-semibold">Structured Records</span>
                    <span className="text-indigo-600 font-mono font-bold mt-1 block text-sm">
                      {processingDetails?.structured_records_count ?? "0"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-semibold">Validation Issues</span>
                    <span className="text-amber-600 font-mono font-bold mt-1 block text-sm">
                      {validationResults.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-semibold">Conflicts</span>
                    <span className={`font-mono font-bold mt-1 block text-sm ${conflicts.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {conflicts.length}
                    </span>
                  </div>
                </div>

                {/* Error Banner if Failed */}
                {selectedDoc.processing_status === "failed" && (
                  <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-3">
                    <div className="flex items-center justify-between text-rose-700 font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Processing Failed / File Missing
                      </span>
                    </div>
                    <p className="font-mono text-[11px] leading-relaxed break-all text-rose-900 bg-rose-100/60 p-2 rounded border border-rose-200">
                      {selectedDoc.error_message || "Document processing failed."}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="file"
                        id={`proc-reupload-${selectedDoc.id}`}
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleReuploadDoc(selectedDoc.id, f);
                        }}
                      />
                      <label
                        htmlFor={`proc-reupload-${selectedDoc.id}`}
                        className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        {drawerReuploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        {drawerReuploading ? "Uploading..." : "Re-upload File"}
                      </label>
                      <button
                        onClick={(e) => handleReprocess(selectedDoc.id, e)}
                        className="px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs border border-slate-300 font-medium transition-colors shadow-sm cursor-pointer"
                      >
                        Retry Pipeline
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(selectedDoc.id)}
                        className="px-2.5 py-1.5 rounded-md bg-white hover:bg-rose-50 text-rose-600 text-xs border border-rose-200 font-medium transition-colors shadow-sm cursor-pointer"
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 6-Stage Processing Timeline */}
              <div className="p-6 rounded-lg bg-white border border-slate-200 space-y-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Pipeline Stage Breakdown
                </h4>

                <div className="relative border-l-2 border-slate-200 ml-3 pl-5 space-y-6">
                  {(processingDetails?.stages || []).map((stage) => (
                    <div key={stage.stage_id} className="relative">
                      {/* Timeline Node Dot */}
                      <div
                        className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          stage.status === "completed"
                            ? "bg-emerald-500 ring-2 ring-emerald-100"
                            : stage.status === "processing"
                            ? "bg-amber-500 ring-2 ring-amber-100 animate-pulse"
                            : stage.status === "failed"
                            ? "bg-rose-500 ring-2 ring-rose-100"
                            : "bg-slate-300 ring-2 ring-slate-100"
                        }`}
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {stage.stage_id}. {stage.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                              stage.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : stage.status === "processing"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : stage.status === "failed"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {stage.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug">{stage.details}</p>

                        {stage.timestamp && (
                          <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                            {new Date(stage.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Traceability Breakdown */}
              <div className="p-6 rounded-lg bg-white border border-slate-200 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" /> Data Traceability Breakdown
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">PostgreSQL Document ID</span>
                    <span className="font-mono text-blue-600 font-bold">#{selectedDoc.id}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Storage Relative File</span>
                    <span className="font-mono text-slate-700 text-[11px] font-semibold break-all max-w-[200px] text-right">{selectedDoc.file_path}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Vector Store Status</span>
                    <span className="font-semibold text-emerald-700">
                      {processingDetails?.chunks_count ? `${processingDetails.chunks_count} FAISS Chunks` : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Audit History Timeline */}
              <div className="p-6 rounded-lg bg-white border border-slate-200 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> System Processing Log History
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{auditLogs.length} events</span>
                </h4>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-3">No processing history available.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-blue-700">{log.action}</span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                          </span>
                        </div>
                        {log.details && <p className="text-slate-600 text-[11px]">{log.details}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
