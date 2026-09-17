"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AiOrb } from "@/components/chat/AiOrb";
import { EvidenceCard } from "@/components/chat/EvidenceCard";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Sparkles, 
  FileText, 
  Database, 
  CheckCircle, 
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Info,
  Layers,
  HelpCircle
} from "lucide-react";

export interface SourceReference {
  document_id: number | null;
  chunk_id: number | null;
  original_filename: string | null;
  document_name: string | null;
  page_number: number | null;
  sheet_name: string | null;
  source_reference: string | null;
  chunk_type: string | null;
  relevance_score: number | null;
}

export interface RetrievedChunk {
  relevance_score: number;
  document_id: number | null;
  chunk_id: number | null;
  original_filename: string | null;
  document_name: string | null;
  page_number: number | null;
  sheet_name: string | null;
  chunk_type: string | null;
  source_reference: string | null;
  content: string;
}

export interface AssistantQueryResponse {
  query: string;
  answer: string | null;
  sources: SourceReference[];
  retrieved_chunks: RetrievedChunk[];
  provider: string;
  model: string;
  status: "success" | "not_found" | "configuration_error" | "provider_error" | "timeout_error" | string;
  error?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceReference[];
  retrievedChunks?: RetrievedChunk[];
  provider?: string;
  model?: string;
  status?: string;
  error?: string | null;
}

const SAMPLE_PROMPTS = [
  "Which project produced the highest coal in Q1 2026?",
  "Compare production and stripping ratio between Gevra Expansion and Nigahi.",
  "What safety incidents or hazards occurred at Ukni?",
  "List all projects with average coal seam thickness above 8 metres."
];

function AssistantContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isHod = user?.role === "HOD";

  const paramQuery = searchParams.get("query") || "";
  const paramDocIdStr = searchParams.get("doc_id") || "";
  const paramDocId = paramDocIdStr ? parseInt(paramDocIdStr, 10) : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("Searching authorized documents...");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialTriggeredRef = useRef<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleSourceExpand = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleClearChat = () => {
    setMessages([]);
    setValidationError(null);
  };

  const handleSubmit = useCallback(async (queryText?: string, targetDocId?: number | null) => {
    const textToSubmit = (queryText !== undefined ? queryText : inputValue).trim();

    if (!textToSubmit) {
      setValidationError("Please enter a question.");
      return;
    }

    setValidationError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: textToSubmit,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (queryText === undefined) {
      setInputValue("");
    }

    setIsLoading(true);
    setLoadingStep("Searching authorized documents...");

    // Simulated progress text transition
    const stepTimer = setTimeout(() => {
      setLoadingStep("Generating grounded answer from retrieved evidence...");
    }, 1500);

    try {
      const docIdFilter = targetDocId !== undefined ? targetDocId : paramDocId;

      const response = await fetchWithAuth("/api/assistant/query", {
        method: "POST",
        body: JSON.stringify({
          query: textToSubmit,
          top_k: 5,
          doc_id: docIdFilter || undefined
        })
      });

      clearTimeout(stepTimer);

      if (!response.ok) {
        let errDetail = `HTTP ${response.status} ${response.statusText}`;
        if (response.status === 401) {
          errDetail = "Session expired. Please log in again.";
        } else if (response.status === 403) {
          errDetail = "Access denied: Information restricted to authorized roles.";
        }

        const errorAssistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          content: response.status === 403
            ? "Access denied. The requested information resides in confidential documents restricted to HOD role."
            : "The assistant encountered a backend server error while processing your query.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "server_error",
          error: errDetail
        };
        setMessages((prev) => [...prev, errorAssistantMsg]);
        return;
      }

      const data: AssistantQueryResponse = await response.json();

      let answerText = data.answer || "";
      if (!answerText && data.status === "not_found") {
        answerText = "I couldn't find this information in the available authorized CMPDI/CIL documents.";
      } else if (!answerText && data.error) {
        answerText = `LLM Service Warning: ${data.error}`;
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: data.sources || [],
        retrievedChunks: data.retrieved_chunks || [],
        provider: data.provider,
        model: data.model,
        status: data.status,
        error: data.error
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      clearTimeout(stepTimer);
      const networkErrorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: "Unable to connect to CMPDI AI service. Please verify that the FastAPI backend server is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "network_error",
        error: err.message || "Failed to fetch"
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, paramDocId]);

  // Initial trigger from URL query parameters (e.g., from Search or Viewer pages)
  useEffect(() => {
    if (!initialTriggeredRef.current && (paramQuery.trim() || paramDocId)) {
      initialTriggeredRef.current = true;
      const initialText = paramQuery.trim() || `Tell me about document #${paramDocId}`;
      handleSubmit(initialText, paramDocId);
    }
  }, [paramQuery, paramDocId, handleSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <PageHeader 
          title="AI Document Assistant" 
          description="Ask natural-language questions across official CMPDI reports with evidence-first grounding and PostgreSQL traceability."
        />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded RAG Mode</span>
          </div>

          <div className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
            Role: <span className={isHod ? "text-amber-400 font-bold" : "text-teal-400 font-bold"}>{user?.role || "NORMAL_USER"}</span>
          </div>

          {messages.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearChat}
              className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 border-slate-800 bg-slate-900"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* Security Context Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0" />
          <span>Answers are generated strictly from authorized CMPDI/CIL document evidence. Unsupported claims are rejected.</span>
        </div>
        {paramDocId && (
          <span className="font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
            Filtering Context: Doc #{paramDocId}
          </span>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="backdrop-blur-2xl bg-black/40 rounded-2xl border border-white/10 shadow-2xl flex flex-col min-h-[580px] overflow-hidden relative">
        
        {/* Chat History Messages */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[620px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-2 shadow-lg">
                <MessageSquare className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100">CMPDI Intelligent AI Assistant</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Type a question below to perform dense FAISS vector context retrieval and generate evidence-first answers grounded in PostgreSQL document chunks.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(prompt)}
                    className="p-3.5 text-left bg-slate-950 hover:bg-slate-900 border border-slate-800/80 hover:border-teal-500/40 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-teal-400 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-teal-300">
                        {prompt}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";
              const hasSources = (msg.sources && msg.sources.length > 0);
              const isExpanded = !!expandedSources[msg.id];

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2 w-full`}
                >
                  {/* Sender Header */}
                  <div className={`flex items-center gap-2 px-1 text-xs ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    {!isUser && <AiOrb isThinking={false} />}
                    <span className="font-bold text-slate-400">
                      {isUser ? "You" : "AI Core"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble / Card */}
                  <div
                    className={`max-w-3xl rounded-2xl p-4 sm:p-5 shadow-2xl text-xs sm:text-sm leading-relaxed backdrop-blur-md ${
                      isUser
                        ? "bg-indigo-900/40 text-indigo-50 border border-indigo-500/30 rounded-tr-none font-medium"
                        : "bg-black/60 text-slate-100 border border-slate-800 border-l-cyan-500 border-l-4 rounded-tl-none shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    }`}
                  >
                    {/* Assistant Status Badges */}
                    {!isUser && msg.status && (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {msg.status === "success" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            <CheckCircle className="w-3 h-3" /> Grounded Evidence Answer
                          </span>
                        )}
                        {msg.status === "not_found" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            <HelpCircle className="w-3 h-3" /> Insufficient Context
                          </span>
                        )}
                        {(msg.status === "server_error" || msg.status === "network_error") && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                            <AlertCircle className="w-3 h-3" /> Error Response
                          </span>
                        )}
                      </div>
                    )}

                    {/* Main Content Text */}
                    <div className="whitespace-pre-wrap font-sans text-slate-100 leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Backend Error Alert Banner */}
                    {!isUser && msg.error && (
                      <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Error Detail:</strong> {msg.error}
                        </div>
                      </div>
                    )}

                    {/* Evidence & Source Citations Section */}
                    {!isUser && hasSources && (
                      <div className="mt-4 pt-3.5 border-t border-slate-800">
                        {/* Evidence Traceability Pipeline Visualizer */}
                        <div className="mb-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-cyan-400" /> Grounded Evidence Pipeline Flow
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">Answer</span>
                            <span className="text-slate-500">→</span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold">Source Doc</span>
                            <span className="text-slate-500">→</span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">Page</span>
                            <span className="text-slate-500">→</span>
                            <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/30 font-bold">Chunk</span>
                            <span className="text-slate-500">→</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">Verified Evidence</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <Database className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Evidence Citations & Traceability ({msg.sources?.length})</span>
                          </div>

                          <button
                            onClick={() => toggleSourceExpand(msg.id)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer font-mono"
                          >
                            <span>{isExpanded ? "Collapse Details" : "View Retrieved Chunks"}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Source Cards List */}
                        <div className="space-y-4 mt-4">
                          {msg.sources?.map((src, idx) => (
                            <EvidenceCard 
                              key={idx} 
                              index={idx} 
                              source={src as any} 
                              chunkContent={msg.retrievedChunks?.[idx]?.content} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Loading Animated State */}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start space-y-2"
            >
              <div className="flex items-center gap-2 px-1 text-xs">
                <AiOrb isThinking={true} />
                <span className="font-bold text-slate-400">AI Core</span>
                <span className="text-[11px] font-mono text-cyan-400 animate-pulse">{loadingStep}</span>
              </div>
              <div className="bg-black/60 border border-slate-800 border-l-cyan-500 border-l-4 rounded-2xl rounded-tl-none p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] max-w-md space-y-2 backdrop-blur-md ml-12">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Evaluating FAISS Embeddings...</p>
                    <p className="text-[11px] text-slate-400">{loadingStep}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {validationError && (
            <div className="px-3 py-2 bg-rose-500/10 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Ask a natural language question about CMPDI coal reserves, borehole metrics, core logs..."
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900 p-3 pr-10 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none disabled:bg-slate-950 disabled:cursor-not-allowed"
              />
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !inputValue.trim()}
              className="h-[54px] px-6 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-teal-500/10 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono px-1">
            <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
            <span>API: <code className="text-teal-400">POST /api/assistant/query</code></span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}

