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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <PageHeader 
          title="Report Generator" 
          description="Generate source-backed reports from verified CMPDI/CIL documents."
        />

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchReports}
            disabled={isLoadingReports}
            className="flex items-center gap-1.5 text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingReports ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={openGenerationModal}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Report</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={totalReportsCount.toString()}
          icon={<FileText className="h-6 w-6 text-blue-600" />}
          trend="Generated by system"
        />
        <StatCard
          title="Completed Reports"
          value={completedCount.toString()}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          trend="Fully grounded"
          trendUp={true}
        />
        <StatCard
          title="Validation Issues"
          value={totalValidationIssues.toString()}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
        />
        <StatCard
          title="Data Conflicts"
          value={totalConflicts.toString()}
          icon={<ShieldCheck className="h-6 w-6 text-purple-600" />}
        />
      </div>

      {/* Main Reports List / Table */}
      <SectionCard
        title="Generated Reports"
        description="Historical and newly compiled source-backed reports."
      >
        {reportsError ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h4 className="text-sm font-semibold text-red-900">Backend Connection Error</h4>
            <p className="text-xs text-red-700 max-w-md mx-auto">{reportsError}</p>
            <Button variant="secondary" size="sm" onClick={fetchReports}>
              Retry Connection
            </Button>
          </div>
        ) : isLoadingReports ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 font-medium">Loading reports from PostgreSQL database...</p>
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-full w-full text-gray-400" />}
            title="No reports have been generated yet."
            description="Click 'Generate New Report' above to select CMPDI documents and compile a grounded report."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-200 bg-white">
                {reports.map((report) => {
                  const docCount = report.source_document_ids?.length || 0;
                  const issueCount = report.validation_summary?.total_validation_records || 0;
                  const conflictCount = report.validation_summary?.conflict_count || 0;
                  const formattedDate = report.created_at
                    ? new Date(report.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "N/A";

                  return (
                    <tr key={report.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap font-mono text-xs font-bold text-gray-500">
                        #{report.id}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        <div>
                          <span>{report.report_title}</span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                            <span>{docCount} Source Document{docCount !== 1 ? "s" : ""}</span>
                            {issueCount > 0 && (
                              <span className="text-yellow-700 font-medium">({issueCount} issues)</span>
                            )}
                            {conflictCount > 0 && (
                              <span className="text-red-600 font-medium">({conflictCount} conflicts)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                          {report.report_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {report.status === "completed" && <StatusBadge status="success" label="Completed" />}
                        {report.status === "processing" && <StatusBadge status="pending" label="Processing" />}
                        {report.status === "failed" && <StatusBadge status="error" label="Failed" />}
                        {report.status === "pending" && <StatusBadge status="pending" label="Pending" />}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 font-mono">
                        [{report.source_document_ids?.join(", ")}]
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-xs">
                        <Link
                          href={`/reports/${report.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Generate Source-Backed Report</h3>
                  <p className="text-xs text-gray-500">Select CMPDI documents and report parameters for automated generation.</p>
                </div>
              </div>

              <button
                onClick={closeGenerationModal}
                disabled={isGenerating}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              
              {/* Validation Alert */}
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-medium">{validationError}</span>
                </div>
              )}

              {/* Generation Error Alert */}
              {generationError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Report Generation Failed</span>
                  </div>
                  <p className="text-red-700">{generationError}</p>
                </div>
              )}

              {/* Report Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Report Title <span className="text-red-500">*</span>
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
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100"
                />
              </div>

              {/* Report Type Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Report Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 bg-white shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Selection Section */}
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Source Document Selection <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500">Select one or multiple real CMPDI documents from PostgreSQL.</p>
                  </div>

                  {documents.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllDocs}
                      disabled={isGenerating}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      {selectedDocIds.length === documents.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {/* Documents List */}
                {isLoadingDocs ? (
                  <div className="py-8 text-center space-y-2 border border-gray-200 rounded-xl bg-gray-50">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                    <span className="text-xs text-gray-500 font-medium">Fetching real documents from backend...</span>
                  </div>
                ) : docsError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
                    {docsError}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50 text-xs text-gray-500">
                    No documents found in database. Please upload a document first.
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
                              ? "bg-blue-50/80 border-blue-400 shadow-2xs"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              disabled={isGenerating}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate text-xs">
                                {doc.original_filename || doc.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                <span>Doc ID: {doc.id}</span>
                                {doc.category && <span>• {doc.category}</span>}
                                {doc.page_count && <span>• {doc.page_count} pages</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-gray-100 text-gray-700 uppercase font-semibold border border-gray-200">
                              {doc.type}
                            </span>
                            {doc.processing_status === "completed" ? (
                              <StatusBadge status="success" label="Ready" />
                            ) : (
                              <StatusBadge status="pending" label={doc.processing_status || "Pending"} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Generating Animated State Indicator */}
              {isGenerating && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Compiling Source-Backed Report...</p>
                      <p className="text-[11px] text-blue-700">
                        {generationStep === 1 && "Analyzing selected document chunks in PostgreSQL..."}
                        {generationStep === 2 && "Validating extracted geological parameters & data quality..."}
                        {generationStep === 3 && "Executing LLM grounded report generation..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={closeGenerationModal}
                disabled={isGenerating}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleGenerateReport}
                disabled={isGenerating || selectedDocIds.length === 0}
                className="bg-blue-700 hover:bg-blue-800 text-white font-medium flex items-center gap-2 shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
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
