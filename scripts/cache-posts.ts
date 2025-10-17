import "./load-env";
import { fetchPublishedPosts, getPostFromNotion } from "../src/lib/notion";
import type { Post } from "../src/lib/notion";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import GithubSlugger from "github-slugger";
import {
  NOTION_IMAGE_PROXY_PATH,
  parseProxyTarget,
  shouldProxyNotionImage,
} from "../src/lib/image-proxy";

const COVER_OUTPUT_DIR = path.join(process.cwd(), "public", "notion-images");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureLocalImage(sourceUrl: string): Promise<string | null> {
  try {
    await fs.promises.mkdir(COVER_OUTPUT_DIR, { recursive: true });

    const url = new URL(sourceUrl);
    const extension = path.extname(url.pathname) || ".jpg";
    const hashedName = `${crypto.createHash("sha1").update(sourceUrl).digest("hex")}${extension}`;
    const targetPath = path.join(COVER_OUTPUT_DIR, hashedName);

    if (!fs.existsSync(targetPath)) {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Unexpected response ${response.status} fetching image`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(targetPath, buffer);
    }

    return `/notion-images/${hashedName}`;
  } catch (error) {
    console.warn(`⚠️  Failed to cache image ${sourceUrl}:`, error);
    return null;
  }
}

async function ensureCoverImage(post: Post): Promise<Post> {
  if (!post.coverImageOriginal) {
    return post;
  }

  const localPath = await ensureLocalImage(post.coverImageOriginal);
  if (!localPath) {
    return post;
  }

  return {
    ...post,
    coverImage: localPath,
    coverImageOriginal: localPath,
  };
}

function resolveOriginalUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("/notion-images/") || rawUrl.startsWith("/")) {
    return null;
  }
  if (rawUrl.startsWith("data:")) {
    return null;
  }
  if (rawUrl.startsWith(NOTION_IMAGE_PROXY_PATH)) {
    try {
      const proxyUrl = new URL(rawUrl, "https://cache.local");
      const target = parseProxyTarget(proxyUrl.searchParams.get("src"));
      return target?.toString() ?? null;
    } catch {
      return null;
    }
  }
  return rawUrl;
}

async function cacheInlineImages(post: Post): Promise<Post> {
  if (!post.content) return post;

  const imagePattern = /!\[[^\]]*\]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/g;
  const downloads = new Map<string, string>();
  let updatedContent = post.content;

  for (const match of post.content.matchAll(imagePattern)) {
    const rawUrl = match.groups?.url;
    if (!rawUrl) continue;

    const originalUrl = resolveOriginalUrl(rawUrl);
    if (!originalUrl || !shouldProxyNotionImage(originalUrl)) {
      continue;
    }

    if (!downloads.has(originalUrl)) {
      const localPath = await ensureLocalImage(originalUrl);
      if (!localPath) {
        continue;
      }
      downloads.set(originalUrl, localPath);
    }

    const localPath = downloads.get(originalUrl)!;
    const escaped = escapeRegExp(rawUrl);
    const replacementRegex = new RegExp(
      `(?<=!\\[[^\\]]*\\]\\()${escaped}(?=(?:\\s+"[^"]*")?\\))`,
      "g"
    );
    updatedContent = updatedContent.replace(replacementRegex, localPath);
  }

  return {
    ...post,
    content: updatedContent,
  };
}

async function cachePosts() {
  try {
    console.log("Fetching posts from Notion...");
    const posts = await fetchPublishedPosts();

    const allPosts = [];

    for (const post of posts) {
      const postDetails = await getPostFromNotion(post.id);
      if (postDetails) {
        const postWithCover = await ensureCoverImage(postDetails);
        const postWithImages = await cacheInlineImages(postWithCover);

        // 🆕 generate slug untuk tiap heading agar konsisten dengan rehype-slug
        const slugger = new GithubSlugger();
        const fixedHeadings = postWithImages.headings.map((h) => ({
          ...h,
          slug: slugger.slug(h.text),
        }));

        allPosts.push({
          ...postWithImages,
          headings: fixedHeadings,
        });
      }
    }

    const cachePath = path.join(process.cwd(), "posts-cache.json");
    fs.writeFileSync(cachePath, JSON.stringify(allPosts, null, 2));

    console.log(`✅ Successfully cached ${allPosts.length} posts.`);
  } catch (error) {
    console.error("Error caching posts:", error);
    const cachePath = path.join(process.cwd(), "posts-cache.json");
    if (fs.existsSync(cachePath)) {
      console.warn("Using existing cached posts because Notion fetch failed.");
      return;
    }
    console.warn(
      "No cached posts were found, writing an empty cache so the build can proceed. Verify NOTION_TOKEN/NOTION_DATABASE_ID."
    );
    fs.writeFileSync(cachePath, JSON.stringify([], null, 2));
  }
}

cachePosts();
