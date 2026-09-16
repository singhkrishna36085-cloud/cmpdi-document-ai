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
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Layers,
  Shield,
  Check,
  XCircle,
  Play
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
  // Tabs State
  const [activeTab, setActiveTab] = useState<"issues" | "conflicts" | "matrix">("issues");

  // User Role State
  const [userRole, setUserRole] = useState<string>("NORMAL_USER");

  // Overview State
  const [overview, setOverview] = useState<ValidationOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);

  // Issues State & Filters
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

  // Conflicts State
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState<boolean>(false);

  // Document Quality Matrix State
  const [docMatrix, setDocMatrix] = useState<DocumentQualityItem[]>([]);
  const [docMatrixLoading, setDocMatrixLoading] = useState<boolean>(false);
  const [revalidatingDocId, setRevalidatingDocId] = useState<number | null>(null);

  // Detail Modal & Review State
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [reviewStatus, setReviewStatus] = useState<string>("OPEN");
  const [reviewNote, setReviewNote] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Fetch Current User Role
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

  // Fetch Overview Metrics
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

  // Fetch Paginated Issues
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
      if (docFilter) params.append("document_id", docFilter);

      const res = await fetchWithAuth(`/api/validation/issues?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired. Please log in again.");
        if (res.status === 403) throw new Error("Access denied: Restricted validation data.");
        throw new Error(`Failed to load issues (Status ${res.status})`);
      }
      const data: ValidationIssuesResponse = await res.json();
      setIssuesData(data);
    } catch (err: any) {
      setIssuesError(err.message || "An error occurred while fetching validation issues.");
    } finally {
      setIssuesLoading(false);
    }
  }, [page, pageSize, searchTerm, severityFilter, ruleTypeFilter, statusFilter, docFilter]);

  // Fetch Conflicts List
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

  // Fetch Document Matrix
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

  // Re-run validation on a specific document
  const handleRevalidateDoc = async (docId: number) => {
    setRevalidatingDocId(docId);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}/validate`, { method: "POST" });
      if (res.ok) {
        await fetchOverview();
        if (activeTab === "matrix") fetchDocMatrix();
        if (activeTab === "issues") fetchIssues();
        if (activeTab === "conflicts") fetchConflicts();
      }
    } catch (e) {
      console.error("Revalidation failed", e);
    } finally {
      setRevalidatingDocId(null);
    }
  };

  // Submit Issue Review (HOD role)
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setReviewSubmitting(true);
    setReviewMessage(null);
    try {
      const res = await fetchWithAuth(`/api/validation/issues/${selectedIssue.id}/review`, {
        method: "POST",
        body: JSON.stringify({ status: reviewStatus, note: reviewNote }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Review submission failed.");
      }
      const data = await res.json();
      setSelectedIssue(data.issue);
      setReviewMessage("Review status updated successfully.");
      fetchIssues();
      fetchOverview();
    } catch (err: any) {
      setReviewMessage(`Error: ${err.message}`);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Status Badge Component
  const getStatusBadge = (statusStr: string) => {
    switch (statusStr.toUpperCase()) {
      case "RESOLVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            RESOLVED
          </span>
        );
      case "DISMISSED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
            <XCircle className="w-3 h-3 mr-1 text-slate-500" />
            DISMISSED
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            <RefreshCw className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
            UNDER REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
            OPEN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Validation & Data Quality Center"
          description="Detect anomalies, review formatting and completeness rules, inspect cross-document conflicts, and trace original evidence."
        />
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
          <Shield className="w-4 h-4 text-slate-500" />
          <span>Role:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            userRole === "HOD" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
          }`}>
            {userRole}
          </span>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Errors</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {overviewLoading ? "-" : overview?.total_errors ?? 0}
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Critical format/logical errors</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Warnings</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {overviewLoading ? "-" : overview?.total_warnings ?? 0}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Completeness & unit warnings</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Conflicts</p>
              <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {overviewLoading ? "-" : overview?.total_conflicts ?? 0}
              </h3>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
              <GitCompare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Cross-document mismatches</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Affected Docs</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {overviewLoading ? "-" : overview?.affected_documents_count ?? 0}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Documents with issues</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Clean Docs</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {overviewLoading ? "-" : overview?.clean_documents_count ?? 0}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Zero validation issues</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("issues")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "issues"
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Validation Issues List
          </button>

          <button
            onClick={() => setActiveTab("conflicts")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "conflicts"
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Cross-Document Conflict Center
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "matrix"
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Document Quality Matrix
          </button>
        </nav>
      </div>

      {/* Tab 1: Issues List View */}
      {activeTab === "issues" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <form onSubmit={handleApplyFilters} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search field, value, message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Severities</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </select>

              {/* Rule Type Filter */}
              <select
                value={ruleTypeFilter}
                onChange={(e) => setRuleTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Rule Types</option>
                <option value="completeness">completeness</option>
                <option value="format">format</option>
                <option value="unit">unit</option>
                <option value="logical">logical</option>
                <option value="conflict">conflict</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Review Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="DISMISSED">DISMISSED</option>
              </select>

              {/* Document ID Filter */}
              <input
                type="text"
                placeholder="Doc ID (e.g. 11)"
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5"
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
          {issuesError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs font-medium">{issuesError}</p>
              </div>
              <button
                onClick={fetchIssues}
                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs rounded font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {issuesLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Querying validation results from PostgreSQL...</p>
              </div>
            ) : !issuesData || issuesData.items.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Validation Issues Found</h3>
                <p className="text-xs text-slate-500 mt-1">All extracted records passed validation rules or matched your filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Rule Type</th>
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Field / Invalid Value</th>
                      <th className="py-3 px-4">Message</th>
                      <th className="py-3 px-4">Source Ref</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {issuesData.items.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {issue.severity === "error" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                              ERROR
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                              WARNING
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {issue.rule_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{issue.document_name}</span>
                          <span className="text-[11px] text-slate-400 ml-1">(Doc #{issue.document_id})</span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs font-mono text-[11px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{issue.field_name || "-"}</div>
                          <div className="text-slate-500 truncate">{issue.invalid_value ? `"${issue.invalid_value}"` : ""}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                          {issue.message}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {issue.source_reference || `Page ${issue.page_number || 1}`}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(issue.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedIssue(issue);
                              setReviewStatus(issue.status || "OPEN");
                              setReviewNote(issue.review_note || "");
                              setReviewMessage(null);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {issuesData && issuesData.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.min(page * pageSize, issuesData.total)}</span> of{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{issuesData.total}</span> issues
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
                    Page {page} of {issuesData.total_pages}
                  </span>
                  <button
                    disabled={page >= issuesData.total_pages}
                    onClick={() => setPage((p) => Math.min(issuesData.total_pages, p + 1))}
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

      {/* Tab 2: Cross-Document Conflicts View */}
      {activeTab === "conflicts" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-orange-600" />
              Cross-Document Conflict Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Side-by-side comparison of parameter values extracted across different documents that mismatch.
              Original extracted values are preserved exactly from PostgreSQL.
            </p>
          </div>

          {conflictsLoading ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Fetching detected cross-document conflicts...</p>
            </div>
          ) : conflicts.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Cross-Document Conflicts Detected</h3>
              <p className="text-xs text-slate-500 mt-1">All extracted key figures are consistent across processed documents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conflicts.map((conf) => (
                <div key={conf.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {conf.entity_type} Conflict
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {conf.field_name}: <span className="font-normal text-slate-600">{conf.entity_identifier}</span>
                      </h4>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">Conflict #{conf.id}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    {conf.message}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Document A Side */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Doc A (ID #{conf.doc_a_id})</span>
                      </div>
                      <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                        {conf.val_a || "N/A"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        Source: {conf.source_ref_a || "N/A"}
                      </div>
                      <Link
                        href={`/documents/viewer?id=${conf.doc_a_id}`}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1 pt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Source A
                      </Link>
                    </div>

                    {/* Document B Side */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Doc B (ID #{conf.doc_b_id})</span>
                      </div>
                      <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                        {conf.val_b || "N/A"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        Source: {conf.source_ref_b || "N/A"}
                      </div>
                      <Link
                        href={`/documents/viewer?id=${conf.doc_b_id}`}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1 pt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Source B
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Document Quality Matrix */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
              Document Data Quality Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Overview of document quality statuses determined deterministically from PostgreSQL validation results and conflict checks.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {docMatrixLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading document quality matrix...</p>
              </div>
            ) : docMatrix.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">No Documents Uploaded</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Errors</th>
                      <th className="py-3 px-4 text-center">Warnings</th>
                      <th className="py-3 px-4 text-center">Conflicts</th>
                      <th className="py-3 px-4">Quality Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {docMatrix.map((doc) => (
                      <tr key={doc.document_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {doc.name} <span className="text-[11px] text-slate-400 font-normal">(#{doc.document_id})</span>
                          {doc.is_confidential && (
                            <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                              CONFIDENTIAL
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 uppercase font-mono text-[11px]">
                          {doc.type}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold font-mono text-rose-600">
                          {doc.errors_count}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold font-mono text-amber-600">
                          {doc.warnings_count}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold font-mono text-orange-600">
                          {doc.conflicts_count}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {doc.quality_status === "Clean" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Clean
                            </span>
                          ) : doc.quality_status === "Conflicts" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                              <GitCompare className="w-3.5 h-3.5 mr-1 text-orange-600" /> Conflicts
                            </span>
                          ) : doc.quality_status === "Errors" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                              <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Errors
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Warnings
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            disabled={revalidatingDocId === doc.document_id}
                            onClick={() => handleRevalidateDoc(doc.document_id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs inline-flex items-center gap-1"
                          >
                            {revalidatingDocId === doc.document_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            Re-Validate
                          </button>

                          <Link
                            href={`/documents/viewer?id=${doc.document_id}`}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 rounded font-medium text-xs inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Viewer
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issue Detail & Review Modal */}
      {isModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {selectedIssue.severity === "error" ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Validation Finding #{selectedIssue.id}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Finding Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Document:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedIssue.document_name} <span className="font-normal text-slate-400">(Doc #{selectedIssue.document_id})</span>
                </p>
              </div>

              <div>
                <span className="text-slate-500">Rule Type:</span>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedIssue.rule_type}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Affected Field:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedIssue.field_name || "N/A"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Extracted Invalid Value:</span>
                <p className="font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  {selectedIssue.invalid_value ? `"${selectedIssue.invalid_value}"` : "N/A"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Source Reference:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedIssue.source_reference || `Page ${selectedIssue.page_number || 1}`}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Review Status:</span>
                <div className="mt-0.5">{getStatusBadge(selectedIssue.status)}</div>
              </div>
            </div>

            {/* Message Alert */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Validation Engine Finding Message:</span>
              {selectedIssue.message}
            </div>

            {/* HOD Review Controls */}
            {userRole === "HOD" ? (
              <form onSubmit={handleSaveReview} className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-teal-600" /> HOD Governance Review Action
                </h4>

                {reviewMessage && (
                  <div className={`p-2 rounded text-xs font-medium ${
                    reviewMessage.startsWith("Error") ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {reviewMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Set Status:</label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="UNDER_REVIEW">UNDER REVIEW</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="DISMISSED">DISMISSED</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Review Note:</label>
                    <input
                      type="text"
                      placeholder="Optional notes for audit log..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    {reviewSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save Review Status
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                Review status changes are restricted to HOD governance role.
              </div>
            )}

            {/* Navigation & Close */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <Link
                href={`/documents/viewer?id=${selectedIssue.document_id}&page=${selectedIssue.page_number || 1}${selectedIssue.chunk_id ? `&chunk_id=${selectedIssue.chunk_id}` : ""}`}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Source Evidence in Viewer
              </Link>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
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
