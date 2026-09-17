import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="md:flex md:items-center md:justify-between mb-8 pb-4 border-b border-slate-800/60">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 sm:truncate sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-4 flex md:ml-4 md:mt-0 items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}

