import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateReadingTime(wordCount: number): string {
  const WORDS_PER_MINUTE = 225; // Average adult reading speed
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  return `${minutes} min read`;
}

const PARAGRAPH_SEPARATOR = /\r?\n\s*\r?\n/;

function isRenderableParagraph(paragraph: string): boolean {
  const trimmed = paragraph.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return false; // headings
  if (/^[-*_]{3,}\s*$/.test(trimmed)) return false; // horizontal rules
  return true;
}

export function getFirstContentParagraph(content?: string | null): string | null {
  if (!content) return null;
  const paragraphs = content.split(PARAGRAPH_SEPARATOR);
  for (const paragraph of paragraphs) {
    if (isRenderableParagraph(paragraph)) {
      return paragraph.trim();
    }
  }
  return null;
}

export function removeFirstContentParagraph(content?: string | null): string {
  if (!content) return "";
  const paragraphs = content.split(PARAGRAPH_SEPARATOR);
  let removed = false;

  const kept = paragraphs.filter((paragraph) => {
    if (!removed && isRenderableParagraph(paragraph)) {
      removed = true;
      return false;
    }
    return true;
  });

  return kept.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export { buildNotionImageProxy, shouldProxyNotionImage, NOTION_IMAGE_PROXY_PATH } from "./image-proxy";
