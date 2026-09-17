"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { HeroScene } from "@/components/3d/HeroScene";
import { ArrowRight, MessageSquare, ShieldAlert, Cpu, FileText, Database, Layers, Files } from "lucide-react";
import { useRef } from "react";

export default function CinematicLandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Background color interpolation: Dark Space -> Soft Blue/Purple -> Pure White
  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.4, 0.8, 1],
    ["#030303", "#0f172a", "#f8fafc", "#ffffff"]
  );

  // Global Text Color: White -> Slate-900
  const textColor = useTransform(
    scrollYProgress,
    [0, 0.4, 0.6, 1],
    ["#ffffff", "#e2e8f0", "#334155", "#0f172a"]
  );
  
  // Muted Text Color: Slate-400 -> Slate-500
  const mutedTextColor = useTransform(
    scrollYProgress,
    [0, 0.4, 0.6, 1],
    ["#94a3b8", "#94a3b8", "#64748b", "#475569"]
  );

  // Navbar Background: Dark translucent -> Light translucent
  const navBg = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    ["rgba(3, 5, 10, 0.4)", "rgba(15, 23, 42, 0.4)", "rgba(255, 255, 255, 0.8)"]
  );
  const navBorder = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    ["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.05)", "rgba(0, 0, 0, 0.05)"]
  );
  const navText = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    ["#ffffff", "#e2e8f0", "#0f172a"]
  );

  return (
    <motion.div 
      ref={containerRef}
      style={{ backgroundColor, color: textColor }}
      className="relative min-h-[300vh] font-sans overflow-x-hidden selection:bg-[#06B6D4]/30"
    >
      {/* ── GLOBAL 3D BACKGROUND (Stays fixed as user scrolls) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <HeroScene scrollYProgress={scrollYProgress} />
      </div>

      {/* ── TOP FLOATING NAVIGATION ── */}
      <motion.header 
        style={{ backgroundColor: navBg, borderColor: navBorder }}
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300 backdrop-blur-md border-b"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
               <span className="font-bold text-white text-sm">C</span>
             </div>
             <motion.span style={{ color: navText }} className="font-bold text-lg tracking-wide">
               CMPDI <span className="font-light">Document AI</span>
             </motion.span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
             <Link href="/" className="hover:opacity-70 transition-opacity">Home</Link>
             <Link href="/documents" className="hover:opacity-70 transition-opacity">Documents</Link>
             <Link href="/assistant" className="hover:opacity-70 transition-opacity">AI Assistant</Link>
             <Link href="/search" className="hover:opacity-70 transition-opacity">Search</Link>
             <Link href="/validation" className="hover:opacity-70 transition-opacity">Validation</Link>
             <Link href="/government-resources" className="hover:opacity-70 transition-opacity">Gov Resources</Link>
          </nav>
          
          <div className="flex items-center gap-4">
             <Link href="/login" className="text-sm font-medium hover:opacity-70 transition-opacity">Log In</Link>
             <Link 
               href="/dashboard" 
               className="hidden sm:inline-flex items-center justify-center px-6 py-2 text-sm font-bold text-slate-900 bg-white rounded-full hover:scale-105 transition-transform shadow-md"
             >
               Launch App
             </Link>
          </div>
        </div>
      </motion.header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 w-full">
        
        {/* ── HERO SECTION (100vh) ── */}
        <section className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto space-y-8 flex flex-col items-center"
          >
            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-medium tracking-tight"
            >
              CMPDI Document AI
            </motion.h1>

            {/* Subheadline */}
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-light max-w-3xl leading-snug"
            >
              Turn Complex Mining Data Into Intelligent Decisions.
            </motion.h2>

            {/* Description */}
            <motion.p
              style={{ color: mutedTextColor }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-lg sm:text-xl max-w-2xl leading-relaxed font-light"
            >
              AI-powered document intelligence for geological, mining, production and technical reporting.
            </motion.p>

            {/* CTA Buttons - Soft & Pill Shaped */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-8"
            >
              <Link
                href="/documents"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-medium text-slate-900 bg-white rounded-full overflow-hidden transition-transform hover:scale-105 shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
              >
                <span className="relative flex items-center gap-2">
                  Explore Platform <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              
              <Link
                href="/assistant"
                className="group inline-flex items-center justify-center px-8 py-4 text-base font-medium border border-white/20 rounded-full backdrop-blur-md transition-all hover:bg-white/10 hover:scale-[1.02]"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Ask CMPDI AI
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── SPACER FOR TRANSITION ── */}
        <div className="h-[40vh]" />

        {/* ── LIGHT WORLD SECTIONS ── */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
          
          {/* SECTION 2: From Reports to Knowledge */}
          <section className="py-40 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="max-w-4xl"
            >
              <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-8">
                From Reports to Knowledge.
              </h2>
              <motion.p style={{ color: mutedTextColor }} className="text-xl md:text-2xl font-light leading-relaxed max-w-3xl mx-auto">
                Transform complex mining documents into structured, searchable and actionable intelligence without touching a single manual spreadsheet.
              </motion.p>
            </motion.div>
          </section>

          {/* AI ASSISTANT SECTION */}
          <section className="py-40">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex-1 space-y-8"
              >
                <h2 className="text-5xl md:text-6xl font-medium tracking-tight leading-tight">
                  Ask Your Documents.
                </h2>
                <motion.p style={{ color: mutedTextColor }} className="text-xl font-light leading-relaxed max-w-lg">
                  Query thousands of geological reports instantly. Our engine provides exact, evidence-backed answers directly from your archives, citing the exact document and page.
                </motion.p>
                <Link href="/assistant" className="inline-flex items-center gap-2 text-blue-500 font-medium hover:text-blue-600 transition-colors group text-lg">
                  Try the Assistant <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex-1 w-full"
              >
                {/* Soft, clean AI chat representation */}
                <div className="w-full rounded-[2rem] bg-white/60 border border-slate-200/50 backdrop-blur-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 blur-[80px] rounded-full pointer-events-none opacity-50" />
                   
                   <div className="space-y-8 relative z-10">
                     <div className="flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
                       <div className="space-y-2">
                         <div className="text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl rounded-tl-none px-5 py-3 w-fit">
                           What was the raw coal production in Gevra Expansion?
                         </div>
                       </div>
                     </div>

                     <div className="flex gap-4 flex-row-reverse">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md flex-shrink-0">
                         <MessageSquare className="w-5 h-5 text-white" />
                       </div>
                       <div className="flex flex-col gap-3 items-end max-w-[80%]">
                         <div className="text-sm text-slate-700 bg-blue-50 rounded-2xl rounded-tr-none px-5 py-4 border border-blue-100 shadow-sm">
                           The raw coal production for the Gevra Expansion Project was recorded at <strong>50.00 MTPA</strong> as per the latest geological assessment.
                         </div>
                         <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-3 py-1 shadow-sm">
                           <FileText className="w-3 h-3 text-slate-400" />
                           <span className="text-xs font-medium text-slate-500">Gevra_Assessment_2023.pdf • Page 14</span>
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* VALIDATION SECTION */}
          <section className="py-40">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-20">
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex-1 space-y-8"
              >
                <h2 className="text-5xl md:text-6xl font-medium tracking-tight leading-tight">
                  Data Quality Secured.
                </h2>
                <motion.p style={{ color: mutedTextColor }} className="text-xl font-light leading-relaxed max-w-lg">
                  Automatically detect contradictions across historical drill logs and modern production reports. Ensure compliance with intelligent validation rules.
                </motion.p>
                <Link href="/validation" className="inline-flex items-center gap-2 text-blue-500 font-medium hover:text-blue-600 transition-colors group text-lg">
                  View Rule Audit <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex-1 w-full"
              >
                {/* Clean, soft validation representation */}
                <div className="w-full rounded-[2rem] bg-white/60 border border-slate-200/50 backdrop-blur-2xl p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
                   <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 blur-[80px] rounded-full pointer-events-none" />
                   
                   <div className="flex flex-col items-center gap-8 relative z-10 w-full">
                      <div className="flex justify-between items-center w-full max-w-sm">
                        <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center gap-1">
                          <span className="text-xs text-slate-400 font-medium">Historical Log</span>
                          <span className="text-sm font-semibold text-slate-700">Depth: 14.2m</span>
                        </div>
                        
                        <div className="w-10 h-[1px] bg-slate-200 border-dashed border-t border-slate-300" />
                        
                        <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center gap-1">
                          <span className="text-xs text-slate-400 font-medium">Modern Report</span>
                          <span className="text-sm font-semibold text-slate-700">Depth: 14.5m</span>
                        </div>
                      </div>
                      
                      <div className="px-5 py-2 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-2 shadow-sm">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-700">0.3m Deviation Detected</span>
                      </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* KNOWLEDGE BASE */}
          <section className="py-40 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="max-w-3xl space-y-8"
            >
              <div className="w-24 h-24 mx-auto rounded-[2rem] bg-blue-50 border border-blue-100 flex items-center justify-center shadow-lg">
                 <Layers className="w-10 h-10 text-blue-500" />
              </div>
              
              <h2 className="text-5xl md:text-7xl font-medium tracking-tight">
                Semantic Knowledge Base.
              </h2>
              <motion.p style={{ color: mutedTextColor }} className="text-xl font-light leading-relaxed">
                Experience the power of FAISS vector search. We chunk and embed every document into a massive intelligence matrix, creating a living semantic network.
              </motion.p>
              
              <div className="pt-8">
                <Link
                  href="/knowledge-base"
                  className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                >
                  Explore Knowledge Graph
                </Link>
              </div>
            </motion.div>
          </section>

        </div>
        
        <div className="h-[20vh]" />
      </main>
    </motion.div>
  );
}
