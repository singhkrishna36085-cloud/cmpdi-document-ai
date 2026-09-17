"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import { 
  Search as SearchIcon, 
  FileText, 
  Eye, 
  Bot, 
  ArrowRight, 
  ShieldAlert,
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Info,
  RefreshCw,
  Filter
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
  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);

  const sampleQueries = [
    "coal production",
    "geological coal seam",
    "borehole depth seam",
    "ash content and GCV",
  ];

  const executeSearch = useCallback(async (searchQuery: string, limit: number) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth("/api/search", {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery.trim(),
          top_k: limit,
        }),
      });

      if (!res.ok) {
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
          {percentage}% Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
        {percentage}% Match
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
      
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Global Semantic Search</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Query CMPDI geological exploration reports, borehole logs, core samples, and operational metrics using natural language AI search.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter a search query (e.g. 'coal seam thickness', 'borehole depth')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-3 rounded-md bg-slate-50 border border-slate-300 text-sm text-slate-600">
              <Filter className="w-4 h-4" />
              <span>Results:</span>
              <select
                value={topK}
                onChange={(e) => {
                  const newK = parseInt(e.target.value, 10);
                  setTopK(newK);
                  if (query.trim()) executeSearch(query, newK);
                }}
                className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-3 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 cursor-pointer h-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching</span>
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Suggested:</span>
          {sampleQueries.map((sample) => (
            <button
              key={sample}
              onClick={() => handleChipClick(sample)}
              className="px-3 py-1.5 rounded bg-slate-100 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 text-xs font-medium transition-all cursor-pointer"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

      {/* Format Filter Bar */}
      {searchResults && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5">
            {["all", "pdf", "docx", "xlsx", "csv"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all cursor-pointer ${
                  selectedFormat === fmt
                    ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-500 font-medium px-2">
            Showing {filteredResults.length} of {searchResults.total_results} matching chunks
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          <div className="p-12 rounded-lg bg-white border border-slate-200 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">Querying Knowledge Base...</p>
            <p className="text-xs text-slate-500 mt-1">Searching embeddings across CMPDI geological archives</p>
          </div>
        </div>
      ) : !searchResults ? (
        <div className="p-12 rounded-lg bg-white border border-slate-200 text-center shadow-sm">
          <SearchIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Ready for Semantic Search</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            Enter a search term above to perform dense vector search against FAISS embeddings across all uploaded CMPDI reports.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="p-12 rounded-lg bg-white border border-slate-200 text-center shadow-sm">
          <Info className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">No Relevant Documents Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            No document chunks in the knowledge base matched your query "{searchResults.query}". Try rephrasing your search terms.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((item, index) => {
            const isExpanded = expandedChunkId === item.chunk_id;
            return (
              <div
                key={`${item.document_id}-${item.chunk_id}-${index}`}
                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                        Doc #{item.document_id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
                        Chunk #{item.chunk_id}
                      </span>
                      {item.page_number && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                          Page {item.page_number}
                        </span>
                      )}
                      {item.sheet_name && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                          Sheet: {item.sheet_name}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase border border-slate-200">
                        {item.chunk_type}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                      {item.document_name || item.original_filename}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{item.original_filename}</p>
                  </div>

                  <div className="shrink-0">
                    {formatRelevanceBadge(item.relevance_score)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
                    Extracted Passage (Source: {item.source_reference})
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100 font-mono">
                    {isExpanded ? item.content : (item.content.length > 350 ? item.content.slice(0, 350) + "..." : item.content)}
                  </div>
                </div>

                {/* Details Section */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-md text-xs">
                      <div className="font-semibold text-slate-700 mb-2">Vector Match Details:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600">
                        <div>Document ID: <strong className="text-slate-900">{item.document_id}</strong></div>
                        <div>Chunk ID: <strong className="text-slate-900">{item.chunk_id}</strong></div>
                        <div>Score: <strong className="text-slate-900">{item.relevance_score}</strong></div>
                        <div className="truncate" title={item.source_reference}>Source: <strong className="text-slate-900">{item.source_reference}</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setExpandedChunkId(isExpanded ? null : item.chunk_id)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? "Show Less" : "Expand Full Text"}
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assistant?doc_id=${item.document_id}&query=${encodeURIComponent(query)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <Bot className="w-4 h-4 text-blue-600" /> Ask AI
                    </Link>

                    <Link
                      href={`/documents/viewer?id=${item.document_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 border border-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Eye className="w-4 h-4" /> View Document
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
