"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EvidenceCard } from "@/components/chat/EvidenceCard";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Database, 
  CheckCircle, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Info,
  HelpCircle,
  Bot
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

    const stepTimer = setTimeout(() => {
      setLoadingStep("Generating grounded answer from retrieved evidence...");
    }, 1500);

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
        error: data.error,
        officialUrl: data.officialUrl,
        officialTitle: data.officialTitle
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      clearTimeout(stepTimer);
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
    <div className="space-y-6 pb-12 bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 text-slate-900">
      {/* Header Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">AI Document Assistant</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Ask natural-language questions across official CMPDI reports with evidence-first grounding and traceability.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
            <Bot className="w-3.5 h-3.5" />
            <span>Grounded RAG Mode</span>
          </div>

          <div className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            Role: <span className={isHod ? "text-amber-700 font-bold" : "text-blue-700 font-bold"}>{user?.role || "NORMAL_USER"}</span>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Security Context Banner */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Answers are generated strictly from authorized CMPDI/CIL document evidence.</span>
        </div>
        {paramDocId && (
          <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
            Filtering Context: Doc #{paramDocId}
          </span>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-h-[580px] overflow-hidden relative">
        
        {/* Chat History Messages */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[620px] bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <MessageSquare className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800">Khani Gyan AI Assistant</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Type a question below to perform dense FAISS vector context retrieval and generate evidence-first answers grounded in PostgreSQL document chunks.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(prompt)}
                    className="p-3.5 text-left bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-start gap-2.5">
                      <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 group-hover:text-blue-800 font-medium">
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
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 w-full`}>
                  <div className={`flex items-center gap-2 px-1 text-xs ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="font-semibold text-slate-600">
                      {isUser ? "You" : "Khani Gyan AI"}
                    </span>
                    <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  <div className={`max-w-3xl rounded-lg p-4 shadow-sm text-sm leading-relaxed border ${
                    isUser
                      ? "bg-blue-600 text-white border-blue-700 rounded-tr-none font-medium"
                      : "bg-white text-slate-800 border-slate-200 rounded-tl-none"
                  }`}>
                    {!isUser && msg.status && (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {msg.status === "success" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Grounded Evidence Answer
                          </span>
                        )}
                        {msg.status === "not_found" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                            <HelpCircle className="w-3 h-3" /> Insufficient Context
                          </span>
                        )}
                        {(msg.status === "server_error" || msg.status === "network_error") && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Error Response
                          </span>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {!isUser && msg.error && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div><strong>Error Detail:</strong> {msg.error}</div>
                      </div>
                    )}

                    {!isUser && hasSources && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Database className="w-4 h-4 text-blue-600" />
                            <span>Evidence Citations ({msg.sources?.length})</span>
                          </div>
                          <button
                            onClick={() => toggleSourceExpand(msg.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? "Collapse Details" : "View Retrieved Chunks"}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="space-y-3 mt-3">
                            {msg.sources?.map((src, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                                <div className="text-xs font-semibold text-slate-700 mb-1">
                                  Doc #{src.document_id} - {src.document_name}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 mb-2">
                                  {src.source_reference} (Score: {src.relevance_score})
                                </div>
                                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap font-mono">
                                  {msg.retrievedChunks?.[idx]?.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center gap-2 px-1 text-xs">
                <span className="font-semibold text-slate-600">Khani Gyan AI</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-4 shadow-sm max-w-md space-y-2 ml-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Evaluating Knowledge Base...</p>
                    <p className="text-xs text-slate-500">{loadingStep}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          {validationError && (
            <div className="mb-3 px-3 py-2 bg-rose-50 text-rose-700 text-sm font-medium rounded-md border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
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
                placeholder="Ask a natural language question about CMPDI documents..."
                rows={2}
                className="w-full resize-none rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !inputValue.trim()}
              className="h-[60px] px-6 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
