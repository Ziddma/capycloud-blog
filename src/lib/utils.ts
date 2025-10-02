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

interface NotionImageProxyOptions {
  absolute?: boolean;
  baseUrl?: string;
}

export function buildNotionImageProxy(
  src?: string,
  options: NotionImageProxyOptions = {}
): string | undefined {
  if (!src) return undefined;

  try {
    // Validate the source URL before proxying
    new URL(src);
  } catch {
    return src;
  }

  const path = `/images/notion-cover?src=${encodeURIComponent(src)}`;
  if (!options.absolute) {
    return path;
  }

  const base = options.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}
