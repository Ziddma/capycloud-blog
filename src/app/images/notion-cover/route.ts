import { NextResponse } from "next/server";
import { createCacheRequest, getRuntimeCache } from "@/lib/runtime-cache";

const IMAGE_CACHE_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const IMAGE_CACHE_PREFIX = "https://notion-blog.internal/cache/notion-image?src=";

export const runtime = "nodejs";

function shouldBypassCache(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("fresh") === "1") return true;
  const cacheControl = request.headers.get("cache-control") ?? "";
  return /no-cache|max-age=0/.test(cacheControl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src");

  if (!src) {
    return new NextResponse("Missing src parameter", { status: 400 });
  }

  if (!/^https?:\/\//i.test(src)) {
    return new NextResponse("Invalid src parameter", { status: 400 });
  }

  const cacheKey = IMAGE_CACHE_PREFIX + encodeURIComponent(src);
  const cache = getRuntimeCache();
  const cacheRequest = createCacheRequest(cacheKey);

  if (!shouldBypassCache(request) && cache && cacheRequest) {
    const cached = await cache.match(cacheRequest);
    if (cached) {
      return cached;
    }
  }

  const upstream = await fetch(src);
  if (!upstream.ok) {
    return new NextResponse("Failed to fetch image", { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const response = new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=0, s-maxage=${IMAGE_CACHE_TTL_SECONDS}`,
    },
  });

  if (cache && cacheRequest) {
    try {
      await cache.put(cacheRequest, response.clone());
    } catch (error) {
      console.warn("Failed caching Notion cover image", error);
    }
  }

  return response;
}
