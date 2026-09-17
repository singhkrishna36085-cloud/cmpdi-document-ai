"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { 
  Sparkles, 
  RefreshCw, 
  Tag, 
  FileText, 
  Database, 
  Layers, 
  BarChart2, 
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Filter
} from "lucide-react";
import { DocumentItem } from "@/types/reports";
import { TopicAnalysisResponse, TopicCluster, WordFrequency, AnalyzedDocInfo } from "@/types/topics";

import { fetchWithAuth } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TopicsPage() {
  // State: Document Selection
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [useAllDocs, setUseAllDocs] = useState(true);

  // State: Analysis Results
  const [analysis, setAnalysis] = useState<TopicAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // State: UI Toggles
  const [showDocSelector, setShowDocSelector] = useState(false);

  // Load real documents for selector
  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetchWithAuth("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const toggleDocSelection = (docId: number) => {
    setUseAllDocs(false);
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
    if (validationError) setValidationError(null);
  };

  const handleSelectAll = () => {
    setUseAllDocs(true);
    setSelectedDocIds([]);
    if (validationError) setValidationError(null);
  };

  const handleAnalyze = async () => {
    if (!useAllDocs && selectedDocIds.length === 0) {
      setValidationError("Select at least one document or choose 'All Documents'.");
      return;
    }

    setValidationError(null);
    setError(null);
    setIsAnalyzing(true);

    try {
      const payload = {
        document_ids: useAllDocs ? null : selectedDocIds
      };

      const res = await fetchWithAuth("/api/topics/analyze", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errDetail = `HTTP ${res.status} ${res.statusText}`;
        try {
          const errJson = await res.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {}
        throw new Error(errDetail);
      }

      const data: TopicAnalysisResponse = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Unable to analyze documents. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <PageHeader 
          title="Word Cloud & Topic Intelligence" 
          description="Discover dominant terms, key frequency distributions, and TF-IDF topic clusters across CMPDI/CIL document content."
        />

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowDocSelector(!showDocSelector)}
            className="flex items-center gap-2 text-gray-700 border-gray-300"
          >
            <Filter className="w-4 h-4 text-blue-600" />
            <span>{useAllDocs ? "All Documents" : `${selectedDocIds.length} Selected`}</span>
            {showDocSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-blue-700 hover:bg-blue-800 text-white font-medium flex items-center gap-2 shadow-sm"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Analyze Documents</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Document Selection Drawer / Panel */}
      {showDocSelector && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Document Scope Filter</h4>
              <p className="text-xs text-gray-500">Choose specific CMPDI documents for NLP topic extraction or analyze all processed documents.</p>
            </div>

            <button
              onClick={handleSelectAll}
              className={`text-xs font-semibold px-3 py-1 rounded-lg border cursor-pointer transition-colors ${
                useAllDocs ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              All Processed Documents ({documents.length})
            </button>
          </div>

          {isLoadingDocs ? (
            <div className="py-6 text-center text-xs text-gray-500">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin mx-auto mb-1" />
              <span>Loading documents...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isSelected = !useAllDocs && selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocSelection(doc.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 text-blue-900 font-medium shadow-2xs"
                        : "bg-gray-50/70 border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected || useAllDocs}
                        onChange={() => {}}
                        className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300 cursor-pointer"
                      />
                      <span className="truncate">{doc.original_filename || doc.name}</span>
                    </div>

                    <span className="font-mono text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 uppercase font-semibold">
                      {doc.type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Analysis Failed</span>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 animate-spin mx-auto">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Analyzing Document Text & Generating Word Cloud...</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Cleaning stop words, calculating term frequencies, and building TF-IDF topic clusters.
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Display */}
      {!isAnalyzing && !analysis && (
        <EmptyState
          icon={<Tag className="h-full w-full text-gray-400" />}
          title="No topic analysis available yet."
          description="Click 'Analyze Documents' above to run real NLP word frequency, word cloud PNG generation, and TF-IDF topic clustering across your CMPDI documents."
        />
      )}

      {!isAnalyzing && analysis && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Analysis Summary Header Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Topic Analysis ID #{analysis.analysis_id}</h3>
                <p className="text-xs text-gray-500">
                  Analyzed {analysis.documents_analyzed} document{analysis.documents_analyzed !== 1 ? "s" : ""} • Generated on {new Date(analysis.generated_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {analysis.word_frequencies.length} Key Terms
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                {analysis.topics.length} Topic Clusters
              </span>
            </div>
          </div>

          {/* Word Cloud & Top Terms Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Word Cloud PNG Image Display */}
            <div className="lg:col-span-7">
              <SectionCard 
                title="Document Word Cloud" 
                description="Visual frequency distribution generated from processed document text."
              >
                {analysis.wordcloud_image ? (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-2xs">
                    <img
                      src={analysis.wordcloud_image}
                      alt="CMPDI Document Word Cloud"
                      className="w-full h-auto max-h-[380px] object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                    Word Cloud PNG generation unavailable.
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Top Frequency Terms Table */}
            <div className="lg:col-span-5">
              <SectionCard 
                title="Top Terms & Frequency" 
                description="Highest frequency domain terms extracted from context."
              >
                <div className="max-h-[380px] overflow-y-auto pr-1">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold sticky top-0">
                      <tr>
                        <th scope="col" className="px-3 py-2.5">Term</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Frequency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {analysis.word_frequencies.slice(0, 15).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-3 py-2 font-mono font-medium text-gray-900 capitalize">
                            {item.term}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700 font-mono">
                            {item.frequency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>

          </div>

          {/* Topic Identification Cards Section */}
          <SectionCard 
            title="Extracted Topic Clusters" 
            description="Algorithmic TF-IDF topic themes discovered across CMPDI document text."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analysis.topics.map((topic) => (
                <div
                  key={topic.topic_id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4 hover:border-blue-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Topic #{topic.topic_id}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        {topic.document_count} Document{topic.document_count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 leading-snug">
                      {topic.topic_name}
                    </h4>
                  </div>

                  {/* Keywords Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Key Keywords:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.keywords.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-mono border border-gray-200"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Source Documents list */}
                  {topic.source_documents && topic.source_documents.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 space-y-1">
                      <span className="text-[11px] text-gray-400 font-medium block">Contributing Documents:</span>
                      <div className="space-y-1">
                        {topic.source_documents.map((srcDoc, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-1.5 text-xs text-gray-700 truncate font-mono">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{srcDoc.original_filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Analyzed Source Documents Table */}
          {analysis.source_documents && analysis.source_documents.length > 0 && (
            <SectionCard 
              title="Analyzed Source Documents" 
              description="Documents evaluated during this topic analysis."
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">Doc ID</th>
                      <th scope="col" className="px-4 py-3">Filename</th>
                      <th scope="col" className="px-4 py-3">Type</th>
                      <th scope="col" className="px-4 py-3">Category</th>
                      <th scope="col" className="px-4 py-3 text-right">Chunks Analyzed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {analysis.source_documents.map((sDoc) => (
                      <tr key={sDoc.document_id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-500">#{sDoc.document_id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{sDoc.original_filename}</td>
                        <td className="px-4 py-3 font-mono uppercase text-gray-600">{sDoc.type}</td>
                        <td className="px-4 py-3 text-gray-500">{sDoc.category || "General"}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{sDoc.chunk_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

        </div>
      )}
    </div>
  );
}
