"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Search as SearchIcon, 
  ShieldCheck, 
  User, 
  ChevronDown,
  LayoutDashboard, 
  Files, 
  Upload, 
  Eye,
  Cpu, 
  Database, 
  FileText, 
  Cloud,
  MessageSquare,
  CheckCircle,
  History,
  GitCompare,
  LogOut,
  Sparkles,
  Layers,
  Activity,
  Command,
  ExternalLink,
  Menu,
  X,
  Radio,
  FileSearch,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export interface SystemNotification {
  id: string | number;
  title: string;
  description: string;
  timeAgo: string;
  timestamp: string;
  type: "success" | "warning" | "info" | "error";
  href: string;
  icon: any;
  unread: boolean;
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "just now";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "recent";
  }
}

function mapAuditLogToNotification(log: any, readIds: Set<string | number>): SystemNotification {
  const isUnread = !readIds.has(log.id);
  const action = (log.action || "").toUpperCase();
  const isError = log.status === "FAILURE" || log.status === "ERROR";

  let title = "System Activity";
  let description = `Operation ${log.action || "performed"} by ${log.username || "System"}`;
  let type: "success" | "warning" | "info" | "error" = isError ? "error" : "info";
  let href = "/audit";
  let icon = isError ? AlertTriangle : Activity;

  if (action.includes("UPLOAD") || action.includes("INGEST") || action.includes("DOCUMENT")) {
    title = isError ? "Document Ingestion Alert" : "Document Ingested";
    description = log.details?.filename
      ? `File "${log.details.filename}" processed into vault.`
      : `${log.username || "User"} uploaded document #${log.document_id || log.resource_id || "new"}`;
    type = isError ? "error" : "success";
    href = "/documents";
    icon = isError ? AlertCircle : Files;
  } else if (action.includes("VALIDAT") || action.includes("CONFLICT") || action.includes("ANOMALY")) {
    title = "Validation Engine Alert";
    description = log.details?.message || `${log.username || "System"} executed compliance rules.`;
    type = isError ? "error" : "warning";
    href = "/validation";
    icon = CheckCircle;
  } else if (action.includes("REPORT") || action.includes("EXPORT")) {
    title = "Report Generated";
    description = `${log.username || "Analyst"} compiled report #${log.report_id || log.resource_id || ""}`;
    type = "info";
    href = "/reports";
    icon = FileText;
  } else if (action.includes("QUERY") || action.includes("CHAT") || action.includes("ASSISTANT") || action.includes("RAG") || action.includes("SEARCH")) {
    title = "AI Neural Query";
    description = `Grounded RAG retrieval executed by ${log.username || "User"}`;
    type = "info";
    href = "/assistant";
    icon = MessageSquare;
  } else if (action.includes("LOGIN") || action.includes("AUTH") || action.includes("SECURITY")) {
    title = isError ? "Security Notice" : "Security Session";
    description = `${log.username || "User"} session authenticated.`;
    type = isError ? "error" : "success";
    href = "/audit";
    icon = ShieldCheck;
  }

  return {
    id: log.id,
    title,
    description,
    timeAgo: formatTimeAgo(log.timestamp),
    timestamp: log.timestamp || new Date().toISOString(),
    type,
    href,
    icon,
    unread: isUnread,
  };
}

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "system-ready",
    title: "System Live & Connected",
    description: "KhaniGyan AI Document Intelligence platform is synchronized.",
    timeAgo: "Just now",
    timestamp: new Date().toISOString(),
    type: "success",
    href: "/dashboard",
    icon: Sparkles,
    unread: false
  },
  {
    id: "faiss-active",
    title: "Vector Pipeline Ready",
    description: "FAISS multi-tenant neural embedding vault initialized.",
    timeAgo: "1m ago",
    timestamp: new Date().toISOString(),
    type: "info",
    href: "/knowledge-base",
    icon: Database,
    unread: false
  },
  {
    id: "validation-online",
    title: "Rule Engine Active",
    description: "Automated standard variance & conflict detectors running.",
    timeAgo: "3m ago",
    timestamp: new Date().toISOString(),
    type: "info",
    href: "/validation",
    icon: CheckCircle,
    unread: false
  }
];

interface NavItem {
  name: string;
  href: string;
  icon: any;
  desc?: string;
  badge?: string;
  isExternal?: boolean;
}

interface NavGroup {
  name: string;
  href?: string;
  icon?: any;
  isStandalone?: boolean;
  items?: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    name: "Home",
    href: "/",
    icon: Sparkles,
    isStandalone: true,
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isStandalone: true,
  },
  {
    name: "Repository",
    icon: Files,
    items: [
      { name: "Documents Vault", href: "/documents", icon: Files, desc: "Centralized archive & multi-tenant storage" },
      { name: "Upload Documents", href: "/upload", icon: Upload, desc: "Ingest PDF, DOCX, XLSX up to 50MB" },
      { name: "Document Viewer", href: "/documents/viewer", icon: Eye, desc: "Side-by-side OCR & metadata viewer" },
      { name: "Processing Pipeline", href: "/processing", icon: Cpu, desc: "8-stage OCR, chunking & FAISS index" },
    ]
  },
  {
    name: "Analytics",
    icon: GitCompare,
    items: [
      { name: "Cross-Document Matrix", href: "/cross-document", icon: GitCompare, desc: "Side-by-side production & thickness diffs" },
      { name: "Validation & Conflicts", href: "/validation", icon: CheckCircle, desc: "Automated rule validation & anomaly alerts" },
      { name: "Generated Reports", href: "/reports", icon: FileText, desc: "Compilation of structured reports & exports" },
      { name: "Topics & NLP", href: "/topics", icon: Layers, desc: "TF-IDF topic modeling & keyword analysis" },
    ]
  },
  {
    name: "Search & AI",
    icon: SearchIcon,
    items: [
      { name: "Semantic Search", href: "/search", icon: SearchIcon, desc: "Dense FAISS vector search across reports" },
      { name: "Knowledge Base", href: "/knowledge-base", icon: Database, desc: "Embedding index stats & manual sync" },
      { name: "AI Assistant", href: "/assistant", icon: MessageSquare, desc: "Grounded conversational mining assistant", badge: "Live RAG" },
    ]
  },
  {
    name: "Government Resources",
    icon: Cloud,
    items: [
      { name: "Ministry of Coal", href: "/government-resources", icon: Cloud, desc: "Official portals & directives" },
      { name: "Major Statistics", href: "/government-resources?category=Major+Statistics", icon: Database, desc: "Coal production & reserves metrics" },
      { name: "Acts & Mining Policies", href: "/government-resources?category=Acts+%26+Policies", icon: ShieldCheck, desc: "MMDR Act & environmental statutes" },
      { name: "Mine Safety Norms", href: "/government-resources?category=Safety+in+Coal+Mines", icon: ShieldCheck, desc: "DGMS guidelines & safety protocols" },
      { name: "Parliamentary Q&A", href: "/government-resources?category=Parliament+Q%26A", icon: FileSearch, desc: "Lok/Rajya Sabha official records" },
    ]
  }
];

export function TopNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isHOD = user?.role === "HOD";
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Real-Time Notifications State
  const [notifications, setNotifications] = useState<SystemNotification[]>(DEFAULT_NOTIFICATIONS);
  const [readNotifIds, setReadNotifIds] = useState<Set<string | number>>(new Set());
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  const navRef = useRef<HTMLElement>(null);

  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveNotifications = async () => {
    try {
      const res = await fetchWithAuth("/api/audit?page=1&page_size=6");
      if (res.ok) {
        const data = await res.json();
        const logs = data.items || [];
        if (logs.length > 0) {
          const mapped = logs.map((log: any) => mapAuditLogToNotification(log, readNotifIds));
          setNotifications(mapped);
          const unread = mapped.filter((n: SystemNotification) => n.unread).length;
          setUnreadCount(unread);
        }
      }
    } catch {
      // Keep default telemetry fallback
    }
  };

  useEffect(() => {
    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 12000); // 12-second live polling
    return () => clearInterval(interval);
  }, [readNotifIds]);

  const markAllAsRead = () => {
    const allIds = new Set<string | number>(notifications.map(n => n.id));
    setReadNotifIds(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const handleDropdownEnter = (groupName: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveDropdown(groupName);
  };

  const handleDropdownLeave = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const handleUserMenuEnter = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current);
      userMenuTimeoutRef.current = null;
    }
    setShowUserMenu(true);
  };

  const handleUserMenuLeave = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current);
    }
    userMenuTimeoutRef.current = setTimeout(() => {
      setShowUserMenu(false);
    }, 180);
  };

  const handleNotifEnter = () => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
      notifTimeoutRef.current = null;
    }
    setShowNotifications(true);
  };

  const handleNotifLeave = () => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
    }
    notifTimeoutRef.current = setTimeout(() => {
      setShowNotifications(false);
    }, 180);
  };

  // Close dropdowns on route change or click outside
  useEffect(() => {
    setActiveDropdown(null);
    setShowUserMenu(false);
    setShowNotifications(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
      if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  const isGroupActive = (group: NavGroup) => {
    if (group.isStandalone && group.href) {
      return isActive(group.href);
    }
    return group.items?.some(item => isActive(item.href)) || false;
  };

  return (
    <header 
      ref={navRef}
      className="fixed top-0 left-0 w-full z-50 h-[68px] bg-[#090A0F]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all"
    >
      {/* Laser highlight top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 max-w-[1920px] mx-auto">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 sm:gap-3 group focus:outline-none"
          >
            {/* Modern Mineral Crest */}
            <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-white/20 group-hover:border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300">
              <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative font-display font-black text-lg sm:text-xl text-white">
                K
              </div>
              <div className="absolute -top-[1px] -left-[1px] w-1.5 sm:w-2 h-1.5 sm:h-2 border-t-2 border-l-2 border-white" />
              <div className="absolute -bottom-[1px] -right-[1px] w-1.5 sm:w-2 h-1.5 sm:h-2 border-b-2 border-r-2 border-cyan-400" />
            </div>

            {/* Brand Title: Pure White, Modern Display Font, Responsive Size */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display text-base sm:text-xl md:text-2xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)] group-hover:text-white/90 transition-colors whitespace-nowrap">
                  Khanij Gyan
                </span>
                <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-widest px-1.5 sm:px-2 py-0.5 rounded bg-white text-slate-950 uppercase shadow-md">
                  AI
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-200 font-medium tracking-wider uppercase hidden xl:block">
                KhanijGyan-AI Intelligence System
              </span>
            </div>
          </Link>

          {/* Live RAG Telemetry Pill */}
          <div className="hidden 2xl:flex items-center gap-2 ml-3 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>FAISS v2.4 • ONLINE</span>
          </div>
        </div>

        {/* Center: Desktop Navigation Groups with White Text & Increased Font Size */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 justify-center flex-1">
          {navigationGroups.map((group) => {
            const groupIsActive = isGroupActive(group);

            if (group.isStandalone && group.href) {
              const active = isActive(group.href);
              return (
                <Link
                  key={group.name}
                  href={group.href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-[15px] font-bold tracking-tight transition-all duration-200 ${
                    active
                      ? "text-white bg-white/15 border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      : "text-white hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/10"
                  }`}
                >
                  <group.icon className={`w-4 h-4 ${active ? "text-white" : "text-white/90"}`} />
                  <span>{group.name}</span>
                  {active && (
                    <motion.div
                      layoutId="navActiveIndicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full shadow-[0_0_8px_#ffffff]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            }

            const isOpen = activeDropdown === group.name;

            return (
              <div
                key={group.name}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(group.name)}
                onMouseLeave={handleDropdownLeave}
              >
                <button
                  onClick={() => setActiveDropdown(isOpen ? null : group.name)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-[15px] font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                    isOpen || groupIsActive
                      ? "text-white bg-white/15 border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      : "text-white hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/10"
                  }`}
                >
                  {group.icon && (
                    <group.icon className={`w-4 h-4 ${groupIsActive ? "text-white" : "text-white/90"}`} />
                  )}
                  <span>{group.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-white" : "text-white/80"}`} />

                  {groupIsActive && (
                    <motion.div
                      layoutId="navActiveIndicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full shadow-[0_0_8px_#ffffff]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>

                {/* Dropdown Menu Panel with continuous hover bridge */}
                <AnimatePresence>
                  {isOpen && (
                    <div
                      className="absolute top-full left-0 pt-2 z-50"
                      onMouseEnter={() => handleDropdownEnter(group.name)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="w-80 rounded-xl bg-[#0d1017]/95 backdrop-blur-2xl border border-white/[0.1] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden"
                      >
                        {/* Subtle header accent glow */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                        
                        <div className="px-3 py-2 text-[11px] font-mono tracking-widest text-slate-400 uppercase border-b border-white/[0.05] mb-1.5 flex items-center justify-between">
                          <span className="font-bold text-slate-300">{group.name}</span>
                          <span className="text-cyan-400/80 text-[10px]">● {group.items?.length || 0} Modules</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          {group.items?.map((item) => {
                            const itemActive = isActive(item.href);
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                                  itemActive
                                    ? "bg-cyan-950/50 border border-cyan-500/30 text-white"
                                    : "text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent"
                                }`}
                              >
                                <div className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                                  itemActive 
                                    ? "bg-cyan-500/20 text-cyan-300" 
                                    : "bg-white/[0.04] text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-950/50"
                                }`}>
                                  <Icon className="w-[18px] h-[18px]" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold tracking-tight ${itemActive ? "text-cyan-300" : "text-slate-100 group-hover:text-white"}`}>
                                      {item.name}
                                    </span>
                                    {item.badge && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        {item.badge}
                                      </span>
                                    )}
                                    {itemActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] ml-auto" />
                                    )}
                                  </div>
                                  {item.desc && (
                                    <p className="text-xs text-slate-400 line-clamp-1 group-hover:text-slate-300 transition-colors mt-0.5">
                                      {item.desc}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Right: Quick Search, Notifications & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Quick Search Trigger */}
          <Link
            href="/search"
            className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/30 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-sm"
            title="Search documents and data"
          >
            <SearchIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline text-[11px]">Search...</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-obsidian-800 border border-white/[0.1] rounded text-slate-400">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </Link>

          {/* Notifications Trigger */}
          <div 
            className="relative"
            onMouseEnter={handleNotifEnter}
            onMouseLeave={handleNotifLeave}
          >
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && unreadCount > 0) {
                  markAllAsRead();
                }
              }}
              className={`relative p-2 rounded-lg border transition-all focus:outline-none cursor-pointer ${
                showNotifications || unreadCount > 0
                  ? "text-cyan-300 bg-cyan-950/40 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  : "text-slate-400 hover:text-cyan-300 bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] hover:border-cyan-500/30"
              }`}
              title="Real-Time System Alerts & Telemetry"
              aria-label="System Alerts"
            >
              <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-cyan-300 animate-[bounce_1.5s_infinite]" : ""}`} />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 text-[9px] font-mono font-bold text-slate-950 shadow-[0_0_10px_#06b6d4]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              )}
            </button>

            {/* Notifications Popover with continuous hover bridge */}
            <AnimatePresence>
              {showNotifications && (
                <div 
                  className="absolute right-0 top-full pt-2 z-50"
                  onMouseEnter={handleNotifEnter}
                  onMouseLeave={handleNotifLeave}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="w-80 sm:w-96 rounded-2xl bg-[#0d1017]/98 backdrop-blur-2xl border border-white/[0.12] p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
                  >
                    {/* Header accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </div>
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Live System Alerts
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Real-Time
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                      {notifications.map((notif) => {
                        const Icon = notif.icon || Activity;
                        return (
                          <Link
                            key={notif.id}
                            href={notif.href}
                            onClick={() => setShowNotifications(false)}
                            className={`p-2.5 rounded-xl border transition-all text-left group block ${
                              notif.unread
                                ? "bg-cyan-950/30 border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-cyan-500/20"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                notif.type === "success"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : notif.type === "warning"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : notif.type === "error"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                                    {notif.title}
                                  </h4>
                                  <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                    {notif.timeAgo}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed group-hover:text-slate-300">
                                  {notif.description}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
                      <Link
                        href="/audit"
                        onClick={() => setShowNotifications(false)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-semibold"
                      >
                        <span>Audit Log Chain</span>
                        <span>&rarr;</span>
                      </Link>

                      <Link
                        href="/validation"
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        Validation Center
                      </Link>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-white/[0.1] hidden sm:block" />

          {/* User Profile Pill & Dropdown */}
          <div 
            className="relative"
            onMouseEnter={handleUserMenuEnter}
            onMouseLeave={handleUserMenuLeave}
          >
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/30 transition-all focus:outline-none cursor-pointer"
            >
              {/* Avatar with Role Halo */}
              <div className={`relative flex h-7 w-7 items-center justify-center rounded-lg border ${
                isHOD 
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                  : "bg-cyan-950/60 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              }`}>
                {isHOD ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Name & Role Text */}
              <div className="flex flex-col items-start text-left hidden sm:flex">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user?.full_name || user?.username || "CMPDI Officer"}
                </span>
                <span className={`text-[9px] font-mono tracking-wider font-semibold uppercase ${
                  isHOD ? "text-emerald-400" : "text-cyan-400"
                }`}>
                  {isHOD ? "HOD Administrator" : "Mine Engineer"}
                </span>
              </div>

              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {/* User Dropdown Menu with continuous hover bridge */}
            <AnimatePresence>
              {showUserMenu && (
                <div 
                  className="absolute right-0 top-full pt-2 z-50"
                  onMouseEnter={handleUserMenuEnter}
                  onMouseLeave={handleUserMenuLeave}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="w-64 rounded-xl bg-[#0d1017]/95 backdrop-blur-2xl border border-white/[0.1] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-xs font-semibold text-white">
                        {user?.full_name || user?.username || "Officer"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {user?.email || "officer@cmpdi.coalindia.in"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold border ${
                          isHOD 
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                            : "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                        }`}>
                          {isHOD ? "Full Access (HOD)" : "Standard User (Normal)"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <Link
                        href="/audit"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>Security & Audit Log</span>
                      </Link>
                      
                      <Link
                        href="/validation"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Validation Center</span>
                      </Link>

                      <Link
                        href="/"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Public Landing Page</span>
                      </Link>
                    </div>

                    <div className="mt-1 pt-1 border-t border-white/[0.06]">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out Session</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.08]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#090A0F]/98 backdrop-blur-2xl border-b border-white/[0.1] px-4 py-5 max-h-[calc(100dvh-4rem)] overflow-y-auto shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
          >
            <div className="flex flex-col gap-4">
              {/* Mobile Quick Search Bar */}
              <Link
                href="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-xs text-white/90 font-medium transition-colors shadow-sm"
              >
                <SearchIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Search documents, boreholes, reports...</span>
              </Link>
              {navigationGroups.map((group) => (
                <div key={group.name} className="flex flex-col gap-1">
                  <div className="text-[11px] font-mono tracking-widest text-white/70 uppercase px-2 font-bold">
                    {group.name}
                  </div>
                  {group.isStandalone && group.href ? (
                    <Link
                      href={group.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold transition-colors ${
                        isActive(group.href)
                          ? "bg-white/15 text-white border border-white/25 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                          : "text-white hover:bg-white/[0.08] active:bg-white/[0.12]"
                      }`}
                    >
                      <group.icon className="w-4 h-4 text-white" />
                      <span>{group.name}</span>
                    </Link>
                  ) : (
                    group.items?.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          isActive(item.href)
                            ? "bg-white/15 text-white border border-white/25 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                            : "text-white/90 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12]"
                        }`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive(item.href) ? "text-white" : "text-white/80"}`} />
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 ml-auto border border-cyan-500/30">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
