"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Filter,
  RotateCcw,
  Eye,
  FileText,
  Bot,
  BarChart3,
  Tag,
  Database,
  Lock,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  Shield,
  ExternalLink,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { fetchWithAuth } from "@/lib/api";

interface AuditLogItem {
  id: number;
  timestamp: string;
  user_id: number | null;
  username: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  document_id: number | null;
  report_id: number | null;
  status: string;
  ip_address: string | null;
  details: any;
}

interface AuditResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  user_role: string;
  metrics: {
    total_events: number;
    successful_events: number;
    failed_events: number;
    unique_users: number;
  };
}

interface DocumentItem {
  id: number;
  name: string;
  original_filename: string;
  is_confidential: boolean;
  created_at: string;
}

interface DocumentHistoryResponse {
  document_id: number;
  document_name: string;
  is_confidential: boolean;
  total_events: number;
  history: AuditLogItem[];
}

export default function AuditCenterPage() {
  // State
  const [activeTab, setActiveTab] = useState<"table" | "docHistory" | "governance">("table");
  
  // Audit Table State
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  
  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // Document History State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [docHistory, setDocHistory] = useState<DocumentHistoryResponse | null>(null);
  const [docHistoryLoading, setDocHistoryLoading] = useState<boolean>(false);
  const [docHistoryError, setDocHistoryError] = useState<string | null>(null);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (searchTerm.trim()) queryParams.append("search", searchTerm.trim());
      if (actionFilter) queryParams.append("action", actionFilter);
      if (resourceFilter) queryParams.append("resource_type", resourceFilter);
      if (statusFilter) queryParams.append("status", statusFilter);
      if (roleFilter) queryParams.append("role", roleFilter);

      const res = await fetchWithAuth(`/api/audit?${queryParams.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        if (res.status === 403) {
          throw new Error("Access denied. Insufficient permissions to view audit logs.");
        }
        throw new Error(`Failed to load audit logs (Status ${res.status})`);
      }
      const data: AuditResponse = await res.json();
      setAuditData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, actionFilter, resourceFilter, statusFilter, roleFilter]);

  // Fetch Documents List for History Selector
  const fetchDocumentsList = async () => {
    try {
      const res = await fetchWithAuth("/api/documents?limit=100");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        if (data.documents && data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(data.documents[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load document list", e);
    }
  };

  // Fetch Document History
  const fetchDocumentHistory = useCallback(async (docId: number) => {
    setDocHistoryLoading(true);
    setDocHistoryError(null);
    try {
      const res = await fetchWithAuth(`/api/audit/document-history/${docId}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied: Confidential document history restricted to HOD role.");
        }
        throw new Error(`Failed to load document history (Status ${res.status})`);
      }
      const data: DocumentHistoryResponse = await res.json();
      setDocHistory(data);
    } catch (err: any) {
      setDocHistoryError(err.message || "Could not fetch document history.");
    } finally {
      setDocHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    fetchDocumentsList();
  }, []);

  useEffect(() => {
    if (selectedDocId && activeTab === "docHistory") {
      fetchDocumentHistory(selectedDocId);
    }
  }, [selectedDocId, activeTab, fetchDocumentHistory]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setActionFilter("");
    setResourceFilter("");
    setStatusFilter("");
    setRoleFilter("");
    setPage(1);
  };

  // Action Badge Helper
  const getActionBadge = (action: string) => {
    const actUpper = action.toUpperCase();
    if (actUpper.includes("LOGIN")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <UserCheck className="w-3 h-3 mr-1 text-indigo-500" />
          {action}
        </span>
      );
    }
    if (actUpper.includes("DOCUMENT")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <FileText className="w-3 h-3 mr-1 text-blue-500" />
          {action}
        </span>
      );
    }
    if (actUpper.includes("AI") || actUpper.includes("RAG")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <Bot className="w-3 h-3 mr-1 text-teal-500" />
          {action}
        </span>
      );
    }
    if (actUpper.includes("REPORT")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <BarChart3 className="w-3 h-3 mr-1 text-emerald-500" />
          {action}
        </span>
      );
    }
    if (actUpper.includes("TOPIC")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Tag className="w-3 h-3 mr-1 text-purple-500" />
          {action}
        </span>
      );
    }
    if (actUpper.includes("SEARCH") || actUpper.includes("INDEX")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
          <Search className="w-3 h-3 mr-1 text-cyan-500" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Shield className="w-3 h-3 mr-1 text-slate-500" />
        {action}
      </span>
    );
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            SUCCESS
          </span>
        );
      case "FAILURE":
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
            FAILURE
          </span>
        );
      case "NOT_FOUND":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            NOT FOUND
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Audit & Governance Center"
          description="PostgreSQL-backed activity history, system events, compliance records and resource lifecycle traceability."
        />
        {auditData && (
          <div className="flex items-center space-x-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-300">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Role:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              auditData.user_role === "HOD" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              {auditData.user_role}
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Total Audit Events</p>
              <h3 className="text-2xl font-bold text-slate-100 font-mono mt-1">
                {auditData?.metrics.total_events ?? "-"}
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Recorded in PostgreSQL DB</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Successful Operations</p>
              <h3 className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {auditData?.metrics.successful_events ?? "-"}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Clean execution status</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Failed / Exceptions</p>
              <h3 className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {auditData?.metrics.failed_events ?? "-"}
              </h3>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Failed or missing context</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Unique Active Users</p>
              <h3 className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {auditData?.metrics.unique_users ?? "-"}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Authenticated accounts</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("table")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "table"
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            System Audit Log
          </button>

          <button
            onClick={() => setActiveTab("docHistory")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "docHistory"
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400"
            }`}
          >
            <Layers className="w-4 h-4" />
            Document Lifecycle History
          </button>

          <button
            onClick={() => setActiveTab("governance")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "governance"
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400"
            }`}
          >
            <Info className="w-4 h-4" />
            Governance & Traceability Policy
          </button>
        </nav>
      </div>

      {/* Tab 1: Audit Table View */}
      {activeTab === "table" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <form onSubmit={handleApplyFilters} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search action, user, details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
                <option value="DOCUMENT_VIEW">DOCUMENT_VIEW</option>
                <option value="DOCUMENT_PROCESS">DOCUMENT_PROCESS</option>
                <option value="DOCUMENT_VALIDATE">DOCUMENT_VALIDATE</option>
                <option value="AI_ASSISTANT_QUERY">AI_ASSISTANT_QUERY</option>
                <option value="RAG_RETRIEVAL">RAG_RETRIEVAL</option>
                <option value="REPORT_GENERATE">REPORT_GENERATE</option>
                <option value="REPORT_VIEW">REPORT_VIEW</option>
                <option value="TOPIC_ANALYSIS">TOPIC_ANALYSIS</option>
                <option value="SEMANTIC_SEARCH">SEMANTIC_SEARCH</option>
                <option value="KNOWLEDGE_BASE_REINDEX">KNOWLEDGE_BASE_REINDEX</option>
              </select>

              {/* Resource Type Filter */}
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Resource Types</option>
                <option value="AUTH">AUTH</option>
                <option value="DOCUMENT">DOCUMENT</option>
                <option value="AI">AI</option>
                <option value="REPORTS">REPORTS</option>
                <option value="TOPICS">TOPICS</option>
                <option value="SEARCH">SEARCH</option>
                <option value="KNOWLEDGE_BASE">KNOWLEDGE_BASE</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILURE">FAILURE</option>
                <option value="NOT_FOUND">NOT_FOUND</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Roles</option>
                <option value="HOD">HOD</option>
                <option value="NORMAL_USER">NORMAL_USER</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <Filter className="w-3.5 h-3.5" />
                Apply Filters
              </button>
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs rounded font-medium transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Querying PostgreSQL audit history...</p>
              </div>
            ) : !auditData || auditData.items.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Audit Events Found</h3>
                <p className="text-xs text-slate-500 mt-1">No system activity logs matched your filter criteria in PostgreSQL.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User & Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Details Preview</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {auditData.items.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{log.username}</span>
                            <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                              log.user_role === "HOD" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {log.user_role}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ""}
                          {log.document_id ? ` (Doc #${log.document_id})` : ""}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-500 dark:text-slate-400">
                          {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "-")}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {auditData && auditData.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.min(page * pageSize, auditData.total)}</span> of{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{auditData.total}</span> entries
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Page {page} of {auditData.total_pages}
                  </span>
                  <button
                    disabled={page >= auditData.total_pages}
                    onClick={() => setPage((p) => Math.min(auditData.total_pages, p + 1))}
                    className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Document History View */}
      {activeTab === "docHistory" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Chronological Document Lifecycle History
            </h3>
            <p className="text-xs text-slate-500">
              Select an uploaded document to inspect every audited stage of its lifecycle (Upload &rarr; Processing &rarr; Validation &rarr; Search &rarr; AI Query &rarr; Reports).
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-xl">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Select Document:</label>
              <select
                value={selectedDocId || ""}
                onChange={(e) => setSelectedDocId(Number(e.target.value))}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Doc #{doc.id}: {doc.name} ({doc.original_filename}) {doc.is_confidential ? "[CONFIDENTIAL]" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {docHistoryLoading ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading document audit timeline...</p>
            </div>
          ) : docHistoryError ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <p className="text-xs font-medium">{docHistoryError}</p>
            </div>
          ) : docHistory ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {docHistory.document_name} <span className="text-xs font-normal text-slate-500">(Doc #{docHistory.document_id})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total recorded events: {docHistory.total_events}
                  </p>
                </div>
                {docHistory.is_confidential && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                    <Lock className="w-3 h-3 mr-1 text-rose-600" />
                    CONFIDENTIAL
                  </span>
                )}
              </div>

              {/* Timeline List */}
              {docHistory.history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No audit events recorded for this document yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {docHistory.history.map((item, idx) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white dark:border-slate-900" />
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            {getActionBadge(item.action)}
                            {getStatusBadge(item.status)}
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                          <span>User: <strong className="text-slate-900 dark:text-slate-100">{item.username}</strong> ({item.user_role})</span>
                          <span className="font-mono text-[11px] text-slate-400">Event ID #{item.id}</span>
                        </div>
                        {item.details && (
                          <pre className="text-[11px] bg-slate-900 text-slate-100 p-2.5 rounded-lg overflow-x-auto font-mono">
                            {typeof item.details === "object" ? JSON.stringify(item.details, null, 2) : String(item.details)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 3: Governance Policy */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              CMPDI System Governance & Immutable Audit Chain
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every operation within the CMPDI / CIL Document AI platform passes through centralized audit services. Activity records are persisted directly to PostgreSQL with strict secret redaction and role-based data protection.
            </p>

            {/* Traceability Flow Diagram */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                End-to-End Audit Traceability Chain
              </h4>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-1/5 shadow-sm">
                  <UserCheck className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">User Action</p>
                  <p className="text-[10px] text-slate-500">JWT Authenticated</p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-1/5 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">System Event</p>
                  <p className="text-[10px] text-slate-500">Fail-Safe Audit Service</p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-1/5 shadow-sm">
                  <FileText className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Resource Target</p>
                  <p className="text-[10px] text-slate-500">Doc / AI / Report ID</p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-1/5 shadow-sm">
                  <Database className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">PostgreSQL Log</p>
                  <p className="text-[10px] text-slate-500">Indexed & Sanitized</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                  <Lock className="w-4 h-4 text-rose-500" />
                  Secrets Redaction Policy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Passwords, bcrypt hashes, JWT access tokens, API keys, and LLM secrets are automatically stripped before writing to PostgreSQL audit logs. Secrets are never exposed to clients.
                </p>
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                  Confidential Document Isolation
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Audit records referencing confidential documents (e.g., Doc #27) are strictly restricted to HOD roles. NORMAL_USER requests never receive confidential metadata or event details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Audit Event #{selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Timestamp:</span>
                <p className="font-mono font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : "-"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Action:</span>
                <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
              </div>

              <div>
                <span className="text-slate-500">User:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedLog.username} ({selectedLog.user_role})
                </p>
              </div>

              <div>
                <span className="text-slate-500">Status:</span>
                <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
              </div>

              <div>
                <span className="text-slate-500">Resource Type & ID:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedLog.resource_type} {selectedLog.resource_id ? `#${selectedLog.resource_id}` : ""}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Document / Report Reference:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedLog.document_id ? `Doc #${selectedLog.document_id}` : (selectedLog.report_id ? `Report #${selectedLog.report_id}` : "N/A")}
                </p>
              </div>
            </div>

            {/* Sanitized Metadata JSON */}
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sanitized Action Metadata:</span>
              <pre className="mt-1.5 p-3.5 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                {typeof selectedLog.details === "object"
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : String(selectedLog.details || "No metadata")}
              </pre>
            </div>

            {/* Navigation Links if authorized */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2">
                {selectedLog.document_id && (
                  <Link
                    href={`/documents/viewer?id=${selectedLog.document_id}`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Document Viewer
                  </Link>
                )}

                {selectedLog.report_id && (
                  <Link
                    href={`/reports?id=${selectedLog.report_id}`}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Report Detail
                  </Link>
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
