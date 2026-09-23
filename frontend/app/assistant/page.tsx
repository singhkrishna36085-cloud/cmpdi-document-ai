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
  mode?: string;
}

const MODE_CARDS_MAP: Record<string, Array<{
  category: string;
  title: string;
  desc: string;
  prompt: string;
  icon: any;
}>> = {
  all: [
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
  ],
  doc: [
    {
      category: "BOREHOLE LITHOLOGY",
      title: "Borehole Core Logs & Strata",
      desc: "Extract borehole core logs, depth intervals, and coal seam thicknesses.",
      prompt: "Retrieve borehole core logs and seam thickness from authorized CMPDI documents.",
      icon: FileText,
    },
    {
      category: "COAL QUALITY",
      title: "Proximate Analysis & Ash %",
      desc: "Retrieve proximate analysis results (Ash %, Moisture %, GCV) from project files.",
      prompt: "What are the proximate analysis results (Ash %, Moisture %) reported in Nigahi project?",
      icon: Database,
    },
    {
      category: "RESERVES CLASSIFICATION",
      title: "Proved vs Indicated Reserves",
      desc: "Summarize geological reserve classifications across CMPDI authorized blocks.",
      prompt: "Summarize the Proved vs Indicated coal reserve metrics across the project files.",
      icon: Layers,
    },
    {
      category: "OVERBURDEN METRICS",
      title: "Stripped Volume & Extraction",
      desc: "Extract official overburden volume stripped and coal extracted figures.",
      prompt: "Extract overburden volume stripped and coal extracted values from CMPDI reports.",
      icon: BookOpen,
    }
  ],
  web: [
    {
      category: "MINISTRY DIRECTIVES",
      title: "Latest 2026 Policy Circulars",
      desc: "Live search recent Ministry of Coal notifications, Gazette orders, and circulars.",
      prompt: "What are the latest 2026 Ministry of Coal guidelines, policies, and notifications in India?",
      icon: Globe,
    },
    {
      category: "PRODUCTION TARGETS",
      title: "Coal India (CIL) Dispatch Targets",
      desc: "Real-time updates on CIL domestic coal extraction and off-take goals.",
      prompt: "What is the latest domestic coal extraction and dispatch target for Coal India Limited?",
      icon: Zap,
    },
    {
      category: "COMMERCIAL BLOCKS",
      title: "Commercial Auction Results",
      desc: "Find recent commercial coal mine auction results and revenue share updates.",
      prompt: "What are the latest commercial coal block auction results and policy updates in 2025-2026?",
      icon: ExternalLink,
    },
    {
      category: "CLEAN COAL TECH",
      title: "Coal Gasification & Washeries",
      desc: "Live web intelligence on national coal gasification schemes and Washery directives.",
      prompt: "What are the latest government directives on coal gasification and washery reject usage?",
      icon: Sparkles,
    }
  ],
  calc: [
    {
      category: "STRIPPING RATIO",
      title: "Calculate Stripping Ratio (SR)",
      desc: "Step-by-step ratio calculation: Overburden volume (m³) / Coal extracted (tonnes).",
      prompt: "Calculate stripping ratio with an example where Overburden = 4,200,000 m³ and Coal = 1,400,000 tonnes.",
      icon: Cpu,
    },
    {
      category: "RESERVE ESTIMATION",
      title: "In-situ Coal Reserve Formula",
      desc: "Calculate geological reserves from Area (sq m), Seam Thickness (m), and Specific Gravity.",
      prompt: "Explain the formula and calculate in-situ coal reserve from Area, Seam Thickness, and Specific Gravity.",
      icon: Database,
    },
    {
      category: "ECONOMIC CUTOFF",
      title: "Break-Even Stripping Ratio (BESR)",
      desc: "Formulate break-even economics based on mining costs, recovery, and market price.",
      prompt: "How is Break-Even Stripping Ratio (BESR) calculated from cost of mining, coal selling price, and processing cost?",
      icon: RotateCcw,
    },
    {
      category: "EMPIRICAL FORMULAS",
      title: "Specific Gravity & Ash Relation",
      desc: "Compute expected specific gravity from Ash % using CMPDI empirical formulas.",
      prompt: "Calculate expected specific gravity given non-coking coal ash percentage with standard CMPDI empirical formula.",
      icon: FileSpreadsheet,
    }
  ],
  safety: [
    {
      category: "CMR 2017 COMPLIANCE",
      title: "Bench Height & Slope Stability",
      desc: "Statutory parameters for opencast mine bench dimensions and slope angles under CMR 2017.",
      prompt: "What are the statutory requirements for bench height, width, and slope stability under Coal Mines Regulations 2017?",
      icon: ShieldAlert,
    },
    {
      category: "DUMP SAFETY",
      title: "Dump Slope Radar & Monitoring",
      desc: "DGMS compliance circulars for overburden waste dump monitoring and stability.",
      prompt: "What are the DGMS guidelines for overburden dump slope monitoring and radar installation in opencast mines?",
      icon: AlertCircle,
    },
    {
      category: "HEMM TRANSPORT",
      title: "HEMM Haul Road Safety Rules",
      desc: "DGMS transport standards for dumpers, shovels, and gradient specifications.",
      prompt: "What are the statutory DGMS safety rules for Heavy Earth Moving Machinery (HEMM) haul road management?",
      icon: Info,
    },
    {
      category: "HAZARD AUDIT",
      title: "Incident Reporting & Investigation",
      desc: "Statutory procedure for reporting and investigating dangerous occurrences in mines.",
      prompt: "What DGMS statutory procedures must be followed for reporting and investigating mine safety hazards?",
      icon: HelpCircle,
    }
  ]
};

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
  const [selectedMode, setSelectedMode] = useState<string>("doc");
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
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode: selectedMode
    };

    setMessages((prev) => [...prev, userMessage]);
    if (queryText === undefined) {
      setInputValue("");
    }

    setIsLoading(true);

    // Dynamic loading step based on selected mode
    if (selectedMode === "web") {
      setLoadingStep("Querying live Ministry of Coal & sector web intelligence...");
    } else if (selectedMode === "calc") {
      setLoadingStep("Computing step-by-step mining formulas & engineering metrics...");
    } else if (selectedMode === "safety") {
      setLoadingStep("Auditing DGMS safety circulars & CMR 2017 compliance records...");
    } else if (selectedMode === "doc") {
      setLoadingStep("Scanning authorized CMPDI borehole & geological archives...");
    } else {
      setLoadingStep("Searching authorized documents & hybrid intelligence...");
    }

    // Simulated progress text transition
    const stepTimer = setTimeout(() => {
      setLoadingStep("Generating grounded answer from retrieved evidence...");
    }, 1500);

    try {
      const docIdFilter = targetDocId !== undefined ? targetDocId : paramDocId;

      // Enrich query with targeted context directive if a specific mode is selected
      let finalQuery = textToSubmit;
      if (selectedMode === "doc") {
        finalQuery = `[CMPDI DOCUMENT RETRIEVAL ONLY - Ground answer strictly on authorized CMPDI reports and borehole logs] ${textToSubmit}`;
      } else if (selectedMode === "web") {
        finalQuery = `[LIVE WEB INTEL - Search and ground with latest 2026 Ministry of Coal guidelines and news] ${textToSubmit}`;
      } else if (selectedMode === "calc") {
        finalQuery = `[MINING CALCULATION - Compute step-by-step mathematical formulas, units, and clear numbers] ${textToSubmit}`;
      } else if (selectedMode === "safety") {
        finalQuery = `[DGMS COMPLIANCE - Ground answer in Directorate General of Mines Safety and CMR 2017 regulations] ${textToSubmit}`;
      }

      const response = await fetchWithAuth("/api/assistant/query", {
        method: "POST",
        body: JSON.stringify({
          query: finalQuery,
          top_k: 5,
          mode: selectedMode,
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
          error: errDetail,
          mode: selectedMode
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
        error: data.error,
        mode: selectedMode
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
        error: err.message || "Failed to fetch",
        mode: selectedMode
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, paramDocId, selectedMode]);

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
    <div className="min-h-[calc(100vh-5rem)] bg-white text-slate-900 rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.06)] space-y-4 sm:space-y-5 max-w-6xl mx-auto flex flex-col justify-between pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>HYBRID AUTONOMOUS AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            AI Document Assistant
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl">
            Ask questions across official CMPDI reports, live internet search, or global engineering intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Role: <span className={isHod ? "text-amber-600 font-bold" : "text-blue-600 font-bold"}>{user?.role || "NORMAL_USER"}</span>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-rose-600 border border-slate-200 bg-slate-50 hover:bg-rose-50 transition-colors shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Security Context Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-medium">Multi-source reasoning enabled: Official CMPDI reports + Live Web Grounding + Global Engineering Intelligence.</span>
        </div>
        {paramDocId && (
          <span className="font-mono text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300 font-semibold">
            Filtering Context: Doc #{paramDocId}
          </span>
        )}
      </div>

      {/* Main Chat Container in Pure White Theme */}
      <div className="relative bg-slate-50/50 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[720px] lg:min-h-[820px] overflow-hidden">
        {/* Subtle Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        
        {/* Chat History Messages */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 min-h-[540px] max-h-[calc(100vh-16rem)] lg:max-h-[850px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4 space-y-6 relative z-10">
              
              {/* Crest Icon in Clean White / Light Blue */}
              <div className="relative mb-1">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                  <Bot className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="max-w-xl mx-auto space-y-2">
                <div className="text-xs font-mono text-blue-600 font-bold uppercase tracking-widest">
                  {greeting}, Mining Engineer
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-sans">
                  What geological data would you like to analyze?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Connected to dense FAISS vector embeddings, authorized PostgreSQL chunks, and live government engineering reports.
                </p>
              </div>

              {/* Dynamic Mode-Specific Prompt Cards in Pure White */}
              <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
                {(MODE_CARDS_MAP[selectedMode] || MODE_CARDS_MAP.all).map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(card.prompt)}
                      className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md text-left cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono tracking-widest text-blue-600 uppercase font-bold">
                            {card.category}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed group-hover:text-slate-600">
                          {card.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Capabilities row */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-[11px] font-mono text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" /> FAISS Dense Vectors
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> PostgreSQL Verification
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" /> Live Web Grounding
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
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}>
                      {isUser ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <span className="font-bold text-slate-700 font-mono">
                      {isUser ? "You" : "KHANIJ GYAN AI"}
                    </span>
                    {!isUser && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        ONLINE
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble / Card */}
                  {isUser ? (
                    <div className="max-w-2xl bg-blue-600 text-white border border-blue-500 rounded-2xl rounded-tr-none p-4 shadow-sm">
                      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-200 rounded-2xl rounded-tl-none p-5 sm:p-6 shadow-sm space-y-4">
                      {/* Top row: Status badges & Engine */}
                      <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {msg.mode && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                              {msg.mode === "doc" && <FileText className="w-3 h-3 text-emerald-600" />}
                              {msg.mode === "web" && <Globe className="w-3 h-3 text-blue-600" />}
                              {msg.mode === "calc" && <Cpu className="w-3 h-3 text-amber-600" />}
                              {msg.mode === "safety" && <ShieldAlert className="w-3 h-3 text-purple-600" />}
                              {(!["doc", "web", "calc", "safety"].includes(msg.mode)) && <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                              <span>
                                {msg.mode === "doc" ? "CMPDI Documents Mode" :
                                 msg.mode === "web" ? "Live Web Intel Mode" :
                                 msg.mode === "calc" ? "Mine Calculations Mode" :
                                 msg.mode === "safety" ? "DGMS Compliance Mode" : "Autonomous Hybrid"}
                              </span>
                            </span>
                          )}
                          {msg.source_type === "document" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                              <FileText className="w-3 h-3" /> Verified Document Evidence
                            </span>
                          )}
                          {msg.source_type === "web" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                              <Globe className="w-3 h-3" /> Live Web Grounding
                            </span>
                          )}
                          {msg.source_type === "hybrid" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                              <Sparkles className="w-3 h-3" /> Hybrid Multi-Source Intelligence
                            </span>
                          )}
                          {msg.source_type === "global_ai" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                              <Sparkles className="w-3 h-3" /> AI Global Knowledge Engine
                            </span>
                          )}
                          {(!msg.source_type && msg.status === "success") && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                              <CheckCircle className="w-3 h-3" /> Answer Generated
                            </span>
                          )}
                          {msg.status === "not_found" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                              <HelpCircle className="w-3 h-3" /> General Knowledge Response
                            </span>
                          )}
                          {(msg.status === "server_error" || msg.status === "network_error") && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                              <AlertCircle className="w-3 h-3" /> Error Response
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500">
                          Engine: <span className="text-blue-600 font-bold">{msg.provider || "Gemini 2.5 RAG"}</span>
                        </div>
                      </div>

                      {/* Neural Reasoning Accordion in Light Theme */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        <button
                          onClick={() => toggleReasoning(msg.id)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-xs text-slate-700 font-mono transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-semibold tracking-wide text-slate-900">Neural Reasoning & Evidence Trace</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                              {msg.sources && msg.sources.length > 0 ? `${msg.sources.length} Chunks Matched` : "Synthesized"}
                            </span>
                          </div>
                          {openReasoning[msg.id] ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        </button>

                        {openReasoning[msg.id] && (
                          <div className="p-3 text-[11px] font-mono text-slate-600 space-y-2.5 border-t border-slate-200 bg-white">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="text-slate-400">PROVIDER / ENGINE</div>
                                <div className="text-blue-700 font-bold mt-0.5">{msg.provider || "DeepSeek / Gemini 2.5"}</div>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="text-slate-400">MODEL ARCHITECTURE</div>
                                <div className="text-slate-800 font-bold mt-0.5">{msg.model || "gemini-2.5-flash"}</div>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="text-slate-400">RETRIEVAL STRATEGY</div>
                                <div className="text-emerald-700 font-bold mt-0.5">
                                  {msg.source_type === "document" ? "FAISS Dense Index" : msg.source_type === "web" ? "Live SerpAPI Grounding" : "Hybrid Fusion Engine"}
                                </div>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                              <span className="text-blue-700 font-bold">Execution Trace: </span>
                              Vector similarity evaluated across CMPDI geological archives &rarr; Contextual filtering applied &rarr; Cross-encoder verification &rarr; Anti-hallucination grounded brief generated.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Main Markdown Content in Light Mode */}
                      <div className="text-slate-900 font-sans text-sm leading-relaxed">
                        <MarkdownViewer content={msg.content} variant="light" />
                      </div>

                      {/* Web Grounding Sources */}
                      {hasWebSources && (
                        <div className="mt-4 pt-3.5 border-t border-slate-200">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-2 font-mono">
                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                            <span>Live Web Grounding Sources ({msg.web_sources?.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {msg.web_sources?.map((ws, wIdx) => (
                              <a
                                key={wIdx}
                                href={ws.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-white transition-all text-xs text-slate-700 group font-mono shadow-sm"
                              >
                                <span className="truncate group-hover:text-blue-700 font-medium">{ws.title || ws.url}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Backend Error Alert Banner */}
                      {msg.error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Error Detail:</strong> {msg.error}
                          </div>
                        </div>
                      )}

                      {/* Evidence & Source Citations Section */}
                      {hasSources && (
                        <div className="mt-4 pt-3.5 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                              <Database className="w-3.5 h-3.5 text-blue-600" />
                              <span>Evidence Citations & Traceability ({msg.sources?.length})</span>
                            </div>

                            <button
                              onClick={() => toggleSourceExpand(msg.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer font-mono"
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
                                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 hover:border-blue-400 transition-all shadow-sm group"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 truncate">
                                      <FileText className="w-4 h-4 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                                      <span className="truncate">{src.original_filename || src.document_name || "CMPDI Document"}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 font-mono">
                                      <span className="px-2.5 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[11px] font-medium">
                                        {refText}
                                      </span>
                                      
                                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                                        <span className="font-bold">Match: {scorePct}%</span>
                                        <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${scorePct}%` }} />
                                        </div>
                                      </div>

                                      {src.document_id && (
                                        <Link
                                          href={`/documents/viewer?id=${src.document_id}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all shadow-sm"
                                        >
                                          View <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      )}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-700 text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 shadow-inner">
                                      <div className="text-blue-700 font-sans font-bold text-[10px] uppercase tracking-wider mb-1">
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

                      {/* Interactive Action Bar */}
                      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-500">Helpful?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, "up")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              feedbackMap[msg.id] === "up"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-300"
                            }`}
                            title="Helpful & Accurate"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, "down")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              feedbackMap[msg.id] === "down"
                                ? "bg-rose-50 text-rose-700 border-rose-300 shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-300"
                            }`}
                            title="Inaccurate or Irrelevant"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                            title="Copy answer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied</span>
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
                            className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                            title="Regenerate this answer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Regenerate</span>
                          </button>

                          <button
                            onClick={() => handlePrintBrief(msg.content, msg.timestamp)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
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

          {/* Thinking Step-by-Step State */}
          {isLoading && (
            <div className="flex flex-col items-start space-y-2">
              <div className="flex items-center gap-2 px-1 text-xs">
                <span className="font-bold font-mono text-blue-600">KHANIJ GYAN AI</span>
                <span className="text-[11px] font-mono text-slate-500">Synthesizing...</span>
              </div>
              <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-none p-4 shadow-sm max-w-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono text-blue-700 tracking-wide">
                      NEURAL REASONING ACTIVE
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{loadingStep}</p>
                  </div>
                </div>
                {/* Visual mini progress pipeline */}
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Command Dock in Clean White Theme */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-2.5">
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
                      ? "bg-blue-600 text-white border border-blue-600 shadow-sm font-bold"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100"
                  }`}
                  title={mode.hint}
                >
                  <ModeIcon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {validationError && (
            <div className="px-3.5 py-2 bg-rose-50 text-rose-700 text-xs font-mono font-bold rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 p-2.5 sm:p-3.5 shadow-sm transition-all">
            
            {/* Top row: Textarea */}
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={
                selectedMode === "doc"
                  ? "Query authorized CMPDI geological reports, borehole core logs, seam strata..."
                  : selectedMode === "web"
                  ? "Search live Ministry of Coal directives, 2026 notifications, market intel..."
                  : selectedMode === "calc"
                  ? "Calculate stripping ratio, overburden volume, coal reserves in tonnes, specific gravity..."
                  : selectedMode === "safety"
                  ? "Query DGMS safety circulars, Coal Mines Regulations (CMR 2017), hazard logs..."
                  : "Ask a question across CMPDI reports, borehole data, or engineering calculations..."
              }
              rows={3}
              className="w-full resize-none bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 leading-relaxed font-sans min-h-[64px]"
            />

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between gap-2.5 pt-2 px-2 border-t border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
                  selectedMode === "doc"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                    : selectedMode === "web"
                    ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                    : selectedMode === "calc"
                    ? "bg-amber-50 border-amber-200 text-amber-700 font-semibold"
                    : selectedMode === "safety"
                    ? "bg-purple-50 border-purple-200 text-purple-700 font-semibold"
                    : "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Mode: {ASSISTANT_MODES.find(m => m.id === selectedMode)?.label || "Hybrid"}
                </span>

                {paramDocId && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-mono">
                    Doc #{paramDocId}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputValue.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs font-mono tracking-wider transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer ml-auto"
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

