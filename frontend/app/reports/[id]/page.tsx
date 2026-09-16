"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import { 
  ArrowLeft, 
  FileText, 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  Printer, 
  FileSpreadsheet,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { ReportItem } from "@/types/reports";

import { fetchWithAuth } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  const [report, setReport] = useState<ReportItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportDetail = async () => {
    if (!reportId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/reports/${reportId}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied: This report contains restricted confidential sources.");
        }
        if (res.status === 404) {
          throw new Error(`Report ID ${reportId} not found.`);
        }
        throw new Error(`HTTP ${res.status}: Failed to fetch report details.`);
      }

      const data: ReportItem = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report detail.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="secondary" size="sm" className="flex items-center gap-1 text-gray-700">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Reports</span>
            </Button>
          </Link>
          <PageHeader 
            title={report?.report_title || `Report #${reportId}`} 
            description="Source-backed automated report compiled from official CMPDI document repository."
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchReportDetail}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-gray-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={!report}
            className="flex items-center gap-1.5 text-gray-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Main Content Body */}
      {error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4 my-8">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-red-900">Report Not Found or Server Error</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto mt-1">{error}</p>
          </div>
          <Link href="/reports">
            <Button variant="primary" size="md">
              Return to Reports Dashboard
            </Button>
          </Link>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Fetching Report #{reportId} from PostgreSQL...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          
          {/* Metadata Banner Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                  Report ID: #{report.id}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {report.report_type.replace("_", " ")}
                </span>
                {report.status === "completed" && <StatusBadge status="success" label="Completed & Verified" />}
                {report.status === "processing" && <StatusBadge status="pending" label="Processing" />}
                {report.status === "failed" && <StatusBadge status="error" label="Failed" />}
              </div>

              {report.generation_metadata?.provider && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{report.generation_metadata.provider}/{report.generation_metadata.model || "openai/gpt-oss-20b"}</span>
                </div>
              )}
            </div>

            {/* Timestamps & Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Created Date</span>
                <span className="font-semibold text-gray-900">
                  {report.created_at ? new Date(report.created_at).toLocaleString() : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Completed Date</span>
                <span className="font-semibold text-gray-900">
                  {report.completed_at ? new Date(report.completed_at).toLocaleString() : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Source Documents</span>
                <span className="font-semibold text-gray-900">
                  {report.source_document_ids?.length || 0} Documents [{report.source_document_ids?.join(", ")}]
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Generation Speed</span>
                <span className="font-semibold text-gray-900">
                  {report.generation_metadata?.generation_time_seconds ? `${report.generation_metadata.generation_time_seconds}s` : "Fast"}
                </span>
              </div>
            </div>
          </div>

          {/* Validation & Conflict Alert Banner if present */}
          {report.validation_summary && (report.validation_summary.warning_count > 0 || report.validation_summary.error_count > 0 || report.validation_summary.conflict_count > 0) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-2 text-xs text-yellow-900">
              <div className="flex items-center gap-2 font-bold text-yellow-900">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <span>Data Quality & Validation Summary</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                  Warnings: {report.validation_summary.warning_count}
                </span>
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-medium">
                  Errors: {report.validation_summary.error_count}
                </span>
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                  Conflicts: {report.validation_summary.conflict_count}
                </span>
              </div>
            </div>
          )}

          {/* Main Markdown Report Body */}
          <SectionCard title="Generated Report Document" description="Full source-grounded report text.">
            {report.report_content ? (
              <div className="prose prose-slate max-w-none p-4 sm:p-6 bg-white rounded-xl border border-gray-100 font-sans leading-relaxed whitespace-pre-wrap text-sm text-gray-800">
                {report.report_content}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl text-xs font-medium">
                {report.status === "failed" ? (
                  <div className="space-y-2 text-red-700">
                    <AlertCircle className="w-6 h-6 mx-auto text-red-600" />
                    <p className="font-semibold">Report Generation Failed</p>
                    <p className="text-[11px]">{report.generation_metadata?.error_detail || "Check backend LLM API credentials."}</p>
                  </div>
                ) : (
                  "Report content is currently being compiled..."
                )}
              </div>
            )}
          </SectionCard>

          {/* Source References & Traceability Cards */}
          {report.source_references && report.source_references.length > 0 && (
            <SectionCard 
              title={`Source Traceability (${report.source_references.length} Citations)`} 
              description="Official source document citations linked to factual findings."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.source_references.map((src, idx) => {
                  const isSheet = !!src.sheet_name;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-gray-900 truncate">
                          {isSheet ? (
                            <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <span className="truncate">{src.original_filename || "CMPDI Document"}</span>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-white text-gray-700 font-mono text-[11px] font-semibold border border-gray-200">
                          Doc ID: {src.document_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600 text-[11px]">
                        <span>Reference: <strong>{src.source_reference || `Page ${src.page_number}`}</strong></span>
                        {src.page_number && <span>• Page {src.page_number}</span>}
                        {src.sheet_name && <span>• Sheet: {src.sheet_name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

        </div>
      ) : null}
    </div>
  );
}
