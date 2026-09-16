"use client";

import { useEffect, useState, useMemo } from "react";
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
  FolderOpen
} from "lucide-react";

export default function DocumentViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawId = searchParams.get("id");
  const docId = rawId ? parseInt(rawId, 10) : null;

  // Document selection list (when no ID is selected or switching)
  const [docList, setDocList] = useState<DocumentDetail[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "structured" | "validation" | "processing">("overview");

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

  // Load document list for selector dropdown
  useEffect(() => {
    async function loadDocList() {
      try {
        const res = await fetchWithAuth("/api/documents");
        if (res.ok) {
          const data = await res.json();
          setDocList(data.documents || []);
        }
      } catch (err) {
        // Silent catch for list dropdown
      }
    }
    loadDocList();
  }, []);

  // Fetch real document details when docId changes
  useEffect(() => {
    if (!docId || isNaN(docId)) {
      setDocument(null);
      setLoading(false);
      return;
    }

    async function fetchDocumentData() {
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
    }

    fetchDocumentData();
  }, [docId]);

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
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Pending
          </span>
        );
    }
  };

  // Filtered chunks based on search
  const filteredChunks = useMemo(() => {
    if (!searchTerm) return chunks;
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
      <div className="space-y-6">
        <PageHeader
          title="Document Viewer"
          description="Inspect real document content, structured extractions, page traceability, and validation findings."
        />

        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-2xl mx-auto space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100">Select a Document to View</h2>
            <p className="text-sm text-slate-400 mt-1">
              Choose an uploaded report from the repository list below or navigate from the Documents page.
            </p>
          </div>

          {docList.length > 0 ? (
            <div className="space-y-3 text-left max-h-80 overflow-y-auto pr-1">
              {docList.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/documents/viewer?id=${doc.id}`)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/80 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-400 font-semibold">
                          ID #{doc.id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-teal-400 transition-colors">
                          {doc.name || doc.original_filename}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{doc.original_filename}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          ) : (
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors"
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/documents"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PageHeader
            title={`Document #${docId} Inspection`}
            description="Viewing document status, extractions, and validation findings."
          />
        </div>

        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-slate-100 space-y-4 max-w-3xl mx-auto shadow-xl">
          <div className="flex items-center gap-3 text-rose-400">
            <ShieldAlert className="w-8 h-8 shrink-0" />
            <h3 className="text-lg font-bold">
              {errorCode === 403
                ? "403 Access Denied"
                : errorCode === 404
                ? "404 Document Not Found"
                : "Error Loading Document"}
            </h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
          <div className="pt-4 border-t border-rose-500/20 flex gap-3">
            <Link
              href="/documents"
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Back to Documents
            </Link>
            {errorCode === 403 && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/documents"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400"
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
            <div key={i} className="h-28 rounded-xl bg-slate-900/50 border border-slate-800 animate-pulse p-4" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse p-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                ID #{document.id}
              </span>
              <h1 className="text-xl font-bold text-slate-100">{document.name || document.original_filename}</h1>
              {document.is_confidential && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-3.5 h-3.5" /> HOD Confidential
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{document.original_filename}</p>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Document Switcher Dropdown */}
          {docList.length > 1 && (
            <select
              value={document.id}
              onChange={(e) => router.push(`/documents/viewer?id=${e.target.value}`)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {docList.map((d) => (
                <option key={d.id} value={d.id}>
                  Doc #{d.id}: {d.name || d.original_filename}
                </option>
              ))}
            </select>
          )}

          <Link
            href={`/assistant?doc_id=${document.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-semibold border border-teal-500/20 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" /> Open in AI Assistant
          </Link>
          <Link
            href={`/search?query=${encodeURIComponent(document.name || document.original_filename)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-teal-400" /> Search Knowledge
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
          >
            <FileBarChart className="w-3.5 h-3.5 text-teal-400" /> Reports
          </Link>
        </div>
      </div>

      {/* KPI Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Status</span>
          <div className="pt-0.5">{getStatusBadge(document.processing_status)}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Pages</span>
          <div className="text-lg font-bold text-slate-100 font-mono">
            {document.page_count ?? "Not available"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Extracted Chunks</span>
          <div className="text-lg font-bold text-teal-400 font-mono">{chunks.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Structured Data</span>
          <div className="text-lg font-bold text-cyan-400 font-mono">{structuredData.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Validation Issues</span>
          <div className="flex items-center gap-2 text-lg font-bold font-mono">
            <span className={valErrorsCount > 0 ? "text-rose-400" : "text-slate-300"}>
              {valErrorsCount} <span className="text-xs text-rose-400 font-normal">err</span>
            </span>
            <span className="text-slate-600">/</span>
            <span className={valWarningsCount > 0 ? "text-amber-400" : "text-slate-300"}>
              {valWarningsCount} <span className="text-xs text-amber-400 font-normal">warn</span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Conflicts</span>
          <div className={`text-lg font-bold font-mono ${conflicts.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {conflicts.length}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "overview"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" /> Overview & Metadata
        </button>

        <button
          onClick={() => setActiveTab("content")}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "content"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" /> Extracted Content ({chunks.length})
        </button>

        <button
          onClick={() => setActiveTab("structured")}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "structured"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TableIcon className="w-4 h-4" /> Structured Data ({structuredData.length})
        </button>

        <button
          onClick={() => setActiveTab("validation")}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "validation"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Validation & Conflicts ({validationResults.length + conflicts.length})
        </button>

        <button
          onClick={() => setActiveTab("processing")}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "processing"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" /> Pipeline Timeline
        </button>
      </div>

      {/* Tab 1: OVERVIEW & METADATA */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" /> PostgreSQL Document Record
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Original Filename</span>
                <p className="text-slate-200 font-mono font-medium mt-1 break-all">{document.original_filename}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Document Name</span>
                <p className="text-slate-200 font-medium mt-1">{document.name}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Category</span>
                <p className="text-slate-200 font-medium mt-1">{document.category || "General"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Source / Department</span>
                <p className="text-slate-200 font-medium mt-1">{document.source || "CMPDI"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">File Type / Extension</span>
                <p className="text-slate-200 font-mono font-medium mt-1 uppercase">{document.type}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">File Size</span>
                <p className="text-slate-200 font-mono font-medium mt-1">{formatFileSize(document.file_size)}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Document Date</span>
                <p className="text-slate-200 font-mono font-medium mt-1">{document.doc_date || "Not specified"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Uploaded At</span>
                <p className="text-slate-200 font-mono font-medium mt-1">
                  {document.created_at ? new Date(document.created_at).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>

            {document.description && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Description</span>
                <p className="text-xs text-slate-300 leading-relaxed">{document.description}</p>
              </div>
            )}

            {document.error_message && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1 text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> Processing Error Message:
                </span>
                <p className="font-mono">{document.error_message}</p>
              </div>
            )}
          </div>

          {/* Side Summary Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 h-fit">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-400" /> Pipeline Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Processing Started</span>
                <span className="font-mono text-slate-200">
                  {document.processing_started_at
                    ? new Date(document.processing_started_at).toLocaleTimeString()
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Processing Completed</span>
                <span className="font-mono text-slate-200">
                  {document.processing_completed_at
                    ? new Date(document.processing_completed_at).toLocaleTimeString()
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">FAISS Indexing</span>
                <span className="font-semibold text-emerald-400">
                  {chunks.length > 0 ? `${chunks.length} Vectors Indexed` : "Pending"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Confidentiality Role</span>
                <span className="font-semibold text-amber-400">
                  {document.is_confidential ? "HOD Only" : "Normal / Public"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
              <span className="font-bold text-slate-200 block">Source Traceability</span>
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
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            <span className="text-xs text-slate-400">
              Showing {filteredChunks.length} of {chunks.length} chunks
            </span>
          </div>

          {filteredChunks.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
              No extracted content available for this document.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChunks.map((c, index) => (
                <div
                  key={c.id || index}
                  className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                        Chunk #{c.id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        Type: {c.chunk_type}
                      </span>
                      {c.page_number && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-medium">
                          Page {c.page_number}
                        </span>
                      )}
                      {c.sheet_name && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-medium">
                          Sheet: {c.sheet_name}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      Source Ref: {c.source_reference || `Doc #${document.id} Chunk #${c.id}`}
                    </span>
                  </div>

                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800/60 overflow-x-auto">
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
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
              No structured data available for this document.
            </div>
          ) : (
            <div className="space-y-6">
              {structuredData.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
                        {item.entity_type}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Record ID #{item.id}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                      {item.page_number && <span className="text-cyan-400">Page {item.page_number}</span>}
                      {item.sheet_name && <span className="text-amber-400">Sheet: {item.sheet_name}</span>}
                      <span>Source: {item.source_reference || `Chunk #${item.chunk_id}`}</span>
                    </div>
                  </div>

                  {/* Render Key-Value or Tabular Extraction dynamically */}
                  {item.entity_type === "table" && Array.isArray(item.data?.rows) ? (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            {item.data.columns?.map((col: string, idx: number) => (
                              <th key={idx} className="p-3 font-semibold text-slate-300">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {item.data.rows.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-950/50">
                              {Array.isArray(row)
                                ? row.map((val: any, cIdx: number) => (
                                    <td key={cIdx} className="p-3 text-slate-200">
                                      {val?.toString() || ""}
                                    </td>
                                  ))
                                : Object.values(row).map((val: any, cIdx: number) => (
                                    <td key={cIdx} className="p-3 text-slate-200">
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
                        <div key={key} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">{key}</span>
                          <span className="text-xs font-mono font-semibold text-slate-200 mt-1 block break-all">
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
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Single-Document Validation Findings
              </span>
              <span className="text-xs font-mono text-slate-400">{validationResults.length} issues</span>
            </h3>

            {validationResults.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-center text-emerald-400 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> No validation issues detected for this document.
              </div>
            ) : (
              <div className="space-y-3">
                {validationResults.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            v.severity === "error"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {v.severity}
                        </span>
                        <span className="text-xs font-mono text-teal-400 font-semibold">{v.rule_type}</span>
                        {v.field_name && (
                          <span className="text-xs font-mono text-slate-400">Field: {v.field_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200">{v.message}</p>
                      {v.invalid_value && (
                        <p className="text-[11px] font-mono text-rose-300">
                          Value: <span className="underline">{v.invalid_value}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-500 shrink-0">
                      {v.source_reference || (v.page_number ? `Page ${v.page_number}` : `Chunk #${v.chunk_id}`)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross-Document Conflicts */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" /> Cross-Document Conflicts
              </span>
              <span className="text-xs font-mono text-slate-400">{conflicts.length} conflicts</span>
            </h3>

            {conflicts.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-center text-emerald-400 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> No cross-document conflicts detected for this document.
              </div>
            ) : (
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-rose-400 font-semibold">
                        Conflict on {c.entity_identifier} ({c.field_name})
                      </span>
                      <span className="font-mono text-slate-500">Conflict ID #{c.id}</span>
                    </div>

                    <p className="text-xs text-slate-300">{c.message}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Document #{c.doc_a_id} Value</span>
                        <span className="text-teal-400 font-bold block mt-0.5">{c.val_a}</span>
                        <span className="text-slate-500 text-[10px] block mt-1">{c.source_ref_a}</span>
                      </div>

                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Document #{c.doc_b_id} Value</span>
                        <span className="text-rose-400 font-bold block mt-0.5">{c.val_b}</span>
                        <span className="text-slate-500 text-[10px] block mt-1">{c.source_ref_b}</span>
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
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" /> Document Processing Pipeline Timeline
          </h3>

          <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-8">
            {(processingDetails?.stages || []).map((stage) => (
              <div key={stage.stage_id} className="relative">
                {/* Timeline Node Dot */}
                <div
                  className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                    stage.status === "completed"
                      ? "bg-emerald-500 border-slate-900"
                      : stage.status === "processing"
                      ? "bg-amber-500 border-slate-900 animate-ping"
                      : stage.status === "failed"
                      ? "bg-rose-500 border-slate-900"
                      : "bg-slate-700 border-slate-900"
                  }`}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-slate-200">
                      Stage {stage.stage_id}: {stage.name}
                    </h4>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                        stage.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : stage.status === "processing"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : stage.status === "failed"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{stage.details}</p>

                  {stage.timestamp && (
                    <span className="text-[11px] font-mono text-slate-500 block pt-0.5">
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
