"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Files, 
  Sparkles, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Database,
  Calendar,
  AlertCircle
} from "lucide-react";
import { ReportItem, DocumentItem, ReportGenerateRequest } from "@/types/reports";

import { fetchWithAuth } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined && process.env.NEXT_PUBLIC_API_URL !== "" ? process.env.NEXT_PUBLIC_API_URL : "";

const REPORT_TYPES = [
  { id: "geological_summary", label: "Geological Summary" },
  { id: "production_summary", label: "Production Summary" },
  { id: "document_analysis", label: "Document Analysis" },
  { id: "general_summary", label: "General Summary" }
];

export default function ReportsPage() {
  const router = useRouter();

  // State: Reports Dashboard
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // State: Generator Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("geological_summary");
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

  // State: Available Documents
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // State: Generation Execution
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Fetch real reports from backend
  const fetchReports = async () => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const res = await fetchWithAuth(`/api/reports`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch reports`);
      }
      const data: ReportItem[] = await res.json();
      setReports(data || []);
    } catch (err: any) {
      setReportsError(err.message || "Failed to connect to backend server");
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Fetch real documents for report generator selection
  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    setDocsError(null);
    try {
      const res = await fetchWithAuth(`/api/documents`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch documents`);
      }
      const data = await res.json();
      const docList: DocumentItem[] = data.documents || [];
      setDocuments(docList);
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
    // 1. Validation before API call
    if (!reportTitle.trim()) {
      setValidationError("Report title is required.");
      return;
    }
    if (!reportType) {
      setValidationError("Report type must be selected.");
      return;
    }
    if (selectedDocIds.length === 0) {
      setValidationError("Please select at least one document for report generation.");
      return;
    }

    setValidationError(null);
    setGenerationError(null);
    setIsGenerating(true);
    setGenerationStep(1);

    // Simulate UX progress step sequence while request runs
    const timer1 = setTimeout(() => setGenerationStep(2), 600);
    const timer2 = setTimeout(() => setGenerationStep(3), 1200);

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
        } catch {
          // fallback
        }
        throw new Error(errText);
      }

      const newReport: ReportItem = await res.json();
      setIsModalOpen(false);
      await fetchReports();
      router.push(`/reports/${newReport.id}`);
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate report");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  // Metrics calculations
  const totalReportsCount = reports.length;
  const completedCount = reports.filter((r) => r.status === "completed").length;
  const totalValidationIssues = reports.reduce((acc, r) => acc + (r.validation_summary?.total_validation_records || 0), 0);
  const totalConflicts = reports.reduce((acc, r) => acc + (r.validation_summary?.conflict_count || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 text-slate-100">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <PageHeader 
          title="Automated Report Intelligence" 
          description="Compile source-backed geological, production, and mine compliance reports from verified CMPDI documents."
        />

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchReports}
            disabled={isLoadingReports}
            className="flex items-center gap-1.5 text-slate-200 bg-slate-900 border-slate-800 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoadingReports ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={openGenerationModal}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Report</span>
          </Button>
        </div>
      </div>

      {/* ── DOCUMENT-TO-REPORT VISUAL PIPELINE FLOW (SECTION 14) ── */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <h3 className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
            Document-to-Report Automated Compilation Pipeline
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-cyan-400 font-bold block">STAGE 1</span>
            <span className="text-xs font-bold text-slate-200 block">Doc Selection</span>
            <span className="text-[10px] text-slate-400 font-mono">PostgreSQL Archive</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-blue-400 font-bold block">STAGE 2</span>
            <span className="text-xs font-bold text-slate-200 block">RAG Extraction</span>
            <span className="text-[10px] text-slate-400 font-mono">384-Dim Vectors</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-purple-400 font-bold block">STAGE 3</span>
            <span className="text-xs font-bold text-slate-200 block">Validation Check</span>
            <span className="text-[10px] text-slate-400 font-mono">Conflict Audit</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-pink-400 font-bold block">STAGE 4</span>
            <span className="text-xs font-bold text-slate-200 block">LLM Compilation</span>
            <span className="text-[10px] text-slate-400 font-mono">Grounded RAG</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 font-bold block">STAGE 5</span>
            <span className="text-xs font-bold text-slate-100 block">Report Output</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">100% Traceable</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={totalReportsCount.toString()}
          icon={<FileText className="h-6 w-6 text-cyan-400" />}
          trend="Generated by system"
        />
        <StatCard
          title="Completed Reports"
          value={completedCount.toString()}
          icon={<CheckCircle className="h-6 w-6 text-emerald-400" />}
          trend="Fully grounded"
          trendUp={true}
        />
        <StatCard
          title="Validation Issues"
          value={totalValidationIssues.toString()}
          icon={<AlertTriangle className="h-6 w-6 text-amber-400" />}
        />
        <StatCard
          title="Data Conflicts"
          value={totalConflicts.toString()}
          icon={<ShieldCheck className="h-6 w-6 text-purple-400" />}
        />
      </div>

      {/* Main Reports List / Table */}
      <SectionCard
        title="Generated Reports Archive"
        description="Historical and newly compiled source-backed reports."
      >
        {reportsError ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto animate-pulse" />
            <h4 className="text-sm font-bold text-white">Backend Connection Error</h4>
            <p className="text-xs text-rose-300 max-w-md mx-auto font-mono">{reportsError}</p>
            <Button variant="secondary" size="sm" onClick={fetchReports}>
              Retry Connection
            </Button>
          </div>
        ) : isLoadingReports ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Loading reports from PostgreSQL database...</p>
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-full w-full text-slate-500" />}
            title="No reports have been generated yet."
            description="Click 'Generate New Report' above to select CMPDI documents and compile a grounded report."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[11px]">
                <tr>
                  <th scope="col" className="px-4 py-3.5">ID</th>
                  <th scope="col" className="px-4 py-3.5">Report Title</th>
                  <th scope="col" className="px-4 py-3.5">Type</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Source Docs</th>
                  <th scope="col" className="px-4 py-3.5">Created Date</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {reports.map((report) => {
                  const docCount = report.source_document_ids?.length || 0;
                  const issueCount = report.validation_summary?.total_validation_records || 0;
                  const conflictCount = report.validation_summary?.conflict_count || 0;
                  const formattedDate = report.created_at
                    ? new Date(report.created_at).toLocaleDateString()
                    : "N/A";

                  return (
                    <tr key={report.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap font-bold text-cyan-400">
                        #{report.id}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-100">
                        <div>
                          <span>{report.report_title}</span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-normal">
                            <span>{docCount} Source Document{docCount !== 1 ? "s" : ""}</span>
                            {issueCount > 0 && (
                              <span className="text-amber-400 font-bold">({issueCount} issues)</span>
                            )}
                            {conflictCount > 0 && (
                              <span className="text-rose-400 font-bold">({conflictCount} conflicts)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 capitalize">
                          {report.report_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {report.status === "completed" && <StatusBadge status="success" label="Completed" />}
                        {report.status === "processing" && <StatusBadge status="pending" label="Processing" />}
                        {report.status === "failed" && <StatusBadge status="error" label="Failed" />}
                        {report.status === "pending" && <StatusBadge status="pending" label="Pending" />}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                        [{report.source_document_ids?.join(", ")}]
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-xs">
                        <Link
                          href={`/reports/${report.id}`}
                          className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <span>View Report</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Generate Report Modal / Panel */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generate Source-Backed Report</h3>
                  <p className="text-xs text-slate-400">Select CMPDI documents and report parameters for automated generation.</p>
                </div>
              </div>

              <button
                onClick={closeGenerationModal}
                disabled={isGenerating}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs font-mono">
              {validationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold">{validationError}</span>
                </div>
              )}

              {generationError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Report Generation Failed</span>
                  </div>
                  <p className="text-rose-300">{generationError}</p>
                </div>
              )}

              {/* Report Title */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Report Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => {
                    setReportTitle(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isGenerating}
                  placeholder="e.g., CMPDI Geological Exploration Summary Report"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Report Type Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Report Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Selection Section */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Source Document Selection <span className="text-rose-400">*</span>
                    </label>
                    <p className="text-[11px] text-slate-400 font-sans">Select one or multiple real CMPDI documents from PostgreSQL.</p>
                  </div>

                  {documents.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllDocs}
                      disabled={isGenerating}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                    >
                      {selectedDocIds.length === documents.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {/* Documents List */}
                {isLoadingDocs ? (
                  <div className="py-8 text-center space-y-2 border border-slate-800 rounded-xl bg-slate-950">
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
                    <span className="text-xs text-slate-400 font-mono">Fetching real documents from backend...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950 text-xs text-slate-400">
                    No documents found in database.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {documents.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => !isGenerating && toggleDocSelection(doc.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-cyan-500/10 border-cyan-500/40 text-slate-100"
                              : "bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              disabled={isGenerating}
                              className="h-4 w-4 text-cyan-500 rounded border-slate-800 bg-slate-900 focus:ring-cyan-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-100 truncate text-xs font-mono">
                                {doc.original_filename || doc.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>Doc ID: {doc.id}</span>
                                {doc.category && <span>• {doc.category}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-cyan-300 font-bold border border-slate-800">
                              {doc.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={closeGenerationModal}
                disabled={isGenerating}
                className="bg-slate-900 border-slate-800 text-slate-300"
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleGenerateReport}
                disabled={isGenerating || selectedDocIds.length === 0}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling Report...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Report</span>
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

