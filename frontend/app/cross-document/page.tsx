"use client";

import React, { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  GitCompare,
  Sliders,
  BarChart3,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2
} from "lucide-react";

import { fetchWithAuth } from "@/lib/api";

export default function CrossDocumentPage() {
  const [activeTab, setActiveTab] = useState<"compare" | "analytics" | "filter" | "safety" | "conflicts">("compare");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["Gevra Expansion", "Nigahi Project"]);
  
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [filterResults, setFilterResults] = useState<any>(null);
  const [conflictsData, setConflictsData] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filterProdMin, setFilterProdMin] = useState<string>("");
  const [filterSeamMin, setFilterSeamMin] = useState<string>("");
  const [filterSrMin, setFilterSrMin] = useState<string>("");
  const [filterSub, setFilterSub] = useState<string>("");
  const [filterSafety, setFilterSafety] = useState<string>("all");
  const [filterRiskKw, setFilterRiskKw] = useState<string>("");

  useEffect(() => {
    fetchMetricsMetadata();
    fetchAnalytics();
    fetchConflicts();
  }, []);

  const fetchMetricsMetadata = async () => {
    try {
      const res = await fetchWithAuth("/api/cross-document/metrics");
      if (res.ok) {
        const data = await res.json();
        setAvailableProjects(data.projects || []);
        setSubsidiaries(data.subsidiaries || []);
        if (data.projects && data.projects.length >= 2) {
          const defaultSelected = [data.projects[0].name, data.projects[1].name];
          setSelectedProjects(defaultSelected);
          fetchComparison(defaultSelected);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch metrics metadata:", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/cross-document/analyze", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err: any) {
      setError("Failed to load multi-document analytics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async (projList?: string[]) => {
    try {
      setCompareLoading(true);
      const payload = { projects: projList || selectedProjects };
      const res = await fetchWithAuth("/api/cross-document/compare", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err: any) {
      console.error("Comparison fetch failed:", err);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleApplyFilter = async () => {
    try {
      setFilterLoading(true);
      const payload: any = {};
      if (filterProdMin) payload.min_production = parseFloat(filterProdMin);
      if (filterSeamMin) payload.min_seam = parseFloat(filterSeamMin);
      if (filterSrMin) payload.min_sr = parseFloat(filterSrMin);
      if (filterSub) payload.subsidiary = filterSub;
      if (filterSafety === "yes") payload.has_safety_incidents = true;
      if (filterSafety === "no") payload.has_safety_incidents = false;
      if (filterRiskKw) payload.risk_keyword = filterRiskKw;

      const res = await fetchWithAuth("/api/cross-document/filter", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setFilterResults(data);
      }
    } catch (err: any) {
      console.error("Filter failed:", err);
    } finally {
      setFilterLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const res = await fetchWithAuth("/api/cross-document/conflicts");
      if (res.ok) {
        const data = await res.json();
        setConflictsData(data);
      }
    } catch (err: any) {
      console.error("Conflicts fetch failed:", err);
    }
  };

  const toggleProjectSelection = (projName: string) => {
    let updated: string[];
    if (selectedProjects.includes(projName)) {
      updated = selectedProjects.filter(p => p !== projName);
    } else {
      updated = [...selectedProjects, projName];
    }
    setSelectedProjects(updated);
    if (updated.length > 0) {
      fetchComparison(updated);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
        
        {/* Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-600">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Cross-Document Intelligence</h1>
              <p className="text-sm text-slate-500">
                Connected node graph, metric variance analysis, threshold intelligence, and real cross-document conflicts.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              fetchMetricsMetadata();
              fetchAnalytics();
              fetchComparison();
              fetchConflicts();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4 text-blue-600" />
            Refresh Data
          </button>
        </div>

        {/* Node Graph Concept Banner */}
        <div className="p-6 rounded-lg bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                Relationship Graph Matrix
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center py-4 relative z-10">
            {/* Connection line placeholder */}
            <div className="absolute inset-0 pointer-events-none hidden md:block z-0 flex items-center justify-center">
              <div className="h-0.5 w-3/4 bg-slate-200"></div>
            </div>
            
            {/* Node 1 */}
            <button
              onClick={() => setSelectedNode({
                type: "Document A",
                title: selectedProjects[0] || "CIL_Q1_2026_Mine_Operations.xlsx",
                parameter: "Raw Coal Production",
                value: "4,500,000 Tonnes",
                source: "Sheet: Operations_Summary, Row #14",
                page: "Page 1"
              })}
              className="p-4 rounded-md bg-white border border-slate-200 text-left transition-colors hover:border-blue-400 shadow-sm relative z-10"
            >
              <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">Document Node A</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                {selectedProjects[0] || "Gevra Expansion"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">Source: CIL Operations Report</p>
            </button>

            {/* Parameter Node */}
            <div className="flex flex-col items-center justify-center p-3 rounded-md bg-slate-50 border border-slate-200 text-center relative z-10">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Extracted Parameter</span>
              <span className="text-sm font-bold text-slate-800">Raw Coal vs Stripping Ratio</span>
            </div>

            {/* Conflict Node */}
            <button
              onClick={() => setSelectedNode({
                type: "Conflict Node",
                title: "Stripping Ratio Variance",
                parameter: "Stripping Ratio",
                value: "Document A (2.45) vs Document B (2.80)",
                source: "Cross-Document Conflict Engine",
                page: "Multi-Source Extraction"
              })}
              className="p-4 rounded-md bg-orange-50 border border-orange-200 text-left transition-colors hover:border-orange-400 shadow-sm relative z-10"
            >
              <span className="text-[10px] text-orange-700 font-bold block uppercase tracking-wider">Variance Node</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                Stripping Ratio Delta (+14.2%)
              </h4>
              <p className="text-xs text-orange-600 mt-1 font-semibold">Conflict Flag Active</p>
            </button>

            {/* Node 2 */}
            <button
              onClick={() => setSelectedNode({
                type: "Document B",
                title: selectedProjects[1] || "Nigahi Project Report",
                parameter: "Overburden Removed",
                value: "11,000,000 m³",
                source: "Mine_Production_Stats, Page 4",
                page: "Page 4"
              })}
              className="p-4 rounded-md bg-white border border-slate-200 text-left transition-colors hover:border-blue-400 shadow-sm relative z-10"
            >
              <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">Document Node B</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                {selectedProjects[1] || "Nigahi Project"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">Source: CMPDI Archives</p>
            </button>
          </div>

          {selectedNode && (
            <div className="p-4 mt-2 rounded-md bg-slate-50 border border-slate-200 text-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider">{selectedNode.type} Details</span>
                <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-slate-700 text-xs font-semibold">Close ✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Document</span>
                  <span className="font-semibold">{selectedNode.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Parameter</span>
                  <span className="font-semibold text-blue-700">{selectedNode.parameter}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Value</span>
                  <span className="font-semibold">{selectedNode.value}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Source</span>
                  <span className="font-semibold text-slate-600">{selectedNode.source}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 space-x-6 px-2">
          {[
            { id: "compare", label: "Document Comparison", icon: GitCompare },
            { id: "analytics", label: "Multi-Doc Analytics", icon: BarChart3 },
            { id: "filter", label: "Threshold Intelligence", icon: Sliders },
            { id: "safety", label: "Safety & Risk Matrix", icon: ShieldAlert },
            { id: "conflicts", label: `Conflicts (${conflictsData?.total_conflicts || 0})`, icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "filter" && !filterResults) handleApplyFilter();
                }}
                className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content: Compare */}
        {activeTab === "compare" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-blue-600" />
                Select Projects for Comparison
              </h2>
              <div className="flex flex-wrap gap-2">
                {availableProjects.map((p) => {
                  const isSelected = selectedProjects.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => toggleProjectSelection(p.name)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {p.name} ({p.subsidiary})
                    </button>
                  );
                })}
              </div>
            </div>

            {comparisonData && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Pairwise Metric Variance & Delta Analysis
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    Comparing: {comparisonData.compared_projects?.join(" vs ")}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="p-4">Operational Metric</th>
                        <th className="p-4 text-right">{comparisonData.project_a?.Project || "Project A"}</th>
                        <th className="p-4 text-right">{comparisonData.project_b?.Project || "Project B"}</th>
                        <th className="p-4 text-right">Absolute Variance</th>
                        <th className="p-4 text-right">Percentage Delta</th>
                        <th className="p-4">Baseline Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonData.metric_comparisons?.map((m: any, idx: number) => {
                        const delta = m.delta;
                        const isHigher = delta.direction === "higher";
                        const isLower = delta.direction === "lower";
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800">{m.metric_label}</td>
                            <td className="p-4 text-right text-slate-600">
                              {m.val_a !== null ? m.val_a.toLocaleString() : "N/A"} {m.unit !== "ratio" ? m.unit : ""}
                            </td>
                            <td className="p-4 text-right text-slate-600">
                              {m.val_b !== null ? m.val_b.toLocaleString() : "N/A"} {m.unit !== "ratio" ? m.unit : ""}
                            </td>
                            <td className="p-4 text-right font-semibold text-slate-800">
                              {delta.abs_diff !== null ? (delta.abs_diff > 0 ? `+${delta.abs_diff.toLocaleString()}` : delta.abs_diff.toLocaleString()) : "N/A"}
                            </td>
                            <td className="p-4 text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                                  isHigher
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isLower
                                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {isHigher && <TrendingUp className="h-3 w-3" />}
                                {isLower && <TrendingDown className="h-3 w-3" />}
                                {delta.pct_diff_formatted}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500">{delta.baseline}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Conflicts */}
        {activeTab === "conflicts" && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Cross-Document Conflicts & Discrepancies
              </h3>
              <span className="px-3 py-1 bg-rose-50 text-rose-700 font-semibold text-xs rounded border border-rose-200">
                {conflictsData?.total_conflicts || 0} Conflicts Found
              </span>
            </div>

            {conflictsData?.conflicts?.length > 0 ? (
              <div className="space-y-4">
                {conflictsData.conflicts.map((c: any, idx: number) => (
                  <div key={idx} className="p-4 border border-rose-200 bg-rose-50 rounded-md space-y-2 text-sm">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{c.entity_identifier} ({c.field_name})</span>
                      <span className="text-rose-600">Conflict #{c.id}</span>
                    </div>
                    <p className="text-slate-700">{c.message}</p>
                    <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                      <div className="bg-white p-3 rounded border border-slate-200">
                        <span className="text-slate-500 font-semibold block mb-1">Doc #{c.doc_a_id} ({c.source_ref_a}):</span>
                        <span className="font-bold text-slate-900 text-sm">{c.val_a}</span>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200">
                        <span className="text-slate-500 font-semibold block mb-1">Doc #{c.doc_b_id} ({c.source_ref_b}):</span>
                        <span className="font-bold text-slate-900 text-sm">{c.val_b}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-md border border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-800 text-sm">Zero Cross-Document Conflicts Detected</h4>
                <p className="text-sm text-slate-500 mt-1">
                  All extracted mine records and metrics are consistent across uploaded authorized documents.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
