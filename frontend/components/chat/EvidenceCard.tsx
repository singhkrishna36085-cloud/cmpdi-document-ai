"use client";

import { motion } from "framer-motion";
import { FileText, Database, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface EvidenceCardProps {
  index: number;
  source: {
    document_id: number | null;
    chunk_id: number | null;
    original_filename: string | null;
    document_name: string | null;
    page_number: number | null;
    sheet_name: string | null;
    source_reference: string | null;
    relevance_score: number | null;
  };
  chunkContent?: string;
}

export function EvidenceCard({ index, source, chunkContent }: EvidenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scorePct = source.relevance_score ? Math.round(source.relevance_score * 100) : 85;
  const refText =
    source.source_reference ||
    (source.page_number
      ? `Page ${source.page_number}`
      : source.sheet_name
      ? `Sheet: ${source.sheet_name}`
      : "Document Text");

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: index * 0.1,
      }}
      whileHover={{ scale: 1.02 }}
      className="relative bg-slate-950/80 backdrop-blur-md border border-slate-700/50 hover:border-emerald-500/60 rounded-xl p-4 text-xs space-y-3 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] overflow-hidden group cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Glowing Top Edge */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2 font-bold text-slate-200 truncate">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate text-sm">
            {source.original_filename || source.document_name || "Verified Source"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-900/80 text-emerald-300 border border-emerald-500/20 text-[11px] shadow-inner">
            {refText}
          </span>

          {/* Confidence Visualization Bar */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px]">
            <span className="font-bold">Score: {scorePct}%</span>
            <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          {source.document_id && (
            <Link
              href={`/documents/viewer?id=${source.document_id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-bold text-[11px] transition-all shadow-md hover:shadow-cyan-500/20"
            >
              View <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Expandable Chunk Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="mt-2 pt-3 border-t border-slate-700/50 text-slate-300 text-[11px] font-mono bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 shadow-inner">
          <div className="text-emerald-400 font-sans font-bold text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileText className="w-3 h-3" />
            Context Chunk
          </div>
          <div className="leading-relaxed">
            {chunkContent || "No detailed chunk content available."}
          </div>
        </div>
      </motion.div>
      
      {!isExpanded && chunkContent && (
        <div className="flex justify-center -mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
          <ChevronDown className="w-4 h-4 text-emerald-400" />
        </div>
      )}
      {isExpanded && chunkContent && (
        <div className="flex justify-center -mt-1">
          <ChevronUp className="w-4 h-4 text-emerald-400" />
        </div>
      )}
    </motion.div>
  );
}
