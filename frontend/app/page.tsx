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
  Sparkles,
  ArrowRight,
  MessageSquare
} from "lucide-react";

import { fetchWithAuth } from "@/lib/api";
import { Hero3DCore } from "@/components/3d/Hero3DCore";

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
        <div className="flex items-center space-x-3 bg-slate-900/80 p-8 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 text-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <div>
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              Loading System Intelligence <Sparkles className="w-4 h-4 text-cyan-400" />
            </h3>
            <p className="text-xs text-slate-400">Fetching real-time metrics from CMPDI PostgreSQL database...</p>
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
        <div className="rounded-2xl bg-rose-500/10 p-8 border border-rose-500/30 shadow-2xl text-center max-w-xl mx-auto my-12 text-slate-100 backdrop-blur-xl">
          <AlertOctagon className="h-12 w-12 text-rose-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Unable to load dashboard data</h3>
          <p className="mt-2 text-xs text-rose-300 font-mono">{error}</p>
          <button
            onClick={() => fetchDashboardData(rangeFilter)}
            className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all"
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
    <div className="space-y-8 pb-12 text-slate-100">
      {/* ── 0. CINEMATIC 3D HERO OPENING SECTION ── */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left Content Column */}
          <div className="lg:col-span-6 space-y-6 z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3.5 py-1.5 text-xs font-mono font-semibold text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>CMPDI / Coal India AI Document Core</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500">
                  CMPDI Document AI
                </span>
              </h1>
              <h2 className="text-lg sm:text-xl font-bold text-slate-200 mt-2">
                AI-Powered Document Intelligence for Smarter Mining Decisions
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              Transform geological, mining and production documents into searchable knowledge, evidence-backed insights and intelligent reports.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>Explore Platform</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900/80 border border-purple-500/40 px-5 py-3 text-xs font-bold text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 transition-all cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <span>Ask AI</span>
              </Link>
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-800 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              >
                <Files className="h-4 w-4 text-cyan-400" />
                <span>View Documents</span>
              </Link>
            </div>
          </div>

          {/* Hero Right 3D Visual Column */}
          <div className="lg:col-span-6 relative">
            <Hero3DCore />
          </div>
        </div>
      </section>

      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader 
          title="Dashboard & Operational Metrics" 
          description="Real-time CMPDI/CIL Document AI processing overview & database analytics."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Date Range Filter */}
          <div className="inline-flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-800 shadow-sm text-xs font-medium">
            <div className="px-2.5 py-1 flex items-center text-slate-400 border-r border-slate-800 mr-1 font-mono text-[11px]">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
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
                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-mono font-semibold ${
                  rangeFilter === btn.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
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
            className="inline-flex items-center justify-center space-x-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-bold text-slate-100 shadow hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
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
            icon={<Files className="h-5 w-5 text-blue-400" />}
          />
        </Link>
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Processed Documents"
            value={overview.processed_documents.toLocaleString()}
            icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          />
        </Link>
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Processing Documents"
            value={overview.processing_documents.toLocaleString()}
            icon={<Loader2 className="h-5 w-5 text-amber-400 animate-spin" />}
          />
        </Link>
        <Link href="/documents" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Pending Documents"
            value={overview.pending_documents.toLocaleString()}
            icon={<Clock className="h-5 w-5 text-slate-400" />}
          />
        </Link>
        <Link href="/knowledge-base" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Document Chunks"
            value={overview.total_chunks.toLocaleString()}
            icon={<Layers className="h-5 w-5 text-indigo-400" />}
          />
        </Link>
        <Link href="/knowledge-base" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Structured Extractions"
            value={overview.total_extractions.toLocaleString()}
            icon={<Database className="h-5 w-5 text-cyan-400" />}
          />
        </Link>
        <Link href="/validation" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Validation Errors"
            value={overview.total_validation_errors.toLocaleString()}
            icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
          />
        </Link>
        <Link href="/validation" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Data Conflicts"
            value={overview.total_conflicts.toLocaleString()}
            icon={<ShieldAlert className="h-5 w-5 text-orange-400" />}
          />
        </Link>
        <Link href="/reports" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Generated Reports"
            value={overview.total_reports.toLocaleString()}
            icon={<FileText className="h-5 w-5 text-purple-400" />}
          />
        </Link>
        <Link href="/topics" className="block hover:scale-[1.02] transition-transform">
          <StatCard
            title="Topic Intelligence Runs"
            value={overview.total_topics.toLocaleString()}
            icon={<Cpu className="h-5 w-5 text-teal-400" />}
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
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-sm text-slate-100">
                <span className="text-xs font-mono font-medium text-slate-400 block">Total Coal Production</span>
                <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">{coal_analytics.total_production_mt} MT</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs font-mono font-medium text-slate-400 block">Average Ash %</span>
                <span className="text-xl font-bold text-slate-100 font-mono mt-1 block">
                  {coal_analytics.avg_ash ? `${coal_analytics.avg_ash}%` : "Extracted per seam"}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs font-mono font-medium text-slate-400 block">Average GCV</span>
                <span className="text-xl font-bold text-slate-100 font-mono mt-1 block">
                  {coal_analytics.avg_gcv ? `${coal_analytics.avg_gcv} kcal/kg` : "Extracted per seam"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Period-wise Production Performance</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coal_analytics.metrics.map((m, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-100 text-sm block font-mono">{m.period}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        Target: {m.target_mt} MT | Actual: {m.actual_mt} MT
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
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
            <Link href="/knowledge-base" className="inline-flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
              <span>Manage Vectors</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-cyan-400" />
                <div>
                  <span className="text-sm font-bold text-slate-100">FAISS Index Status</span>
                  <p className="text-xs text-slate-400 font-mono">Vector store state</p>
                </div>
              </div>
              <StatusBadge 
                status={knowledge_base.status === "ready" ? "success" : "error"} 
                label={knowledge_base.status === "ready" ? "Ready" : "Unavailable"} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] font-mono font-medium text-slate-400 block">Total Chunks</span>
                <span className="text-base font-bold text-slate-100 font-mono">{knowledge_base.total_chunks}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] font-mono font-medium text-slate-400 block">Indexed Vectors</span>
                <span className="text-base font-bold text-slate-100 font-mono">{knowledge_base.indexed_vectors}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] font-mono font-medium text-slate-400 block">Dimension</span>
                <span className="text-base font-bold text-slate-100 font-mono">{knowledge_base.dimension} d</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] font-mono font-medium text-slate-400 block">Embedding</span>
                <span className="text-xs font-semibold text-cyan-400 truncate block mt-1 font-mono" title={knowledge_base.model_name}>
                  {knowledge_base.model_name}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-xs font-medium text-slate-400 font-mono">Database Sync Status:</span>
              <span className={`inline-flex items-center space-x-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                knowledge_base.sync_status === "synchronized" 
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" 
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
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
            <Link href="/validation" className="inline-flex items-center space-x-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors">
              <span>View Rule Audit</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Link href="/validation" className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/30 text-center hover:bg-rose-500/20 transition-all block">
                <span className="text-xs font-mono font-semibold text-rose-300 block">Validation Errors</span>
                <span className="text-2xl font-black text-rose-400 font-mono">{validation.errors}</span>
              </Link>
              <Link href="/validation" className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-center hover:bg-amber-500/20 transition-all block">
                <span className="text-xs font-mono font-semibold text-amber-300 block">Warnings</span>
                <span className="text-2xl font-black text-amber-400 font-mono">{validation.warnings}</span>
              </Link>
              <Link href="/validation" className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/30 text-center hover:bg-orange-500/20 transition-all block">
                <span className="text-xs font-mono font-semibold text-orange-300 block">Data Conflicts</span>
                <span className="text-2xl font-black text-orange-400 font-mono">{validation.total_conflicts}</span>
              </Link>
            </div>

            {/* Recent Conflicts Preview */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Recent Data Conflicts</h4>
                <Link href="/validation" className="text-xs text-cyan-400 hover:underline">
                  See all {validation.total_conflicts} conflict(s) &rarr;
                </Link>
              </div>
              {validation.recent_conflicts && validation.recent_conflicts.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {validation.recent_conflicts.slice(0, 3).map((conflict) => (
                    <Link key={conflict.id} href="/validation" className="block p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs transition-all">
                      <div className="flex items-center justify-between text-slate-100 font-semibold mb-1">
                        <span className="text-orange-400 font-mono">Doc #{conflict.doc_a_id} vs Doc #{conflict.doc_b_id}</span>
                        <span className="text-slate-400 font-mono">{conflict.field_name}</span>
                      </div>
                      <p className="text-slate-300 line-clamp-1">{conflict.message}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-slate-950/40 text-xs text-slate-400 border border-dashed border-slate-800">
                  No active data conflicts detected.
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

