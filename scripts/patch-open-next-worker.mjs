import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

function patchWorkerRouting() {
  const helperBlock = [
    'const NOTION_IMAGE_PATH = "/images/notion";',
    'const NOTION_COVER_IMAGE_PATH = "/images/notion-cover";',
    "const NOTION_SIGNED_HOSTS = new Set([",
    '    "prod-files-secure.s3.us-west-2.amazonaws.com",',
    '    "prod-files-secure.s3.amazonaws.com",',
    '    "s3.us-west-2.amazonaws.com",',
    '    "s3.amazonaws.com",',
    '    "www.notion-static.com",',
    '    "notion-static.com",',
    "]);",
    "const HOST_SUFFIXES = [",
    '    ".amazonaws.com",',
    '    ".notion-static.com",',
    '    ".notion.so",',
    '    ".s3.amazonaws.com",',
    "];",
    "const CACHE_SECONDS = 60 * 60 * 12;",
    "const STALE_SECONDS = 60 * 60 * 24;",
    "const CACHE_HEADER = `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`;",
    "const KV_TTL_SECONDS = 60 * 60 * 24 * 30;",
    "const encoder = new TextEncoder();",
    "const FALLBACK_KV = {",
    "    async getWithMetadata() {",
    "        return { value: null, metadata: null };",
    "    },",
    "    async put() {",
    "        return;",
    "    },",
    "};",
    "const normalizePathname = (pathname) => {",
    "    const basePath = globalThis.__NEXT_BASE_PATH__ ?? \"\";",
    "    if (!basePath || basePath === \"/\") {",
    "        return pathname;",
    "    }",
    "    const normalizedBase = basePath.endsWith(\"/\") ? basePath.slice(0, -1) : basePath;",
    "    if (!pathname.startsWith(normalizedBase)) {",
    "        return pathname;",
    "    }",
    "    const trimmed = pathname.slice(normalizedBase.length);",
    "    return trimmed.startsWith(\"/\") ? trimmed : `/${trimmed}`;",
    "};",
    "const decodeProxySource = (value) => {",
    "    if (!value) {",
    "        return null;",
    "    }",
    "    try {",
    "        return decodeURIComponent(value);",
    "    } catch {",
    "        return value;",
    "    }",
    "};",
    "const isAllowedHost = (hostname) => {",
    "    if (!hostname) {",
    "        return false;",
    "    }",
    "    if (NOTION_SIGNED_HOSTS.has(hostname)) {",
    "        return true;",
    "    }",
    "    return HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));",
    "};",
    "const parseProxyTarget = (raw) => {",
    "    const decoded = decodeProxySource(raw);",
    "    if (!decoded || decoded.startsWith(NOTION_IMAGE_PATH)) {",
    "        return null;",
    "    }",
    "    let candidate;",
    "    try {",
    "        candidate = new URL(decoded);",
    "    } catch {",
    "        return null;",
    "    }",
    '    if (!/^https?:$/.test(candidate.protocol)) {',
    "        return null;",
    "    }",
    "    if (!isAllowedHost(candidate.hostname)) {",
    "        return null;",
    "    }",
    "    return candidate;",
    "};",
    "const buildNotionImageProxyUrl = (sourceUrl) => {",
    "    const proxy = new URL(`https://www.notion.so/image/${encodeURIComponent(sourceUrl.toString())}`);",
    '    proxy.searchParams.set("cache", "v2");',
    "    if (!proxy.searchParams.has(\"table\")) {",
    '        proxy.searchParams.set("table", "block");',
    "    }",
    "    return proxy;",
    "};",
    "const buildResponseHeaders = (upstream, source, contentType) => {",
    "    const headers = new Headers();",
    "    const type = contentType ?? upstream?.headers.get(\"content-type\") ?? \"application/octet-stream\";",
    '    headers.set("content-type", type);',
    "    const cacheControl = upstream?.headers.get(\"cache-control\");",
    '    headers.set("cache-control", cacheControl ?? CACHE_HEADER);',
    "    const etag = upstream?.headers.get(\"etag\");",
    "    if (etag) headers.set(\"etag\", etag);",
    "    const lastModified = upstream?.headers.get(\"last-modified\");",
    "    if (lastModified) headers.set(\"last-modified\", lastModified);",
    '    headers.set("x-proxied-from", source.origin);',
    '    headers.set("access-control-allow-origin", "*");',
    "    return headers;",
    "};",
    "const createHash = async (input) => {",
    "    const data = encoder.encode(input);",
    "    const digest = await crypto.subtle.digest(\"SHA-1\", data);",
    "    const bytes = new Uint8Array(digest);",
    "    let hex = \"\";",
    "    for (const byte of bytes) {",
    "        hex += byte.toString(16).padStart(2, \"0\");",
    "    }",
    "    return hex;",
    "};",
    "const getKvBinding = (env) => {",
    "    if (!env) return FALLBACK_KV;",
    "    if (env.KV && typeof env.KV.getWithMetadata === \"function\") {",
    "        return env.KV;",
    "    }",
    "    const candidates = Object.keys(env).filter((key) => /kv/i.test(key) || key === \"KV_BINDING\");",
    "    for (const key of candidates) {",
    "        const binding = env[key];",
    "        if (binding && typeof binding.getWithMetadata === \"function\") {",
    "            return binding;",
    "        }",
    "    }",
    "    return FALLBACK_KV;",
    "};",
    "const readCache = async (request, method) => {",
    "    const cacheStorage = globalThis.caches;",
    "    if (!cacheStorage) {",
    "        return null;",
    "    }",
    "    try {",
    "        const cache = cacheStorage.default;",
    "        const cacheKey = new Request(request.url, request);",
    "        const cached = await cache.match(cacheKey);",
    "        if (!cached) {",
    "            return null;",
    "        }",
    "        const headers = new Headers(cached.headers);",
    '        headers.set("x-cache-status", "edge-cache");',
    "        if (method === \"HEAD\") {",
    "            return new Response(null, { status: cached.status, statusText: cached.statusText, headers });",
    "        }",
    "        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });",
    "    } catch (error) {",
    "        console.warn(\"Failed to read edge cache\", error);",
    "        return null;",
    "    }",
    "};",
    "const writeCache = (request, response) => {",
    "    const cacheStorage = globalThis.caches;",
    "    if (!cacheStorage) {",
    "        return;",
    "    }",
    "    try {",
    "        const cacheKey = new Request(request.url, request);",
    "        cacheStorage.default.put(cacheKey, response).catch((error) => {",
    "            console.warn(\"Failed to cache image response\", error);",
    "        });",
    "    } catch (error) {",
    "        console.warn(\"Failed to initiate cache put\", error);",
    "    }",
    "};",
    "const getFromKv = async (kv, key, method, sourceUrl, request) => {",
    "    try {",
    "        const result = await kv.getWithMetadata(key, \"arrayBuffer\");",
    "        const value = result?.value;",
    "        const metadata = result?.metadata ?? {};",
    "        if (!value) {",
    "            return null;",
    "        }",
    "        const headers = buildResponseHeaders(null, sourceUrl, metadata.contentType);",
    '        headers.set("cache-control", CACHE_HEADER);',
    '        headers.set("x-cache-status", "kv");',
    "        if (method === \"HEAD\") {",
    "            return new Response(null, { status: 200, headers });",
    "        }",
    "        const response = new Response(value, { status: 200, headers });",
    "        writeCache(request, response.clone());",
    "        return response;",
    "    } catch (error) {",
    "        console.warn(\"Failed to read from KV\", error);",
    "        return null;",
    "    }",
    "};",
    "const handleNotionImageRequest = async (request, env, ctx, pathname) => {",
    "    const normalized = normalizePathname(pathname);",
    "    if (normalized !== NOTION_IMAGE_PATH && normalized !== NOTION_COVER_IMAGE_PATH) {",
    "        return null;",
    "    }",
    "    const method = request.method.toUpperCase();",
    "    if (method !== \"GET\" && method !== \"HEAD\") {",
    "        return new Response(\"Method Not Allowed\", { status: 405 });",
    "    }",
    "    const requestUrl = new URL(request.url);",
    "    const sourceUrl = parseProxyTarget(requestUrl.searchParams.get(\"src\"));",
    "    if (!sourceUrl) {",
    "        return new Response(\"Missing or unsupported src parameter\", { status: 400 });",
    "    }",
    "    const kv = getKvBinding(env);",
    "    const kvKey = await createHash(sourceUrl.toString());",
    "    const cachedEdge = await readCache(request, method);",
    "    if (cachedEdge) {",
    "        return cachedEdge;",
    "    }",
    "    const cachedKv = await getFromKv(kv, kvKey, method, sourceUrl, request);",
    "    if (cachedKv) {",
    "        return cachedKv;",
    "    }",
    "    const upstreamCandidates = [];",
    "    if (NOTION_SIGNED_HOSTS.has(sourceUrl.hostname)) {",
    "        upstreamCandidates.push(buildNotionImageProxyUrl(sourceUrl));",
    "    }",
    "    upstreamCandidates.push(sourceUrl);",
    "    let upstream = null;",
    "    const upstreamInit = {",
    "        cf: {",
    "            cacheTtl: CACHE_SECONDS,",
    "            cacheEverything: true,",
    "        },",
    "    };",
    "    for (const candidate of upstreamCandidates) {",
    "        const upstreamRequest = new Request(candidate.toString(), {",
    "            method,",
    "            headers: {",
    '                accept: request.headers.get("accept") ?? "image/*",',
    '                "user-agent": request.headers.get("user-agent") ?? "notion-image-proxy",',
    "            },",
    "        });",
    "        const result = await fetch(upstreamRequest, upstreamInit);",
    "        if (result.ok) {",
    "            upstream = result;",
    "            break;",
    "        }",
    "        if (!upstream || upstream.status === 403 || upstream.status === 404) {",
    "            upstream = result;",
    "        } else {",
    "            result.body?.cancel();",
    "        }",
    "    }",
    "    if (!upstream || !upstream.ok) {",
    "        const status = upstream?.status ?? 502;",
    "        upstream?.body?.cancel();",
    "        return new Response(\"Upstream image request failed\", { status });",
    "    }",
    "    const buffer = await upstream.arrayBuffer();",
    "    const contentType = upstream.headers.get(\"content-type\") ?? \"application/octet-stream\";",
    "    const headers = buildResponseHeaders(upstream, sourceUrl, contentType);",
    '    headers.set("cache-control", CACHE_HEADER);',
    '    headers.set("x-cache-status", "origin");',
    "    ctx.waitUntil((async () => {",
    "        try {",
    "            if (kv !== FALLBACK_KV) {",
    "                await kv.put(kvKey, buffer, {",
    "                    expirationTtl: KV_TTL_SECONDS,",
    "                    metadata: {",
    "                        contentType,",
    "                        source: sourceUrl.toString(),",
    "                    },",
    "                });",
    "            }",
    "        } catch (error) {",
    "            console.warn(\"Failed to persist image in KV\", error);",
    "        }",
    "    })());",
    "    if (method === \"HEAD\") {",
    "        return new Response(null, { status: 200, headers });",
    "    }",
    "    const response = new Response(buffer, { status: 200, headers });",
    "    ctx.waitUntil((async () => {",
    "        writeCache(request, response.clone());",
    "    })());",
    "    return response;",
    "};\n",
  ].join("\n");

  const urlInjection = [
    "            const pathname = url.pathname;",
    "            const notionResponse = await handleNotionImageRequest(request, env, ctx, pathname);",
    "            if (notionResponse) {",
    "                return notionResponse;",
    "            }",
  ].join("\n");

  const targets = [
    {
      file: path.join(
        cwd,
        "node_modules",
        "@opennextjs",
        "cloudflare",
        "dist",
        "cli",
        "templates",
        "worker.js",
      ),
      optional: false,
    },
    {
      file: path.join(cwd, ".open-next", "worker.js"),
      optional: true,
    },
  ];

  let applied = false;

  for (const target of targets) {
    const { file, optional } = target;
    if (!fs.existsSync(file)) {
      if (!optional) {
        console.warn(`[patch-open-next-worker] Missing required file: ${file}`);
      }
      continue;
    }

    let contents = fs.readFileSync(file, "utf8");
    const marker = "export default {";
    if (!contents.includes(marker)) {
      throw new Error(`[patch-open-next-worker] Could not find export marker in ${file}`);
    }

    const helperStart = 'const NOTION_IMAGE_PATH = "/images/notion";';
    const markerIndex = contents.indexOf(marker);
    if (contents.includes(helperStart)) {
      const startIndex = contents.indexOf(helperStart);
      if (startIndex !== -1 && startIndex < markerIndex) {
        contents =
          contents.slice(0, startIndex) +
          helperBlock +
          contents.slice(markerIndex);
      }
    } else {
      contents = contents.replace(marker, `${helperBlock}${marker}`);
    }

    const fetchNeedle = "            const url = new URL(request.url);\n";
    if (!contents.includes(fetchNeedle)) {
      throw new Error(`[patch-open-next-worker] Could not find fetch hook in ${file}`);
    }

    const oldInjectionPattern = /            const pathname = url\.pathname;[\s\S]*?}\n/;
    if (oldInjectionPattern.test(contents)) {
      contents = contents.replace(oldInjectionPattern, `${urlInjection}\n`);
    } else {
      contents = contents.replace(fetchNeedle, `${fetchNeedle}${urlInjection}\n`);
    }

    const legacyBlockPattern =
      /}\s*else if \(matchesRoute\(pathname, NOTION_COVER_IMAGE_PATH\)\) {[\s\S]*?}\s*/;
    contents = contents.replace(legacyBlockPattern, "");

    const doubleClose = "            if (notionResponse) {\n                return notionResponse;\n            }\n            }\n";
    if (contents.includes(doubleClose)) {
      contents = contents.replace(doubleClose, "            if (notionResponse) {\n                return notionResponse;\n            }\n");
    }

    fs.writeFileSync(file, contents, "utf8");
    console.info(`[patch-open-next-worker] Patched ${path.relative(cwd, file)}`);
    applied = true;
  }

  if (!applied) {
    console.info("[patch-open-next-worker] Worker routing already patched.");
  }
}

function patchProcessEnvMutation() {
  const pattern = "process !== r.g.process && (process.env = r.g.process.env, r.g.process = process),";
  const replacement = [
    "(() => {",
    "      if (process !== r.g.process) {",
    "        const globalProcess = r.g.process;",
    '        if (globalProcess && typeof globalProcess === "object") {',
    "          const sourceEnv = globalProcess.env;",
    "          if (sourceEnv && process.env && process.env !== sourceEnv) {",
    "            Object.assign(process.env, sourceEnv);",
    "          }",
    "        }",
    "        r.g.process = process;",
    "      }",
    "    })(),",
  ].join("\n");

  const targets = [
    path.join(cwd, ".open-next", "server-functions", "notionImages", "index.mjs"),
    path.join(cwd, ".open-next", "server-functions", "notionCoverImages", "index.mjs"),
  ];

  let applied = false;

  for (const file of targets) {
    if (!fs.existsSync(file)) continue;

    let contents = fs.readFileSync(file, "utf8");
    if (contents.includes("Object.assign(process.env, sourceEnv);")) {
      continue;
    }

    if (!contents.includes(pattern)) {
      continue;
    }

    contents = contents.replace(pattern, replacement);
    fs.writeFileSync(file, contents, "utf8");
    console.info(`[patch-open-next-worker] Patched process env mutation in ${path.relative(cwd, file)}`);
    applied = true;
  }

  if (!applied && targets.some((file) => fs.existsSync(file))) {
    console.info("[patch-open-next-worker] Process env mutation already patched.");
  }
}

patchWorkerRouting();
patchProcessEnvMutation();
