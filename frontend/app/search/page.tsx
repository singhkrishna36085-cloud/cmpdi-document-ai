"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Layers
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

export default function SearchPage() {
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

      {/* Prominent Search Form & Controls */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Enter a natural language search query (e.g. 'coal seam thickness', 'borehole depth')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Top-K Selector Control */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Top K:</span>
              <select
                value={topK}
                onChange={(e) => {
                  const newK = parseInt(e.target.value, 10);
                  setTopK(newK);
                  if (query.trim()) executeSearch(query, newK);
                }}
                className="bg-transparent text-teal-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-slate-900 text-slate-100">5</option>
                <option value={10} className="bg-slate-900 text-slate-100">10</option>
                <option value={20} className="bg-slate-900 text-slate-100">20</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-colors shrink-0 flex items-center gap-2"
            >
              {loading ? "Searching..." : "Search"}
              <ArrowRight className="w-4 h-4" />
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
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-teal-400 text-xs font-mono transition-all"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

      {/* Format Filter Bar (if search results present) */}
      {searchResults && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {["all", "pdf", "docx", "xlsx", "csv"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                  selectedFormat === fmt
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
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
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-900/50 border border-slate-800 animate-pulse p-5 space-y-3" />
          ))}
        </div>
      ) : !searchResults ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm space-y-2">
          <SearchIcon className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Ready for Semantic Search</h3>
          <p className="text-xs max-w-md mx-auto">
            Enter a question or search term above to perform dense vector search against FAISS embeddings across all uploaded CMPDI reports.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm space-y-2">
          <Info className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Relevant Documents Found</h3>
          <p className="text-xs max-w-md mx-auto">
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
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-lg"
              >
                {/* Result Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400 font-bold">
                        Doc #{item.document_id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                        Chunk #{item.chunk_id}
                      </span>
                      {item.page_number && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          Page {item.page_number}
                        </span>
                      )}
                      {item.sheet_name && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-medium">
                          Sheet: {item.sheet_name}
                        </span>
                      )}
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium uppercase">
                        {item.chunk_type}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100">
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
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Retrieved Content (Source: {item.source_reference})
                  </span>
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/60 overflow-x-auto">
                    {isExpanded ? item.content : (item.content.length > 300 ? item.content.slice(0, 300) + "..." : item.content)}
                  </pre>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
                    <span className="text-slate-400 font-bold block">Vector Match Technical Details:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                      <div>Document ID: <strong className="text-teal-400">#{item.document_id}</strong></div>
                      <div>Chunk ID: <strong className="text-cyan-400">#{item.chunk_id}</strong></div>
                      <div>Similarity Score: <strong className="text-emerald-400">{item.relevance_score}</strong></div>
                      <div>Source Ref: <strong className="text-amber-400">{item.source_reference}</strong></div>
                    </div>
                  </div>
                )}

                {/* Footer Action Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
                  <button
                    onClick={() => setExpandedChunkId(isExpanded ? null : item.chunk_id)}
                    className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? "Show Less" : "Expand Full Content"}
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assistant?doc_id=${item.document_id}&query=${encodeURIComponent(query)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-semibold border border-teal-500/20 transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" /> Ask AI About This
                    </Link>

                    <Link
                      href={`/documents/viewer?id=${item.document_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-400" /> View Document
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Real Search History Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-400" /> Search History
        </h4>
        <p className="text-xs text-slate-500 italic">No search history available.</p>
      </div>
    </div>
  );
}
