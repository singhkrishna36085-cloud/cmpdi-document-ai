"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Files, 
  Upload, 
  Eye,
  Cpu, 
  Database, 
  Search, 
  FileText, 
  Cloud,
  MessageSquare,
  CheckCircle,
  History,
  GitCompare,
  LogOut,
  User,
  ShieldCheck,
  Sparkles
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Documents", href: "/documents", icon: Files },
    { name: "Upload Documents", href: "/upload", icon: Upload },
    { name: "Document Viewer", href: "/documents/viewer", icon: Eye },
    { name: "AI Processing", href: "/processing", icon: Cpu },
    { name: "Knowledge Base", href: "/knowledge-base", icon: Database },
    { name: "Search", href: "/search", icon: Search },
    { name: "Report Generator", href: "/reports", icon: FileText },
    { name: "Word Cloud & Topics", href: "/topics", icon: Cloud },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
    { name: "Cross-Doc Intelligence", href: "/cross-document", icon: GitCompare },
    { name: "Validation & Quality", href: "/validation", icon: CheckCircle },
    { name: "Audit / History", href: "/audit", icon: History },
  ];

  const displayName = user?.full_name || user?.username || "CMPDI User";
  const isHOD = user?.role === "HOD";
  const roleLabel = isHOD ? "HOD Administrator" : "Normal User";

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-2xl text-slate-100 z-30">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-5 border-b border-slate-800/80 bg-slate-900/60 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
            C
          </div>
          <div>
            <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              CMPDI AI <Sparkles className="w-3 h-3 text-cyan-400" />
            </span>
            <p className="text-[10px] text-slate-400 font-mono">Coal India Enterprise</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold">
          Platform Navigation
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 via-blue-600/15 to-purple-600/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                }`}
              >
                {/* Active Neon Bar Indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-cyan-400 shadow-lg shadow-cyan-400/80" />
                )}

                <item.icon
                  className={`mr-3 h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-slate-800/80 p-3.5 bg-slate-900/40 space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-400 shrink-0 border border-cyan-500/30">
            {isHOD ? <ShieldCheck className="h-4 w-4 text-teal-400" /> : <User className="h-4 w-4 text-cyan-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-100 truncate">{displayName}</p>
            <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isHOD ? "bg-teal-400" : "bg-cyan-400"}`} />
              {roleLabel}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all border border-rose-500/20 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
