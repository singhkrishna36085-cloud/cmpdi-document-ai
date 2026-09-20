"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  variant?: "dark" | "light";
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  content, 
  className = "",
  variant = "light"
}) => {
  if (!content) return null;

  const isLight = variant === "light";

  return (
    <div className={`max-w-none font-sans leading-relaxed ${isLight ? "text-slate-800" : "text-slate-200"} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => (
            <div className="mt-7 mb-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase mb-2 ${
                isLight 
                  ? "bg-blue-50 border border-blue-200 text-blue-700" 
                  : "bg-teal-500/10 border border-teal-500/30 text-teal-300"
              }`}>
                <span>✦ TOPIC OVERVIEW</span>
              </div>
              <h1
                className={`font-display text-2xl sm:text-3xl font-extrabold tracking-tight uppercase pb-2 border-b ${
                  isLight
                    ? "text-slate-900 border-slate-200"
                    : "text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-100 to-emerald-300 border-slate-800/80"
                }`}
                {...props}
              >
                {children}
              </h1>
            </div>
          ),
          h2: ({ node, children, ...props }) => (
            <div className={`mt-6 mb-3.5 pt-3 border-t ${isLight ? "border-slate-200" : "border-slate-800/70"}`}>
              <h2
                className={`font-display text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2.5 uppercase ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
                {...props}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isLight ? "bg-blue-600" : "bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.7)]"
                }`} />
                <span>{children}</span>
              </h2>
            </div>
          ),
          h3: ({ node, children, ...props }) => (
            <div className="mt-5 mb-2.5">
              <h3
                className={`font-display text-base sm:text-lg font-bold tracking-wide flex items-center gap-2 uppercase ${
                  isLight ? "text-blue-700" : "text-teal-300"
                }`}
                {...props}
              >
                <span className={`font-black text-sm select-none ${isLight ? "text-blue-600" : "text-teal-400"}`}>➤</span>
                <span>{children}</span>
              </h3>
            </div>
          ),
          h4: ({ node, children, ...props }) => (
            <h4 className={`font-display text-sm sm:text-base font-semibold mt-4 mb-2 tracking-wide uppercase ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`} {...props}>
              {children}
            </h4>
          ),
          p: ({ node, children, ...props }) => (
            <p className={`font-sans text-sm sm:text-base leading-relaxed tracking-wide [word-spacing:0.04em] mb-3.5 font-normal ${
              isLight ? "text-slate-700" : "text-slate-200"
            }`} {...props}>
              {children}
            </p>
          ),
          ul: ({ node, children, ...props }) => (
            <ul className="my-3 space-y-2 list-none pl-0" {...props}>
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="my-3.5 space-y-2 list-none pl-0 [counter-reset:ai-counter]" {...props}>
              {children}
            </ol>
          ),
          li: ({ node, ordered, children, ...props }: any) => {
            if (ordered) {
              return (
                <li
                  className={`font-sans text-sm sm:text-base leading-relaxed tracking-wide flex items-start gap-3 p-3 rounded-xl border transition-all [counter-increment:ai-counter] ${
                    isLight 
                      ? "text-slate-800 bg-slate-50/80 border-slate-200 hover:border-blue-300"
                      : "text-slate-200 bg-slate-900/50 border-slate-800/80 hover:border-teal-500/30"
                  }`}
                  {...props}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold shrink-0 mt-0.5 before:content-[counter(ai-counter)] select-none shadow-sm ${
                    isLight
                      ? "bg-blue-100 border border-blue-200 text-blue-700"
                      : "bg-teal-500/15 border border-teal-500/35 text-teal-300"
                  }`} />
                  <div className="flex-1 space-y-1">{children}</div>
                </li>
              );
            }

            return (
              <li
                className={`font-sans text-sm sm:text-base leading-relaxed tracking-wide flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  isLight 
                    ? "text-slate-800 bg-slate-50/80 border-slate-200 hover:border-blue-300"
                    : "text-slate-200 bg-slate-900/40 border-slate-800/70 hover:border-teal-500/30"
                }`}
                {...props}
              >
                <span className={`font-extrabold text-base shrink-0 mt-0.5 select-none ${
                  isLight ? "text-blue-600" : "text-teal-400 drop-shadow-[0_0_6px_rgba(45,212,191,0.5)]"
                }`}>
                  ➤
                </span>
                <div className="flex-1 space-y-1">{children}</div>
              </li>
            );
          },
          strong: ({ node, children, ...props }) => (
            <strong className={`font-bold tracking-wide px-1.5 py-0.5 rounded border mr-1 inline-block ${
              isLight
                ? "bg-blue-50 text-blue-900 border-blue-200"
                : "bg-teal-500/10 text-teal-200 border-teal-500/20"
            }`} {...props}>
              {children}
            </strong>
          ),
          em: ({ node, children, ...props }) => (
            <em className={`italic tracking-wide font-normal ${isLight ? "text-slate-600" : "text-slate-300"}`} {...props}>
              {children}
            </em>
          ),
          hr: ({ node, ...props }) => (
            <div className="my-6 flex items-center gap-3">
              <div className={`h-px flex-1 ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
              <span className={`text-xs select-none ${isLight ? "text-slate-400" : "text-slate-600"}`}>✦ ✦ ✦</span>
              <div className={`h-px flex-1 ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
            </div>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className={`border-l-4 px-4 py-3 my-4 rounded-r-xl italic text-sm tracking-wide shadow-sm ${
                isLight 
                  ? "border-blue-500 bg-blue-50/50 text-slate-700" 
                  : "border-teal-500 bg-teal-500/5 text-slate-300"
              }`}
              {...props}
            >
              {children}
            </blockquote>
          ),
          table: ({ node, ...props }) => (
            <div className={`my-5 overflow-x-auto rounded-2xl border p-1.5 shadow-sm ${
              isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-950/90 shadow-xl"
            }`}>
              <table className="w-full text-left text-xs sm:text-sm border-separate border-spacing-y-1.5" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className={`font-display text-xs uppercase font-bold tracking-wider ${
                isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900/90 text-teal-300"
              }`}
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => <tbody className="space-y-1" {...props} />,
          tr: ({ node, ...props }) => (
            <tr className={`rounded-xl transition-colors ${
              isLight ? "bg-slate-50/70 hover:bg-slate-100/80" : "bg-slate-900/40 hover:bg-slate-800/60"
            }`} {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className={`px-4 py-3 font-semibold whitespace-nowrap first:rounded-l-xl last:rounded-r-xl border-b ${
                isLight ? "text-slate-800 border-slate-200" : "text-slate-200 border-slate-800"
              }`}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className={`font-sans px-4 py-3 leading-relaxed tracking-wide first:rounded-l-xl last:rounded-r-xl ${
                isLight ? "text-slate-700" : "text-slate-300"
              }`}
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold border mx-1 ${
                    isLight 
                      ? "bg-slate-100 text-blue-700 border-slate-200" 
                      : "bg-slate-800/90 text-teal-300 border-slate-700/60"
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto text-xs font-mono my-4 text-slate-200 shadow-inner">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          a: ({ node, ...props }) => (
            <a
              className={`underline underline-offset-4 transition-colors font-semibold ${
                isLight ? "text-blue-600 hover:text-blue-800" : "text-teal-400 hover:text-teal-300"
              }`}
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
