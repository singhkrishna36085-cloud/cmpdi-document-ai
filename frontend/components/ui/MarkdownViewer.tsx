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
    <div className={`max-w-none text-slate-200 font-sans leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => (
            <div className="mt-8 mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold tracking-widest uppercase mb-2">
                <span>✦ TOPIC OVERVIEW</span>
              </div>
              <h1
                className="font-display text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-100 to-emerald-300 tracking-wider uppercase pb-2 border-b border-slate-800/80"
                {...props}
              >
                {children}
              </h1>
            </div>
          ),
          h2: ({ node, children, ...props }) => (
            <div className="mt-7 mb-3.5 pt-3 border-t border-slate-800/70">
              <h2
                className="font-display text-lg sm:text-xl font-bold text-white tracking-wider flex items-center gap-2.5 uppercase"
                {...props}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0 shadow-[0_0_10px_rgba(45,212,191,0.7)]" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-teal-200">
                  {children}
                </span>
              </h2>
            </div>
          ),
          h3: ({ node, children, ...props }) => (
            <div className="mt-6 mb-2.5">
              <h3
                className="font-display text-base sm:text-lg font-bold text-teal-300 tracking-wide flex items-center gap-2 uppercase"
                {...props}
              >
                <span className="text-teal-400 font-black text-sm select-none">➤</span>
                <span>{children}</span>
              </h3>
            </div>
          ),
          h4: ({ node, children, ...props }) => (
            <h4 className="font-display text-sm sm:text-base font-semibold text-slate-200 mt-4 mb-2 tracking-wide uppercase" {...props}>
              {children}
            </h4>
          ),
          p: ({ node, children, ...props }) => (
            <p className="font-sans text-slate-200 text-sm sm:text-base leading-relaxed tracking-wide [word-spacing:0.07em] mb-4 font-normal" {...props}>
              {children}
            </p>
          ),
          ul: ({ node, children, ...props }) => (
            <ul className="my-3 space-y-2.5 list-none pl-0" {...props}>
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="my-3.5 space-y-2.5 list-none pl-0 [counter-reset:ai-counter]" {...props}>
              {children}
            </ol>
          ),
          li: ({ node, ordered, children, ...props }: any) => {
            if (ordered) {
              return (
                <li
                  className="font-sans text-sm sm:text-base text-slate-200 leading-relaxed tracking-wide [word-spacing:0.06em] flex items-start gap-3.5 p-3 sm:p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-teal-500/30 transition-all [counter-increment:ai-counter]"
                  {...props}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/35 text-teal-300 text-xs font-mono font-bold shrink-0 mt-0.5 before:content-[counter(ai-counter)] select-none shadow-sm" />
                  <div className="flex-1 space-y-1">{children}</div>
                </li>
              );
            }

            return (
              <li
                className="font-sans text-sm sm:text-base text-slate-200 leading-relaxed tracking-wide [word-spacing:0.06em] flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/70 hover:border-teal-500/30 transition-all"
                {...props}
              >
                <span className="text-teal-400 font-extrabold text-base shrink-0 mt-0.5 select-none drop-shadow-[0_0_6px_rgba(45,212,191,0.5)]">
                  ➤
                </span>
                <div className="flex-1 space-y-1">{children}</div>
              </li>
            );
          },
          strong: ({ node, children, ...props }) => (
            <strong className="font-bold text-white tracking-wide bg-teal-500/10 text-teal-200 px-1.5 py-0.5 rounded border border-teal-500/20 mr-1 inline-block" {...props}>
              {children}
            </strong>
          ),
          em: ({ node, children, ...props }) => (
            <em className="italic text-slate-300 tracking-wide font-normal" {...props}>
              {children}
            </em>
          ),
          hr: ({ node, ...props }) => (
            <div className="my-6 flex items-center gap-3">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-slate-600 text-xs select-none">✦ ✦ ✦</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className="border-l-4 border-teal-500 bg-teal-500/5 px-4 py-3 my-4 rounded-r-xl text-slate-300 italic text-sm tracking-wide [word-spacing:0.06em] shadow-inner"
              {...props}
            >
              {children}
            </blockquote>
          ),
          table: ({ node, ...props }) => (
            <div className="my-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl p-1.5">
              <table className="w-full text-left text-xs sm:text-sm border-separate border-spacing-y-1.5" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="font-display bg-slate-900/90 text-teal-300 text-xs uppercase font-bold tracking-wider"
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => <tbody className="space-y-1" {...props} />,
          tr: ({ node, ...props }) => (
            <tr className="bg-slate-900/40 hover:bg-slate-800/60 rounded-xl transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap first:rounded-l-xl last:rounded-r-xl border-b border-slate-800"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="font-sans px-4 py-3 text-slate-300 leading-relaxed tracking-wide [word-spacing:0.05em] first:rounded-l-xl last:rounded-r-xl"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="px-2 py-0.5 rounded-md bg-slate-800/90 text-teal-300 text-xs font-mono font-semibold border border-slate-700/60 mx-1"
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
              className="text-teal-400 hover:text-teal-300 underline underline-offset-4 transition-colors font-semibold"
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
