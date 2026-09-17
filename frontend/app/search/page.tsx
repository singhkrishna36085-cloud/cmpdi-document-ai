"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchWithAuth } from "@/lib/api";
import { 
  Search as SearchIcon, 
  Sparkles, 
  FileText, 
  Eye, 
  Bot, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Filter, 
  SlidersHorizontal,
  Info,
  Layers,
  RefreshCw
} from "lucide-react";

interface SearchResultItem {
  relevance_score: number;
  document_id: number;
  chunk_id: number;
  original_filename: string;
  document_name: string;
  page_number: number | null;
  sheet_name: string | null;
  chunk_type: string;
  source_reference: string;
  content: string;
}

interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
  message?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("query") || "";

  const [query, setQuery] = useState<string>(initialQuery);
  const [topK, setTopK] = useState<number>(5);
  const [selectedFormat, setSelectedFormat] = useState<string>("all");

  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);

  // Suggested quick search query chips
  const sampleQueries = [
    "coal production",
    "geological coal seam",
    "borehole depth seam",
    "ash content and GCV",
  ];

  // Core Search API execution
  const executeSearch = useCallback(async (searchQuery: string, limit: number) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetchWithAuth("/api/search", {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery.trim(),
          top_k: limit,
        }),
      });

      if (!res.ok) {
        setErrorCode(res.status);
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
        } else if (res.status === 403) {
          setError("Access denied: Search results restricted to authorized documents.");
        } else {
          setError(`Search execution failed (${res.status}).`);
        }
        setSearchResults(null);
        return;
      }

      const data: SearchResponse = await res.json();
      setSearchResults(data);
    } catch (err: any) {
      setError("Unable to search the knowledge base. Please check backend connection.");
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute initial search on page load if query param exists
  useEffect(() => {
    if (initialQuery.trim()) {
      executeSearch(initialQuery, topK);
    }
  }, [initialQuery, executeSearch, topK]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?query=${encodeURIComponent(query.trim())}`);
      executeSearch(query, topK);
    }
  };

  const handleChipClick = (chipQuery: string) => {
    setQuery(chipQuery);
    router.push(`/search?query=${encodeURIComponent(chipQuery)}`);
    executeSearch(chipQuery, topK);
  };

  // Filter search results by file format if user selected format filter
  const filteredResults = useMemo(() => {
    if (!searchResults || !searchResults.results) return [];
    if (selectedFormat === "all") return searchResults.results;
    return searchResults.results.filter((item) => {
      const filename = (item.original_filename || "").toLowerCase();
      if (selectedFormat === "pdf") return filename.endsWith(".pdf");
      if (selectedFormat === "docx") return filename.endsWith(".docx") || filename.endsWith(".doc");
      if (selectedFormat === "xlsx") return filename.endsWith(".xlsx") || filename.endsWith(".xls");
      if (selectedFormat === "csv") return filename.endsWith(".csv");
      return true;
    });
  }, [searchResults, selectedFormat]);

  const formatRelevanceBadge = (score: number) => {
    const percentage = (score * 100).toFixed(1);
    if (score >= 0.5) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
          <Sparkles className="w-3 h-3" /> {percentage}% Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
        {percentage}% Match
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Semantic Search"
        description="Query CMPDI geological exploration reports, borehole logs, core samples, and operational metrics using natural language AI search."
      />

      {/* Prominent Glowing Glass Search Form & Controls */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background Ambient Flare */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
            <input
              type="text"
              placeholder="Enter a natural language search query (e.g. 'coal seam thickness', 'borehole depth')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Top-K Selector Control */}
            <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>Top K:</span>
              <select
                value={topK}
                onChange={(e) => {
                  const newK = parseInt(e.target.value, 10);
                  setTopK(newK);
                  if (query.trim()) executeSearch(query, newK);
                }}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-slate-900 text-slate-100">5</option>
                <option value={10} className="bg-slate-900 text-slate-100">10</option>
                <option value={20} className="bg-slate-900 text-slate-100">20</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sample Search Query Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-mono">Suggested Queries:</span>
          {sampleQueries.map((sample) => (
            <button
              key={sample}
              onClick={() => handleChipClick(sample)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-all cursor-pointer"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

      {/* Format Filter Bar (if search results present) */}
      {searchResults && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl">
            {["all", "pdf", "docx", "xlsx", "csv"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  selectedFormat === fmt
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredResults.length} of {searchResults.total_results} matching vector chunks for "{searchResults.query}"
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 animate-pulse" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state with AI processing animation */}
      {loading ? (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-cyan-500/30 text-center space-y-3 backdrop-blur-xl">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs font-mono font-bold text-cyan-300">Performing FAISS Dense Vector Match...</p>
            <p className="text-[11px] text-slate-400 font-mono">Searching 384-dimensional embeddings across CMPDI geological archives</p>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse p-6 space-y-3 backdrop-blur-xl" />
          ))}
        </div>
      ) : !searchResults ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs font-mono space-y-3 backdrop-blur-xl">
          <SearchIcon className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Ready for Semantic Search</h3>
          <p className="text-xs max-w-md mx-auto text-slate-400">
            Enter a question or search term above to perform dense vector search against FAISS embeddings across all uploaded CMPDI reports.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs font-mono space-y-3 backdrop-blur-xl">
          <Info className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Relevant Documents Found</h3>
          <p className="text-xs max-w-md mx-auto text-slate-400">
            No document chunks in the knowledge base matched your query "{searchResults.query}". Try rephrasing your search terms.
          </p>
        </div>
      ) : (
        /* Search Results List */
        <div className="space-y-4">
          {filteredResults.map((item, index) => {
            const isExpanded = expandedChunkId === item.chunk_id;

            return (
              <div
                key={`${item.document_id}-${item.chunk_id}-${index}`}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all space-y-4 shadow-xl backdrop-blur-xl group"
              >
                {/* Result Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30">
                        Doc #{item.document_id}
                      </span>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30">
                        Chunk #{item.chunk_id}
                      </span>
                      {item.page_number && (
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold">
                          Page {item.page_number}
                        </span>
                      )}
                      {item.sheet_name && (
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                          Sheet: {item.sheet_name}
                        </span>
                      )}
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold uppercase">
                        {item.chunk_type}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {item.document_name || item.original_filename}
                    </h3>
                    <p className="text-xs font-mono text-slate-400">{item.original_filename}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {formatRelevanceBadge(item.relevance_score)}
                  </div>
                </div>

                {/* Extracted Content Snippet / Full Text */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">
                    Retrieved Content (Source: {item.source_reference})
                  </span>
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80 overflow-x-auto">
                    {isExpanded ? item.content : (item.content.length > 300 ? item.content.slice(0, 300) + "..." : item.content)}
                  </pre>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
                    <span className="text-cyan-300 font-bold block uppercase tracking-wider text-[10px]">Vector Match Technical Details:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                      <div>Document ID: <strong className="text-cyan-400">#{item.document_id}</strong></div>
                      <div>Chunk ID: <strong className="text-purple-300">#{item.chunk_id}</strong></div>
                      <div>Similarity Score: <strong className="text-emerald-400">{item.relevance_score}</strong></div>
                      <div>Source Ref: <strong className="text-amber-300">{item.source_reference}</strong></div>
                    </div>
                  </div>
                )}

                {/* Footer Action Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
                  <button
                    onClick={() => setExpandedChunkId(isExpanded ? null : item.chunk_id)}
                    className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? "Show Less" : "Expand Full Content"}
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assistant?doc_id=${item.document_id}&query=${encodeURIComponent(query)}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 transition-all shadow-sm"
                    >
                      <Bot className="w-3.5 h-3.5 text-cyan-400" /> Ask AI About This
                    </Link>

                    <Link
                      href={`/documents/viewer?id=${item.document_id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold border border-slate-800 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> View Document
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Real Search History Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 backdrop-blur-xl">
        <h4 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-cyan-400" /> System Search History
        </h4>
        <p className="text-xs text-slate-400 font-mono italic">No search history available.</p>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}


