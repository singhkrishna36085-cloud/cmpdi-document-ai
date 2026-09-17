"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchWithAuth } from "@/lib/api";
import { DocumentDetail } from "@/types/document";
import { 
  Files, 
  Search, 
  Filter, 
  Eye, 
  Upload, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Database
} from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchWithAuth("/api/documents");
        if (!res.ok) {
          if (res.status === 401) {
            setError("Session expired. Please log in again.");
          } else {
            setError(`Failed to load documents (${res.status})`);
          }
          return;
        }
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (err: any) {
        setError("Unable to connect to CMPDI backend server.");
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  const categories = Array.from(new Set(documents.map((d) => d.category).filter(Boolean)));

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.source.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Document Repository"
          description="Manage, inspect, and analyze real CMPDI geological and operational reports."
        />
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-teal-500/10 shrink-0"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename, document name, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>

        {categories.length > 0 && (
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse p-6 space-y-4 backdrop-blur-xl"
            >
              <div className="h-5 bg-slate-800 rounded-lg w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded-lg w-1/2" />
              <div className="h-12 bg-slate-800/40 rounded-xl w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={<Files className="h-full w-full" />}
          title={searchQuery || selectedCategory !== "all" ? "No matching documents" : "No documents found"}
          description={
            searchQuery || selectedCategory !== "all"
              ? "Try adjusting your search filters."
              : "Get started by uploading a new CMPDI report."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/50 hover:bg-slate-900/80 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30">
                    ID #{doc.id}
                  </span>
                  <div className="flex items-center gap-2">
                    {doc.is_confidential && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3" /> HOD Only
                      </span>
                    )}
                    {getStatusBadge(doc.processing_status)}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {doc.name || doc.original_filename}
                </h3>
                <p className="text-xs text-slate-400 font-mono line-clamp-1 mt-1">
                  {doc.original_filename}
                </p>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-mono font-semibold">Category</span>
                    <span className="text-slate-200 font-semibold">{doc.category || "General"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-mono font-semibold">Source</span>
                    <span className="text-slate-200 font-semibold">{doc.source || "CMPDI"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-mono font-semibold">File Size</span>
                    <span className="text-slate-300 font-mono">{formatFileSize(doc.file_size)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-mono font-semibold">Pages</span>
                    <span className="text-slate-300 font-mono">{doc.page_count ?? "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3.5 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}
                </span>
                <Link
                  href={`/documents/viewer?id=${doc.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  View Details
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

