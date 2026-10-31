"use client";

import { memo } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/** Markdown + LaTeX ($inline$, $$display$$) for questions, options and markschemes. */
export const Markdown = memo(function Markdown({
  children,
  inline = false,
  className,
}: {
  children: string;
  inline?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("md", inline && "md-inline", className)}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
