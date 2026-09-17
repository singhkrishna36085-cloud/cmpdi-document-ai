"use client";

import React from "react";
import { 
  FileText, 
  Database, 
  Cpu, 
  Search, 
  ShieldCheck, 
  BarChart2, 
  Sparkles,
  Layers,
  CheckCircle2
} from "lucide-react";

export function Hero2DFallback() {
  return (
    <div className="relative w-full h-[480px] flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl">
      {/* Volumetric Glowing Light Cones */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-24 -left-20 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Central Rotating Orbital Rings */}
      <div className="absolute w-80 h-80 rounded-full border border-cyan-500/20 animate-orbit-rotate pointer-events-none flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50 absolute -top-1.5" />
      </div>
      <div className="absolute w-[360px] h-[360px] rounded-full border border-purple-500/15 animate-orbit-rotate pointer-events-none flex items-center justify-center [animation-direction:reverse]">
        <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-lg shadow-purple-500/50 absolute -bottom-1.5" />
      </div>

      {/* Central 3D Core Sphere */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center w-36 h-36 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-purple-700/20 border border-cyan-400/40 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 animate-float-slow group cursor-pointer">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-cyan-400/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex flex-col items-center gap-2 text-center p-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <Cpu className="w-8 h-8 animate-spin [animation-duration:12s]" />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              CMPDI AI CORE
            </span>
          </div>
        </div>
      </div>

      {/* Floating 3D Node Cards */}
      <div className="absolute top-12 left-8 sm:left-16 p-3.5 rounded-2xl glass-panel-interactive border-cyan-500/30 animate-float-slow flex items-center gap-3">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">Borehole Logs & Reports</div>
          <span className="text-[10px] font-mono text-cyan-400">PDF / XLSX Parsed</span>
        </div>
      </div>

      <div className="absolute bottom-12 left-6 sm:left-12 p-3.5 rounded-2xl glass-panel-interactive border-purple-500/30 animate-float-reverse flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">FAISS Vector Store</div>
          <span className="text-[10px] font-mono text-purple-300">384-Dim MiniLM-L6</span>
        </div>
      </div>

      <div className="absolute top-14 right-8 sm:right-16 p-3.5 rounded-2xl glass-panel-interactive border-emerald-500/30 animate-float-reverse flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">Data Validation Engine</div>
          <span className="text-[10px] font-mono text-emerald-400">Real-time Quality Checks</span>
        </div>
      </div>

      <div className="absolute bottom-14 right-6 sm:right-12 p-3.5 rounded-2xl glass-panel-interactive border-amber-500/30 animate-float-slow flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">RAG Natural Language</div>
          <span className="text-[10px] font-mono text-amber-300">Evidence Citations</span>
        </div>
      </div>
    </div>
  );
}
