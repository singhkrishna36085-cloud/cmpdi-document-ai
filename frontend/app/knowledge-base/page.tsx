"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="min-h-[calc(100vh-8rem)] bg-white text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-8 max-w-7xl mx-auto">
      {/* Header Bar in Light Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>GEOLOGICAL KNOWLEDGE VECTOR STORE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Knowledge Base & Vector Store
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            FAISS vector database status, sentence-transformer embedding model configuration, and indexed document chunk repository.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadKnowledgeBaseData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
            Refresh Status
          </button>

          {isHod && (
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-md cursor-pointer disabled:opacity-50"
              title="HOD Administrative Control: Re-index vector embeddings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? "animate-spin" : ""}`} />
              {reindexing ? "Indexing..." : "Reindex Knowledge Base"}
            </button>
          )}
        </div>
      </div>

      {/* Quick Search Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-50 via-teal-50/40 to-blue-50/40 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-teal-800 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-teal-600" /> AI Natural Language Semantic Search
        </div>
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 max-w-4xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all indexed geological reports, borehole logs, core samples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-xs transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors shrink-0 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            Search Now <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Reindex Result Message */}
      {reindexMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="font-medium">{reindexMsg}</span>
          </div>
          <button onClick={() => setReindexMsg(null)} className="text-amber-700 hover:text-amber-900 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Vector Database Health KPI Cards in Pure White */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">FAISS Index Status</span>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {indexStatus?.status || "Ready"}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Indexed Vectors</span>
          <div className="text-2xl sm:text-3xl font-black text-teal-600 font-mono">
            {indexStatus?.total_vectors ?? "0"}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Embedding Dimension</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {indexStatus?.dimension ?? 384}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Embedding Model</span>
          <div className="text-xs font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1.5 rounded-lg mt-1 truncate inline-block">
            {indexStatus?.model_name || "all-MiniLM-L6-v2"}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Searchable Documents</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {documents.length}
          </div>
        </div>
      </div>

      {/* Detailed Technical Specification & Document Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vector Database Metadata Details */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
              <Database className="w-5 h-5" />
            </div>
            <span>FAISS Vector Engine Specifications</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider block">Vector Store Architecture</span>
              <p className="text-slate-900 font-semibold font-mono text-sm">FAISS IndexFlatIP (Cosine Similarity)</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider block">Embedding Model</span>
              <p className="text-teal-700 font-bold font-mono text-sm">sentence-transformers / all-MiniLM-L6-v2</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider block">Dense Vector Dimension</span>
              <p className="text-slate-900 font-semibold font-mono text-sm">384 Float32 Dimensions</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider block">Index Binary Location</span>
              <p className="text-slate-700 font-mono text-xs truncate">
                {indexStatus?.index_path || "backend/app/vector_store/faiss_index.bin"}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2 text-xs text-slate-700">
            <span className="font-bold text-teal-950 block flex items-center gap-2 text-sm">
              <ShieldAlert className="w-4 h-4 text-teal-700" /> RBAC Vector Filtering Security
            </span>
            <p className="leading-relaxed text-slate-600">
              Every semantic query evaluates user credentials (<span className="font-mono font-semibold text-slate-800">NORMAL_USER</span> vs <span className="font-mono font-semibold text-slate-800">HOD</span>). Unauthorized document vectors are dynamically filtered out using backend <span className="font-mono text-slate-800 font-semibold">allowed_doc_ids</span> prior to returning results to client.
            </p>
          </div>
        </div>

        {/* Right Column: Real Document Format Distribution */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span>Indexed Document Formats</span>
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="flex items-center gap-2.5 text-slate-800 font-semibold">
                <FileText className="w-4 h-4 text-rose-500" /> PDF Reports
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs shadow-xs">
                {fileTypeCounts.pdf} documents
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="flex items-center gap-2.5 text-slate-800 font-semibold">
                <FileText className="w-4 h-4 text-blue-500" /> DOCX Borehole Logs
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs shadow-xs">
                {fileTypeCounts.docx} documents
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="flex items-center gap-2.5 text-slate-800 font-semibold">
                <FileText className="w-4 h-4 text-emerald-600" /> XLSX Spreadsheets
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs shadow-xs">
                {fileTypeCounts.xlsx} documents
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="flex items-center gap-2.5 text-slate-800 font-semibold">
                <FileText className="w-4 h-4 text-amber-500" /> CSV Data Tables
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs shadow-xs">
                {fileTypeCounts.csv} documents
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="flex items-center gap-2.5 text-slate-800 font-semibold">
                <FileText className="w-4 h-4 text-purple-500" /> Images & Core Photos
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs shadow-xs">
                {fileTypeCounts.images} documents
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
