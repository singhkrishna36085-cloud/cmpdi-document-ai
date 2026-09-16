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
  FileText,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  Building2,
  ArrowRight,
  Filter
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function CrossDocumentPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"compare" | "analytics" | "filter" | "safety" | "conflicts">("compare");
  
  // Data States
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

  // Filter Form Controls
  const [filterProdMin, setFilterProdMin] = useState<string>("");
  const [filterSeamMin, setFilterSeamMin] = useState<string>("");
  const [filterSrMin, setFilterSrMin] = useState<string>("");
  const [filterSub, setFilterSub] = useState<string>("");
  const [filterSafety, setFilterSafety] = useState<string>("all");
  const [filterRiskKw, setFilterRiskKw] = useState<string>("");

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    setToken(savedToken);
  }, []);

  const getHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const savedToken = token || localStorage.getItem("access_token");
    if (savedToken) {
      headers["Authorization"] = `Bearer ${savedToken}`;
    }
    return headers;
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchMetricsMetadata();
    fetchAnalytics();
    fetchConflicts();
  }, []);

  // Fetch Metadata
  const fetchMetricsMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cross-document/metrics`, { headers: getHeaders() });
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

  // Fetch Multi-Doc Analytics
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/cross-document/analyze`, {
        method: "POST",
        headers: getHeaders()
      });
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

  // Fetch Pairwise / Multi-Project Comparison
  const fetchComparison = async (projList?: string[]) => {
    try {
      setCompareLoading(true);
      const payload = { projects: projList || selectedProjects };
      const res = await fetch(`${API_BASE}/api/cross-document/compare`, {
        method: "POST",
        headers: getHeaders(),
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

  // Fetch Filter Results
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

      const res = await fetch(`${API_BASE}/api/cross-document/filter`, {
        method: "POST",
        headers: getHeaders(),
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

  // Fetch Conflicts
  const fetchConflicts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cross-document/conflicts`, { headers: getHeaders() });
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
      <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
              <GitCompare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Cross-Document Intelligence Center
              </h1>
              <p className="text-sm text-slate-500">
                Compare mine projects, analyze metric variances, filter operational thresholds, and audit cross-document evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchMetricsMetadata();
                fetchAnalytics();
                fetchComparison();
                fetchConflicts();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Intelligence
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-4 bg-white px-6 pt-3 rounded-t-xl border border-b-0 border-slate-200">
          {[
            { id: "compare", label: "Document Comparison", icon: GitCompare },
            { id: "analytics", label: "Multi-Doc Analytics", icon: BarChart3 },
            { id: "filter", label: "Threshold Intelligence", icon: Sliders },
            { id: "safety", label: "Safety & Risk Matrix", icon: ShieldAlert },
            { id: "conflicts", label: `Cross-Doc Conflicts (${conflictsData?.total_conflicts || 0})`, icon: AlertTriangle }
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
                className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
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

        {/* Tab 1: Document Comparison */}
        {activeTab === "compare" && (
          <div className="space-y-6">
            {/* Project Selection Selector */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Select Mine Projects to Compare Side-by-Side
              </h2>
              <div className="flex flex-wrap gap-2">
                {availableProjects.map((p) => {
                  const isSelected = selectedProjects.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => toggleProjectSelection(p.name)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {p.name} ({p.subsidiary})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metric Comparisons Side-by-Side Table */}
            {comparisonData && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Pairwise Metric Variance & Delta Analysis
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Comparing: {comparisonData.compared_projects?.join(" vs ")}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                        <th className="p-4">Operational Metric</th>
                        <th className="p-4 text-right">{comparisonData.project_a?.Project || "Project A"}</th>
                        <th className="p-4 text-right">{comparisonData.project_b?.Project || "Project B"}</th>
                        <th className="p-4 text-right">Absolute Variance</th>
                        <th className="p-4 text-right">Percentage Delta</th>
                        <th className="p-4">Baseline Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {comparisonData.metric_comparisons?.map((m: any, idx: number) => {
                        const delta = m.delta;
                        const isHigher = delta.direction === "higher";
                        const isLower = delta.direction === "lower";
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-semibold text-slate-900">{m.metric_label}</td>
                            <td className="p-4 text-right font-mono font-medium text-slate-800">
                              {m.val_a !== null ? m.val_a.toLocaleString() : "N/A"} {m.unit !== "ratio" ? m.unit : ""}
                            </td>
                            <td className="p-4 text-right font-mono font-medium text-slate-800">
                              {m.val_b !== null ? m.val_b.toLocaleString() : "N/A"} {m.unit !== "ratio" ? m.unit : ""}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-900">
                              {delta.abs_diff !== null ? (delta.abs_diff > 0 ? `+${delta.abs_diff.toLocaleString()}` : delta.abs_diff.toLocaleString()) : "N/A"}
                            </td>
                            <td className="p-4 text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  isHigher
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isLower
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
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

            {/* Side-by-Side Factual Cards */}
            {comparisonData?.all_selected_records && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {comparisonData.all_selected_records.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{rec.Subsidiary}</span>
                        <h4 className="text-lg font-bold text-slate-900">{rec.Project}</h4>
                        <p className="text-xs text-slate-500">{rec.Mine_Name}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {rec.source_reference}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">Safety Incidents:</span>
                        <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800 mt-1">
                          {rec.Safety_Incidents || "No safety incidents reported."}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold text-slate-700">Risk Flags:</span>
                        <p className="p-2.5 bg-amber-50/60 rounded border border-amber-200/60 text-amber-900 mt-1">
                          {rec.Risk_Flags || "No risk flags reported."}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold text-slate-700">Geological Notes:</span>
                        <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800 mt-1">
                          {rec.Geological_Notes || "No geological notes available."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Multi-Doc Analytics */}
        {activeTab === "analytics" && analyticsData && (
          <div className="space-y-6">
            {/* Overview Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Raw Coal Production</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analyticsData.total_raw_coal_tonnes?.toLocaleString()} <span className="text-sm font-normal text-slate-500">t</span>
                </p>
                <span className="text-xs text-emerald-600 font-medium">Across {analyticsData.total_records} Mine Projects</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Overburden Removed</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analyticsData.total_overburden_m3?.toLocaleString()} <span className="text-sm font-normal text-slate-500">m³</span>
                </p>
                <span className="text-xs text-blue-600 font-medium">Aggregate SR: {analyticsData.aggregate_stripping_ratio}</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Average Stated Stripping Ratio</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.avg_stated_stripping_ratio}</p>
                <span className="text-xs text-slate-500">Mean of stated mine ratios</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Average Seam Thickness</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.avg_seam_thickness_m} <span className="text-sm font-normal text-slate-500">m</span></p>
                <span className="text-xs text-slate-500">Average across seams</span>
              </div>
            </div>

            {/* Extrema Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analyticsData.highest_production && (
                <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Highest Production</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{analyticsData.highest_production.project}</p>
                  <p className="text-sm font-mono font-bold text-emerald-800">{analyticsData.highest_production.value?.toLocaleString()} t</p>
                  <span className="text-xs text-slate-500">{analyticsData.highest_production.subsidiary}</span>
                </div>
              )}

              {analyticsData.lowest_production && (
                <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl">
                  <span className="text-xs font-bold text-amber-700 uppercase">Lowest Production</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{analyticsData.lowest_production.project}</p>
                  <p className="text-sm font-mono font-bold text-amber-800">{analyticsData.lowest_production.value?.toLocaleString()} t</p>
                  <span className="text-xs text-slate-500">{analyticsData.lowest_production.subsidiary}</span>
                </div>
              )}

              {analyticsData.highest_seam_thickness && (
                <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl">
                  <span className="text-xs font-bold text-blue-700 uppercase">Highest Seam Thickness</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{analyticsData.highest_seam_thickness.project}</p>
                  <p className="text-sm font-mono font-bold text-blue-800">{analyticsData.highest_seam_thickness.value} m</p>
                  <span className="text-xs text-slate-500">{analyticsData.highest_seam_thickness.subsidiary}</span>
                </div>
              )}

              {analyticsData.highest_stated_sr && (
                <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-xl">
                  <span className="text-xs font-bold text-purple-700 uppercase">Highest Stripping Ratio</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{analyticsData.highest_stated_sr.project}</p>
                  <p className="text-sm font-mono font-bold text-purple-800">{analyticsData.highest_stated_sr.value}</p>
                  <span className="text-xs text-slate-500">{analyticsData.highest_stated_sr.subsidiary}</span>
                </div>
              )}
            </div>

            {/* Subsidiary Distribution Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Subsidiary Production & Overburden Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 border-b">
                      <th className="p-3">Subsidiary</th>
                      <th className="p-3 text-center">Projects Count</th>
                      <th className="p-3 text-right">Raw Coal Production (t)</th>
                      <th className="p-3 text-right">Overburden Removed (m³)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(analyticsData.subsidiary_distribution || {}).map(([sub, data]: [string, any]) => (
                      <tr key={sub} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{sub}</td>
                        <td className="p-3 text-center font-medium">{data.count}</td>
                        <td className="p-3 text-right font-mono font-medium">{data.total_raw_coal?.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-medium">{data.total_overburden?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Threshold Intelligence */}
        {activeTab === "filter" && (
          <div className="space-y-6">
            {/* Filter Control Bar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600" />
                  Structured Operational Threshold Filters
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Demo Presets:</span>
                  <button
                    onClick={() => {
                      setFilterProdMin("2000000");
                      setFilterSeamMin("");
                      setFilterSrMin("");
                      setFilterSub("");
                      setFilterSafety("all");
                      setFilterRiskKw("");
                    }}
                    className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-semibold transition-colors"
                  >
                    High Output (&gt;2M t)
                  </button>
                  <button
                    onClick={() => {
                      setFilterProdMin("");
                      setFilterSeamMin("8");
                      setFilterSrMin("");
                      setFilterSub("");
                      setFilterSafety("all");
                      setFilterRiskKw("");
                    }}
                    className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-semibold transition-colors"
                  >
                    Thick Seam (&gt;8m)
                  </button>
                  <button
                    onClick={() => {
                      setFilterProdMin("");
                      setFilterSeamMin("");
                      setFilterSrMin("2.70");
                      setFilterSub("");
                      setFilterSafety("all");
                      setFilterRiskKw("");
                    }}
                    className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md font-semibold transition-colors"
                  >
                    High SR (&gt;2.70)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Raw Coal Production (Tonnes)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2000000"
                    value={filterProdMin}
                    onChange={e => setFilterProdMin(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Seam Thickness (Metres)</label>
                  <input
                    type="number"
                    placeholder="e.g. 8"
                    value={filterSeamMin}
                    onChange={e => setFilterSeamMin(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Stripping Ratio</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 2.70"
                    value={filterSrMin}
                    onChange={e => setFilterSrMin(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subsidiary</label>
                  <select
                    value={filterSub}
                    onChange={e => setFilterSub(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                  >
                    <option value="">All Subsidiaries</option>
                    {subsidiaries.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Safety Incidents Flag</label>
                  <select
                    value={filterSafety}
                    onChange={e => setFilterSafety(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                  >
                    <option value="all">All Records</option>
                    <option value="yes">Contains Reported Safety Incident/Near-Miss</option>
                    <option value="no">Zero Reported Safety Incidents</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Risk Keyword Search</label>
                  <input
                    type="text"
                    placeholder="e.g. Ash trend, blasting, water"
                    value={filterRiskKw}
                    onChange={e => setFilterRiskKw(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setFilterProdMin("");
                    setFilterSeamMin("");
                    setFilterSrMin("");
                    setFilterSub("");
                    setFilterSafety("all");
                    setFilterRiskKw("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Clear Filters
                </button>

                <button
                  onClick={handleApplyFilter}
                  disabled={filterLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                >
                  {filterLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Apply Operational Filter
                </button>
              </div>
            </div>

            {/* Filter Results Display */}
            {filterResults && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="text-base font-bold text-slate-900">
                    Filtered Operational Results ({filterResults.total_matched} of {filterResults.total_unfiltered} Projects Matched)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterResults.records?.map((r: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-xl bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-blue-600 uppercase">{r.Subsidiary}</span>
                          <h5 className="font-bold text-slate-900 text-sm">{r.Project}</h5>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">
                          {r.source_reference}
                        </span>
                      </div>
                      <div className="space-y-1 font-mono">
                        <p><span className="font-semibold text-slate-700">Raw Coal:</span> {r.Raw_Coal_Produced_Tonnes?.toLocaleString()} t</p>
                        <p><span className="font-semibold text-slate-700">Overburden:</span> {r.Overburden_Removed_M3?.toLocaleString()} m³</p>
                        <p><span className="font-semibold text-slate-700">Stated SR:</span> {r.Stripping_Ratio}</p>
                        <p><span className="font-semibold text-slate-700">Seam Thickness:</span> {r.Average_Seam_Thickness_M} m</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Safety & Risk Matrix */}
        {activeTab === "safety" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Source-Grounded Safety, Risk & Geological Factual Matrix
            </h3>

            <div className="space-y-4">
              {availableProjects.map((p, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">{p.subsidiary}</span>
                      <h4 className="font-bold text-slate-900">{p.name}</h4>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{p.source_reference}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1 text-[11px] uppercase">Safety Incidents</span>
                      <p className="text-slate-800">{p.safety_incidents || "No safety incidents reported."}</p>
                    </div>

                    <div className="bg-amber-50/60 p-3 rounded border border-amber-200/60">
                      <span className="font-bold text-amber-900 block mb-1 text-[11px] uppercase">Risk Flags</span>
                      <p className="text-amber-900">{p.risk_flags || "No risk flags reported."}</p>
                    </div>

                    <div className="bg-white p-3 rounded border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1 text-[11px] uppercase">Geological Notes</span>
                      <p className="text-slate-800">{p.geological_notes || "No geological notes available."}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Cross-Doc Conflicts */}
        {activeTab === "conflicts" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Cross-Document Conflicts & Metric Discrepancies
              </h3>
              <span className="px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded-full border border-red-200">
                {conflictsData?.total_conflicts || 0} Conflicts Found
              </span>
            </div>

            {conflictsData?.conflicts?.length > 0 ? (
              <div className="space-y-4">
                {conflictsData.conflicts.map((c: any, idx: number) => (
                  <div key={idx} className="p-4 border border-red-200 bg-red-50/30 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{c.entity_identifier} ({c.field_name})</span>
                      <span className="text-red-600">Conflict #{c.id}</span>
                    </div>
                    <p className="text-slate-700">{c.message}</p>
                    <div className="grid grid-cols-2 gap-4 font-mono pt-1 text-[11px]">
                      <div className="bg-white p-2 rounded border">
                        <span className="text-slate-500 font-sans block">Doc #{c.doc_a_id} ({c.source_ref_a}):</span>
                        <span className="font-bold text-slate-900">{c.val_a}</span>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-slate-500 font-sans block">Doc #{c.doc_b_id} ({c.source_ref_b}):</span>
                        <span className="font-bold text-slate-900">{c.val_b}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Zero Cross-Document Conflicts Detected</h4>
                <p className="text-xs text-slate-500 mt-1">
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
