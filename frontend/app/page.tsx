"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DashboardOverviewResponse } from "@/types/dashboard";
import { 
  Files, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Layers,
  Database,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Loader2,
  Calendar,
  ExternalLink,
  Flame,
  BarChart2
} from "lucide-react";

import { fetchWithAuth } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeFilter, setRangeFilter] = useState<string>("all");

  const fetchDashboardData = useCallback(async (filterRange: string = "all", showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/dashboard/overview?range=${filterRange}`, {
        cache: "no-store"
      });


      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const result: DashboardOverviewResponse = await res.json();
      setData(result);
    } catch (err: any) {
      console.error("Error fetching dashboard overview:", err);
      setError(err?.message || "Unable to load dashboard data. Please verify backend connection.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(rangeFilter);
  }, [fetchDashboardData, rangeFilter]);

  const handleFilterChange = (range: string) => {
    setRangeFilter(range);
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="flex items-center space-x-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Loading Dashboard Intelligence</h3>
            <p className="text-sm text-gray-500">Fetching real-time metrics from CMPDI PostgreSQL database...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Dashboard" 
          description="Overview of CMPDI Document AI platform processing metrics and performance analytics."
        />
        <div className="rounded-lg bg-red-50 p-6 border border-red-200 shadow-sm text-center max-w-xl mx-auto my-12">
          <AlertOctagon className="h-12 w-12 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900">Unable to load dashboard data</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={() => fetchDashboardData(rangeFilter)}
            className="mt-5 inline-flex items-center space-x-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const overview = data?.overview || {
    total_documents: 0,
    processed_documents: 0,
    processing_documents: 0,
    failed_documents: 0,
    pending_documents: 0,
    total_chunks: 0,
    total_extractions: 0,
    total_validation_errors: 0,
    total_validation_warnings: 0,
    total_conflicts: 0,
    total_reports: 0,
    total_topics: 0,
    total_ai_queries: 0
  };

  const documents = data?.documents || { document_types: [], statuses: [], timeline: [], departments: [] };
  const validation = data?.validation || { total_validation_results: 0, errors: 0, warnings: 0, valid_results: 0, total_conflicts: 0, recent_conflicts: [] };
  const reports = data?.reports || { total_reports: 0, completed_reports: 0, failed_reports: 0, pending_reports: 0, by_type: [], recent_reports: [] };
  const topics = data?.topics || { total_analyses: 0, documents_analyzed: 0, recent_analyses: [], dominant_topics: [] };
  const knowledge_base = data?.knowledge_base || { status: "unknown", total_chunks: 0, indexed_vectors: 0, dimension: 384, model_name: "all-MiniLM-L6-v2", sync_status: "unknown" };
  const recent_activity = data?.recent_activity || [];
  const coal_analytics = data?.coal_analytics;

  const totalDocCount = overview.total_documents || 1;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader 
          title="Dashboard & System Intelligence" 
          description="Real-time CMPDI/CIL Document AI operational overview & interactive performance analytics."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Date Range Filter */}
          <div className="inline-flex items-center rounded-lg bg-white p-1 border border-gray-200 shadow-sm text-xs font-medium">
            <div className="px-2 py-1 flex items-center text-gray-500 border-r border-gray-200 mr-1">
              <Calendar className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <span>Range:</span>
            </div>
            {[
              { id: "all", label: "All Time" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "90d", label: "Last 90 Days" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleFilterChange(btn.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  rangeFilter === btn.id
                    ? "bg-slate-900 text-white font-semibold shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData(rangeFilter, true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center space-x-2 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── 1. PRIMARY KPI SUMMARY CARDS WITH DRILL-DOWN LINKS (10 METRICS) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Total Documents"
            value={overview.total_documents.toLocaleString()}
            icon={<Files className="h-5 w-5 text-blue-600" />}
          />
        </Link>
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Processed Documents"
            value={overview.processed_documents.toLocaleString()}
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          />
        </Link>
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Processing Documents"
            value={overview.processing_documents.toLocaleString()}
            icon={<Loader2 className="h-5 w-5 text-amber-600 animate-spin" />}
          />
        </Link>
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Pending Documents"
            value={overview.pending_documents.toLocaleString()}
            icon={<Clock className="h-5 w-5 text-slate-500" />}
          />
        </Link>
        <Link href="/knowledge-base" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Document Chunks"
            value={overview.total_chunks.toLocaleString()}
            icon={<Layers className="h-5 w-5 text-indigo-600" />}
          />
        </Link>
        <Link href="/knowledge-base" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Structured Extractions"
            value={overview.total_extractions.toLocaleString()}
            icon={<Database className="h-5 w-5 text-cyan-600" />}
          />
        </Link>
        <Link href="/validation" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Validation Errors"
            value={overview.total_validation_errors.toLocaleString()}
            icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          />
        </Link>
        <Link href="/validation" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Data Conflicts"
            value={overview.total_conflicts.toLocaleString()}
            icon={<ShieldAlert className="h-5 w-5 text-orange-600" />}
          />
        </Link>
        <Link href="/reports" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Generated Reports"
            value={overview.total_reports.toLocaleString()}
            icon={<FileText className="h-5 w-5 text-purple-600" />}
          />
        </Link>
        <Link href="/topics" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Topic Intelligence Runs"
            value={overview.total_topics.toLocaleString()}
            icon={<Cpu className="h-5 w-5 text-teal-600" />}
          />
        </Link>
      </div>

      {/* ── 2. PREPARED 4-YEAR COAL PRODUCTION & QUALITY ANALYTICS ───────────── */}
      {coal_analytics && coal_analytics.has_coal_data && (
        <SectionCard
          title="Coal Production & Quality Intelligence (4-Year Trend)"
          description="Automated production metric extraction across processed CMPDI mine reports."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 text-white p-4 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-slate-400 block">Total Coal Production</span>
                <span className="text-2xl font-bold text-teal-400 mt-1 block">{coal_analytics.total_production_mt} MT</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-gray-500 block">Average Ash %</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">
                  {coal_analytics.avg_ash ? `${coal_analytics.avg_ash}%` : "Extracted per seam"}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-gray-500 block">Average GCV</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">
                  {coal_analytics.avg_gcv ? `${coal_analytics.avg_gcv} kcal/kg` : "Extracted per seam"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Period-wise Production Performance</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coal_analytics.metrics.map((m, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">{m.period}</span>
                      <span className="text-xs text-gray-500">
                        Target: {m.target_mt} MT | Actual: {m.actual_mt} MT
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {m.achievement_pct}% Target
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── 3. KNOWLEDGE BASE & VALIDATION QUALITY ROW ───────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Knowledge Base Card */}
        <SectionCard 
          title="Knowledge Base & Vector Index Status" 
          description="FAISS semantic search vector database & embedding status."
          action={
            <Link href="/knowledge-base" className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
              <span>Manage Vectors</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-slate-700" />
                <div>
                  <span className="text-sm font-semibold text-slate-900">FAISS Index Status</span>
                  <p className="text-xs text-slate-500">Vector store state</p>
                </div>
              </div>
              <StatusBadge 
                status={knowledge_base.status === "ready" ? "success" : "error"} 
                label={knowledge_base.status === "ready" ? "Ready" : "Unavailable"} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-white p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500 block">Total Chunks</span>
                <span className="text-lg font-bold text-gray-900">{knowledge_base.total_chunks}</span>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500 block">Indexed Vectors</span>
                <span className="text-lg font-bold text-gray-900">{knowledge_base.indexed_vectors}</span>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500 block">Vector Dimension</span>
                <span className="text-lg font-bold text-gray-900">{knowledge_base.dimension} d</span>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500 block">Embedding Model</span>
                <span className="text-xs font-semibold text-blue-600 truncate block mt-1" title={knowledge_base.model_name}>
                  {knowledge_base.model_name}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">Database Sync Status:</span>
              <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                knowledge_base.sync_status === "synchronized" 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-amber-100 text-amber-800"
              }`}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                <span className="capitalize">{knowledge_base.sync_status}</span>
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Validation & Data Quality */}
        <SectionCard 
          title="Data Validation & Conflict Intelligence" 
          description="Real-time compliance findings & cross-document conflicts."
          action={
            <Link href="/validation" className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-800">
              <span>View Rule Audit</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Link href="/validation" className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-center hover:bg-rose-100 transition-colors block">
                <span className="text-xs font-semibold text-rose-700 block">Validation Errors</span>
                <span className="text-2xl font-bold text-rose-900">{validation.errors}</span>
              </Link>
              <Link href="/validation" className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center hover:bg-amber-100 transition-colors block">
                <span className="text-xs font-semibold text-amber-700 block">Warnings</span>
                <span className="text-2xl font-bold text-amber-900">{validation.warnings}</span>
              </Link>
              <Link href="/validation" className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center hover:bg-orange-100 transition-colors block">
                <span className="text-xs font-semibold text-orange-700 block">Data Conflicts</span>
                <span className="text-2xl font-bold text-orange-900">{validation.total_conflicts}</span>
              </Link>
            </div>

            {/* Recent Conflicts Preview */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Recent Data Conflicts</h4>
                <Link href="/validation" className="text-xs text-blue-600 hover:underline">
                  See all {validation.total_conflicts} conflict(s) &rarr;
                </Link>
              </div>
              {validation.recent_conflicts && validation.recent_conflicts.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {validation.recent_conflicts.slice(0, 3).map((conflict) => (
                    <Link key={conflict.id} href="/validation" className="block p-2.5 rounded bg-gray-50 border border-gray-200 hover:bg-white text-xs transition-colors">
                      <div className="flex items-center justify-between text-gray-900 font-semibold mb-1">
                        <span className="text-orange-700 font-medium">Doc #{conflict.doc_a_id} vs Doc #{conflict.doc_b_id}</span>
                        <span className="text-gray-500">{conflict.field_name}</span>
                      </div>
                      <p className="text-gray-600 line-clamp-1">{conflict.message}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center rounded bg-gray-50 text-xs text-gray-500 border border-dashed border-gray-200">
                  No active data conflicts detected.
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── 4. DOCUMENT ANALYTICS CHARTS GRID (INTERACTIVE BAR/TOOLTIP VISUALIZATION) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Document Type Distribution */}
        <SectionCard 
          title="Document Type Distribution" 
          description="Breakdown of ingested geological reports, drill logs, and datasets."
        >
          {documents.document_types && documents.document_types.length > 0 ? (
            <div className="space-y-3">
              {documents.document_types.map((dt) => {
                const pct = Math.round((dt.count / totalDocCount) * 100);
                return (
                  <div key={dt.type} className="group space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span className="font-semibold uppercase text-gray-900">{dt.type}</span>
                      <span className="group-hover:text-blue-600 transition-colors">
                        {dt.count} doc(s) ({pct}%)
                      </span>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500 group-hover:bg-blue-500" 
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">No document type distribution data available.</div>
          )}
        </SectionCard>

        {/* Document Status Distribution */}
        <SectionCard 
          title="Processing Pipeline Status" 
          description="Current state of document ingestion, text extraction & structured parsing."
        >
          {documents.statuses && documents.statuses.length > 0 ? (
            <div className="space-y-3">
              {documents.statuses.map((st) => {
                const pct = Math.round((st.count / totalDocCount) * 100);
                let barColor = "bg-emerald-500";
                if (st.status === "processing") barColor = "bg-amber-500 animate-pulse";
                if (st.status === "pending") barColor = "bg-slate-400";
                if (st.status === "failed") barColor = "bg-rose-500";

                return (
                  <div key={st.status} className="group space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span className="font-semibold capitalize text-gray-900">{st.status}</span>
                      <span>{st.count} doc(s) ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`${barColor} h-3 rounded-full transition-all duration-500`} 
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">No processing status data available.</div>
          )}
        </SectionCard>
      </div>

      {/* ── 5. TIMELINE & DEPARTMENT ANALYTICS GRID ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Document Timeline */}
        <SectionCard 
          title="Document Upload Timeline" 
          description="Historical trend of document uploads grouped by date/month."
        >
          {documents.timeline && documents.timeline.length > 0 ? (
            <div className="space-y-3">
              {documents.timeline.map((item) => (
                <div key={item.date} className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200 hover:bg-white transition-colors">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">{item.date}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full">
                    {item.count} Document(s)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">No document timeline data available for selected filter range.</div>
          )}
        </SectionCard>

        {/* Source / Department Distribution */}
        <SectionCard 
          title="Department & Source Analytics" 
          description="Document distribution across CMPDI divisions and source departments."
        >
          {documents.departments && documents.departments.length > 0 ? (
            <div className="space-y-3">
              {documents.departments.map((dept) => {
                const pct = Math.round((dept.count / totalDocCount) * 100);
                return (
                  <div key={dept.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span className="font-semibold text-gray-900">{dept.department}</span>
                      <span>{dept.count} doc(s)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">No department analytics available.</div>
          )}
        </SectionCard>
      </div>

      {/* ── 6. REPORT & TOPIC SUMMARY ROW WITH DRILL-DOWN LINKS ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Reports Summary Card */}
        <SectionCard 
          title="Automated Reports Intelligence" 
          description="Summary of AI-generated geological & mining summary reports."
          action={
            <Link href="/reports" className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-600 hover:text-purple-800">
              <span>View All Reports</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                <span className="text-xs font-semibold text-purple-700 block">Total Reports</span>
                <span className="text-xl font-bold text-purple-900">{reports.total_reports}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                <span className="text-xs font-semibold text-emerald-700 block">Completed</span>
                <span className="text-xl font-bold text-emerald-900">{reports.completed_reports}</span>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-center">
                <span className="text-xs font-semibold text-rose-700 block">Failed</span>
                <span className="text-xl font-bold text-rose-900">{reports.failed_reports}</span>
              </div>
            </div>

            {/* Recent Reports List with Clickable Links */}
            {reports.recent_reports && reports.recent_reports.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Recent Generated Reports</h4>
                {reports.recent_reports.slice(0, 3).map((rep) => (
                  <Link 
                    key={rep.id} 
                    href={`/reports/${rep.id}`}
                    className="p-2.5 rounded bg-gray-50 border border-gray-200 hover:bg-white text-xs flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors block">
                        {rep.report_title}
                      </span>
                      <span className="text-gray-500 capitalize">{rep.report_type.replace("_", " ")}</span>
                    </div>
                    <StatusBadge status={rep.status === "completed" ? "success" : "pending"} label={rep.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center rounded bg-gray-50 text-xs text-gray-500 border border-dashed border-gray-200">
                No reports generated yet.
              </div>
            )}
          </div>
        </SectionCard>

        {/* Topics Summary Card */}
        <SectionCard 
          title="Topic Modeling & Entity Intelligence" 
          description="NLP topic clusters extracted across CMPDI geological archives."
          action={
            <Link href="/topics" className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-600 hover:text-teal-800">
              <span>Explore WordCloud</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-teal-50 p-3 rounded-lg border border-teal-100 text-center">
                <span className="text-xs font-semibold text-teal-700 block">Topic Runs</span>
                <span className="text-xl font-bold text-teal-900">{topics.total_analyses}</span>
              </div>
              <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-100 text-center">
                <span className="text-xs font-semibold text-cyan-700 block">Docs Analyzed</span>
                <span className="text-xl font-bold text-cyan-900">{topics.documents_analyzed}</span>
              </div>
            </div>

            {/* Dominant Topics Preview */}
            {topics.dominant_topics && topics.dominant_topics.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Dominant Topic Clusters</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {topics.dominant_topics.slice(0, 3).map((top, idx) => (
                    <Link key={idx} href="/topics" className="block p-2.5 rounded bg-gray-50 border border-gray-200 hover:bg-white text-xs transition-colors">
                      <span className="font-bold text-teal-800 block">{top.topic_name || `Topic #${top.topic_id}`}</span>
                      <p className="text-gray-600 mt-1">
                        Keywords: {top.keywords ? top.keywords.slice(0, 4).join(" • ") : "N/A"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center rounded bg-gray-50 text-xs text-gray-500 border border-dashed border-gray-200">
                No topic analysis runs available yet.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── 7. RECENT ACTIVITY STREAM WITH CLICKABLE DRILL-DOWN LINKS ────────── */}
      <SectionCard 
        title="Recent System Activity Log" 
        description="Chronological event log of document uploads, AI queries, reports, and audit logs."
      >
        {recent_activity && recent_activity.length > 0 ? (
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {recent_activity.map((event, eventIdx) => {
                let badgeBg = "bg-blue-600";
                let IconComp = Files;
                let targetHref = "/documents";

                if (event.type === "document") {
                  badgeBg = "bg-blue-600";
                  IconComp = Files;
                  targetHref = "/documents";
                } else if (event.type === "report") {
                  badgeBg = "bg-purple-600";
                  IconComp = FileText;
                  targetHref = event.id ? `/reports/${event.id}` : "/reports";
                } else if (event.type === "topic_analysis") {
                  badgeBg = "bg-teal-600";
                  IconComp = Cpu;
                  targetHref = "/topics";
                } else if (event.type === "audit") {
                  badgeBg = "bg-indigo-600";
                  IconComp = Activity;
                  targetHref = "/audit";
                }

                return (
                  <li key={eventIdx}>
                    <div className="relative pb-8">
                      {eventIdx !== recent_activity.length - 1 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full ${badgeBg} text-white flex items-center justify-center ring-8 ring-white shadow-sm`}>
                            <IconComp className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <Link href={targetHref} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              {event.title}
                            </Link>
                            {event.details && (
                              <p className="text-xs text-gray-500 mt-0.5">{event.details}</p>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-xs text-gray-500">
                            <time dateTime={event.timestamp}>
                              {new Date(event.timestamp).toLocaleString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
            No recent activity available.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
