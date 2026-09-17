"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroScene } from "@/components/3d/HeroScene";
import { ArrowRight, MessageSquare, ShieldAlert, Cpu, FileText, Database, Layers, Files } from "lucide-react";

export default function CinematicLandingPage() {
  return (
    <div className="relative min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      {/* ── GLOBAL 3D BACKGROUND (Stays fixed as user scrolls) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <HeroScene />
      </div>

      {/* ── TOP FLOATING NAVIGATION ── */}
      <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-slate-950/40 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
               <span className="font-bold text-slate-900 text-lg">C</span>
             </div>
             <span className="font-bold text-lg tracking-wide">CMPDI <span className="font-light text-cyan-400">AI</span></span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
             <Link href="/" className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Home</Link>
             <Link href="/documents" className="hover:text-cyan-400 transition-colors">Documents</Link>
             <Link href="/assistant" className="hover:text-cyan-400 transition-colors">AI Assistant</Link>
             <Link href="/search" className="hover:text-cyan-400 transition-colors">Search</Link>
             <Link href="/validation" className="hover:text-cyan-400 transition-colors">Validation</Link>
          </nav>
          
          <div className="flex items-center gap-4">
             <Link href="/login" className="text-sm font-medium hover:text-cyan-400 transition-colors">Log In</Link>
             <Link 
               href="/dashboard" 
               className="hidden sm:inline-flex items-center justify-center px-5 py-2 text-sm font-bold text-slate-950 bg-cyan-400 rounded-full hover:bg-cyan-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
             >
               Launch Core
             </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 w-full">
        
        {/* ── HERO SECTION (100vh) ── */}
        <section className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto space-y-6 flex flex-col items-center"
          >
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-sm"
            >
              <span className="text-xs sm:text-sm font-medium tracking-[0.2em] text-cyan-300 uppercase">
                AI-Powered Document Intelligence
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              CMPDI{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-500">
                Document AI
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-light text-slate-200 max-w-3xl leading-snug drop-shadow-lg"
            >
              Turn Complex Mining Data Into Intelligent Decisions.
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed"
            >
              Process documents, extract structured knowledge, validate information and ask AI questions with evidence-backed answers.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-6"
            >
              <Link
                href="/documents"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-slate-950 bg-cyan-400 rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
              >
                <span className="relative flex items-center gap-2">
                  Explore Platform <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              
              <Link
                href="/assistant"
                className="group inline-flex items-center justify-center px-8 py-4 font-semibold text-white bg-white/5 border border-white/10 rounded-full backdrop-blur-xl transition-all hover:bg-white/10 hover:scale-[1.02]"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-cyan-400" /> Ask CMPDI AI
              </Link>
            </motion.div>
          </motion.div>

          {/* Bottom Micro-elements */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 1.5 }}
            className="absolute bottom-10 left-0 w-full px-8 flex justify-between items-end text-xs font-mono text-slate-500 uppercase tracking-widest pointer-events-none hidden md:flex"
          >
            <div className="max-w-[150px] leading-relaxed border-l border-cyan-500/30 pl-3">
              Smarter Insights<br/>For A Stronger<br/>Tomorrow
            </div>
            
            <div className="flex flex-col items-center gap-2">
               <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-500/50 to-transparent animate-pulse" />
               <span>Scroll</span>
            </div>
            
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">System Online</span>
            </div>
          </motion.div>

        </section>

        {/* ── SPACING TO LET THE 3D BREATHE ── */}
        <div className="h-[30vh]" />

        {/* ── PIPELINE TRANSITION ── */}
        <section className="py-32 px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="max-w-4xl"
          >
            <h2 className="text-4xl md:text-6xl font-light text-slate-200 mb-6">
              From Reports to <span className="font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Knowledge</span>
            </h2>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mt-16 font-mono text-sm tracking-wider text-cyan-400">
               <div className="flex flex-col items-center gap-3">
                 <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-center backdrop-blur-md">
                   <Files className="w-6 h-6 text-slate-300" />
                 </div>
                 <span>Documents</span>
               </div>
               <div className="hidden md:block w-12 h-[1px] bg-cyan-500/50" />
               <div className="flex flex-col items-center gap-3">
                 <div className="w-16 h-16 rounded-2xl bg-cyan-900/30 border border-cyan-700/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                   <Database className="w-6 h-6 text-cyan-400" />
                 </div>
                 <span>Extraction</span>
               </div>
               <div className="hidden md:block w-12 h-[1px] bg-cyan-500/50" />
               <div className="flex flex-col items-center gap-3">
                 <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                   <ShieldAlert className="w-6 h-6 text-emerald-400" />
                 </div>
                 <span>Validation</span>
               </div>
               <div className="hidden md:block w-12 h-[1px] bg-cyan-500/50" />
               <div className="flex flex-col items-center gap-3">
                 <div className="w-16 h-16 rounded-2xl bg-violet-900/30 border border-violet-700/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                   <Cpu className="w-6 h-6 text-violet-400" />
                 </div>
                 <span>Knowledge</span>
               </div>
            </div>
          </motion.div>
        </section>

        {/* ── AI ASSISTANT SECTION ── */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="flex-1 space-y-6"
            >
              <h2 className="text-5xl md:text-6xl font-bold leading-tight">Ask Your Documents <br/><span className="text-cyan-400">Anything.</span></h2>
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Query thousands of geological reports instantly. Our RAG engine provides exact, evidence-backed answers directly from your archives.
              </p>
              <Link href="/assistant" className="inline-flex items-center gap-2 text-cyan-400 font-bold hover:text-cyan-300 transition-colors group">
                Try the Assistant <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="flex-1 w-full relative"
            >
              {/* Premium abstract representation of the AI chat */}
              <div className="w-full h-80 rounded-3xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
                 
                 <div className="space-y-4">
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-800" />
                     <div className="h-8 w-48 bg-slate-800 rounded-lg" />
                   </div>
                   <div className="flex gap-3 flex-row-reverse">
                     <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                       <MessageSquare className="w-4 h-4 text-cyan-400" />
                     </div>
                     <div className="flex flex-col gap-2 items-end">
                       <div className="h-6 w-64 bg-cyan-900/30 border border-cyan-800/50 rounded-lg" />
                       <div className="h-6 w-40 bg-cyan-900/30 border border-cyan-800/50 rounded-lg" />
                     </div>
                   </div>
                 </div>
                 
                 <div className="mt-8 h-12 w-full bg-slate-950/80 rounded-xl border border-slate-800 flex items-center px-4">
                   <div className="w-2 h-4 bg-cyan-400 animate-pulse" />
                 </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CROSS-DOCUMENT / VALIDATION SECTION ── */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="flex-1 space-y-6"
            >
              <h2 className="text-5xl md:text-6xl font-bold leading-tight">Data Quality <br/><span className="text-emerald-400">Secured.</span></h2>
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Automatically detect contradictions across historical drill logs and modern production reports. Ensure 100% compliance with intelligent validation rules.
              </p>
              <Link href="/validation" className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors group">
                View Rule Audit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="flex-1 w-full"
            >
              {/* Abstract validation representation */}
              <div className="w-full h-80 rounded-3xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden flex items-center justify-center">
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                 
                 <div className="flex items-center gap-8 relative z-10">
                    <div className="flex flex-col gap-4">
                      <div className="w-32 h-10 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-400">Doc A: 14.2m</div>
                      <div className="w-32 h-10 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-400">Doc B: 14.5m</div>
                    </div>
                    
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                      <ShieldAlert className="w-6 h-6 text-rose-400" />
                    </div>
                    
                    <div className="w-32 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-xs font-mono text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      Resolved
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── KNOWLEDGE / SEARCH ── */}
        <section className="py-32 px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="max-w-3xl space-y-8"
          >
            <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
               <Layers className="w-10 h-10 text-violet-400" />
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">Semantic <br/>Knowledge Base</h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              Experience the power of FAISS vector search. We chunk and embed every document into a massive 384-dimensional intelligence matrix.
            </p>
            
            <div className="pt-8">
              <Link
                href="/knowledge-base"
                className="inline-flex items-center justify-center px-10 py-4 font-bold text-white bg-slate-800 rounded-full hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-500 shadow-xl"
              >
                Explore Knowledge Graph
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── SPACING BEFORE FOOTER ── */}
        <div className="h-[20vh]" />
        
      </main>
    </div>
  );
}
