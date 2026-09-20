"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { Gemini3DAurora } from "@/components/3d/Gemini3DAurora";
import { Geological3DKnowledgeCore } from "@/components/3d/Geological3DKnowledgeCore";
import { 
  ArrowRight, 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  Layers, 
  Search, 
  CheckCircle2, 
  GitCompare, 
  ChevronDown,
  Sparkles,
  Database,
  ShieldCheck,
  Zap,
  ExternalLink,
  Cpu,
  BarChart3,
  TrendingUp
} from "lucide-react";

export default function GeminiCinematicLandingPage() {
  const router = useRouter();
  const [promptInput, setPromptInput] = useState("");

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptInput.trim()) {
      router.push(`/assistant?prompt=${encodeURIComponent(promptInput.trim())}`);
    } else {
      router.push("/assistant");
    }
  };

  const samplePrompts = [
    { text: "Which project produced highest coal in Q1 2026?", tag: "Production" },
    { text: "Compare Gevra Expansion vs Nigahi stripping ratio", tag: "Analytics" },
    { text: "Audit DGMS safety near-miss hazards at Ukni OC", tag: "Compliance" },
    { text: "List mines with average seam thickness >8m", tag: "Geology" },
  ];

  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-sans overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* ── TOP NAVIGATION WITH UPDATED WHITE BRANDING ── */}
      <TopNavbar />

      {/* ── GEMINI 3D HERO SECTION ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-20 overflow-hidden">
        
        {/* Background Ambient Color Blooms (Gemini Nebula) */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] sm:w-[950px] h-[550px] bg-gradient-to-tr from-cyan-600/20 via-violet-600/25 to-pink-600/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -left-48 w-[450px] h-[450px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        {/* Real-time WebGL 3D Quantum Aurora Ribbon */}
        <Gemini3DAurora />

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8 mt-4 sm:mt-8">
          
          {/* Gemini Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_25px_rgba(255,255,255,0.06)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-200 font-mono">
              KHANIJGYAN AI • NEXT-GEN MINING INTELLIGENCE
            </span>
          </motion.div>

          {/* Main Gemini Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="font-display text-4xl sm:text-6xl lg:text-[5rem] font-black tracking-[-0.035em] leading-[1.08] max-w-5xl"
          >
            <span className="text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.15)]">
              The Most Capable AI for
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-200 drop-shadow-[0_0_45px_rgba(139,92,246,0.35)]">
              Geological & Mining Intelligence.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base sm:text-xl text-slate-300 font-normal max-w-3xl leading-relaxed tracking-tight"
          >
            Multi-document RAG search, borehole log analysis, reserve computations, and automated DGMS compliance auditing — grounded with 100% verifiable source citations.
          </motion.p>

          {/* ── GEMINI SIGNATURE FLOATING PROMPT BAR ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="w-full max-w-3xl pt-2"
          >
            <form 
              onSubmit={handlePromptSubmit}
              className="relative flex items-center rounded-full bg-[#0a0c16]/80 backdrop-blur-2xl border border-white/20 p-2 sm:p-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.15)] focus-within:border-cyan-400 focus-within:shadow-[0_0_35px_rgba(6,182,212,0.3)] transition-all"
            >
              <div className="flex items-center pl-3.5 pr-2 text-cyan-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>

              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask KhanijGyan AI anything about borehole logs, stripping ratio, or reserves..."
                className="flex-1 bg-transparent text-white placeholder:text-slate-400 text-sm sm:text-base outline-none px-2 font-medium"
              />

              <button
                type="submit"
                className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <span>Ask AI</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </form>

            {/* Quick Interactive Prompt Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3.5">
              {samplePrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(`/assistant?prompt=${encodeURIComponent(chip.text)}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white transition-all shadow-xs cursor-pointer"
                >
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">{chip.tag}:</span>
                  <span className="truncate max-w-[240px] sm:max-w-none">{chip.text}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
          >
            <Link
              href="/documents"
              className="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm sm:text-base font-bold text-slate-950 bg-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <span>Explore Document Workspace</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center px-8 py-3.5 text-sm sm:text-base font-bold text-white border border-white/20 rounded-full bg-white/[0.04] backdrop-blur-xl transition-all hover:bg-white/[0.1] hover:border-white/30 hover:scale-[1.02] active:scale-95"
            >
              <BarChart3 className="w-4 h-4 mr-2 text-cyan-400" />
              <span>Operations Dashboard</span>
            </Link>
          </motion.div>

          {/* Scroll cue */}
          <div className="pt-6 flex flex-col items-center gap-1.5 text-slate-400 text-xs font-mono">
            <span>SCROLL TO EXPLORE SPATIAL INTELLIGENCE</span>
            <ChevronDown className="w-4 h-4 animate-bounce text-cyan-400" />
          </div>

        </div>
      </section>

      {/* ── GEMINI BENTO GRID: CAPABILITIES & ARCHITECTURE ── */}
      <section className="relative z-20 py-24 sm:py-32 border-t border-white/[0.08] bg-[#030409]">
        
        {/* Subtle Ambient Radial Blooms */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-cyan-600/10 blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section Header in Gemini Style */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Core Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Engineered for Geological Precision.
            </h2>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-light">
              Every document format flows effortlessly through OCR, structured extraction, cross-verification, and dense semantic indexing.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Bento Card 1 (Span 8): Multimodal Ingestion Engine */}
            <div className="lg:col-span-8 p-7 sm:p-9 rounded-3xl bg-[#090b14]/80 backdrop-blur-2xl border border-white/[0.1] hover:border-white/25 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    01 • INGESTION & OCR
                  </span>
                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Multimodal Extraction Engine
                </h3>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl font-light">
                  Process PDF reports, multi-sheet Excel workbooks, digitized borehole depth logs, and core scan imagery with sub-second accuracy and automated tabular reconstruction.
                </p>
              </div>

              {/* Visual Demo Bar */}
              <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-bold">PDF Reports</span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">XLSX Mine Plans</span>
                  <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold">DOCX Boreholes</span>
                  <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold">Core Scans</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PaddleOCR & PyMuPDF Online</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2 (Span 4): Evidence Grounded RAG */}
            <div className="lg:col-span-4 p-7 sm:p-9 rounded-3xl bg-[#090b14]/80 backdrop-blur-2xl border border-white/[0.1] hover:border-white/25 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold">
                    02 • VERIFIED CITATIONS
                  </span>
                  <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  Zero-Hallucination Grounding
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">
                  Every answer links to exact document IDs, sheet names, page numbers, and cosine similarity relevance match scores.
                </p>
              </div>

              {/* Mock Citation Card */}
              <div className="mt-8 p-4 rounded-2xl bg-violet-950/20 border border-violet-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-violet-300 font-semibold">Kusmunda_Geol_2023.pdf</span>
                  <span className="text-emerald-400 font-bold">100% Match</span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">
                  Proven Coal Reserves: 1,482.35 MT (Seam I, II, III) • SR: 1.42 m³/t
                </p>
              </div>
            </div>

            {/* Bento Card 3 (Span 4): Automated Compliance Quarantine */}
            <div className="lg:col-span-4 p-7 sm:p-9 rounded-3xl bg-[#090b14]/80 backdrop-blur-2xl border border-white/[0.1] hover:border-white/25 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                    03 • COMPLIANCE AUDIT
                  </span>
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  DGMS Rule Audits
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">
                  10 operational compliance algorithms actively inspect stripping ratio math, positive tonnage, and seam thickness tolerances.
                </p>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Discrepancy Status:</span>
                <span className="text-emerald-400 font-bold">0 Blocking Flags</span>
              </div>
            </div>

            {/* Bento Card 4 (Span 8): Cross-Mine Operational Analytics */}
            <div className="lg:col-span-8 p-7 sm:p-9 rounded-3xl bg-[#090b14]/80 backdrop-blur-2xl border border-white/[0.1] hover:border-white/25 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-bold">
                    04 • ANALYTICS
                  </span>
                  <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Cross-Mine Performance Matrix
                </h3>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl font-light">
                  Instant aggregation across Q1 2026 dataset: 15,167,000 Tonnes raw coal produced and 39,880,000 m³ overburden removed across all 7 authoritative mine sites.
                </p>
              </div>

              {/* Metrics Pills */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px] uppercase">Gevra (SECL)</span>
                  <span className="text-white font-bold text-sm">3,915,000 t</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px] uppercase">Nigahi (NCL)</span>
                  <span className="text-white font-bold text-sm">2,840,000 t</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px] uppercase">Lakhanpur (MCL)</span>
                  <span className="text-white font-bold text-sm">2,215,000 t</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px] uppercase">Piparwar (CCL)</span>
                  <span className="text-white font-bold text-sm">2,150,000 t</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: LIVING 3D NEURAL GEOLOGY CORE ── */}
      <section className="py-24 sm:py-32 border-t border-white/[0.08] bg-[#020205] relative overflow-hidden">
        
        {/* Soft Background Aurora */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-900/10 via-purple-900/15 to-transparent blur-[160px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Descriptive Typography */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Spatial 3D Intelligence</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Inspect Geological Layers in Real-Time 3D.
              </h2>
              <p className="text-base text-slate-400 font-light leading-relaxed">
                Interact with stratigraphic formations, inspect borehole logs with depth physics, and explore multi-layer coal reserves through our custom WebGL neural engine.
              </p>
              <div className="pt-2">
                <Link
                  href="/knowledge-base"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  <span>Open Vector Knowledge Base</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </Link>
              </div>
            </div>

            {/* Right Column: 3D Geological Knowledge Core */}
            <div className="lg:col-span-7 flex items-center justify-center relative">
              <div className="w-full relative">
                <Geological3DKnowledgeCore />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: GEMINI-STYLE LAUNCH BANNER & FOOTER ── */}
      <section className="py-24 sm:py-32 border-t border-white/[0.08] bg-[#000000] relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          
          <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#0c0f1d] to-[#04050a] border border-white/[0.15] shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.15)] relative overflow-hidden space-y-6">
            
            {/* Top Glow Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>CMPDI & Coal India Limited</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-2xl mx-auto leading-tight">
              Ready to Transform Your Geological Archives?
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
              Experience the authoritative AI platform engineered for exploration reports, borehole analysis, stripping ratio compliance, and mining operations.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/documents"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-slate-950 font-bold text-base shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
              >
                <span>Launch Document Workspace</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              
              <Link
                href="/assistant"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-base border border-white/20 hover:scale-105 active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4 mr-2.5 text-cyan-400" />
                <span>Ask KhanijGyan AI</span>
              </Link>
            </div>

          </div>

          {/* Footer Copyright */}
          <div className="mt-16 text-center text-xs font-mono text-slate-500 space-y-2">
            <p>© {new Date().getFullYear()} KhanijGyan AI • Central Mine Planning & Design Institute (CMPDI) / CIL</p>
            <p className="text-slate-600">Enterprise AI for Geological Exploration, Borehole Analysis & DGMS Compliance</p>
          </div>

        </div>
      </section>

    </div>
  );
}
