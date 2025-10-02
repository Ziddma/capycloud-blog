import { NextResponse } from "next/server";
import { fetchAllPosts, invalidatePostsCache } from "@/lib/notion";

const DEFAULT_TTL_SECONDS = 600;

export const runtime = "nodejs";

function shouldBypassCache(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("fresh") === "1") return true;
  const cacheControl = request.headers.get("cache-control") ?? "";
  return /no-cache|max-age=0/.test(cacheControl);
}

export async function GET(request: Request) {
  const posts = await fetchAllPosts({
    forceRefresh: shouldBypassCache(request),
    cacheTtlSeconds: DEFAULT_TTL_SECONDS,
  });

  return NextResponse.json(
    { posts },
    {
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${DEFAULT_TTL_SECONDS}`,
      },
    }
  );
}

export async function POST(request: Request) {
  const expectedToken = process.env.REVALIDATION_TOKEN;
  if (expectedToken) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expectedToken}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  await invalidatePostsCache();
  const posts = await fetchAllPosts({ forceRefresh: true, cacheTtlSeconds: DEFAULT_TTL_SECONDS });

  return NextResponse.json(
    { posts },
    {
      status: 202,
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${DEFAULT_TTL_SECONDS}`,
      },
    }
  );
}
