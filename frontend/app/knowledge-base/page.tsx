"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DocumentDetail } from "@/types/document";
import { 
  Database, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  Layers, 
  Cpu, 
  BarChart2, 
  ArrowRight, 
  Info, 
  FileCheck, 
  AlertCircle,
  Sparkles
} from "lucide-react";

interface IndexStatus {
  status: string;
  total_vectors: number;
  dimension: number;
  model_name: string;
  index_path?: string;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isHod = user?.role === "HOD";

  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [documents, setDocuments] = useState<DocumentDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState<boolean>(false);
  const [reindexMsg, setReindexMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  async function loadKnowledgeBaseData() {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, docsRes] = await Promise.allSettled([
        fetchWithAuth("/api/search/status"),
        fetchWithAuth("/api/documents"),
      ]);

      if (statusRes.status === "fulfilled" && statusRes.value.ok) {
        const sData = await statusRes.value.json();
        setIndexStatus(sData);
      }

      if (docsRes.status === "fulfilled" && docsRes.value.ok) {
        const dData = await docsRes.value.json();
        setDocuments(dData.documents || []);
      }
    } catch (err: any) {
      setError("Unable to connect to CMPDI backend server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKnowledgeBaseData();
  }, []);

  // Calculate real document file extension counts from PostgreSQL records
  const fileTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pdf: 0,
      docx: 0,
      xlsx: 0,
      csv: 0,
      images: 0,
      other: 0,
    };

    documents.forEach((d) => {
      const parts = (d.original_filename || "").split(".");
      const ext = (d.type || (parts.length > 1 ? parts.pop() : "") || "").toLowerCase();
      if (ext.includes("pdf")) counts.pdf++;
      else if (ext.includes("doc")) counts.docx++;
      else if (ext.includes("xls")) counts.xlsx++;
      else if (ext.includes("csv")) counts.csv++;
      else if (["jpg", "jpeg", "png"].some((imgExt) => ext.includes(imgExt))) counts.images++;
      else counts.other++;
    });

    return counts;
  }, [documents]);

  // HOD Re-index handler
  const handleReindex = async () => {
    if (!isHod) return;
    const confirmReindex = window.confirm(
      "Are you sure you want to re-index all PostgreSQL document chunks into the FAISS vector database?\n\nThis will re-encode all document text using sentence-transformers (all-MiniLM-L6-v2)."
    );
    if (!confirmReindex) return;

    setReindexing(true);
    setReindexMsg(null);
    try {
      const res = await fetchWithAuth("/api/search/reindex", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setReindexMsg(`Successfully re-indexed ${data.indexed_count || data.indexed || 0} document chunks into FAISS vector database.`);
        await loadKnowledgeBaseData();
      } else {
        const errData = await res.json();
        setReindexMsg(`Reindex failed: ${errData.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      setReindexMsg(`Network error: ${err.message}`);
    } finally {
      setReindexing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Knowledge Base & Vector Store"
          description="FAISS vector database status, sentence-transformer embedding model configuration, and indexed document chunk repository."
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadKnowledgeBaseData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Status
          </button>

          {isHod && (
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/10"
              title="HOD Administrative Control: Re-index vector embeddings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? "animate-spin" : ""}`} />
              {reindexing ? "Indexing..." : "Reindex Knowledge Base"}
            </button>
          )}
        </div>
      </div>

      {/* Quick Search Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 text-teal-400 font-bold text-sm">
          <Sparkles className="w-4 h-4" /> AI Natural Language Semantic Search
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all indexed geological reports, borehole logs, core samples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors shrink-0 flex items-center gap-2"
          >
            Search Now <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Reindex Result Message */}
      {reindexMsg && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{reindexMsg}</span>
          </div>
          <button onClick={() => setReindexMsg(null)} className="text-amber-400 hover:text-amber-200 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Vector Database Health KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">FAISS Index Status</span>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> {indexStatus?.status || "Ready"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Indexed Vectors</span>
          <div className="text-xl font-bold text-teal-400 font-mono">
            {indexStatus?.total_vectors ?? "N/A"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Embedding Dimension</span>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {indexStatus?.dimension ?? 384}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Embedding Model</span>
          <div className="text-xs font-mono font-bold text-cyan-400 mt-1 truncate">
            {indexStatus?.model_name || "all-MiniLM-L6-v2"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Searchable Documents</span>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {documents.length}
          </div>
        </div>
      </div>

      {/* Detailed Technical Specification & Document Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vector Database Metadata Details */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" /> FAISS Vector Engine Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] uppercase block">Vector Store Architecture</span>
              <p className="text-slate-200 font-semibold font-mono">FAISS IndexFlatIP (Cosine Similarity)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] uppercase block">Embedding Model</span>
              <p className="text-teal-400 font-semibold font-mono">sentence-transformers / all-MiniLM-L6-v2</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] uppercase block">Dense Vector Dimension</span>
              <p className="text-slate-200 font-semibold font-mono">384 Float32 Dimensions</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] uppercase block">Index Binary Location</span>
              <p className="text-slate-300 font-mono text-[11px] truncate">
                {indexStatus?.index_path || "backend/app/vector_store/faiss_index.bin"}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs text-slate-400">
            <span className="font-bold text-slate-200 block flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-teal-400" /> RBAC Vector Filtering Security
            </span>
            <p className="leading-relaxed">
              Every semantic query evaluates user credentials (`NORMAL_USER` vs `HOD`). Unauthorized document vectors are dynamically filtered out using backend `allowed_doc_ids` prior to returning results to client.
            </p>
          </div>
        </div>

        {/* Right Column: Real Document Format Distribution */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-teal-400" /> Indexed Document Formats
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <FileText className="w-4 h-4 text-rose-400" /> PDF Reports
              </span>
              <span className="font-bold text-slate-100">{fileTypeCounts.pdf} documents</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <FileText className="w-4 h-4 text-blue-400" /> DOCX Borehole Logs
              </span>
              <span className="font-bold text-slate-100">{fileTypeCounts.docx} documents</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <FileText className="w-4 h-4 text-emerald-400" /> XLSX Spreadsheets
              </span>
              <span className="font-bold text-slate-100">{fileTypeCounts.xlsx} documents</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <FileText className="w-4 h-4 text-amber-400" /> CSV Data Tables
              </span>
              <span className="font-bold text-slate-100">{fileTypeCounts.csv} documents</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <FileText className="w-4 h-4 text-purple-400" /> Images & Core Photos
              </span>
              <span className="font-bold text-slate-100">{fileTypeCounts.images} documents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
