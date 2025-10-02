"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { components } from "@/components/mdx-component";

interface MarkdownClientProps {
  children: string;
}

export default function MarkdownClient({ children }: MarkdownClientProps) {
  return (
    <ReactMarkdown
      components={components}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSlug]}
    >
      {children}
    </ReactMarkdown>
  );
}
