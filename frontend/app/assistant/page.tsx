"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Trash2, 
  Database, 
  CheckCircle, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldAlert,
  HelpCircle,
  Bot,
  Sparkles
} from "lucide-react";
import { AiOrb } from "@/components/chat/AiOrb";

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
  officialUrl?: string;
  officialTitle?: string;
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
  officialUrl?: string;
  officialTitle?: string;
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
  const [loadingStep, setLoadingStep] = useState<string>("Initializing neural vector retrieval...");
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
    setLoadingStep("Extracting semantic embeddings from FAISS...");

    const stepTimer1 = setTimeout(() => {
      setLoadingStep("Cross-referencing PostgreSQL authorized document chunks...");
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep("Synthesizing 4D intelligence response...");
    }, 3500);

    try {
      const docIdFilter = targetDocId !== undefined ? targetDocId : paramDocId;

      const historyContext = messages.slice(-4).map(m => ({
        role: m.sender,
        content: m.content
      }));

      const response = await fetchWithAuth("/api/assistant/query", {
        method: "POST",
        body: JSON.stringify({
          query: textToSubmit,
          top_k: 5,
          doc_id: docIdFilter || undefined,
          history: historyContext.length > 0 ? historyContext : undefined
        })
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

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
        error: data.error,
        officialUrl: data.officialUrl,
        officialTitle: data.officialTitle
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      const networkErrorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: "Unable to connect to Khani Gyan AI service. Please verify that the FastAPI backend server is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "network_error",
        error: err.message || "Failed to fetch"
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, paramDocId, messages]);

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
    <div className="space-y-6 pb-12 bg-[#030509] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-100 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-cyan-900/10 blur-[120px] pointer-events-none z-0 rounded-full" />
      <div className="absolute bottom-0 left-0 w-full max-w-2xl h-[300px] bg-blue-900/10 blur-[100px] pointer-events-none z-0 rounded-full" />

      {/* Header Bar */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">Khani Gyan 4D Assistant</h1>
            <p className="text-xs font-mono text-cyan-400/80">
              Neural Grounded Intelligence Core
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-300 text-xs font-bold font-mono border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Bot className="w-3.5 h-3.5" />
            <span>RAG Active</span>
          </div>

          <div className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
            Role: <span className={isHod ? "text-emerald-400" : "text-cyan-400"}>{user?.role || "NORMAL_USER"}</span>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl flex flex-col min-h-[600px] overflow-hidden relative z-10">
        
        {/* Full Screen Loading Overlay with 4D Animation */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(16px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030509]/80"
            >
              <motion.div
                layoutId="ai-orb-main"
                className="relative z-10"
                initial={{ scale: 0.5, y: -50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              >
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <AiOrb isThinking={true} className="w-64 h-64 sm:w-80 sm:h-80" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex flex-col items-center"
              >
                <div className="text-cyan-400 font-mono text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                  Processing Query
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-3 font-mono tracking-wider max-w-md text-center animate-pulse">
                  {loadingStep}
                </div>
                
                {/* Visual loading bar */}
                <div className="w-48 h-1 bg-slate-800 rounded-full mt-6 overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat History Messages */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[620px] custom-scrollbar">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-8 relative">
              
              {/* Idle Orb at the top/center */}
              <motion.div layoutId="ai-orb-main" className="relative z-10 cursor-pointer hover:scale-105 transition-transform">
                <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full scale-150" />
                <AiOrb isThinking={false} className="w-40 h-40" />
              </motion.div>

              <div className="relative z-10 max-w-xl mx-auto space-y-4">
                <h3 className="text-xl font-bold text-white font-mono tracking-tight">Khani Gyan Core is Online</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  I am connected to the CMPDI vector index. Ask me anything about production metrics, geological surveys, or safety compliance, and I will extract the exact evidence from authorized documents.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 relative z-10">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(prompt)}
                    className="p-4 text-left bg-slate-950/50 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all duration-300 group cursor-pointer shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 group-hover:animate-pulse" />
                      <span className="text-sm text-slate-300 group-hover:text-cyan-100 font-medium">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 w-full relative z-10`}
                >
                  <div className={`flex items-center gap-2 px-1 text-xs font-mono ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <span className={`font-bold ${isUser ? "text-cyan-400" : "text-emerald-400"}`}>
                      {isUser ? "USER" : "KHANI GYAN AI"}
                    </span>
                    <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                  </div>

                  <div className={`max-w-3xl rounded-2xl p-5 shadow-2xl text-sm leading-relaxed border ${
                    isUser
                      ? "bg-cyan-950/30 text-white border-cyan-500/30 rounded-tr-sm shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                      : "bg-slate-900/80 backdrop-blur-xl text-slate-200 border-white/10 rounded-tl-sm"
                  }`}>
                    {!isUser && msg.status && (
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {msg.status === "success" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" /> EVIDENCE GROUNDED
                          </span>
                        )}
                        {msg.status === "not_found" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <HelpCircle className="w-3 h-3" /> LOW CONFIDENCE
                          </span>
                        )}
                        {(msg.status === "server_error" || msg.status === "network_error") && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" /> SYSTEM ERROR
                          </span>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans text-[15px]">
                      {msg.content}
                    </div>

                    {!isUser && msg.error && (
                      <div className="mt-4 p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div><strong className="font-mono text-rose-400 uppercase text-xs block mb-1">Fault Detected</strong> {msg.error}</div>
                      </div>
                    )}

                    {!isUser && hasSources && (
                      <div className="mt-5 pt-5 border-t border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase">
                            <Database className="w-3.5 h-3.5 text-cyan-500" />
                            <span>Retrieved Sources ({msg.sources?.length})</span>
                          </div>
                          <button
                            onClick={() => toggleSourceExpand(msg.id)}
                            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 bg-cyan-950/30 rounded-md border border-cyan-500/20"
                          >
                            <span>{isExpanded ? "COLLAPSE" : "INSPECT"}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 mt-3 overflow-hidden"
                            >
                              {msg.sources?.map((src, idx) => (
                                <div key={idx} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl hover:border-cyan-500/30 transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-bold text-slate-200 line-clamp-1">
                                      {src.document_name}
                                    </div>
                                    <div className="text-[10px] px-2 py-0.5 rounded bg-blue-900/30 border border-blue-500/20 text-blue-400 font-mono font-bold shrink-0">
                                      ID: {src.document_id}
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-mono text-cyan-500/70 mb-3 uppercase tracking-wider">
                                    Ref: {src.source_reference} • Score: {src.relevance_score}
                                  </div>
                                  <div className="text-xs text-slate-400 bg-[#030509] p-3 rounded-lg border border-white/5 whitespace-pre-wrap font-mono leading-relaxed">
                                    {msg.retrievedChunks?.[idx]?.content}
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 sm:p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 relative z-10">
          {validationError && (
            <div className="mb-3 px-4 py-2 bg-rose-950/50 text-rose-400 text-xs font-mono font-bold rounded-lg border border-rose-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Initialize semantic query..."
                rows={1}
                className="relative w-full resize-none rounded-xl border border-white/10 bg-[#030509]/80 px-4 py-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none disabled:opacity-50 transition-all font-mono"
                style={{ minHeight: "56px", maxHeight: "120px" }}
              />
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !inputValue.trim()}
              className="relative h-[56px] px-8 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:shadow-none overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10">Transmit</span>
              <Send className="w-4 h-4 relative z-10" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Security: <span className="text-emerald-500/80">AES-256 Encrypted Stream</span></span>
            <span>Return ↵ to transmit</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-[#030509] flex items-center justify-center">
        <div className="text-cyan-500 font-mono text-sm animate-pulse">Initializing Core...</div>
      </div>
    }>
      <AssistantContent />
    </Suspense>
  );
}
