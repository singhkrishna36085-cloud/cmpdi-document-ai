import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function SectionCard({ title, description, children, action }: SectionCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-xl transition-all">
      <div className="px-5 py-4 sm:px-6 flex justify-between items-center border-b border-slate-800/80 bg-slate-900/40">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-400 font-sans">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5 sm:p-6 text-slate-200">{children}</div>
    </div>
  );
}

