import { createNotionBridge, type Post } from "@/shared/notion-transform";
import {
  buildNotionImageProxy,
  NOTION_IMAGE_PROXY_PATH,
  shouldProxyNotionImage,
} from "./image-proxy";

let notionBridge: ReturnType<typeof createNotionBridge> | null = null;

function ensureEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBridge() {
  if (!notionBridge) {
    const auth = ensureEnvVar("NOTION_TOKEN");
    const databaseId = process.env.NOTION_DATABASE_ID;
    notionBridge = createNotionBridge({ auth, databaseId });
  }
  return notionBridge;
}

function resolveCacheApiBase(): string | null {
  const candidate =
    process.env.NEXT_PUBLIC_CACHE_API_URL ||
    process.env.CACHE_API_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (!candidate) return null;
  return candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
}

function normalizePostImages(post: Post): Post {
  const localCoverPath =
    post.coverImage?.startsWith("/notion-images/") ||
    post.coverImageOriginal?.startsWith("/notion-images/")
      ? post.coverImage ?? post.coverImageOriginal
      : undefined;

  if (localCoverPath) {
    return {
      ...post,
      coverImage: localCoverPath,
      coverImageOriginal: localCoverPath,
    };
  }

  const storedOriginal =
    post.coverImageOriginal &&
    !post.coverImageOriginal.startsWith(NOTION_IMAGE_PROXY_PATH)
      ? post.coverImageOriginal
      : undefined;

  const candidateOriginal =
    storedOriginal ??
    (post.coverImage && shouldProxyNotionImage(post.coverImage)
      ? post.coverImage
      : undefined);

  const proxiedCover =
    buildNotionImageProxy(candidateOriginal ?? post.coverImage) ??
    post.coverImage;

  return {
    ...post,
    coverImageOriginal:
      candidateOriginal ??
      storedOriginal ??
      post.coverImageOriginal ??
      undefined,
    coverImage: proxiedCover,
  };
}

export function getWordCount(content: string): number {
  const cleanText = content
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleanText.split(" ").length;
}

export async function getPostsFromCache(): Promise<Post[]> {
  const apiBase = resolveCacheApiBase();

  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/cache/posts`, {
        cache: "no-store",
      });
      if (res.ok) {
        const remotePosts = (await res.json()) as Post[];
        return remotePosts.map(normalizePostImages);
      }
    } catch (error) {
      console.warn("Failed to fetch posts from cache API:", error);
    }
  }

  const data = await import("../../posts-cache.json");
  const rawPosts = (data.default || data) as Post[];
  return rawPosts.map(normalizePostImages);
}

export async function fetchPublishedPosts() {
  const bridge = getBridge();
  return bridge.fetchPublishedPosts();
}

export async function getDatabaseStructure() {
  const bridge = getBridge();
  return bridge.getDatabaseStructure();
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getPostsFromCache();
  const post = posts.find((p) => p.slug === slug);
  return post || null;
}

export async function getPostFromNotion(pageId: string): Promise<Post | null> {
  const bridge = getBridge();
  const post = await bridge.buildPostFromPage(pageId);
  return post;
}

export type { Post };

