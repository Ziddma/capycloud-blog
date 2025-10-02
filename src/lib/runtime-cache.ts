export function getRuntimeCache(): Cache | undefined {
  if (typeof caches === "undefined") return undefined;
  const candidate = (caches as unknown as { default?: Cache }).default;
  return candidate;
}

export function createCacheRequest(key: string): Request | undefined {
  if (typeof Request === "undefined") return undefined;
  return new Request(key, { method: "GET" });
}
