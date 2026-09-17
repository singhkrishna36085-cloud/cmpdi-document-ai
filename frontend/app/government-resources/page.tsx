"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Building2,
  BarChart3,
  Landmark,
  Leaf,
  Gavel,
  Users,
  BookOpen,
  FileSearch,
  Tag,
  Image,
  MessageCircle,
  Phone,
  Scale,
  Flame,
  HardHat,
  Cpu,
  Star,
  HeartHandshake,
  Grid3X3,
  X,
} from "lucide-react";
import registryData from "@/data/registry.json";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "About Us": Building2,
  "Major Statistics": BarChart3,
  "Organisations": Landmark,
  "Sustainability": Leaf,
  "Nominated Authority": Gavel,
  "Public Information": Users,
  "Minutes of Meetings": BookOpen,
  "Reports": FileSearch,
  "RTI": Tag,
  "Tenders": FileText,
  "Media": Image,
  "Parliament Q&A": MessageCircle,
  "Contact Us": Phone,
  "Acts & Policies": Scale,
  "Coal Gasification": Flame,
  "Safety in Coal Mines": HardHat,
  "Technology Roadmap": Cpu,
  "Achievements Flipbook": Star,
  "CSR": HeartHandshake,
  "Central Sector Schemes": Grid3X3,
  "Chintan Shivir": BookOpen,
  "Procurement Projection": BarChart3,
};

const CATEGORY_COLORS: Record<string, string> = {
  "About Us": "blue",
  "Major Statistics": "violet",
  "Organisations": "cyan",
  "Sustainability": "emerald",
  "Nominated Authority": "amber",
  "Public Information": "sky",
  "Minutes of Meetings": "indigo",
  "Reports": "purple",
  "RTI": "rose",
  "Tenders": "orange",
  "Media": "pink",
  "Parliament Q&A": "teal",
  "Contact Us": "slate",
  "Acts & Policies": "red",
  "Coal Gasification": "orange",
  "Safety in Coal Mines": "red",
  "Technology Roadmap": "cyan",
  "Achievements Flipbook": "yellow",
  "CSR": "green",
  "Central Sector Schemes": "blue",
  "Chintan Shivir": "violet",
  "Procurement Projection": "indigo",
};

function getColorClasses(color: string) {
  const map: Record<string, { icon: string; badge: string; border: string; hover: string }> = {
    blue:    { icon: "text-blue-400",    badge: "bg-blue-900/30 text-blue-400 border-blue-500/30",    border: "border-blue-500/50",    hover: "group-hover:text-blue-300" },
    violet:  { icon: "text-violet-400",  badge: "bg-violet-900/30 text-violet-400 border-violet-500/30",  border: "border-violet-500/50",  hover: "group-hover:text-violet-300" },
    cyan:    { icon: "text-cyan-400",    badge: "bg-cyan-900/30 text-cyan-400 border-cyan-500/30",    border: "border-cyan-500/50",    hover: "group-hover:text-cyan-300" },
    emerald: { icon: "text-emerald-400", badge: "bg-emerald-900/30 text-emerald-400 border-emerald-500/30", border: "border-emerald-500/50", hover: "group-hover:text-emerald-300" },
    amber:   { icon: "text-amber-400",   badge: "bg-amber-900/30 text-amber-400 border-amber-500/30",   border: "border-amber-500/50",   hover: "group-hover:text-amber-300" },
    sky:     { icon: "text-sky-400",     badge: "bg-sky-900/30 text-sky-400 border-sky-500/30",     border: "border-sky-500/50",     hover: "group-hover:text-sky-300" },
    indigo:  { icon: "text-indigo-400",  badge: "bg-indigo-900/30 text-indigo-400 border-indigo-500/30",  border: "border-indigo-500/50",  hover: "group-hover:text-indigo-300" },
    purple:  { icon: "text-purple-400",  badge: "bg-purple-900/30 text-purple-400 border-purple-500/30",  border: "border-purple-500/50",  hover: "group-hover:text-purple-300" },
    rose:    { icon: "text-rose-400",    badge: "bg-rose-900/30 text-rose-400 border-rose-500/30",    border: "border-rose-500/50",    hover: "group-hover:text-rose-300" },
    orange:  { icon: "text-orange-400",  badge: "bg-orange-900/30 text-orange-400 border-orange-500/30",  border: "border-orange-500/50",  hover: "group-hover:text-orange-300" },
    pink:    { icon: "text-pink-400",    badge: "bg-pink-900/30 text-pink-400 border-pink-500/30",    border: "border-pink-500/50",    hover: "group-hover:text-pink-300" },
    teal:    { icon: "text-teal-400",    badge: "bg-teal-900/30 text-teal-400 border-teal-500/30",    border: "border-teal-500/50",    hover: "group-hover:text-teal-300" },
    slate:   { icon: "text-slate-400",   badge: "bg-slate-800 text-slate-400 border-slate-600",   border: "border-slate-500/50",   hover: "group-hover:text-slate-300" },
    red:     { icon: "text-red-400",     badge: "bg-red-900/30 text-red-400 border-red-500/30",     border: "border-red-500/50",     hover: "group-hover:text-red-300" },
    yellow:  { icon: "text-yellow-400",  badge: "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",  border: "border-yellow-500/50",  hover: "group-hover:text-yellow-300" },
    green:   { icon: "text-green-400",   badge: "bg-green-900/30 text-green-400 border-green-500/30",   border: "border-green-500/50",   hover: "group-hover:text-green-300" },
  };
  return map[color] ?? map["slate"];
}

function GovernmentResourcesContent() {
  const searchParams = useSearchParams();
  const defaultCategory = searchParams.get("category");

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    if (defaultCategory) {
      setExpandedCategories((prev) => ({ ...prev, [defaultCategory]: true }));
    }
  }, [defaultCategory]);

  const { resources, categories, totalCount } = useMemo(() => {
    const validResources = registryData.filter((r) => r.verified && r.title !== "Home");
    const filtered = validResources.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.parent.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const cats: Record<string, typeof registryData> = {};
    filtered.forEach((r) => {
      if (!cats[r.category]) cats[r.category] = [];
      cats[r.category].push(r);
    });

    return { resources: filtered, categories: cats, totalCount: validResources.length };
  }, [searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleAll = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    const newState: Record<string, boolean> = {};
    Object.keys(categories).forEach((cat) => (newState[cat] = next));
    setExpandedCategories(newState);
  };

  const isSearching = searchQuery.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#0f172a] text-slate-200">
      <main className="flex-1 overflow-auto pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <div className="mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">
                  <ShieldCheck className="h-4 w-4" />
                  Government of India · Ministry of Coal
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Official Government Resources
                </h1>
                <p className="text-slate-400 max-w-2xl">
                  Verified directory of official Ministry of Coal resources. All links navigate
                  directly to <span className="text-blue-400 font-medium">coal.gov.in</span> and
                  other authorised government portals. No content is replicated.
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats Banner ── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Official Resources", value: totalCount, color: "text-blue-400" },
              { label: "Categories", value: Object.keys(CATEGORY_ICONS).length, color: "text-violet-400" },
              { label: "Source Domain", value: "coal.gov.in", color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-center"
              >
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Search Bar ── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 mb-4">
            <div className="relative flex items-center gap-3">
              <Search className="absolute left-3 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder='Search resources… e.g. "RTI", "production", "PIO", "Lok Sabha"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm"
              />
              {isSearching && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {isSearching && (
              <div className="mt-2 px-1 text-xs text-slate-400">
                Showing <span className="text-white font-semibold">{resources.length}</span> result
                {resources.length !== 1 ? "s" : ""} across{" "}
                <span className="text-white font-semibold">{Object.keys(categories).length}</span> categories
              </div>
            )}
          </div>

          {/* ── Controls ── */}
          {!isSearching && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-500">
                {Object.keys(categories).length} categories · click to expand
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
              >
                {allExpanded ? (
                  <><ChevronDown className="h-3.5 w-3.5" /> Collapse All</>
                ) : (
                  <><ChevronRight className="h-3.5 w-3.5" /> Expand All</>
                )}
              </button>
            </div>
          )}

          {/* ── Category Sections ── */}
          <div className="space-y-3">
            {Object.keys(categories).length === 0 ? (
              <div className="text-center py-16 bg-slate-800/20 border border-slate-700/50 rounded-xl">
                <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">No resources found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Try searching for "RTI", "coal statistics", "parliament", "tenders"…
                </p>
              </div>
            ) : (
              Object.entries(categories).map(([category, items]) => {
                const isExpanded = expandedCategories[category] ?? isSearching;
                const Icon = CATEGORY_ICONS[category] ?? FileText;
                const colorKey = CATEGORY_COLORS[category] ?? "slate";
                const colors = getColorClasses(colorKey);

                return (
                  <div
                    key={category}
                    className="border border-slate-700/80 rounded-xl bg-slate-800/20 overflow-hidden"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/40 hover:bg-slate-700/40 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg bg-slate-900/60 ${colors.icon}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <h2 className="text-[15px] font-semibold text-white">{category}</h2>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}
                        >
                          {items.length} {items.length === 1 ? "resource" : "resources"}
                        </span>
                      </div>
                      <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>

                    {/* Resources Grid */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-900/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map((item, idx) => (
                          <a
                            key={idx}
                            href={item.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex flex-col justify-between p-4 rounded-lg bg-slate-800 border border-slate-700 hover:${colors.border} transition-all shadow-sm`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <h3 className={`font-medium text-[13px] leading-snug text-slate-200 ${colors.hover} transition-colors`}>
                                {item.title}
                              </h3>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-700/50">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-wider">
                                  Official Source
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                                coal.gov.in
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer Note ── */}
          <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl text-center">
            <p className="text-xs text-slate-500">
              All resources link directly to the{" "}
              <a
                href="https://coal.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                official Ministry of Coal website
              </a>
              . CMPDI Document AI does not host or replicate government content. Navigation
              structure sourced from{" "}
              <a
                href="https://coal.gov.in/sitemap"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                coal.gov.in/sitemap
              </a>
              .
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function GovernmentResourcesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <div className="text-center">
          <ShieldCheck className="h-10 w-10 text-blue-500 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-400">Loading Government Resources…</p>
        </div>
      </div>
    }>
      <GovernmentResourcesContent />
    </Suspense>
  );
}
