"use client";

import type { ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import createElement from "react-syntax-highlighter/dist/cjs/create-element";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
}

type AccentColor = "red" | "green" | "blue";

const SEGMENT_TOKEN_REGEX =
  /__NCOLOR_START(?::|__)(red|green|blue)__(.*?)__NCOLOR_END__/gs;
const PLACEHOLDER_PREFIX = "__NCOLOR_PLACEHOLDER_";
const PLACEHOLDER_REGEX = /__NCOLOR_PLACEHOLDER_(\d+)__/g;

const SEGMENT_COLOR_MAP: Record<AccentColor, string> = {
  red: "#f87171",
  green: "#4ade80",
  blue: "#60a5fa",
};

const ACCENT_STYLES: Record<
  AccentColor,
  {
    light: { container: string; button: string };
    dark: { container: string; button: string };
  }
> = {
  red: {
    light: {
      container: "border-red-200/80 bg-red-50/90",
      button: "border border-red-200 bg-white/80 text-red-600 hover:bg-red-50",
    },
    dark: {
      container: "border-red-500/60 bg-red-500/20",
      button: "border border-red-500/40 bg-red-500/30 text-red-100 hover:bg-red-500/40",
    },
  },
  green: {
    light: {
      container: "border-emerald-200/80 bg-emerald-50/90",
      button: "border border-emerald-200 bg-white/80 text-emerald-700 hover:bg-emerald-50",
    },
    dark: {
      container: "border-emerald-500/60 bg-emerald-500/20",
      button: "border border-emerald-500/40 bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/40",
    },
  },
  blue: {
    light: {
      container: "border-blue-200/80 bg-blue-50/90",
      button: "border border-blue-200 bg-white/80 text-blue-600 hover:bg-blue-50",
    },
    dark: {
      container: "border-blue-500/60 bg-blue-500/20",
      button: "border border-blue-500/40 bg-blue-500/30 text-blue-100 hover:bg-blue-500/40",
    },
  },
};

export function CodeBlock({ code, language = "plaintext" }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";

  const processed = useMemo(() => {
    let trimmed = code.trimEnd();
    let accent: AccentColor | null = null;

    trimmed = trimmed.replace(
      /^__CODE_COLOR:(red|green|blue)__\r?\n?/,
      (_match, color: string) => {
        accent = color as AccentColor;
        return "";
      }
    );

    const segments: Array<{ placeholder: string; color: AccentColor; content: string }> = [];
    let placeholderIndex = 0;

    const marked = trimmed.replace(
      SEGMENT_TOKEN_REGEX,
      (_match, color: string, content: string) => {
        const placeholder = PLACEHOLDER_PREFIX + placeholderIndex++ + "__";
        segments.push({
          placeholder,
          color: color as AccentColor,
          content,
        });
        return placeholder;
      }
    );

    const plain = segments.reduce(
      (acc, segment) => acc.split(segment.placeholder).join(segment.content),
      marked
    );

    return { accent, marked, plain, hasSegments: segments.length > 0, segments };
  }, [code]);

  const paletteKey: "light" | "dark" = isDark ? "dark" : "light";
  type AccentPalette = (typeof ACCENT_STYLES)[AccentColor]["light"];
  const accentColor = processed.accent;
  const accentPalette: AccentPalette | null = accentColor
    ? ACCENT_STYLES[accentColor][paletteKey]
    : null;

  const copyTarget = processed.plain;

  const segmentMap = useMemo(() => {
    const map = new Map<string, { color: AccentColor; content: string }>();
    processed.segments.forEach((segment) => {
      map.set(segment.placeholder, segment);
    });
    return map;
  }, [processed.segments]);

  const applyInlineColor = (value: string): ReactNode => {
    if (!processed.hasSegments || !value.includes(PLACEHOLDER_PREFIX)) return value;

    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(PLACEHOLDER_REGEX.source, PLACEHOLDER_REGEX.flags);
    let segmentIndex = 0;

    while ((match = regex.exec(value)) !== null) {
      const [placeholder] = match;
      if (match.index > lastIndex) {
        nodes.push(value.slice(lastIndex, match.index));
      }

      const segment = segmentMap.get(placeholder);
      if (segment) {
        nodes.push(
          <span
            key={'color-segment-' + segmentIndex++ + '-' + match.index}
            style={{ color: SEGMENT_COLOR_MAP[segment.color] }}
          >
            {segment.content}
          </span>
        );
      } else {
        nodes.push(placeholder);
      }

      lastIndex = match.index + placeholder.length;
    }

    if (lastIndex < value.length) {
      nodes.push(value.slice(lastIndex));
    }

    if (nodes.length === 1) return nodes[0];
    return nodes;
  };

  const colorizeNode = (node: ReactNode): ReactNode => {
    if (typeof node === "string") return applyInlineColor(node);
    if (Array.isArray(node)) return node.map(colorizeNode);
    if (isValidElement(node)) {
      const element = node as ReactElement<{ children?: ReactNode }>;
      const children = colorizeNode(element.props.children);
      if (children === element.props.children) return element;
      return cloneElement(element, undefined, children);
    }
    return node;
  };

  type DefaultRenderer = (props: any) => ReactNode;
  const baseRenderer = (SyntaxHighlighter as any).defaultProps?.renderer as DefaultRenderer | undefined;

  const renderWithInlineColors = (props: any): ReactNode => {
    const baseOutput = baseRenderer
      ? baseRenderer(props)
      : props.rows.map((row: any, index: number) =>
          createElement({
            node: row,
            stylesheet: props.stylesheet,
            useInlineStyles: props.useInlineStyles,
            key: index,
          })
        );
    return baseOutput == null ? baseOutput : colorizeNode(baseOutput);
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const containerClass = accentPalette?.container ?? (
    isDark ? "border-border/40 bg-muted/10" : "border-zinc-200 bg-zinc-50"
  );

  const buttonClass = accentPalette?.button ?? (
    isDark
      ? "border border-border/60 bg-background/80 text-muted-foreground hover:bg-muted"
      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
  );

  const syntaxRenderer = processed.hasSegments ? renderWithInlineColors : undefined;

  return (
    <div
      className={cn(
        "relative my-5 w-full max-w-3xl overflow-hidden rounded-xl border shadow-sm backdrop-blur",
        containerClass
      )}
    >
      <button
        onClick={handleCopy}
        className={cn(
          "absolute right-3 top-3 rounded-lg px-3 py-1 text-xs font-medium transition",
          buttonClass
        )}
      >
        {copied ? "Copied" : "Copy"}
      </button>

      <SyntaxHighlighter
        language={language}
        style={isDark ? vscDarkPlus : oneLight}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "1.75rem 1.5rem 1.5rem",
          background: "transparent",
          fontSize: "0.9rem",
        }}
        codeTagProps={{ className: "font-mono leading-6" }}
        renderer={syntaxRenderer}
      >
        {processed.marked}
      </SyntaxHighlighter>
    </div>
  );
}
