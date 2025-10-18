import type {
  KVNamespace,
  PagesFunction,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import {
  createNotionBridge,
  type Post,
} from "../src/shared/notion-transform";

type Env = {
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
  NOTION_WEBHOOK_SECRET?: string;
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
    },
    ...init,
  });
}

function extractPageId(event: any): string | null {
  return (
    event?.data?.id ||
    event?.page?.id ||
    event?.block?.id ||
    event?.id ||
    null
  );
}

function isDeleteEvent(event: any): boolean {
  return (
    event?.type === "page.deleted" ||
    (event?.type === "page.updated" && event?.data?.archived === true)
  );
}

async function readPostsList(env: Env): Promise<Post[]> {
  const stored = await env.KV_BINDING.get(POSTS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Post[]) : [];
  } catch (error) {
    console.warn("Failed to parse posts list from KV:", error);
    return [];
  }
}

async function persistPostsList(env: Env, posts: Post[]) {
  await env.KV_BINDING.put(POSTS_KEY, JSON.stringify(posts));
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (env.NOTION_WEBHOOK_SECRET) {
    const secret = request.headers.get("x-notion-secret");
    if (secret !== env.NOTION_WEBHOOK_SECRET) {
      return makeResponse("Unauthorized", { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return makeResponse("Bad Request", { status: 400 });
  }

  const events: any[] = Array.isArray(payload?.events)
    ? payload.events
    : payload?.event
      ? [payload.event]
      : [];

  if (events.length === 0) {
    return jsonResponse({ ok: true, changed: false });
  }

  const bridge = createNotionBridge({
    auth: env.NOTION_TOKEN,
    databaseId: env.NOTION_DATABASE_ID,
  });

  const list = await readPostsList(env);
  const postsMap = new Map<string, Post>(list.map((post) => [post.id, post]));
  let hasChanges = false;

  for (const event of events) {
    const type: string | undefined = event?.type;
    if (!type?.startsWith("page.")) continue;

    const pageId = extractPageId(event);
    if (!pageId) continue;

    if (isDeleteEvent(event)) {
      if (postsMap.delete(pageId)) {
        await env.KV_BINDING.delete(`post:${pageId}`);
        hasChanges = true;
      }
      continue;
    }

    try {
      const post = await bridge.buildPostFromPage(pageId);
      if (!post) continue;

      if (post.status !== "Published") {
        if (postsMap.delete(post.id)) {
          await env.KV_BINDING.delete(`post:${post.id}`);
          hasChanges = true;
        }
        continue;
      }

      postsMap.set(post.id, post);
      await env.KV_BINDING.put(`post:${post.id}`, JSON.stringify(post));
      hasChanges = true;
    } catch (error) {
      console.error("Failed to refresh post from webhook:", error);
    }
  }

  if (hasChanges) {
    const sorted = bridge.sortPostsByDate(Array.from(postsMap.values()));
    await persistPostsList(env, sorted);
  }

  return jsonResponse({ ok: true, changed: hasChanges });
};
