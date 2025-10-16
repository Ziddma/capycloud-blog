import { NextRequest } from "next/server";
import type { KVNamespace, RequestInitCfProperties } from "@cloudflare/workers-types";
import {
  NOTION_IMAGE_PROXY_PATH,
  parseProxyTarget,
} from "@/lib/image-proxy";

const CACHE_SECONDS = 60 * 60 * 12; // 12 hours
const STALE_SECONDS = 60 * 60 * 24; // 24 hours
const CACHE_HEADER = `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`;
const KV_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const NOTION_SIGNED_HOSTS = new Set([
  "prod-files-secure.s3.us-west-2.amazonaws.com",
  "prod-files-secure.s3.amazonaws.com",
  "s3.us-west-2.amazonaws.com",
  "s3.amazonaws.com",
  "www.notion-static.com",
  "notion-static.com",
]);

function buildNotionImageProxyUrl(sourceUrl: URL): URL {
  const proxy = new URL(`https://www.notion.so/image/${encodeURIComponent(sourceUrl.toString())}`);
  proxy.searchParams.set("cache", "v2");
  if (!proxy.searchParams.has("table")) {
    proxy.searchParams.set("table", "block");
  }
  return proxy;
}

type CfCacheStorage = { default: Cache };

type Env = {
  KV: KVNamespace;
};

const encoder = new TextEncoder();
type StoredMetadata = {
  contentType?: string;
  source?: string;
};

const FALLBACK_KV = {
  async get() {
    return null;
  },
  async getWithMetadata() {
    return { value: null, metadata: null, cacheStatus: null };
  },
  async put() {
    return;
  },
  async delete() {
    return;
  },
  async list() {
    return { keys: [], list_complete: true, cacheStatus: null };
  },
} as unknown as KVNamespace;

let fallbackEnv: Env | null = null;
let hasLoggedMissingBindings = false;

function resolveEnv(context: unknown): Env | null {
  if (!context || typeof context !== "object") return null;
  if ("env" in context && (context as { env?: Env }).env) {
    return (context as { env: Env }).env;
  }
  if ("context" in context && typeof (context as { context?: unknown }).context === "object") {
    const nested = (context as { context?: { env?: Env } }).context;
    if (nested?.env) return nested.env;
  }
  return null;
}

function getEnvWithFallback(context: unknown): Env {
  const env = resolveEnv(context);
  if (env?.KV) {
    return env;
  }

  if (!hasLoggedMissingBindings) {
    console.warn(
      "Missing Cloudflare KV binding in route context. Falling back to in-memory passthrough; images won't be cached locally."
    );
    hasLoggedMissingBindings = true;
  }

  if (!fallbackEnv) {
    fallbackEnv = { KV: FALLBACK_KV };
  }

  return fallbackEnv;
}

async function createHash(input: string): Promise<string> {
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function buildResponseHeaders(upstream: Response | null, source: URL, contentType?: string): Headers {
  const headers = new Headers();
  const type = contentType ?? upstream?.headers.get("content-type") ?? "application/octet-stream";
  headers.set("content-type", type);

  const cacheControl = upstream?.headers.get("cache-control");
  headers.set("cache-control", cacheControl ?? CACHE_HEADER);

  const etag = upstream?.headers.get("etag");
  if (etag) headers.set("etag", etag);

  const lastModified = upstream?.headers.get("last-modified");
  if (lastModified) headers.set("last-modified", lastModified);

  headers.set("x-proxied-from", source.origin);
  headers.set("access-control-allow-origin", "*");

  return headers;
}

async function proxyImage(
  request: NextRequest,
  method: "GET" | "HEAD",
  env: Env,
  sourceUrlOverride?: URL,
  kvKeyOverride?: string
): Promise<Response> {
  const cacheStorage = (globalThis as unknown as { caches?: CfCacheStorage }).caches;

  if (cacheStorage) {
    const cacheKey = new Request(request.url, request);
    const cached = await cacheStorage.default.match(cacheKey);
    if (cached) {
      const clone = cached.clone();
      const headers = new Headers(clone.headers);
      headers.set("x-cache-status", "edge-cache");
      if (method === "HEAD") {
        return new Response(null, {
          status: clone.status,
          statusText: clone.statusText,
          headers,
        });
      }

      return new Response(clone.body, {
        status: clone.status,
        statusText: clone.statusText,
        headers,
      });
    }
  }

  const sourceUrl = sourceUrlOverride ?? parseProxyTarget(request.nextUrl.searchParams.get("src"));

  if (!sourceUrl) {
    return new Response("Missing or unsupported src parameter", { status: 400 });
  }

  try {
    const upstreamCandidates: URL[] = [];

    if (NOTION_SIGNED_HOSTS.has(sourceUrl.hostname)) {
      upstreamCandidates.push(buildNotionImageProxyUrl(sourceUrl));
    }

    upstreamCandidates.push(sourceUrl);

    let upstream: Response | null = null;

    const upstreamInit: RequestInit & { cf?: RequestInitCfProperties } = {
      cf: {
        cacheTtl: CACHE_SECONDS,
        cacheEverything: true,
      },
    };

    for (const candidate of upstreamCandidates) {
      const upstreamRequest = new Request(candidate.toString(), {
        method,
        headers: {
          accept: request.headers.get("accept") ?? "image/*",
          "user-agent": request.headers.get("user-agent") ?? "notion-image-proxy",
        },
      });

      const result = await fetch(upstreamRequest, upstreamInit);
      if (result.ok) {
        upstream = result;
        break;
      }

      if (!upstream || upstream.status === 403 || upstream.status === 404) {
        upstream = result;
      } else {
        result.body?.cancel();
      }
    }

    if (!upstream || !upstream.ok) {
      const status = upstream?.status ?? 502;
      upstream?.body?.cancel();
      return new Response("Upstream image request failed", { status });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const headers = buildResponseHeaders(upstream, sourceUrl, contentType);
    headers.set("cache-control", CACHE_HEADER);
    headers.set("x-cache-status", "origin");

    const cacheKey = kvKeyOverride ?? (await createHash(sourceUrl.toString()));
    try {
      await env.KV.put(cacheKey, buffer, {
        expirationTtl: KV_TTL_SECONDS,
        metadata: {
          contentType,
          source: sourceUrl.toString(),
        },
      });
    } catch (error) {
      console.warn("Failed to persist image in KV", error);
    }

    const response = new Response(method === "HEAD" ? null : buffer, {
      status: 200,
      headers,
    });

    if (cacheStorage && method === "GET") {
      try {
        await cacheStorage.default.put(new Request(request.url, request), response.clone());
      } catch (error) {
        console.warn("Failed to cache image response", error);
      }
    }

    return response;
  } catch (error) {
    console.error("Image proxy error", error);
    return new Response("Failed to proxy image", { status: 502 });
  }
}

async function getFromKV(
  key: string,
  method: "GET" | "HEAD",
  sourceUrl: URL,
  env: Env,
  cacheStorage: CfCacheStorage | undefined,
  request: NextRequest
): Promise<Response | null> {
  try {
    const result = await env.KV.getWithMetadata(key, "arrayBuffer" as const);
    const value = result.value as ArrayBuffer | null;
    const metadata = result.metadata as StoredMetadata | null;
    if (!value) return null;

    const headers = buildResponseHeaders(null, sourceUrl, metadata?.contentType);
    headers.set("cache-control", CACHE_HEADER);
    headers.set("x-cache-status", "kv");

    if (method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    const response = new Response(value, { status: 200, headers });

    if (cacheStorage) {
      try {
        await cacheStorage.default.put(new Request(request.url, request), response.clone());
      } catch (error) {
        console.warn("Failed to cache KV response", error);
      }
    }

    return response;
  } catch (error) {
    console.warn("Failed to read from KV", error);
    return null;
  }
}

export const runtime = "edge";
export const preferredRegion = ["iad1", "cdg1"];
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, context: unknown) {
  const env = getEnvWithFallback(context);
  const cacheStorage = (globalThis as unknown as { caches?: CfCacheStorage }).caches;
  const sourceUrl = parseProxyTarget(request.nextUrl.searchParams.get("src"));
  if (!sourceUrl) {
    return new Response("Missing or unsupported src parameter", { status: 400 });
  }
  const key = await createHash(sourceUrl.toString());

  const cachedKV = await getFromKV(key, "GET", sourceUrl, env, cacheStorage, request);
  if (cachedKV) return cachedKV;

  return proxyImage(request, "GET", env, sourceUrl, key);
}

export async function HEAD(request: NextRequest, context: unknown) {
  const env = getEnvWithFallback(context);
  const cacheStorage = (globalThis as unknown as { caches?: CfCacheStorage }).caches;
  const sourceUrl = parseProxyTarget(request.nextUrl.searchParams.get("src"));
  if (!sourceUrl) {
    return new Response("Missing or unsupported src parameter", { status: 400 });
  }
  const key = await createHash(sourceUrl.toString());

  const cachedKV = await getFromKV(key, "HEAD", sourceUrl, env, cacheStorage, request);
  if (cachedKV) return cachedKV;

  return proxyImage(request, "HEAD", env, sourceUrl, key);
}
