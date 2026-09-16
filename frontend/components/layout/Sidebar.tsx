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
  Settings,
  LogOut,
  User,
  ShieldCheck
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
    { name: "Validation & Traceability", href: "/validation", icon: CheckCircle },
    { name: "Audit / History", href: "/audit", icon: History },
  ];

  const displayName = user?.full_name || user?.username || "Authenticated User";
  const isHOD = user?.role === "HOD";
  const roleLabel = isHOD ? "Head of Department (HOD)" : "Normal User";

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
            C
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            CMPDI DOCUMENT AI
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* System Settings Section */}
        <div className="mt-8">
          <h3 className="px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">
            System
          </h3>
          <div className="mt-2 space-y-1 px-3">
            <Link
              href="#"
              className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* User Profile Area */}
      <div className="border-t border-gray-200 p-4 bg-slate-50/50">
        <div className="flex items-center group rounded-md p-2 hover:bg-white transition-colors border border-transparent hover:border-gray-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">
            {isHOD ? <ShieldCheck className="h-5 w-5 text-teal-600" /> : <User className="h-5 w-5 text-blue-600" />}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs font-medium text-slate-500 truncate flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isHOD ? "bg-teal-500" : "bg-blue-500"}`} />
              {roleLabel}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200/60"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

