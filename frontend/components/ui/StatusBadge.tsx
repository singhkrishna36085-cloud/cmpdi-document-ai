interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "pending";
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-amber-500/10",
    error: "bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-rose-500/10",
    info: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-cyan-500/10",
    pending: "bg-slate-500/10 text-slate-300 border-slate-500/30 shadow-slate-500/10",
  };

  const dots = {
    success: "bg-emerald-400 shadow-emerald-400",
    warning: "bg-amber-400 shadow-amber-400",
    error: "bg-rose-400 shadow-rose-400",
    info: "bg-cyan-400 shadow-cyan-400",
    pending: "bg-slate-400 shadow-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium border shadow-sm ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shadow-sm ${dots[status]}`} />
      {label}
    </span>
  );
}

