"use client";

import { Bell, Search, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TopNavbarProps {
  title?: string;
}

export function TopNavbar({ title = "Dashboard" }: TopNavbarProps) {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-2xl sm:px-6 lg:px-8 z-20">
      <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6">
        <form className="relative flex flex-1 max-w-lg" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-4 text-xs text-slate-100 placeholder:text-slate-400/70 focus:border-cyan-500/60 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 transition-all font-mono"
            placeholder="Search documents, reports, knowledge graph..."
            type="search"
            name="search"
          />
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          <button
            type="button"
            className="relative p-2 text-slate-400 hover:text-cyan-300 rounded-xl hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-all"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-5 lg:w-px lg:bg-slate-800"
            aria-hidden="true"
          />

          {/* Authenticated User Badge */}
          <div className="hidden lg:flex lg:items-center lg:gap-x-3">
            <span className="text-xs font-semibold text-slate-200 font-mono">
              {user?.full_name || user?.username || "Guest User"}
            </span>
            {isHOD ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-300 border border-teal-500/30 shadow-sm shadow-teal-500/10">
                <ShieldCheck className="h-3 w-3 text-teal-400" /> HOD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
                <User className="h-3 w-3 text-cyan-400" /> Normal User
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

