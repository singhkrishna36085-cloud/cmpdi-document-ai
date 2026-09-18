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
  FileSearch
} from "lucide-react";

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
    name: "Document Intelligence",
    icon: Database,
    items: [
      { name: "Repository", href: "/documents", icon: Files, desc: "Exploration logs, boreholes & CSVs" },
      { name: "Semantic Search", href: "/search", icon: SearchIcon, desc: "Vector similarity & hybrid queries" },
      { name: "Knowledge Base", href: "/knowledge-base", icon: Database, desc: "Entity graph & mining ontologies" },
      { name: "Document Viewer", href: "/documents/viewer", icon: Eye, desc: "Interactive PDF, table & core viewer" },
    ]
  },
  {
    name: "AI & Analytics",
    icon: Cpu,
    items: [
      { name: "AI Assistant", href: "/assistant", icon: MessageSquare, desc: "Evidence-grounded conversational RAG", badge: "AI Core" },
      { name: "Cross-Document", href: "/cross-document", icon: GitCompare, desc: "Multi-mine comparative analysis", badge: "New" },
      { name: "Analytical Reports", href: "/reports", icon: FileText, desc: "Automated executive dossiers" },
      { name: "Topic Modeling", href: "/topics", icon: Layers, desc: "Unsupervised geological clustering" },
    ]
  },
  {
    name: "Governance & Operations",
    icon: ShieldCheck,
    items: [
      { name: "Validation Center", href: "/validation", icon: CheckCircle, desc: "Rule engine & data integrity checks" },
      { name: "OCR & Processing", href: "/processing", icon: Cpu, desc: "Real-time document ingestion pipeline" },
      { name: "Audit Trail", href: "/audit", icon: History, desc: "Cryptographic tamper-evident activity log" },
      { name: "Upload Pipeline", href: "/upload", icon: Upload, desc: "Secure multi-format file ingestion" },
    ]
  },
  {
    name: "Gov Resources",
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
  
  const navRef = useRef<HTMLElement>(null);

  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        <div className="flex items-center gap-3 shrink-0">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 group focus:outline-none"
          >
            {/* Geometric Mineral Crest */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-obsidian-700 via-obsidian-800 to-obsidian-900 border border-cyan-500/30 group-hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300">
              {/* Inner glowing pulse */}
              <div className="absolute inset-0 rounded-lg bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative font-mono font-bold text-base bg-gradient-to-br from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                K
              </div>
              {/* Tiny corner tech accents */}
              <div className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-cyan-400" />
              <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-emerald-400" />
            </div>

            {/* Brand Title */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-wider text-white uppercase group-hover:text-cyan-200 transition-colors">
                  Khani Gyan
                </span>
                <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 uppercase">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase hidden xl:block">
                KhaniGyan-AI Intelligence System
              </span>
            </div>
          </Link>

          {/* Live RAG Telemetry Pill */}
          <div className="hidden 2xl:flex items-center gap-2 ml-3 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>FAISS v2.4 • ONLINE</span>
          </div>
        </div>

        {/* Center: Desktop Navigation Groups */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2 justify-center flex-1">
          {navigationGroups.map((group) => {
            const groupIsActive = isGroupActive(group);

            if (group.isStandalone && group.href) {
              const active = isActive(group.href);
              return (
                <Link
                  key={group.name}
                  href={group.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]"
                  }`}
                >
                  <group.icon className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{group.name}</span>
                  {active && (
                    <motion.div
                      layoutId="navActiveIndicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
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
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isOpen || groupIsActive
                      ? "text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]"
                  }`}
                >
                  {group.icon && (
                    <group.icon className={`w-4 h-4 ${groupIsActive ? "text-cyan-400" : "text-slate-400"}`} />
                  )}
                  <span>{group.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 opacity-60 ${isOpen ? "rotate-180" : ""}`} />

                  {groupIsActive && (
                    <motion.div
                      layoutId="navActiveIndicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
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
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-cyan-300 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/30 transition-all focus:outline-none"
              title="System Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
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
                    className="w-80 rounded-xl bg-[#0d1017]/95 backdrop-blur-2xl border border-white/[0.1] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Operational Telemetry
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        Live
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 transition-all">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                          <span>Q1 2026 Operations Ingested</span>
                          <span className="text-[9px] font-mono text-slate-500">2m ago</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          7 mine records parsed into PostgreSQL with full RBAC isolation.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 transition-all">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                          <span className="text-emerald-300">Safety Incident Threshold OK</span>
                          <span className="text-[9px] font-mono text-slate-500">14m ago</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Zero lost-time injuries verified across Gevra and Piparwar sectors.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 transition-all">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                          <span>FAISS Vector Index Synchronized</span>
                          <span className="text-[9px] font-mono text-slate-500">1h ago</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          153 semantic text chunks indexed with cosine metric.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.06] text-center">
                      <Link
                        href="/audit"
                        onClick={() => setShowNotifications(false)}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1"
                      >
                        View Complete Cryptographic Audit Log &rarr;
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
            className="lg:hidden bg-[#090A0F]/95 backdrop-blur-2xl border-b border-white/[0.1] px-4 py-4 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="flex flex-col gap-4">
              {navigationGroups.map((group) => (
                <div key={group.name} className="flex flex-col gap-1">
                  <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase px-2">
                    {group.name}
                  </div>
                  {group.isStandalone && group.href ? (
                    <Link
                      href={group.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                        isActive(group.href)
                          ? "bg-cyan-950/50 text-cyan-300 border border-cyan-500/30"
                          : "text-slate-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      <group.icon className="w-4 h-4" />
                      <span>{group.name}</span>
                    </Link>
                  ) : (
                    group.items?.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                          isActive(item.href)
                            ? "bg-cyan-950/50 text-cyan-300 border border-cyan-500/30"
                            : "text-slate-300 hover:bg-white/[0.05]"
                        }`}
                      >
                        <item.icon className="w-4 h-4 text-slate-400" />
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 ml-auto">
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
