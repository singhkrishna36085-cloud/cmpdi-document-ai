"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  GitCompare,
  Search,
  Filter,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Layers,
  Shield,
  XCircle
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchWithAuth } from "@/lib/api";

interface ValidationOverview {
  total_errors: number;
  total_warnings: number;
  total_conflicts: number;
  affected_documents_count: number;
  clean_documents_count: number;
  total_documents: number;
  severity_distribution: Record<string, number>;
  rule_type_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  recent_issues: any[];
}

interface ValidationIssue {
  id: number;
  document_id: number;
  document_name: string;
  is_confidential: boolean;
  extraction_id: number | null;
  chunk_id: number | null;
  rule_type: string;
  severity: string;
  field_name: string | null;
  invalid_value: string | null;
  message: string;
  page_number: number | null;
  sheet_name: string | null;
  source_reference: string | null;
  status: string;
  reviewed_by_id: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string | null;
}

interface ValidationIssuesResponse {
  items: ValidationIssue[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ConflictItem {
  id: number;
  doc_a_id: number;
  doc_b_id: number;
  entity_type: string;
  entity_identifier: string;
  field_name: string;
  val_a: string | null;
  val_b: string | null;
  source_ref_a: string | null;
  source_ref_b: string | null;
  message: string;
  created_at: string | null;
}

interface DocumentQualityItem {
  document_id: number;
  name: string;
  type: string;
  original_filename: string;
  is_confidential: boolean;
  processing_status: string;
  errors_count: number;
  warnings_count: number;
  conflicts_count: number;
  quality_status: string;
  created_at: string | null;
}

export default function ValidationCenterPage() {
  const [activeTab, setActiveTab] = useState<"issues" | "conflicts" | "matrix">("issues");
  const [userRole, setUserRole] = useState<string>("NORMAL_USER");

  const [overview, setOverview] = useState<ValidationOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);

  const [issuesData, setIssuesData] = useState<ValidationIssuesResponse | null>(null);
  const [issuesLoading, setIssuesLoading] = useState<boolean>(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [docFilter, setDocFilter] = useState<string>("");

  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState<boolean>(false);

  const [docMatrix, setDocMatrix] = useState<DocumentQualityItem[]>([]);
  const [docMatrixLoading, setDocMatrixLoading] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetchWithAuth("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          setUserRole(user.role || "NORMAL_USER");
        }
      } catch (e) {
        console.error("Failed to check current user", e);
      }
    }
    checkUser();
  }, []);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await fetchWithAuth("/api/validation/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (e) {
      console.error("Failed to fetch validation overview", e);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (severityFilter) params.append("severity", severityFilter);
      if (ruleTypeFilter) params.append("rule_type", ruleTypeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (docFilter && !isNaN(Number(docFilter))) params.append("document_id", docFilter);

      const res = await fetchWithAuth(`/api/validation/issues?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired. Please log in again.");
        if (res.status === 403) throw new Error("Access denied: Restricted validation data.");
        throw new Error(`Failed to load issues (Status ${res.status})`);
      }
      const data = await res.json();
      setIssuesData(data);
    } catch (err: any) {
      setIssuesError(err.message || "An error occurred while fetching validation issues.");
    } finally {
      setIssuesLoading(false);
    }
  }, [page, pageSize, searchTerm, severityFilter, ruleTypeFilter, statusFilter, docFilter]);

  const fetchConflicts = useCallback(async () => {
    setConflictsLoading(true);
    try {
      const res = await fetchWithAuth("/api/conflicts");
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch (e) {
      console.error("Failed to load conflicts", e);
    } finally {
      setConflictsLoading(false);
    }
  }, []);

  const fetchDocMatrix = useCallback(async () => {
    setDocMatrixLoading(true);
    try {
      const res = await fetchWithAuth("/api/validation/documents");
      if (res.ok) {
        const data = await res.json();
        setDocMatrix(data.documents || []);
      }
    } catch (e) {
      console.error("Failed to load document quality matrix", e);
    } finally {
      setDocMatrixLoading(false);
    }
  }, []);

  const handleRunFullAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetchWithAuth("/api/validation/audit-all", { method: "POST" });
      if (res.ok) {
        await Promise.all([fetchOverview(), fetchIssues(), fetchConflicts(), fetchDocMatrix()]);
      }
    } catch (e) {
      console.error("Failed to run automated audit", e);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "issues") fetchIssues();
  }, [activeTab, fetchIssues]);

  useEffect(() => {
    if (activeTab === "conflicts") fetchConflicts();
  }, [activeTab, fetchConflicts]);

  useEffect(() => {
    if (activeTab === "matrix") fetchDocMatrix();
  }, [activeTab, fetchDocMatrix]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIssues();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSeverityFilter("");
    setRuleTypeFilter("");
    setStatusFilter("");
    setDocFilter("");
    setPage(1);
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr.toUpperCase()) {
      case "RESOLVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> RESOLVED
          </span>
        );
      case "DISMISSED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 mr-1 text-slate-500" /> DISMISSED
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 mr-1 text-amber-600 animate-spin" /> UNDER REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-600" /> OPEN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
      
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Validation & Quality Center</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Detect anomalies, review formatting and completeness rules, inspect cross-document conflicts, and trace original evidence.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRunFullAudit}
            disabled={isAuditing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
            {isAuditing ? "Auditing Repository..." : "Run Core Audit Suite"}
          </button>
          <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-md border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Role:</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold border bg-blue-100 text-blue-800 border-blue-200">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ERROR</p>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{overviewLoading ? "-" : overview?.total_errors ?? 0}</h3>
          <p className="text-xs text-slate-500 mt-1">Critical logical errors</p>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WARNING</p>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{overviewLoading ? "-" : overview?.total_warnings ?? 0}</h3>
          <p className="text-xs text-slate-500 mt-1">Completeness warnings</p>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CONFLICT</p>
            <GitCompare className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{overviewLoading ? "-" : overview?.total_conflicts ?? 0}</h3>
          <p className="text-xs text-slate-500 mt-1">Cross-doc mismatches</p>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AFFECTED DOCS</p>
            <Layers className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{overviewLoading ? "-" : overview?.affected_documents_count ?? 0}</h3>
          <p className="text-xs text-slate-500 mt-1">Documents with issues</p>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CLEAN DOCS</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{overviewLoading ? "-" : overview?.clean_documents_count ?? 0}</h3>
          <p className="text-xs text-slate-500 mt-1">Zero validation issues</p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("issues")}
            className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === "issues"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Validation Issues List
          </button>

          <button
            onClick={() => setActiveTab("conflicts")}
            className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === "conflicts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Cross-Document Conflicts
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === "matrix"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Document Quality Matrix
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 shadow-sm p-4">
        {activeTab === "issues" && (
          <div className="space-y-4">
            <form onSubmit={handleApplyFilters} className="bg-slate-50 rounded-md border border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                </select>
                <select
                  value={ruleTypeFilter}
                  onChange={(e) => setRuleTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Rule Types</option>
                  <option value="stripping_ratio">Stripping Ratio Math (SR = Waste/Ore)</option>
                  <option value="thickness_bounds">Seam Thickness Bounds & Inversion</option>
                  <option value="negative_overburden">Negative Overburden Flags (Topo Z)</option>
                  <option value="topological_integrity">Topological Integrity (Stacking)</option>
                  <option value="logical">Logical Math Calculation</option>
                  <option value="format">Data Format & Type</option>
                  <option value="completeness">Completeness</option>
                  <option value="unit">Unit Validation</option>
                  <option value="conflict">Cross-Document Conflict</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
                <input
                  type="text"
                  placeholder="Doc ID (e.g. 11)"
                  value={docFilter}
                  onChange={(e) => setDocFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded shadow-sm hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Rule Type</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Field</th>
                    <th className="py-3 px-4">Message</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {issuesData?.items?.map(issue => (
                    <tr key={issue.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {issue.severity === "error" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">ERROR</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">WARNING</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-xs font-mono rounded font-medium border ${
                          issue.rule_type === 'stripping_ratio' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          issue.rule_type === 'thickness_bounds' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                          issue.rule_type === 'negative_overburden' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                          issue.rule_type === 'topological_integrity' ? 'bg-indigo-50 text-indigo-800 border-indigo-300' :
                          issue.rule_type === 'logical' ? 'bg-sky-50 text-sky-800 border-sky-300' :
                          'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          {issue.rule_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{issue.document_name}</div>
                        <div className="text-xs text-slate-500 font-mono">ID: {issue.document_id}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-700 max-w-[150px] truncate" title={issue.field_name || ""}>
                        {issue.field_name || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={issue.message}>
                        {issue.message}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(issue.status)}
                      </td>
                    </tr>
                  ))}
                  {(!issuesData?.items || issuesData.items.length === 0) && !issuesLoading && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No validation issues found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "conflicts" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conflicts.map((conf) => (
                <div key={conf.id} className="border border-slate-200 rounded-md p-4 shadow-sm bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {conf.entity_type} Conflict
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 mt-1">{conf.field_name}: {conf.entity_identifier}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-3 border border-slate-100">{conf.message}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-xs font-semibold text-slate-700 mb-1">Doc A (ID #{conf.doc_a_id})</div>
                      <div className="text-sm font-bold text-rose-600 font-mono break-all">{conf.val_a || "N/A"}</div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate" title={conf.source_ref_a || ""}>{conf.source_ref_a}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-xs font-semibold text-slate-700 mb-1">Doc B (ID #{conf.doc_b_id})</div>
                      <div className="text-sm font-bold text-rose-600 font-mono break-all">{conf.val_b || "N/A"}</div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate" title={conf.source_ref_b || ""}>{conf.source_ref_b}</div>
                    </div>
                  </div>
                </div>
              ))}
              {conflicts.length === 0 && !conflictsLoading && (
                <div className="col-span-2 py-12 text-center text-slate-500 border border-slate-200 rounded-md bg-slate-50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">No cross-document conflicts detected.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "matrix" && (
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4 text-center">Errors</th>
                  <th className="py-3 px-4 text-center">Warnings</th>
                  <th className="py-3 px-4 text-center">Conflicts</th>
                  <th className="py-3 px-4">Quality Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {docMatrix.map(doc => (
                  <tr key={doc.document_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{doc.name || doc.original_filename}</div>
                      <div className="text-xs text-slate-500 font-mono">ID: {doc.document_id}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {doc.errors_count > 0 ? (
                        <span className="inline-flex px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold">{doc.errors_count}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {doc.warnings_count > 0 ? (
                        <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold">{doc.warnings_count}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {doc.conflicts_count > 0 ? (
                        <span className="inline-flex px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded font-bold">{doc.conflicts_count}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {doc.quality_status === "CLEAN" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Clean</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-semibold"><AlertCircle className="w-3.5 h-3.5" /> Action Req</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
