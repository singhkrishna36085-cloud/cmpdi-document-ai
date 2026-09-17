"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Files, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  AlertCircle,
  Clock
} from "lucide-react";
import { ReportItem, DocumentItem, ReportGenerateRequest } from "@/types/reports";
import { fetchWithAuth } from "@/lib/api";

const REPORT_TYPES = [
  { id: "geological_summary", label: "Geological Summary" },
  { id: "production_summary", label: "Production Summary" },
  { id: "document_analysis", label: "Document Analysis" },
  { id: "general_summary", label: "General Summary" }
];

export default function ReportsPage() {
  const router = useRouter();

  // State
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("geological_summary");
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const res = await fetchWithAuth(`/api/reports`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch reports`);
      const data: ReportItem[] = await res.json();
      setReports(data || []);
    } catch (err: any) {
      setReportsError(err.message || "Failed to connect to backend server");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    setDocsError(null);
    try {
      const res = await fetchWithAuth(`/api/documents`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setDocsError(err.message || "Failed to load document list");
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openGenerationModal = () => {
    setIsModalOpen(true);
    setValidationError(null);
    setGenerationError(null);
    setReportTitle("CMPDI Geological Exploration Summary Report");
    setReportType("geological_summary");
    fetchDocuments();
  };

  const closeGenerationModal = () => {
    if (isGenerating) return;
    setIsModalOpen(false);
  };

  const toggleDocSelection = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
    if (validationError) setValidationError(null);
  };

  const selectAllDocs = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
    if (validationError) setValidationError(null);
  };

  const handleGenerateReport = async () => {
    if (!reportTitle.trim()) { setValidationError("Report title is required."); return; }
    if (!reportType) { setValidationError("Report type must be selected."); return; }
    if (selectedDocIds.length === 0) { setValidationError("Please select at least one document for report generation."); return; }

    setValidationError(null);
    setGenerationError(null);
    setIsGenerating(true);

    try {
      const payload: ReportGenerateRequest = {
        document_ids: selectedDocIds,
        report_type: reportType,
        title: reportTitle.trim(),
        provider: "groq",
        model: "openai/gpt-oss-20b"
      };

      const res = await fetchWithAuth(`/api/reports/generate`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errText = `HTTP ${res.status} ${res.statusText}`;
        try {
          const errJson = await res.json();
          if (errJson.detail) errText = errJson.detail;
        } catch {}
        throw new Error(errText);
      }

      const newReport: ReportItem = await res.json();
      setIsModalOpen(false);
      await fetchReports();
      router.push(`/reports/${newReport.id}`);
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalReportsCount = reports.length;
  const completedCount = reports.filter((r) => r.status === "completed").length;
  const totalValidationIssues = reports.reduce((acc, r) => acc + (r.validation_summary?.total_validation_records || 0), 0);
  const totalConflicts = reports.reduce((acc, r) => acc + (r.validation_summary?.conflict_count || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Failed
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
      
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Reports Archive</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Compile source-backed geological, production, and mine compliance reports from verified CMPDI documents.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchReports}
            disabled={isLoadingReports}
            className="inline-flex items-center justify-center space-x-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoadingReports ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openGenerationModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Generate New Report
          </button>
        </div>
      </div>

      {/* Process Flow */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Automated Compilation Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-xs font-semibold text-blue-600 mb-1">STAGE 1</div>
            <div className="text-sm font-medium text-slate-800">Doc Selection</div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-xs font-semibold text-indigo-600 mb-1">STAGE 2</div>
            <div className="text-sm font-medium text-slate-800">RAG Extraction</div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-xs font-semibold text-rose-600 mb-1">STAGE 3</div>
            <div className="text-sm font-medium text-slate-800">Validation Check</div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-xs font-semibold text-amber-600 mb-1">STAGE 4</div>
            <div className="text-sm font-medium text-slate-800">LLM Compilation</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
            <div className="text-xs font-semibold text-emerald-600 mb-1">STAGE 5</div>
            <div className="text-sm font-medium text-emerald-800">Output Traceable</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Total Reports</div>
          <div className="text-2xl font-bold text-slate-900">{totalReportsCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Completed Reports</div>
          <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Validation Issues</div>
          <div className="text-2xl font-bold text-amber-600">{totalValidationIssues}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Data Conflicts</div>
          <div className="text-2xl font-bold text-rose-600">{totalConflicts}</div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="border-b border-slate-100 px-6 py-4 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Generated Reports Archive</h2>
        </div>
        
        {reportsError ? (
          <div className="p-8 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-3" />
            <p className="font-medium">Backend Connection Error</p>
            <p className="text-sm mt-1">{reportsError}</p>
          </div>
        ) : isLoadingReports ? (
          <div className="p-12 text-center text-blue-600">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="font-medium text-slate-900">No reports generated</p>
            <p className="text-sm mt-1">Generate a new report to view it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Report Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const docCount = report.source_document_ids?.length || 0;
                  return (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{report.report_title}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          ID: {report.id} • {docCount} Source Document{docCount !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium capitalize">
                          {report.report_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/reports/${report.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-lg">
              <h3 className="font-semibold text-slate-800">Generate Report</h3>
              <button onClick={closeGenerationModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {validationError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-md border border-rose-200">
                  {validationError}
                </div>
              )}
              {generationError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-md border border-rose-200">
                  {generationError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Title *</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type *</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                >
                  {REPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1 mt-4">
                  <label className="block text-sm font-medium text-slate-700">Source Documents *</label>
                  <button onClick={selectAllDocs} className="text-xs text-blue-600 font-medium">Toggle All</button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                  {isLoadingDocs ? (
                    <div className="p-4 text-center text-sm text-slate-500">Loading documents...</div>
                  ) : documents.map((doc) => (
                    <label key={doc.id} className="flex items-center p-3 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocSelection(doc.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span className="ml-3 text-sm text-slate-700 truncate">{doc.original_filename || doc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-3">
              <button onClick={closeGenerationModal} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 text-sm font-medium hover:bg-white">
                Cancel
              </button>
              <button onClick={handleGenerateReport} disabled={isGenerating} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {isGenerating ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
