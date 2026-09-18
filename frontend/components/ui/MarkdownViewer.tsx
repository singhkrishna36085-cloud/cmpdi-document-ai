"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = "" }) => {
  if (!content) return null;

  return (
    <div className={`prose prose-invert max-w-none text-slate-200 font-sans leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-xl sm:text-2xl font-bold text-teal-300 mt-6 mb-3 pb-2 border-b border-slate-800 tracking-tight"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-lg sm:text-xl font-bold text-slate-100 mt-5 mb-3 pb-2 border-b border-slate-800/80 flex items-center gap-2"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-base sm:text-lg font-semibold text-teal-400 mt-4 mb-2 tracking-wide"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-sm sm:text-base font-semibold text-slate-200 mt-3 mb-1.5" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm text-slate-300 leading-relaxed mb-3.5 font-normal tracking-normal" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-sm text-slate-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-sm text-slate-300" {...props} />
          ),
          li: ({ node, ...props }) => <li className="leading-relaxed pl-1" {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-white tracking-tight" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic text-slate-300" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-6 border-slate-800" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-teal-500 bg-slate-900/60 px-4 py-2.5 my-3.5 rounded-r-xl text-slate-300 italic text-sm shadow-inner"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
              <table className="w-full text-left text-xs sm:text-sm border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="bg-slate-800/90 text-teal-300 text-xs uppercase font-bold tracking-wider border-b border-slate-700"
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-slate-800/70" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-slate-800/40 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 font-semibold text-slate-200 border-r last:border-r-0 border-slate-700/60 whitespace-nowrap"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-4 py-2.5 text-slate-300 border-r last:border-r-0 border-slate-800/70"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-slate-800/90 text-teal-300 text-xs font-mono font-medium border border-slate-700/50"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto text-xs font-mono my-3.5 text-slate-200 shadow-inner">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          a: ({ node, ...props }) => (
            <a
              className="text-teal-400 hover:text-teal-300 underline underline-offset-4 transition-colors font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
