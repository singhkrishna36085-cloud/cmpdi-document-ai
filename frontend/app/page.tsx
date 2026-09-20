"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { Geological3DKnowledgeCore } from "@/components/3d/Geological3DKnowledgeCore";
import {
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  FileText,
  Layers,
  Search,
  CheckCircle2,
  GitCompare,
  Sparkles,
  Database,
  ExternalLink,
  Paperclip,
  Mic,
  Send,
  Sliders,
  TrendingUp,
  Cpu,
  BookOpen,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

// ── GOOGLE GEMINI 4-COLOR SPARKLE SVG ──
function GeminiSparkle({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 65 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32.4473 0C33.1278 0 33.7197 0.464783 33.8857 1.125C34.3947 3.14441 35.0586 5.11414 35.8848 7.03027C38.0369 12.0299 40.99 16.406 44.7393 20.1553C48.4903 23.9045 52.8647 26.8576 57.8643 29.0098C59.7821 29.8359 61.7502 30.4998 63.7695 31.0088C64.4297 31.1748 64.8944 31.7668 64.8945 32.4473C64.8945 33.1278 64.4298 33.7198 63.7695 33.8857C61.7502 34.3947 59.7803 35.0586 57.8643 35.8848C52.8646 38.037 48.4885 40.99 44.7393 44.7393C40.99 48.4904 38.037 52.8646 35.8848 57.8643C35.0586 59.7822 34.3947 61.7502 33.8857 63.7695C33.7198 64.4298 33.1278 64.8945 32.4473 64.8945C31.7668 64.8944 31.1748 64.4297 31.0088 63.7695C30.4998 61.7502 29.8359 59.7803 29.0098 57.8643C26.8576 52.8647 23.9063 48.4885 20.1553 44.7393C16.4041 40.99 12.0299 38.0369 7.03027 35.8848C5.1123 35.0586 3.14441 34.3947 1.125 33.8857C0.464783 33.7197 0 33.1278 0 32.4473C8.67651e-05 31.7668 0.464826 31.1748 1.125 31.0088C3.14442 30.4998 5.11413 29.836 7.03027 29.0098C12.03 26.8575 16.406 23.9046 20.1553 20.1553C23.9046 16.406 26.8575 12.03 29.0098 7.03027C29.836 5.11229 30.4998 3.14442 31.0088 1.125C31.1748 0.464826 31.7668 8.67651e-05 32.4473 0Z"
        fill="url(#gemini-sparkle-gradient-live)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-gradient-live" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1BA0E2" />
          <stop offset="35%" stopColor="#4285F4" />
          <stop offset="70%" stopColor="#9B72CF" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── SAMPLE PROMPTS & REAL RESPONSES FOR INTERACTIVE GEMINI HERO ──
interface SamplePrompt {
  id: string;
  pill: string;
  query: string;
  answerTitle: string;
  answerBullets: string[];
  citation: string;
  page: string;
  accuracy: string;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: "kusmunda",
    pill: "⚡ Kusmunda OC Reserves",
    query: "What was the proven geological coal reserve for Kusmunda OC Expansion, and what stripping ratio was approved in the 2023 mine plan?",
    answerTitle: "Approved Kusmunda Geological & Mining Assessment Report (50 MTPA Horizon):",
    answerBullets: [
      "Total Proven Geological Coal Reserve: 1,482.35 MT across Seams I, II, and III.",
      "Approved Stripping Ratio: 1.42 m³/tonne (composite overburden volume to coal extraction).",
      "Average Seam Thickness: 32.40 m with depth range of 85.0 m to 260.0 m."
    ],
    citation: "Kusmunda_Geol_Report_2023.pdf",
    page: "Page 24, Section 3.2",
    accuracy: "100% Verified Match"
  },
  {
    id: "ukni",
    pill: "📊 Ukni Deep Stripping Ratio",
    query: "Compare Ukni Deep's proposed stripping ratio with DGMS bench slope tolerance guidelines.",
    answerTitle: "Ukni Deep Open Cast Project — Bench Parameters Audit:",
    answerBullets: [
      "Operating Stripping Ratio: 3.85 m³/tonne for the deep horizon expansion.",
      "Overall Pit Slope: 38° approved by CMPDI geomechanical rock classification.",
      "DGMS Compliance Status: Fully aligned with Circular No. 04 (Deep Opencast Safety)."
    ],
    citation: "Ukni_Deep_Expansion_Plan.pdf",
    page: "Page 48, Table 4.1",
    accuracy: "99.8% Match"
  },
  {
    id: "borehole",
    pill: "🔍 Borehole BH-14 Lithology",
    query: "Extract the lithology succession and coal seam thickness for Borehole BH-14.",
    answerTitle: "Borehole Log BH-14 (Gevra Sector IV-A):",
    answerBullets: [
      "Depth 0.0m - 18.2m: Alluvium & Weathered Sandstone.",
      "Depth 18.2m - 142.4m: Alternating Sandstone / Grey Shale sequence.",
      "Depth 142.40m - 150.60m: Clean Seam III (8.20m net thickness, G-11 Grade)."
    ],
    citation: "Gevra_Borehole_Archive_Vol2.pdf",
    page: "Page 112, Log #BH-14",
    accuracy: "100% Extracted"
  },
  {
    id: "dgms",
    pill: "📋 DGMS Safety Checklist",
    query: "What mandatory DGMS compliance checks are required before wet season opencast haul road audits?",
    answerTitle: "DGMS Mandatory Monsoon Opencast Directives:",
    answerBullets: [
      "Haul road gradient maintained strictly at 1 in 16 (maximum 1 in 10 for ramps).",
      "Dump berm height equal to wheel diameter of the largest dumper (240T class).",
      "Piezometric pore pressure monitoring records submitted weekly to Directorate."
    ],
    citation: "DGMS_Tech_Circular_2024.pdf",
    page: "Page 7, Directive #12",
    accuracy: "Statutory Rule Verified"
  }
];

// ── "WHAT KHANIJ GYAN AI CAN DO" CAPABILITY TABS ──
interface CapabilityTab {
  id: string;
  name: string;
  tag: string;
  title: string;
  description: string;
  link: string;
  linkText: string;
  bullets: string[];
}

const CAPABILITY_TABS: CapabilityTab[] = [
  {
    id: "borehole",
    name: "Borehole Analysis",
    tag: "Lithology & Strata Extraction",
    title: "Centimeter-precision drill log & strata parsing",
    description: "Instantly convert complex scanned lithological drill logs, core descriptions, and geophysical density charts into structured strata tables.",
    link: "/documents",
    linkText: "Explore Ingestion & Logs",
    bullets: [
      "Multi-depth lithology column reconstruction with seam identification.",
      "Roof and floor elevation cross-referencing against geological models.",
      "Automatic detection of missing strata intervals or duplicate borehole IDs."
    ]
  },
  {
    id: "rag",
    name: "Evidence-Backed RAG",
    tag: "Instant Citation Engine",
    title: "Ask your entire geological archive anything",
    description: "Pose natural language questions across tens of thousands of pages. Every generated figure and recommendation links directly to the verified PDF page.",
    link: "/assistant",
    linkText: "Open AI Assistant",
    bullets: [
      "Hybrid vector + BM25 keyword search over millions of document tokens.",
      "Exact page number, paragraph, and table coordinate citations.",
      "Direct PDF viewer deep-linking with highlighted evidence bounding boxes."
    ]
  },
  {
    id: "reserve",
    name: "Reserve Auditing",
    tag: "UNFC & Stripping Ratio Math",
    title: "Mathematical verification of coal reserves & stripping ratios",
    description: "Automated deterministic validation calculates whether reported overburden volume matches pit boundary geometry and UNFC reserve categories.",
    link: "/validation",
    linkText: "View Validation Dashboard",
    bullets: [
      "UNFC Code 111, 121, 122 geological classification reconciliation.",
      "Composite stripping ratio (m³/tonne) formula verification.",
      "Discrepancy alerts on mine leasehold tonnage variances exceeding 2.5%."
    ]
  },
  {
    id: "dgms",
    name: "DGMS Compliance",
    tag: "Statutory Mining Rules",
    title: "Automated auditing against DGMS circulars & safety norms",
    description: "Continuously checks mine plans and operational reports against statutory regulations issued by the Directorate General of Mines Safety.",
    link: "/government-resources",
    linkText: "Government Portals & Circulars",
    bullets: [
      "Real-time cross-referencing of bench slopes, berm heights, and haulage widths.",
      "Environmental clearance compliance tracking (air quality, forestry, runoff).",
      "Direct synchronization with Ministry of Coal and DGMS policy repositories."
    ]
  },
  {
    id: "3dcore",
    name: "3D Neural Geology",
    tag: "Interactive Spatial Core",
    title: "Living 3D visualization of subsurface mining knowledge",
    description: "Explore interconnected geological strata, fault lines, borehole distribution, and document clusters in a real-time GPU-accelerated 3D environment.",
    link: "/knowledge-base",
    linkText: "Open Geological Knowledge Base",
    bullets: [
      "Real-time 3D Three.js particle flow representing multi-mine telemetry.",
      "Interactive tilt and node exploration for seam thickness distributions.",
      "Unified spatial bridge between geological reports and physical geometry."
    ]
  }
];

export default function GeminiStyledLandingPage() {
  const [activePromptId, setActivePromptId] = useState<string>("kusmunda");
  const [activeTabId, setActiveTabId] = useState<string>("borehole");
  const [customInput, setCustomInput] = useState<string>("");

  const currentPrompt = SAMPLE_PROMPTS.find(p => p.id === activePromptId) || SAMPLE_PROMPTS[0];
  const currentTab = CAPABILITY_TABS.find(t => t.id === activeTabId) || CAPABILITY_TABS[0];

  return (
    <div className="relative min-h-screen bg-[#FFFFFF] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* ── AMBIENT GOOGLE GEMINI LIGHT AURA BLOOMS (SUBTLE, CLEAN & LUMINOUS) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top Center Cyan/Blue Halo */}
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[650px] bg-gradient-to-b from-blue-100/60 via-cyan-50/40 to-transparent blur-[140px] rounded-full" />
        {/* Top Right Violet Halo */}
        <div className="absolute top-[5%] -right-[10%] w-[650px] h-[650px] bg-gradient-to-bl from-purple-100/50 via-indigo-50/30 to-transparent blur-[160px] rounded-full" />
        {/* Mid Left Amber/Yellow Halo */}
        <div className="absolute top-[35%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-amber-50/50 via-rose-50/30 to-transparent blur-[160px] rounded-full" />
        {/* Bottom Blue Flow */}
        <div className="absolute bottom-[5%] right-[15%] w-[700px] h-[500px] bg-gradient-to-tl from-sky-100/40 via-blue-50/30 to-transparent blur-[150px] rounded-full" />
      </div>

      {/* ── FIXED TOP NAVIGATION BAR ── */}
      <TopNavbar />

      {/* ── MAIN CONTENT WRAPPER ── */}
      <main className="relative z-10 pt-28 sm:pt-32 pb-24">
        
        {/* ── SECTION 1: HERO SECTION (GOOGLE GEMINI AESTHETIC) ── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center pt-8 sm:pt-14 pb-16">
          
          {/* Gemini Style Pill Tag with 4-Color Sparkle */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-slate-300 transition-colors mb-6"
          >
            <GeminiSparkle className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
              KhanijGyan AI • Ministry of Coal Document Intelligence
            </span>
          </motion.div>

          {/* Large Google Sans Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold tracking-[-0.03em] leading-[1.1] text-slate-900 max-w-5xl mx-auto"
          >
            Supercharge mining intelligence{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1BA0E2] via-[#4285F4] to-[#9B72CF]">
              with KhanijGyan AI.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl md:text-2xl text-slate-600 font-normal max-w-3xl mx-auto leading-relaxed"
          >
            Transform raw drill logs, multi-volume geological reports, and DGMS circulars into instant, verified answers with line-level citations and stripping ratios.
          </motion.p>

          {/* Google Style Primary & Secondary Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <Link
              href="/assistant"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <GeminiSparkle className="w-4 h-4 brightness-200" />
              <span>Try KhanijGyan AI</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/documents"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-base font-semibold border border-slate-200 shadow-sm hover:border-slate-300 transition-all active:scale-[0.98]"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Explore Document Vault</span>
            </Link>
          </motion.div>

          {/* ── INTERACTIVE GEMINI PROMPT SANDBOX (SIGNATURE GEMINI UI CARD) ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="mt-12 sm:mt-16 text-left max-w-4xl mx-auto"
          >
            <div className="rounded-[2rem] bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.06)] p-6 sm:p-8 relative transition-all">
              
              {/* Input Bar Mimicking Gemini Web App */}
              <div className="relative flex items-center bg-slate-50/80 border border-slate-200/90 rounded-2xl px-4 py-3 sm:py-3.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Ask anything about your geological archive, coal reserves, or borehole logs..."
                  className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customInput.trim()) {
                      window.location.href = `/assistant?q=${encodeURIComponent(customInput)}`;
                    }
                  }}
                />
                
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <button 
                    type="button" 
                    title="Attach mining document"
                    onClick={() => window.location.href = "/documents"}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    title="Voice query"
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors hidden sm:block"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <Link
                    href={customInput.trim() ? `/assistant?q=${encodeURIComponent(customInput)}` : "/assistant"}
                    className="p-2.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white transition-all shadow-sm flex items-center justify-center"
                    title="Ask KhanijGyan AI"
                  >
                    <Send className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Sample Prompt Suggestion Chips Underneath Input (Interactive) */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap pl-1 pr-1 hidden sm:inline">
                  Try Asking:
                </span>
                {SAMPLE_PROMPTS.map((prompt) => {
                  const isActive = prompt.id === activePromptId;
                  return (
                    <button
                      key={prompt.id}
                      onClick={() => setActivePromptId(prompt.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                        isActive
                          ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {prompt.pill}
                    </button>
                  );
                })}
              </div>

              {/* Live Animated AI Response Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPrompt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 pt-6 border-t border-slate-100"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1BA0E2] via-[#4285F4] to-[#9B72CF] flex items-center justify-center shrink-0 shadow-sm">
                      <GeminiSparkle className="w-4 h-4 brightness-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        KhanijGyan AI Response
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-slate-900">
                        {currentPrompt.answerTitle}
                      </div>
                      <ul className="mt-2.5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed list-disc list-inside">
                        {currentPrompt.answerBullets.map((bullet, idx) => (
                          <li key={idx} className="marker:text-blue-500">
                            {bullet}
                          </li>
                        ))}
                      </ul>

                      {/* Evidence Pill Badges & Deep Link to Assistant */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>{currentPrompt.citation} • {currentPrompt.page}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{currentPrompt.accuracy}</span>
                          </span>
                        </div>

                        <Link
                          href={`/assistant?q=${encodeURIComponent(currentPrompt.query)}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <span>Open full evidence in Assistant</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

            </div>
          </motion.div>

        </section>

        {/* ── SECTION 2: "WHAT KHANIJ GYAN AI CAN DO" (GEMINI CAPABILITY TABBED SHOWCASE) ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
              What KhanijGyan AI can do
            </h2>
            <p className="mt-4 text-base sm:text-xl text-slate-600 font-normal">
              Built specifically for geological exploration, open-cast mine planning, reserve validation, and statutory compliance.
            </p>
          </div>

          {/* Gemini-Style Horizontal Pill Tabs Bar */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 scrollbar-none max-w-4xl mx-auto">
            {CAPABILITY_TABS.map((tab) => {
              const isSelected = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "text-slate-900 bg-slate-100 font-semibold shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="gemini-tab-pill"
                      className="absolute inset-0 rounded-full border border-slate-200/90 bg-white shadow-sm -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="mt-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="rounded-[2.5rem] bg-slate-50/70 border border-slate-200/90 p-8 sm:p-12 lg:p-14 shadow-[0_15px_45px_rgba(0,0,0,0.03)]"
              >
                {/* Check if 3D Knowledge Core Tab is Active */}
                {currentTab.id === "3dcore" ? (
                  <div className="space-y-8">
                    <div className="max-w-3xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 text-purple-800 text-xs font-semibold mb-3">
                        <Cpu className="w-3.5 h-3.5 text-purple-600" />
                        <span>{currentTab.tag}</span>
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                        {currentTab.title}
                      </h3>
                      <p className="mt-3 text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                        {currentTab.description}
                      </p>
                    </div>

                    {/* 3D Knowledge Core Embedded */}
                    <div className="w-full">
                      <Geological3DKnowledgeCore />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                    
                    {/* Left Column: Information & Bullet Points */}
                    <div className="lg:col-span-6 space-y-6">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>{currentTab.tag}</span>
                      </div>

                      <h3 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                        {currentTab.title}
                      </h3>

                      <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                        {currentTab.description}
                      </p>

                      <ul className="space-y-3 pt-2">
                        {currentTab.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                              ✓
                            </div>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-4">
                        <Link
                          href={currentTab.link}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all shadow-sm"
                        >
                          <span>{currentTab.linkText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Right Column: High-Fidelity UI Preview Card */}
                    <div className="lg:col-span-6">
                      <div className="rounded-3xl bg-white border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
                        {currentTab.id === "borehole" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-400 uppercase">Stratigraphic Lithology Column</span>
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                BH-14 • Gevra Sector
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs flex justify-between items-center">
                                <div>
                                  <div className="font-semibold text-amber-900">0.00m - 18.20m: Weathered Topsoil & Sandstone</div>
                                  <div className="text-amber-700 text-[11px]">Specific Gravity: 2.15 • RQD: 45%</div>
                                </div>
                                <span className="font-mono text-amber-800 font-bold">18.20m</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs flex justify-between items-center">
                                <div>
                                  <div className="font-semibold text-slate-800">18.20m - 142.40m: Medium-Grained Sandstone / Shale</div>
                                  <div className="text-slate-600 text-[11px]">Interbedded roof strata with minor carbonaceous streaks</div>
                                </div>
                                <span className="font-mono text-slate-700 font-bold">124.20m</span>
                              </div>

                              <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs flex justify-between items-center shadow-md">
                                <div>
                                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                                    <span>142.40m - 150.60m: Coal Seam III (Main Reserve)</span>
                                    <span className="px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-200 text-[10px]">Grade G-11</span>
                                  </div>
                                  <div className="text-slate-300 text-[11px] mt-0.5">Ash: 28.4% • Moisture: 7.2% • GCV: 4,120 kcal/kg</div>
                                </div>
                                <span className="font-mono text-cyan-300 font-bold text-sm">8.20m</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {currentTab.id === "rag" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-400 uppercase">Sub-Second Vector Search</span>
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                0.42s • 10,400 Pages
                              </span>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                              <div className="font-semibold text-slate-900">Query: &quot;DGMS certified blasting danger zone radius&quot;</div>
                              <p className="text-slate-600 leading-relaxed">
                                &quot;Danger zone radius shall not be less than <strong>300 meters</strong> from the blasting site unless controlled blasting techniques with DGMS permission are adopted.&quot;
                              </p>
                              <div className="pt-2 flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-blue-600">
                                  DGMS_Circular_02_2022.pdf [Page 14]
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {currentTab.id === "reserve" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-400 uppercase">UNFC 111 Reserve Reconciliation</span>
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Audited
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200">
                                <div className="text-slate-500 text-[11px]">Proved Geological Coal</div>
                                <div className="text-lg font-bold text-purple-950 mt-1">1,482.35 MT</div>
                                <div className="text-[10px] text-purple-700 mt-0.5">Confidence: 99.4%</div>
                              </div>
                              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200">
                                <div className="text-slate-500 text-[11px]">Stripping Ratio (OB)</div>
                                <div className="text-lg font-bold text-blue-950 mt-1">1.42 m³/t</div>
                                <div className="text-[10px] text-blue-700 mt-0.5">Tolerance: Passed</div>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Reconciled against 14 contiguous leasehold boundary maps.</span>
                            </div>
                          </div>
                        )}

                        {currentTab.id === "dgms" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-400 uppercase">Statutory Safety Checklist</span>
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Compliant
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                                <span className="font-medium text-emerald-950">Bench Height to Width Ratio (1 : 1.5)</span>
                                <span className="text-emerald-700 font-bold">100% OK</span>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                                <span className="font-medium text-emerald-950">Haul Road Berm Height (2.40m for 240T dumpers)</span>
                                <span className="text-emerald-700 font-bold">VERIFIED</span>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                                <span className="font-medium text-blue-950">Monsoon Sump Pumping Head Capacity (12,000 GPM)</span>
                                <span className="text-blue-700 font-bold">AUDITED</span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </section>

        {/* ── SECTION 3: PRODUCT FEATURE DECK (CLEAN WHITE GOOGLE CARDS) ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Core Architecture</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Built for precision, safety, and scale.
            </h2>
            <p className="mt-4 text-base sm:text-xl text-slate-600 font-normal">
              Every document flows through OCR, structured extraction, cross-verification, and semantic indexing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Multi-Format Ingestion",
                desc: "Scanned PDFs, DOCX, complex Excel spreadsheets, core scan images, and multi-page technical archives.",
                icon: FileText,
                badge: "OCR & Vision",
                color: "text-blue-600 bg-blue-50 border-blue-200"
              },
              {
                step: "02",
                title: "Structured Extraction",
                desc: "Centimeter-accurate borehole strata depth tables, coal seam thicknesses, and overburden volume tallies.",
                icon: Database,
                badge: "Table Parser",
                color: "text-purple-600 bg-purple-50 border-purple-200"
              },
              {
                step: "03",
                title: "Deterministic Rule Engine",
                desc: "100+ automated geological tolerance checks, UNFC reserve categorization, and DGMS safety guidelines.",
                icon: ShieldCheck,
                badge: "Validation",
                color: "text-emerald-600 bg-emerald-50 border-emerald-200"
              },
              {
                step: "04",
                title: "Evidence-Backed RAG",
                desc: "FAISS vector embeddings + chunked indexing for sub-second query latency and verified source citations.",
                icon: Sparkles,
                badge: "FAISS v2.4",
                color: "text-amber-600 bg-amber-50 border-amber-200"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="rounded-3xl bg-white p-7 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-bold font-mono text-slate-400">STEP {item.step}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${item.color}`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </section>

        {/* ── SECTION 4: CROSS-DOCUMENT INTELLIGENCE & CORRELATION ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Visual Node Correlation Card */}
            <div className="lg:col-span-6">
              <div className="rounded-[2.5rem] bg-slate-900 text-white p-8 sm:p-10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <GitCompare className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-semibold text-slate-100">Cross-Document Correlation Engine</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/50">
                    LIVE AUDIT
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Doc A */}
                  <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-white">Historical Borehole Log (BH-14)</div>
                      <span className="text-[11px] text-slate-400 font-mono">1998 Archive</span>
                    </div>
                    <div className="text-xs text-slate-300">Seam Top: 142.40m • Seam Thickness: 8.20m</div>
                  </div>

                  {/* Discrepancy Flag */}
                  <div className="flex items-center justify-center">
                    <div className="px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>0.40m Thickness Discrepancy Flagged</span>
                    </div>
                  </div>

                  {/* Doc B */}
                  <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-white">Modern Mine Plan (2024 Expansion)</div>
                      <span className="text-[11px] text-slate-400 font-mono">Active Plan</span>
                    </div>
                    <div className="text-xs text-slate-300">Seam Top: 142.45m • Seam Thickness: 7.80m</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Audit Verdict: Reconciliation Required</span>
                  <Link href="/cross-document" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                <span>Multi-Source Verification</span>
              </div>

              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Cross-document intelligence.
              </h2>

              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                Never miss a conflict. Automatically cross-reference technical figures across geological reports, mine plans, feasibility studies, and environmental clearances.
              </p>

              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  href="/cross-document"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-all"
                >
                  <span>Explore Cross-Doc Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/validation"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold transition-all"
                >
                  <span>Validation Rules</span>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 5: REAL MINING METRICS STRIP ── */}
        <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
          <div className="rounded-3xl bg-slate-50/80 border border-slate-200/90 p-8 sm:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900">50+</div>
                <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">Mines & Blocks Indexed</div>
              </div>
              <div>
                <div className="font-display text-3xl sm:text-5xl font-extrabold text-blue-600">100+</div>
                <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">Automated Geological Rules</div>
              </div>
              <div>
                <div className="font-display text-3xl sm:text-5xl font-extrabold text-purple-600">&lt;1.2s</div>
                <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">Sub-Second Query Latency</div>
              </div>
              <div>
                <div className="font-display text-3xl sm:text-5xl font-extrabold text-emerald-600">100%</div>
                <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">Page-Level Traceability</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: GOVERNMENT RESOURCES & OFFICIAL DIRECTORY ── */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-10 sm:p-14 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="max-w-3xl space-y-5 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Ministry of Coal Portal Sync</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight text-white">
                Official Ministry & CMPDI Public Resources.
              </h2>
              
              <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed">
                Direct access to verified Ministry of Coal statistics, Coal India Limited policies, National Mineral Index circulars, and environmental compliance notices.
              </p>

              <div className="pt-4 flex flex-wrap gap-3.5">
                <Link
                  href="/government-resources"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-slate-900 bg-white rounded-full hover:bg-slate-100 transition-all shadow-md active:scale-95"
                >
                  <span>Open Government Portal Directory</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
                
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-all"
                >
                  <Search className="w-4 h-4 mr-2 text-cyan-400" />
                  <span>Semantic Document Search</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: GEMINI BOTTOM CTA HERO CARD ── */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-purple-50/80 border border-slate-200/90 p-10 sm:p-16 relative overflow-hidden shadow-sm">
            <div className="w-14 h-14 mx-auto mb-6 flex items-center justify-center">
              <GeminiSparkle className="w-12 h-12" />
            </div>

            <h2 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
              Ready to explore your mining documents?
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Experience the next generation of geological and mining document intelligence designed for CMPDI, Coal India, and exploration officers.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/assistant"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <span>Launch KhanijGyan AI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/documents"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-base font-semibold border border-slate-200 shadow-sm transition-all active:scale-[0.98]"
              >
                <span>Upload Mining Records</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── CLEAN MINIMAL GOOGLE-STYLE FOOTER ── */}
      <footer className="border-t border-slate-200/90 py-12 px-4 sm:px-6 lg:px-8 bg-[#FFFFFF] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          
          <div className="flex items-center gap-3">
            <GeminiSparkle className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-slate-800 text-sm">KhanijGyan AI</span>
            <span>• Ministry of Coal Document Intelligence Suite</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
            <Link href="/documents" className="hover:text-slate-900 transition-colors">Documents</Link>
            <Link href="/assistant" className="hover:text-slate-900 transition-colors">AI Assistant</Link>
            <Link href="/knowledge-base" className="hover:text-slate-900 transition-colors">Knowledge Base</Link>
            <Link href="/validation" className="hover:text-slate-900 transition-colors">Validation</Link>
            <Link href="/cross-document" className="hover:text-slate-900 transition-colors">Cross-Doc</Link>
            <Link href="/reports" className="hover:text-slate-900 transition-colors">Reports</Link>
            <Link href="/government-resources" className="hover:text-slate-900 transition-colors">Gov Portals</Link>
          </div>

          <div className="text-slate-400">
            © {new Date().getFullYear()} KhanijGyan AI. All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
}
