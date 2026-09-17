"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardOverviewResponse } from "@/types/dashboard";
import { 
  Files, 
  Database,
  Layers,
  ShieldAlert,
  RefreshCw,
  AlertOctagon,
  Loader2,
  Calendar,
  MessageSquare,
  ArrowRight,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText
} from "lucide-react";

import { fetchWithAuth } from "@/lib/api";

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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
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
      
      {/* ── HEADER SECTION ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative background element, reducing 3D usage to just a whisper */}
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">CMPDI Document Intelligence Core</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            AI-powered document processing, knowledge discovery and evidence-backed analysis for the Central Mine Planning & Design Institute.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Interactive Date Range Filter */}
          <div className="inline-flex items-center rounded-md bg-white border border-slate-200 p-1 shadow-sm text-xs font-medium">
            <div className="px-2.5 py-1 flex items-center text-slate-500 border-r border-slate-100 mr-1">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span>Range:</span>
            </div>
            {[
              { id: "all", label: "All Time" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleFilterChange(btn.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  rangeFilter === btn.id
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchDashboardData(rangeFilter, true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center space-x-2 rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-slate-200 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800">Loading Enterprise Data</h3>
          <p className="text-sm text-slate-500 mt-1">Connecting to CMPDI PostgreSQL backend...</p>
        </div>
      ) : error && !data ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto my-12">
          <AlertOctagon className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">System Unavailable</h3>
          <p className="mt-2 text-sm text-slate-600">
            Unable to establish a connection with the central database.
          </p>
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-md">
             <p className="text-xs text-rose-700 text-left">{error}</p>
          </div>
          <button
            onClick={() => fetchDashboardData(rangeFilter)}
            className="mt-6 inline-flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <>
      {(() => {
        const overview = data?.overview || {
          total_documents: 0, processed_documents: 0, processing_documents: 0, failed_documents: 0,
          pending_documents: 0, total_chunks: 0, total_extractions: 0, total_validation_errors: 0,
          total_validation_warnings: 0, total_conflicts: 0, total_reports: 0, total_topics: 0, total_ai_queries: 0
        };
        const knowledge_base = data?.knowledge_base || { status: "unknown", total_chunks: 0, indexed_vectors: 0, dimension: 384, model_name: "all-MiniLM-L6-v2", sync_status: "unknown" };
        const validation = data?.validation || { errors: 0, warnings: 0, total_conflicts: 0 };
        // fallback if API doesn't have documents.timeline
        const documentsTimeline = data?.documents?.timeline || []; 

        return (
          <div className="space-y-6">
            {/* ── 1. KEY PLATFORM METRICS (4 CARDS) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-600">Documents</h3>
                  <div className="p-2 bg-blue-50 rounded-md">
                    <Files className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{overview.processed_documents.toLocaleString()}</div>
                <div className="text-xs text-slate-500">
                  <span className="text-emerald-600 font-medium">{overview.processing_documents} processing</span>
                  <span className="mx-1">•</span>
                  <span>{overview.total_documents} total</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-600">Data Extractions</h3>
                  <div className="p-2 bg-indigo-50 rounded-md">
                    <Database className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{overview.total_extractions.toLocaleString()}</div>
                <div className="text-xs text-slate-500">Structured entities identified</div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-600">Knowledge Vectors</h3>
                  <div className="p-2 bg-teal-50 rounded-md">
                    <Layers className="h-4 w-4 text-teal-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{knowledge_base.indexed_vectors.toLocaleString()}</div>
                <div className="text-xs text-slate-500">{overview.total_chunks} chunks indexed</div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-600">Validation Issues</h3>
                  <div className="p-2 bg-rose-50 rounded-md">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{validation.total_conflicts.toLocaleString()}</div>
                <div className="text-xs text-slate-500">
                  <span className="text-rose-600 font-medium">{validation.errors} errors</span>
                  <span className="mx-1">•</span>
                  <span className="text-amber-600 font-medium">{validation.warnings} warnings</span>
                </div>
              </div>

            </div>

            {/* ── 2. MIDDLE ROW: ASK AI & RECENT ACTIVITY ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Ask CMPDI AI */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden lg:col-span-1">
                <div className="border-b border-slate-100 px-5 py-4 bg-slate-50 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-slate-800">Ask CMPDI AI</h2>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-center">
                  <p className="text-sm text-slate-600 mb-6">
                    Query the semantic knowledge base for insights across all processed geological and operational reports.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. Summarize production from Seam III..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <Link href="/assistant" className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-medium transition-colors">
                      Open AI Assistant <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Document Intelligence (Recent Documents Table) */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
                <div className="border-b border-slate-100 px-5 py-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                    <h2 className="font-semibold text-slate-800">Recent Documents</h2>
                  </div>
                  <Link href="/documents" className="text-xs font-medium text-blue-600 hover:text-blue-800">
                    View All Repository &rarr;
                  </Link>
                </div>
                
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-white border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Document Name</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documentsTimeline && documentsTimeline.length > 0 ? (
                        documentsTimeline.slice(0, 5).map((doc: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-medium text-slate-800">{doc.name || `Document #${doc.id}`}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{doc.category || "Report"}</div>
                            </td>
                            <td className="px-5 py-3">
                              {getStatusBadge(doc.status || "completed")}
                            </td>
                            <td className="px-5 py-3 text-slate-600">
                              {doc.date ? new Date(doc.date).toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Link 
                                href={`/documents/viewer?id=${doc.id}`} 
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-sm">
                            No recent documents found in the selected range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        );
      })()}
        </>
      )}
    </div>
  );
}
