"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { HeroScene } from "@/components/3d/HeroScene";
import { FluidJellyCore } from "@/components/3d/FluidJellyCore";
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
  ExternalLink
} from "lucide-react";
import { useRef } from "react";

export default function CinematicLandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Global scroll progress
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Floating Navbar Color Interpolation
  const navBg = useTransform(
    scrollYProgress,
    [0, 0.15, 0.3],
    ["rgba(3, 3, 5, 0.6)", "rgba(15, 23, 42, 0.75)", "rgba(255, 255, 255, 0.95)"]
  );
  const navBorder = useTransform(
    scrollYProgress,
    [0, 0.15, 0.3],
    ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.12)", "rgba(0, 0, 0, 0.08)"]
  );
  const navText = useTransform(
    scrollYProgress,
    [0, 0.15, 0.3],
    ["#ffffff", "#e2e8f0", "#0f172a"]
  );

  // Dark Particle World Lift & Dissolve on Scroll
  const heroWorldY = useTransform(scrollYProgress, [0, 0.4], ["0%", "-25%"]);
  const heroWorldOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.1]);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen bg-[#000000] text-white font-sans overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-900"
    >
      {/* ── PERSISTENT 3D BACKGROUND CANVAS (GPU Particle World) ── */}
      <motion.div 
        style={{ y: heroWorldY, opacity: heroWorldOpacity }}
        className="fixed inset-0 z-0 pointer-events-none"
      >
        <HeroScene scrollYProgress={scrollYProgress} />
      </motion.div>

      {/* ── FLOATING MINIMAL NAVIGATION ── */}
      <motion.header 
        style={{ backgroundColor: navBg, borderColor: navBorder }}
        className="fixed top-0 left-0 w-full z-50 transition-colors duration-300 backdrop-blur-xl border-b"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-white text-base tracking-tighter">K</span>
            </div>
            <motion.span style={{ color: navText }} className="font-bold text-lg tracking-tight">
              KHANI GYAN <span className="font-light opacity-80">AI</span>
            </motion.span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            <motion.div style={{ color: navText }} className="flex items-center gap-7">
              <Link href="/" className="opacity-90 hover:opacity-100 transition-opacity">Home</Link>
              <Link href="/documents" className="opacity-75 hover:opacity-100 transition-opacity">Documents</Link>
              <Link href="/assistant" className="opacity-75 hover:opacity-100 transition-opacity">AI Assistant</Link>
              <Link href="/cross-document" className="opacity-75 hover:opacity-100 transition-opacity">Cross-Document</Link>
              <Link href="/validation" className="opacity-75 hover:opacity-100 transition-opacity">Validation</Link>
              <Link href="/reports" className="opacity-75 hover:opacity-100 transition-opacity">Reports</Link>
              <Link href="/search" className="opacity-75 hover:opacity-100 transition-opacity">Search</Link>
              <Link href="/government-resources" className="opacity-75 hover:opacity-100 transition-opacity">Gov Resources</Link>
            </motion.div>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium opacity-80 hover:opacity-100 transition-opacity px-3 py-2"
            >
              <motion.span style={{ color: navText }}>Log In</motion.span>
            </Link>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center justify-center px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              Launch App
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ── HERO SECTION (DARK GPU PARTICLE OPENING) ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 text-center z-10 pt-28 pb-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center space-y-7">
          
          {/* Pill Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              KHANI GYAN AI • GEOLOGICAL INTELLIGENCE
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-4xl sm:text-6xl lg:text-[4.5rem] font-bold tracking-[-0.03em] leading-[1.12] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-200/90 drop-shadow-[0_2px_25px_rgba(255,255,255,0.12)] max-w-4xl"
          >
            Turn Complex Mining Data Into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-teal-200">
              Intelligent Decisions.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-xl sm:text-2xl text-white font-normal sm:font-medium max-w-3xl leading-relaxed tracking-[-0.01em] drop-shadow-[0_2px_15px_rgba(0,0,0,0.6)]"
          >
            AI-powered document intelligence for geological, mining, production and technical reporting.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
          >
            <Link
              href="/documents"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-slate-950 bg-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_10px_35px_rgba(255,255,255,0.25)]"
            >
              <span>Explore Platform</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link
              href="/assistant"
              className="group inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white border border-white/20 rounded-full bg-white/5 backdrop-blur-xl transition-all hover:bg-white/15 hover:scale-[1.02] active:scale-95"
            >
              <MessageSquare className="w-4 h-4 mr-2.5 text-purple-400" />
              <span>Ask Khani Gyan AI</span>
            </Link>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="pt-6 flex flex-col items-center gap-2 text-slate-400 text-xs font-medium"
          >
            <span>Scroll to enter fluid intelligence</span>
            <ChevronDown className="w-4 h-4 animate-bounce text-slate-400" />
          </motion.div>
        </div>
      </section>

      {/* ── WHITE INTERFACE REVEALED UNDERNEATH ── */}
      <div className="relative z-20 bg-[#FFFFFF] text-slate-900 rounded-t-[3.5rem] shadow-[0_-30px_70px_rgba(0,0,0,0.4)] pt-16 pb-28">
        
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          
          {/* ── SECTION 1: FROM REPORTS TO KNOWLEDGE WITH 3D FLUID JELLY ── */}
          <section className="py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Spacious Typography & Value Proposition */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6 space-y-7"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  <span>Living Neural Geology</span>
                </div>

                <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.12] text-slate-900">
                  From Reports to Knowledge.
                </h2>
                
                <p className="text-lg sm:text-xl font-light leading-relaxed text-slate-600">
                  Transform complex mining documents into structured, searchable and actionable intelligence.
                </p>

                <div className="pt-3 flex items-center gap-6">
                  <Link
                    href="/documents"
                    className="inline-flex items-center gap-2 text-base font-semibold text-purple-600 hover:text-purple-700 group transition-colors"
                  >
                    <span>Explore Document Workspace</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>

              {/* Right Column: Large 3D Fluid Jelly Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6 flex items-center justify-center relative"
              >
                <div className="w-full relative rounded-3xl bg-gradient-to-b from-purple-50/70 via-sky-50/40 to-white border border-slate-200/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
                  <FluidJellyCore />
                  <div className="text-center pb-2 text-xs font-medium text-slate-400">
                    Interactive 3D Fluid Matter • Move cursor over core
                  </div>
                </div>
              </motion.div>

            </div>
          </section>

          {/* ── SECTION 2: DOCUMENT INTELLIGENCE PIPELINE ── */}
          <section className="py-24 sm:py-32 border-t border-slate-100">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9 }}
              className="text-center max-w-3xl mx-auto space-y-4 mb-20"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Multi-Format Ingestion</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900">
                Document Intelligence.
              </h2>
              <p className="text-lg sm:text-xl font-light text-slate-600">
                Every document format flows effortlessly through OCR, structured extraction, cross-verification, and semantic indexing.
              </p>
            </motion.div>

            {/* Pipeline Visual Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {[
                {
                  step: "01",
                  title: "Ingestion",
                  desc: "PDF, DOCX, Excel spreadsheets, core scan images, and multi-page technical archives.",
                  icon: FileText,
                  color: "from-blue-500 to-cyan-400"
                },
                {
                  step: "02",
                  title: "Extraction",
                  desc: "High-accuracy OCR, multi-level table parsing, borehole depth tables, and seam mapping.",
                  icon: Database,
                  color: "from-purple-500 to-indigo-500"
                },
                {
                  step: "03",
                  title: "Rule Validation",
                  desc: "Automated geological tolerance checks, reserve tally verification, and error flagging.",
                  icon: ShieldCheck,
                  color: "from-emerald-500 to-teal-400"
                },
                {
                  step: "04",
                  title: "Knowledge Vector",
                  desc: "FAISS embeddings + chunked indexing for sub-second cross-document reasoning.",
                  icon: Sparkles,
                  color: "from-pink-500 to-rose-400"
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.12 }}
                  className="relative rounded-3xl bg-slate-50/70 p-8 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs font-bold text-slate-400 tracking-wider">STEP {item.step}</span>
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center shadow-md`}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-sm font-light text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── SECTION 3: ASK KHANI GYAN AI CONVERSATIONAL INTERFACE ── */}
          <section className="py-24 sm:py-32 border-t border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
              
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.0 }}
                className="lg:col-span-5 space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Evidence-Backed RAG</span>
                </div>

                <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.12]">
                  Ask Your Archive Anything.
                </h2>
                
                <p className="text-lg font-light leading-relaxed text-slate-600">
                  Pose natural questions across thousands of geological reports. Receive exact answers with line-level evidence references, verified page numbers, and direct source downloads.
                </p>

                <div className="pt-4">
                  <Link
                    href="/assistant"
                    className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-white bg-slate-950 rounded-full hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>Ask Khani Gyan AI</span>
                  </Link>
                </div>
              </motion.div>

              {/* AI Chat Card Mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.0 }}
                className="lg:col-span-7"
              >
                <div className="rounded-3xl bg-slate-50 border border-slate-200/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] space-y-6">
                  
                  {/* User Prompt */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                      U
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-3 text-sm text-slate-800 font-medium max-w-xl shadow-sm">
                      What was the proven geological coal reserve for Kusmunda OC Expansion, and what stripping ratio was approved in the 2023 mine plan?
                    </div>
                  </div>

                  {/* AI Response with Evidence */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-4 max-w-xl">
                      <div className="bg-purple-50/80 border border-purple-100 rounded-2xl rounded-tl-none p-5 text-sm text-slate-700 leading-relaxed shadow-sm">
                        As per the approved Kusmunda Geological & Mining Assessment Report:
                        <ul className="mt-2 space-y-1.5 list-disc list-inside font-normal">
                          <li><strong>Total Proven Reserves:</strong> <strong>1,482.35 MT</strong> across Seams I, II, and III.</li>
                          <li><strong>Approved Stripping Ratio:</strong> <strong>1.42 m³/tonne</strong> for the 50.00 MTPA expansion horizon.</li>
                        </ul>
                      </div>

                      {/* Evidence Badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-sm font-medium">
                          <FileText className="w-3.5 h-3.5 text-purple-500" />
                          <span>Kusmunda_Geol_Report_2023.pdf • Page 24</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>100% Verified Match</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>

            </div>
          </section>

          {/* ── SECTION 4: CROSS-DOCUMENT INTELLIGENCE ── */}
          <section className="py-24 sm:py-32 border-t border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
              
              {/* Visual Cross-Doc Node Graph */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.0 }}
                className="lg:col-span-7 order-2 lg:order-1"
              >
                <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.12)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2.5">
                      <GitCompare className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-semibold text-slate-200">Cross-Document Correlation Engine</span>
                    </div>
                    <span className="text-xs font-mono text-purple-300 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800/50">
                      LIVE AUDIT
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Doc A */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-100">Historical Borehole Log (BH-14)</div>
                          <div className="text-xs text-slate-400">Seam Top: 142.40m • Seam Thickness: 8.20m</div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">1998 Archive</span>
                    </div>

                    {/* Connected Relation */}
                    <div className="flex items-center justify-center">
                      <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>0.40m Thickness Discrepancy Flagged</span>
                      </div>
                    </div>

                    {/* Doc B */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-100">Modern Mine Plan (2024 Expansion)</div>
                          <div className="text-xs text-slate-400">Seam Top: 142.45m • Seam Thickness: 7.80m</div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Active Plan</span>
                    </div>
                  </div>

                </div>
              </motion.div>

              {/* Right Copy */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1.0 }}
                className="lg:col-span-5 order-1 lg:order-2 space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-semibold">
                  <GitCompare className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Multi-Source Verification</span>
                </div>

                <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.12]">
                  Cross-Document Intelligence.
                </h2>
                
                <p className="text-lg font-light leading-relaxed text-slate-600">
                  Never miss a conflict. Automatically cross-reference technical figures across geological reports, mine plans, feasibility studies, and environmental clearances.
                </p>

                <div className="pt-2">
                  <Link
                    href="/cross-document"
                    className="inline-flex items-center gap-2 text-base font-semibold text-cyan-700 hover:text-cyan-800 group"
                  >
                    <span>Explore Cross-Doc Analysis</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>

            </div>
          </section>

          {/* ── SECTION 5: VALIDATION & DATA QUALITY ── */}
          <section className="py-24 sm:py-32 border-t border-slate-100">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="text-center max-w-3xl mx-auto space-y-4 mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Strict Rule Engine</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900">
                Validation & Quality Assurance.
              </h2>
              <p className="text-lg font-light text-slate-600">
                Deterministic validation engine evaluates 100+ geological rules, strip ratio physics, and reserve accounting constraints.
              </p>
            </motion.div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Depth Consistency",
                  rule: "Stratigraphic Order Rule #12",
                  status: "100% Passed",
                  desc: "Validates that borehole lithology layers follow true physical deposition sequence.",
                  color: "text-emerald-700 bg-emerald-50 border-emerald-200"
                },
                {
                  title: "Reserve Reconciliation",
                  rule: "UNFC Standard Rule #04",
                  status: "Audited",
                  desc: "Reconciles proven vs indicated coal reserves across contiguous block leaseholds.",
                  color: "text-purple-700 bg-purple-50 border-purple-200"
                },
                {
                  title: "Production Tolerance",
                  rule: "Monthly DGMS Target Rule #28",
                  status: "Active Monitoring",
                  desc: "Detects reporting anomalies between weighbridge tallies and dispatch manifests.",
                  color: "text-blue-700 bg-blue-50 border-blue-200"
                }
              ].map((v, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.12 }}
                  className="rounded-3xl bg-slate-50/70 p-7 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${v.color}`}>
                      {v.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{v.rule}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">{v.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center pt-10">
              <Link
                href="/validation"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <span>View Full Validation Audit Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {/* ── SECTION 6: GOVERNMENT RESOURCES & OFFICIAL DIRECTORY ── */}
          <section className="py-24 sm:py-32 border-t border-slate-100">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-10 sm:p-14 relative overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.12)]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
              
              <div className="max-w-3xl space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ministry of Coal Portal Sync</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
                  Official Ministry & CMPDI Public Resources.
                </h2>
                
                <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed">
                  Direct access to verified Ministry of Coal statistics, Coal India Limited policies, National Mineral Index circulars, and environmental compliance notices.
                </p>

                <div className="pt-4 flex flex-wrap gap-4">
                  <Link
                    href="/government-resources"
                    className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-slate-900 bg-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
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

        </div>

        {/* ── MINIMAL FOOTER ── */}
        <footer className="border-t border-slate-100 py-12 px-6 sm:px-8 mt-16">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center text-white font-bold text-xs">
                K
              </div>
              <span className="font-semibold text-slate-700">Khani Gyan AI</span>
              <span>• Ministry of Coal Document Intelligence Suite</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/documents" className="hover:text-slate-900 transition-colors">Documents</Link>
              <Link href="/assistant" className="hover:text-slate-900 transition-colors">AI Assistant</Link>
              <Link href="/validation" className="hover:text-slate-900 transition-colors">Validation</Link>
              <Link href="/reports" className="hover:text-slate-900 transition-colors">Reports</Link>
              <Link href="/government-resources" className="hover:text-slate-900 transition-colors">Gov Portals</Link>
            </div>

            <div>
              © {new Date().getFullYear()} Khani Gyan AI. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
