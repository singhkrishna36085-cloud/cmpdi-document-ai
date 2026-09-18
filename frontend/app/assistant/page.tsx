"use client";

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  HelpCircle, 
  Globe, 
  Copy, 
  Check, 
  ArrowRight, 
  Cpu,
  ThumbsUp,
  ThumbsDown,
  Printer,
  Bot,
  User as UserIcon,
  RotateCcw,
  Zap,
  BookOpen
} from "lucide-react";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";

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

export interface WebSource {
  title: string;
  url: string;
}

export interface AssistantQueryResponse {
  query: string;
  answer: string | null;
  source_type?: "document" | "web" | "global_ai" | "hybrid" | string;
  sources: SourceReference[];
  web_sources?: WebSource[];
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
  source_type?: string;
  sources?: SourceReference[];
  web_sources?: WebSource[];
  retrievedChunks?: RetrievedChunk[];
  provider?: string;
  model?: string;
  status?: string;
  error?: string | null;
}

const QUICK_PROMPT_CARDS = [
  {
    category: "PROJECT COMPARISON",
    title: "Compare Gevra vs Nigahi Production",
    desc: "Analyze stripped volume, coal extraction, and stripping ratios across sectors.",
    prompt: "Compare production and stripping ratio between Gevra Expansion and Nigahi.",
    icon: Database,
  },
  {
    category: "SECTOR INTELLIGENCE",
    title: "Latest 2026 Coal Guidelines",
    desc: "Retrieve recent Ministry of Coal directives, policy notifications and updates.",
    prompt: "What are the latest 2026 coal sector guidelines and news in India?",
    icon: Globe,
  },
  {
    category: "MINING CALCULATIONS",
    title: "Stripping Ratio & Overburden",
    desc: "Calculate strip ratio formulas with borehole core log practical examples.",
    prompt: "Explain how stripping ratio and overburden are calculated with a practical example.",
    icon: Cpu,
  },
  {
    category: "SAFETY & COMPLIANCE",
    title: "Mine Safety Incidents & Audits",
    desc: "Audit DGMS safety guidelines, incident records, and hazard logs.",
    prompt: "What safety incidents or hazards occurred at Ukni?",
    icon: ShieldAlert,
  }
];

const SAMPLE_PROMPTS = [
  "Which project produced the highest coal in Q1 2026?",
  "What are the latest 2026 coal sector guidelines and news in India?",
  "Explain how stripping ratio and overburden are calculated with a practical example.",
  "Compare production and seam thickness between Gevra and Nigahi."
];

const ASSISTANT_MODES = [
  { id: "all", label: "Autonomous Hybrid", icon: Sparkles, hint: "FAISS Vectors + Web + Multi-Step Reasoning" },
  { id: "doc", label: "CMPDI Documents", icon: FileText, hint: "Strictly Grounded in Verified Mining Reports" },
  { id: "web", label: "Live Web Intel", icon: Globe, hint: "Latest Ministry & Global Coal Directives" },
  { id: "calc", label: "Mine Calculations", icon: Cpu, hint: "Stripping Ratio & Borehole Reserves Math" },
  { id: "safety", label: "DGMS Compliance", icon: ShieldAlert, hint: "Mine Safety Incidents & Hazard Regulations" }
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});
  const [openReasoning, setOpenReasoning] = useState<Record<string, boolean>>({});

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

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

  const toggleReasoning = (msgId: string) => {
    setOpenReasoning((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleFeedback = (msgId: string, type: "up" | "down") => {
    setFeedbackMap((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? undefined! : type
    }));
  };

  const handleCopy = (id: string, text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintBrief = (content: string, timestamp: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>KhaniGyan-AI - Intelligence Brief</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { font-size: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 4px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; font-family: monospace; }
            .content { font-size: 14px; white-space: pre-wrap; }
            .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>Khani Gyan AI • Verified Intelligence Brief</h1>
          <div class="meta">Generated: ${timestamp} | Confidential & Grounded Evidence</div>
          <div class="content">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <div class="footer">KhaniGyan-AI • Geological Intelligence System</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
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
        source_type: data.source_type,
        sources: data.sources || [],
        web_sources: data.web_sources || [],
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
          description="Ask questions across official CMPDI reports, live internet search, or global engineering intelligence."
        />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hybrid Autonomous AI</span>
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
          <span>Multi-source reasoning enabled: Official CMPDI reports + Live Web Grounding + Global Engineering Intelligence.</span>
        </div>
        {paramDocId && (
          <span className="font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
            Filtering Context: Doc #{paramDocId}
          </span>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="relative bg-gradient-to-b from-[#090f22] via-[#070b18] to-[#050811] rounded-2xl sm:rounded-3xl border border-cyan-500/20 shadow-[0_20px_70px_rgba(0,0,0,0.7)] flex flex-col min-h-[600px] overflow-hidden backdrop-blur-xl">
        {/* Neon Hairline Accent Header Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
        
        {/* Chat History Messages */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[620px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4 space-y-6 relative z-10">
              
              {/* Breathing Neural Core Crest (Pure CSS & SVG, zero 3D crystal/rhombus shapes) */}
              <div className="relative mb-1">
                <div className="absolute -inset-4 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-[#0f2142] to-[#070e1c] border border-cyan-500/40 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.25)]">
                  <div className="absolute inset-1 rounded-full border border-cyan-400/20 animate-spin" style={{ animationDuration: "16s" }} />
                  <div className="absolute inset-2.5 rounded-full border border-teal-400/15" />
                  <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                    <Bot className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </div>


              {/* Title & Subtitle */}
              <div className="max-w-xl mx-auto space-y-2">
                <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                  {greeting}, Mining Engineer
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                  What geological data would you like to analyze?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                  Connected to dense FAISS vector embeddings, authorized PostgreSQL chunks, and live government engineering reports.
                </p>
              </div>

              {/* 4 Sleek Prompt Cards */}
              <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
                {QUICK_PROMPT_CARDS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(card.prompt)}
                      className="group relative flex flex-col justify-between p-4 rounded-2xl bg-[#0a1224]/80 hover:bg-[#0e1a38] border border-cyan-500/15 hover:border-cyan-400/50 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] text-left cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono tracking-widest text-cyan-400/90 uppercase font-bold">
                            {card.category}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed group-hover:text-slate-300">
                          {card.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Capabilities row */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-[11px] font-mono text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" /> FAISS Dense Vectors
                </span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL Verification
                </span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Live Web Grounding
                </span>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";
              const isExpanded = !!expandedSources[msg.id];
              const hasSources = (msg.sources && msg.sources.length > 0);
              const hasWebSources = (msg.web_sources && msg.web_sources.length > 0);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 px-1 text-xs">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      isUser
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    }`}>
                      {isUser ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <span className="font-bold text-slate-300 font-mono">
                      {isUser ? "You" : "KHANI GYAN AI"}
                    </span>
                    {!isUser && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ONLINE
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-500">{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble / Card */}
                  {isUser ? (
                    <div className="max-w-2xl bg-gradient-to-r from-cyan-950/80 to-[#0c1a36] text-slate-100 border border-cyan-500/30 rounded-2xl rounded-tr-none p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-4xl bg-[#090f22]/90 backdrop-blur-md text-slate-100 border border-cyan-500/20 rounded-2xl rounded-tl-none p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] space-y-4">
                      {/* Top row: Status badges & Engine */}
                      <div className="pb-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {msg.source_type === "document" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              <FileText className="w-3 h-3" /> Verified Document Evidence
                            </span>
                          )}
                          {msg.source_type === "web" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                              <Globe className="w-3 h-3" /> Live Web Grounding
                            </span>
                          )}
                          {msg.source_type === "hybrid" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                              <Sparkles className="w-3 h-3" /> Hybrid Multi-Source Intelligence
                            </span>
                          )}
                          {msg.source_type === "global_ai" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                              <Sparkles className="w-3 h-3" /> AI Global Knowledge Engine
                            </span>
                          )}
                          {(!msg.source_type && msg.status === "success") && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              <CheckCircle className="w-3 h-3" /> Answer Generated
                            </span>
                          )}
                          {msg.status === "not_found" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                              <HelpCircle className="w-3 h-3" /> General Knowledge Response
                            </span>
                          )}
                          {(msg.status === "server_error" || msg.status === "network_error") && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                              <AlertCircle className="w-3 h-3" /> Error Response
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-400">
                          Engine: <span className="text-cyan-300 font-bold">{msg.provider || "Gemini 2.5 RAG"}</span>
                        </div>
                      </div>

                      {/* DeepSeek/Claude Style Neural Reasoning Accordion */}
                      <div className="rounded-xl border border-cyan-500/20 bg-[#070c18] overflow-hidden">
                        <button
                          onClick={() => toggleReasoning(msg.id)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-cyan-950/30 hover:bg-cyan-900/30 text-xs text-cyan-300 font-mono transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-semibold tracking-wide">Neural Reasoning & Evidence Trace</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {msg.sources && msg.sources.length > 0 ? `${msg.sources.length} Chunks Matched` : "Synthesized"}
                            </span>
                          </div>
                          {openReasoning[msg.id] ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        </button>

                        {openReasoning[msg.id] && (
                          <div className="p-3 text-[11px] font-mono text-slate-300 space-y-2.5 border-t border-cyan-500/15 bg-slate-950/70">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                              <div className="p-2 rounded-lg bg-[#0b1426] border border-slate-800">
                                <div className="text-slate-500">PROVIDER / ENGINE</div>
                                <div className="text-cyan-300 font-bold mt-0.5">{msg.provider || "DeepSeek / Gemini 2.5"}</div>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0b1426] border border-slate-800">
                                <div className="text-slate-500">MODEL ARCHITECTURE</div>
                                <div className="text-slate-200 font-bold mt-0.5">{msg.model || "gemini-2.5-flash"}</div>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0b1426] border border-slate-800">
                                <div className="text-slate-500">RETRIEVAL STRATEGY</div>
                                <div className="text-emerald-400 font-bold mt-0.5">
                                  {msg.source_type === "document" ? "FAISS Dense Index" : msg.source_type === "web" ? "Live SerpAPI Grounding" : "Hybrid Fusion Engine"}
                                </div>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#09101f] border border-cyan-500/10 text-slate-400 text-[11px] leading-relaxed">
                              <span className="text-cyan-400 font-bold">Execution Trace: </span>
                              Vector similarity evaluated across CMPDI geological archives &rarr; Contextual filtering applied &rarr; Cross-encoder verification &rarr; Anti-hallucination grounded brief generated.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Main Markdown Content */}
                      <div className="text-slate-100 font-sans text-sm leading-relaxed">
                        <MarkdownViewer content={msg.content} />
                      </div>

                      {/* Web Grounding Sources */}
                      {hasWebSources && (
                        <div className="mt-4 pt-3.5 border-t border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-2 font-mono">
                            <Globe className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Live Web Grounding Sources ({msg.web_sources?.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {msg.web_sources?.map((ws, wIdx) => (
                              <a
                                key={wIdx}
                                href={ws.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition-all text-xs text-slate-300 group font-mono"
                              >
                                <span className="truncate group-hover:text-cyan-300">{ws.title || ws.url}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Backend Error Alert Banner */}
                      {msg.error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Error Detail:</strong> {msg.error}
                          </div>
                        </div>
                      )}

                      {/* Evidence & Source Citations Section */}
                      {hasSources && (
                        <div className="mt-4 pt-3.5 border-t border-slate-800/80">
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

                          <div className="space-y-2 mt-2">
                            {msg.sources?.map((src, idx) => {
                              const scorePct = src.relevance_score ? Math.round(src.relevance_score * 100) : 85;
                              const refText = src.source_reference || (src.page_number ? `Page ${src.page_number}` : (src.sheet_name ? `Sheet: ${src.sheet_name}` : "Document Text"));

                              return (
                                <div
                                  key={idx}
                                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 text-xs space-y-2 hover:border-cyan-500/40 transition-all shadow-md group"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2 font-bold text-slate-200 truncate">
                                      <FileText className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                                      <span className="truncate">{src.original_filename || src.document_name || "CMPDI Document"}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 font-mono">
                                      <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[11px]">
                                        {refText}
                                      </span>
                                      
                                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px]">
                                        <span className="font-bold">Match: {scorePct}%</span>
                                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${scorePct}%` }} />
                                        </div>
                                      </div>

                                      {src.document_id && (
                                        <Link
                                          href={`/documents/viewer?id=${src.document_id}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-[11px] transition-all shadow-sm"
                                        >
                                          View <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      )}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-2.5 pt-2 border-t border-slate-800 text-slate-300 text-[11px] font-mono bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                                      <div className="text-cyan-400 font-sans font-bold text-[10px] uppercase tracking-wider mb-1">
                                        Context Block (Doc #{src.document_id}, Chunk #{src.chunk_id}):
                                      </div>
                                      {msg.retrievedChunks?.[idx]?.content || "Retrieved vector content match."}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Modern Interactive Action Bar */}
                      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-500">Helpful?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, "up")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              feedbackMap[msg.id] === "up"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                : "bg-slate-900/80 text-slate-400 hover:text-emerald-400 border-slate-800 hover:border-emerald-500/30"
                            }`}
                            title="Helpful & Accurate"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, "down")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              feedbackMap[msg.id] === "down"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                : "bg-slate-900/80 text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/30"
                            }`}
                            title="Inaccurate or Irrelevant"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                            title="Copy answer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              const msgIdx = messages.findIndex(m => m.id === msg.id);
                              const prevUserQuery = msgIdx > 0 && messages[msgIdx - 1]?.sender === "user" ? messages[msgIdx - 1].content : undefined;
                              if (prevUserQuery) handleSubmit(prevUserQuery);
                            }}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 transition-all flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                            title="Regenerate this answer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Regenerate</span>
                          </button>

                          <button
                            onClick={() => handlePrintBrief(msg.content, msg.timestamp)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                            title="Print or Save Brief"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Print Brief</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Modern Thinking Step-by-Step State */}
          {isLoading && (
            <div className="flex flex-col items-start space-y-2">
              <div className="flex items-center gap-2 px-1 text-xs">
                <span className="font-bold font-mono text-cyan-400">KHANI GYAN AI</span>
                <span className="text-[11px] font-mono text-slate-400">Synthesizing...</span>
              </div>
              <div className="bg-[#0a1224]/90 border border-cyan-500/30 rounded-2xl rounded-tl-none p-4 shadow-[0_0_30px_rgba(6,182,212,0.1)] max-w-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="absolute inset-0 rounded-xl bg-cyan-400/20 animate-ping opacity-30" />
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono text-cyan-200 tracking-wide">
                      NEURAL REASONING ACTIVE
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{loadingStep}</p>
                  </div>
                </div>
                {/* Visual mini progress pipeline */}
                <div className="h-1 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/40">
                  <div className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modern Floating Command Dock */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#060a14] via-[#080e1e] to-transparent border-t border-cyan-500/15 space-y-2.5">
          {/* Quick Mode Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {ASSISTANT_MODES.map((mode) => {
              const ModeIcon = mode.icon;
              const isActive = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold"
                      : "bg-[#0b1426]/70 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
                  }`}
                  title={mode.hint}
                >
                  <ModeIcon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {validationError && (
            <div className="px-3.5 py-2 bg-rose-500/10 text-rose-300 text-xs font-mono font-bold rounded-xl border border-rose-500/25 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="relative rounded-2xl sm:rounded-3xl bg-[#0b1329]/95 backdrop-blur-xl border border-cyan-500/25 p-2.5 sm:p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] focus-within:border-cyan-400/60 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.15)] transition-all">
            
            {/* Top row: Textarea */}
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask a question across CMPDI reports, borehole data, or engineering calculations..."
              rows={2}
              className="w-full resize-none bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50 leading-relaxed font-sans"
            />

            {/* Bottom Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 px-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RAG: FAISS + PostgreSQL
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-slate-300 text-[10px] font-mono">
                  <Globe className="w-3 h-3 text-blue-400" />
                  Hybrid Search
                </span>
                {paramDocId && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                    Doc #{paramDocId}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                  Return <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">↵</kbd> to send
                </span>

                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputValue.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs font-mono tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-95 cursor-pointer ml-auto sm:ml-0"
                >
                  <span>TRANSMIT</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

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

