"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useInView } from "framer-motion";
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
  Image,
  MessageCircle,
  Phone,
  Scale,
  Flame,
  HardHat,
  Cpu,
  Trophy,
  HeartHandshake,
  Layers,
  UsersRound,
  ClipboardList,
  PlaySquare,
  X,
  ChevronUp,
} from "lucide-react";
import registryData from "@/data/registry.json";

// Each category gets an icon + a rich colorful background gradient
const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; iconColor: string; badge: string }> = {
  "About Us":               { icon: Building2,     bg: "from-blue-500 to-blue-700",        iconColor: "text-white", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  "Major Statistics":       { icon: BarChart3,     bg: "from-violet-500 to-purple-700",    iconColor: "text-white", badge: "bg-violet-100 text-violet-700 border-violet-200" },
  "Organisations":          { icon: Landmark,      bg: "from-cyan-500 to-teal-700",        iconColor: "text-white", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  "Sustainability":         { icon: Leaf,          bg: "from-emerald-500 to-green-700",    iconColor: "text-white", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "Nominated Authority":    { icon: Gavel,         bg: "from-amber-500 to-orange-600",     iconColor: "text-white", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  "Public Information":     { icon: Users,         bg: "from-sky-500 to-blue-600",         iconColor: "text-white", badge: "bg-sky-100 text-sky-700 border-sky-200" },
  "Minutes of Meetings":    { icon: BookOpen,      bg: "from-indigo-500 to-indigo-700",    iconColor: "text-white", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  "Reports":                { icon: FileSearch,    bg: "from-purple-500 to-fuchsia-700",   iconColor: "text-white", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  "RTI":                    { icon: ShieldCheck,   bg: "from-rose-500 to-red-700",         iconColor: "text-white", badge: "bg-rose-100 text-rose-700 border-rose-200" },
  "Tenders":                { icon: ClipboardList, bg: "from-orange-500 to-amber-600",     iconColor: "text-white", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  "Media":                  { icon: PlaySquare,    bg: "from-pink-500 to-rose-600",        iconColor: "text-white", badge: "bg-pink-100 text-pink-700 border-pink-200" },
  "Parliament Q&A":         { icon: Landmark,      bg: "from-teal-500 to-cyan-700",        iconColor: "text-white", badge: "bg-teal-100 text-teal-700 border-teal-200" },
  "Contact Us":             { icon: Phone,         bg: "from-slate-500 to-slate-700",      iconColor: "text-white", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  "Acts & Policies":        { icon: Scale,         bg: "from-red-500 to-red-700",          iconColor: "text-white", badge: "bg-red-100 text-red-700 border-red-200" },
  "Coal Gasification":      { icon: Flame,         bg: "from-orange-400 to-red-600",       iconColor: "text-white", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  "Safety in Coal Mines":   { icon: HardHat,       bg: "from-yellow-400 to-orange-500",    iconColor: "text-white", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "Technology Roadmap":     { icon: Cpu,           bg: "from-cyan-400 to-blue-600",        iconColor: "text-white", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  "Achievements Flipbook":  { icon: Trophy,        bg: "from-yellow-500 to-amber-600",     iconColor: "text-white", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "CSR":                    { icon: HeartHandshake,bg: "from-green-500 to-emerald-700",    iconColor: "text-white", badge: "bg-green-100 text-green-700 border-green-200" },
  "Central Sector Schemes": { icon: Layers,        bg: "from-blue-600 to-indigo-700",      iconColor: "text-white", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  "Chintan Shivir":         { icon: UsersRound,    bg: "from-violet-600 to-purple-700",    iconColor: "text-white", badge: "bg-violet-100 text-violet-700 border-violet-200" },
  "Procurement Projection": { icon: BarChart3,     bg: "from-indigo-500 to-blue-700",      iconColor: "text-white", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
};

function getConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? {
    icon: FileText,
    bg: "from-slate-400 to-slate-600",
    iconColor: "text-white",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  };
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

  // 3D scroll-triggered heading animation
  const heroRef = useRef(null);
  const isInView = useInView(heroRef, { once: true, margin: "-80px" });

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <main className="pt-[76px] pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Hero Header ── */}
          <div className="text-center mb-10" ref={heroRef} style={{ perspective: "1000px" }}>
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Government of India · Ministry of Coal
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-4"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", transformOrigin: "bottom center" }}
              initial={{ opacity: 0, y: 100, rotateX: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : {}}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.1,
              }}
            >
              <span className="text-slate-900">Official </span>
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 50%, #db2777 100%)" }}
              >
                Government
              </span>
              <br />
              <span className="text-slate-900">Resources</span>
            </motion.h1>

            <motion.p
              className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 }}
            >
              Verified directory of official Ministry of Coal resources. All links navigate
              directly to{" "}
              <span className="text-blue-600 font-semibold">coal.gov.in</span> and other
              authorised government portals.
            </motion.p>

            {/* Stats row */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-6 mt-7"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-semibold text-slate-700">{totalCount} Official Resources</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                <span className="text-sm font-semibold text-slate-700">{Object.keys(CATEGORY_CONFIG).length} Categories</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-semibold text-slate-700">Source: coal.gov.in</span>
              </div>
            </motion.div>
          </div>

          {/* ── Search + Expand All ── */}
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-3 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.65 }}
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder='Search resources… e.g. "RTI", "production", "Lok Sabha"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-10 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition text-sm"
              />
              {isSearching && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={toggleAll}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-violet-700 transition shadow-md shrink-0"
            >
              {allExpanded ? (
                <><ChevronUp className="h-4 w-4" /> Collapse All</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Expand All</>
              )}
            </button>
          </motion.div>

          {isSearching && (
            <p className="text-xs text-slate-500 mb-4">
              Showing <span className="font-semibold text-slate-700">{resources.length}</span> result
              {resources.length !== 1 ? "s" : ""} across{" "}
              <span className="font-semibold text-slate-700">{Object.keys(categories).length}</span> categories
            </p>
          )}

          {/* ── Category List (3-in-a-row Horizontal Grid with generous gaps) ── */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
            initial="hidden"
            animate="visible"
          >
            {Object.keys(categories).length === 0 ? (
              <div className="col-span-full text-center py-16 border border-slate-100 rounded-2xl bg-slate-50">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-500">No resources found</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Try "RTI", "coal statistics", "parliament", "tenders"…
                </p>
              </div>
            ) : (
              Object.entries(categories).map(([category, items], index) => {
                const isExpanded = expandedCategories[category] ?? isSearching;
                const cfg = getConfig(category);
                const Icon = cfg.icon;
                // Wave: alternate entrance direction
                const fromLeft = index % 3 === 0;

                return (
                  <motion.div
                    key={category}
                    variants={{
                      hidden: { opacity: 0, x: fromLeft ? -50 : 50, y: 20 },
                      visible: {
                        opacity: 1, x: 0, y: 0,
                        transition: {
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }}
                    className="self-start border border-slate-100/90 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 overflow-hidden flex flex-col"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50/70 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Colorful gradient icon square */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.bg} shadow-md shrink-0 transition-transform group-hover:scale-105`}>
                          <Icon className={`h-6 w-6 ${cfg.iconColor}`} />
                        </div>

                        <div className="min-w-0">
                          <h2 className="text-[16px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                            {category}
                          </h2>
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.badge} mt-1 inline-block`}>
                            {items.length} {items.length === 1 ? "resource" : "resources"}
                          </span>
                        </div>
                      </div>

                      <div className={`shrink-0 ml-2 p-1 rounded-full hover:bg-slate-100 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>

                    {/* Expanded Resources List */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 flex flex-col gap-2.5 border-t border-slate-100 bg-slate-50/60 max-h-[380px] overflow-y-auto">
                        {items.map((item, idx) => (
                          <a
                            key={idx}
                            href={item.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col justify-between p-3.5 rounded-xl bg-white border border-slate-100 hover:border-blue-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-[13px] leading-snug text-slate-700 group-hover:text-blue-700 transition-colors">
                                {item.title}
                              </h3>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-50">
                              <ShieldCheck className="h-3 w-3 text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                Official Source
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>

          {/* ── Footer ── */}
          <div className="mt-10 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-center">
            <p className="text-xs text-slate-400">
              All resources link directly to the{" "}
              <a href="https://coal.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
                official Ministry of Coal website
              </a>
              . Khani Gyan AI does not host or replicate government content. Navigation structure sourced from{" "}
              <a href="https://coal.gov.in/sitemap" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <ShieldCheck className="h-10 w-10 text-blue-500 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Loading Government Resources…</p>
        </div>
      </div>
    }>
      <GovernmentResourcesContent />
    </Suspense>
  );
}
