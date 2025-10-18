import type {
  KVNamespace,
  PagesFunction,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { Post } from "../../../src/shared/notion-transform";

type Env = {
  KV_BINDING: KVNamespace;
};

const POSTS_KEY = "posts";

function makeResponse(body: BodyInit | null, init?: ResponseInit): CfResponse {
  return new Response(body, init) as unknown as CfResponse;
}

function jsonResponse(body: unknown, init?: ResponseInit): CfResponse {
  return makeResponse(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
    ...init,
  });
}

async function readPosts(env: Env): Promise<Post[]> {
  const stored = await env.KV_BINDING.get(POSTS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Post[]) : [];
  } catch (error) {
    console.warn("Failed to parse cached posts:", error);
    return [];
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const posts = await readPosts(env);
  return jsonResponse(posts, {
    headers: {
      "cache-control": "public, max-age=0, stale-while-revalidate=60",
    },
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const payload = (await request.json()) as Post[];
    if (!Array.isArray(payload)) {
      return makeResponse("Bad Request", { status: 400 });
    }
    await env.KV_BINDING.put(POSTS_KEY, JSON.stringify(payload));
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Failed to write posts list:", error);
    return makeResponse("Internal Server Error", { status: 500 });
  }
};
