"use client";

import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/smart-image";
import type { Components } from "react-markdown";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { CodeBlock } from "@/components/code-block";


type ElementWithChildren = React.ReactElement<{ children?: React.ReactNode }>;

const isElementWithChildren = (
  node: React.ReactNode
): node is ElementWithChildren =>
  React.isValidElement<{ children?: React.ReactNode }>(node);

const components: Components = {
  // Headings
  h1: ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      {...props}
      className={cn("scroll-mt-32 mt-12 mb-6 font-bold text-4xl first:mt-0", className)}
    >
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      className={cn("scroll-mt-24 mt-10 mb-4 font-bold text-2xl first:mt-0", className)}
    >
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      {...props}
      className={cn("scroll-mt-20 mt-8 mb-3 text-xl font-bold first:mt-0", className)}
    >
      {children}
    </h3>
  ),
  h4: ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 {...props} className={cn("mt-6 mb-2 text-lg font-bold first:mt-0", className)}>
      {children}
    </h4>
  ),
  h5: ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5 {...props} className={cn("mt-6 mb-2 text-base font-semibold first:mt-0", className)}>
      {children}
    </h5>
  ),
  h6: ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6
      {...props}
      className={cn(
        "mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground first:mt-0",
        className
      )}
    >
      {children}
    </h6>
  ),

  // Paragraphs & links
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-4 leading-relaxed">{children}</p>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} className="text-blue-500 hover:underline">
      {children}
    </a>
  ),

  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-4 list-disc space-y-2 pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-4 list-decimal space-y-2 pl-5 [&_ol]:mt-2 [&_ol]:list-[lower-alpha] [&_ol]:space-y-1 [&_ol]:pl-5">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Blockquote with callout support
  blockquote: ({ children }: { children?: React.ReactNode }) => {
    const nodes = React.Children.toArray(children);

    const extractText = (content: React.ReactNode): string => {
      if (typeof content === "string" || typeof content === "number") return String(content);
      if (Array.isArray(content)) return content.map(extractText).join(" ");
      if (isElementWithChildren(content)) return extractText(content.props.children);
      return "";
    };

    const firstText = extractText(nodes[0]).trim();
    const calloutIcons = ["💡", "✅", "⚠️", "❗️", "📘", "ℹ️"];
    const isCallout = calloutIcons.some((icon) => firstText.startsWith(icon));

    if (isCallout) {
      return (
        <blockquote className="my-6 w-full border-0 pl-0">
          <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
            {/* ✅ teks callout hormati newline */}
            <div className="flex w-full flex-col gap-2 whitespace-pre-line [&>p]:m-0 [&>p]:leading-relaxed">
              {children}
            </div>
          </div>
        </blockquote>
      );
    }

    const flattenChildren = (input: React.ReactNode[]): React.ReactNode[] => {
      const result: React.ReactNode[] = [];
      input.forEach((item) => {
        if (typeof item === "string") {
          if (item.trim()) result.push(item);
          return;
        }
        if (!isElementWithChildren(item)) {
          if (item !== undefined && item !== null) {
            result.push(item);
          }
          return;
        }
        const childNodes = item.props.children;
        if (item.type === React.Fragment) {
          result.push(...flattenChildren(React.Children.toArray(childNodes)));
          return;
        }
        const childCount = React.Children.count(childNodes);
        if (childCount > 1) {
          result.push(
            React.cloneElement(item, {
              children: React.Children.map(childNodes, (child, idx) => (
                <React.Fragment key={idx}>{child}</React.Fragment>
              )),
            })
          );
          return;
        }
        if (
          childCount === 1 &&
          typeof childNodes === "string" &&
          childNodes.trim() === ""
        ) {
          return;
        }
        result.push(item);
      });
      return result;
    };

    const segments = flattenChildren(nodes).filter((segment) =>
      typeof segment === "string" ? segment.trim() !== "" : true
    );

    if (!segments.length) return null;

    // ✅ blockquote biasa juga hormati newline
    return (
      <blockquote className="my-6 w-full space-y-4 border-0 pl-0 leading-relaxed text-muted-foreground whitespace-pre-line">
        {segments.map((segment, index) => (
          <div key={index} className="[&>p]:m-0 [&>p]:leading-relaxed">
            {segment}
          </div>
        ))}
      </blockquote>
    );
  },

  // Code & pre
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const match = /language-(\w+)/.exec(className || "");
    if (match) {
      const code = String(children ?? "").replace(/\n$/, "");
      return <CodeBlock code={code} language={match[1]} />;
    }
    return (
      <Badge variant="pre" className="rounded-md font-mono text-sm">
        {children}
      </Badge>
    );
  },
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className={cn("bg-transparent p-0", className)} {...props} />
  ),

  // Images
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => {
    if (!src || typeof src !== "string") {
      return null;
    }

    return (
      <SmartImage
        src={src}
        alt={alt || ""}
        width={1024}
        height={576}
        className="h-auto w-full object-contain"
        maxRetries={4}
        retryDelayMs={1500}
        fallbackSrc="/images/image-fallback.png"
        wrapper="span"
        wrapperClassName="my-6 block overflow-hidden rounded-xl border border-border/40"
      />
    );
  },

  // Tables
  table: ({ children }: { children?: React.ReactNode }) => (
    <Table className="rounded-md">{children}</Table>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <TableHeader className="bg-muted first:rounded-t-md">{children}</TableHeader>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <TableBody className="[&>tr:nth-child(even)]:bg-muted/50">{children}</TableBody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <TableRow className="border-border group">{children}</TableRow>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <TableCell className="border-r border-border last:border-r-0 group-last:first:rounded-bl-md group-last:last:rounded-br-md">
      {children}
    </TableCell>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <TableHead className="font-bold border-r border-border last:border-r-0 first:rounded-tl-md last:rounded-tr-md">
      {children}
    </TableHead>
  ),
};

export { components };
