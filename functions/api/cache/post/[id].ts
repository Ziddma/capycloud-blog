import type {
  KVNamespace,
  PagesFunction,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { Post } from "../../../../src/shared/notion-transform";

type Env = {
  KV_BINDING: KVNamespace;
};

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

function resolveKey(id: string) {
  return `post:${id}`;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params?.id as string;
  if (!id) return makeResponse("Not Found", { status: 404 });

  const stored = await env.KV_BINDING.get(resolveKey(id));
  if (!stored) {
    return makeResponse("Not Found", { status: 404 });
  }

  return makeResponse(stored, {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=0, stale-while-revalidate=60",
      "access-control-allow-origin": "*",
    },
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = params?.id as string;
  if (!id) return makeResponse("Not Found", { status: 404 });

  try {
    const payload = (await request.json()) as Post;
    await env.KV_BINDING.put(resolveKey(id), JSON.stringify(payload));
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Failed to write post to KV:", error);
    return makeResponse("Internal Server Error", { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = params?.id as string;
  if (!id) return makeResponse("Not Found", { status: 404 });

  try {
    await env.KV_BINDING.delete(resolveKey(id));
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Failed to delete post from KV:", error);
    return makeResponse("Internal Server Error", { status: 500 });
  }
};
