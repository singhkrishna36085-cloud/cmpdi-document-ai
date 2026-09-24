"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import { DocumentDetail } from "@/types/document";
import { 
  Files, 
  Search, 
  Filter, 
  Eye, 
  Upload, 
  ShieldAlert,
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Download,
  Trash2,
  Loader2,
  RotateCcw
} from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  const handleReprocess = async (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setReprocessingId(docId);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}/process`, { method: "POST" });
      if (res.ok) {
        const refreshRes = await fetchWithAuth("/api/documents");
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setDocuments(data.documents || []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Re-process notice: ${err.detail || "Processing could not be started"}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDownload = async (docId: number, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(docId);
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}/file?download=true`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Download failed. The file may have been cleared from cloud temporary storage.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `document_${docId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Network error during download: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDocument = async (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this document and its records?")) return;
    try {
      const res = await fetchWithAuth(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete document: ${err.detail || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
      
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Document Repository</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Centralized archive for geological, mining, and operational reports. Manage and analyze securely.
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm shrink-0"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {categories.length > 0 && (
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white cursor-pointer"
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
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Content */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto" />
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              <Files className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {searchQuery || selectedCategory !== "all" ? "No matching documents" : "No documents found"}
            </h3>
            <p className="text-sm text-slate-500">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search filters."
                : "Get started by uploading a new CMPDI report."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Document Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Upload Date</th>
                  <th className="px-6 py-4">Pages</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{doc.name || doc.original_filename}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-mono text-slate-400">ID: {doc.id}</span>
                        {doc.is_confidential && (
                          <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                            <ShieldAlert className="w-3 h-3" /> HOD
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {doc.category || "General"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {doc.page_count ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.processing_status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/documents/viewer?id=${doc.id}&tab=preview`}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 text-sm"
                          title="View Document & Intelligence"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        {doc.processing_status !== "completed" && (
                          <button
                            onClick={(e) => handleReprocess(doc.id, e)}
                            disabled={reprocessingId === doc.id}
                            className="text-amber-600 hover:text-amber-800 transition-colors p-1 disabled:opacity-50"
                            title="Re-run fast document processing"
                          >
                            {reprocessingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDownload(doc.id, doc.original_filename, e)}
                          disabled={downloadingId === doc.id}
                          className="text-slate-500 hover:text-blue-600 transition-colors p-1 disabled:opacity-50"
                          title="Download Original File"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
