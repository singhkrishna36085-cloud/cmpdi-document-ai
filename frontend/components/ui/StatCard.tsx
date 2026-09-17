import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 group">
      {/* Top subtle light flare */}
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all" />

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase truncate">
            {title}
          </p>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-cyan-200 group-hover:to-cyan-400 transition-all font-mono">
            {value}
          </div>
        </div>
        <div className="flex-shrink-0 rounded-xl bg-slate-800/80 p-3 border border-slate-700/50 text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/40 transition-all duration-300 shadow-md">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center text-xs font-mono">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${
              trendUp
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

