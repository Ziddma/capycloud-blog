const EXACT_HOSTS = new Set([
  "prod-files-secure.s3.us-west-2.amazonaws.com",
  "prod-files-secure.s3.amazonaws.com",
  "s3.us-west-2.amazonaws.com",
  "s3.amazonaws.com",
  "www.notion.so",
  "notion.so",
  "www.notion-static.com",
  "notion-static.com",
  "images.unsplash.com",
]);

const HOST_SUFFIXES = [
  ".amazonaws.com",
  ".notion-static.com",
  ".notion.so",
  ".s3.amazonaws.com",
];

export const NOTION_IMAGE_PROXY_PATH = "/images/notion";

export function decodeProxySource(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isAllowedProxyHost(hostname: string): boolean {
  if (!hostname) return false;
  if (EXACT_HOSTS.has(hostname)) return true;
  return HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function shouldProxyNotionImage(rawUrl: string | undefined | null): boolean {
  if (!rawUrl) return false;
  if (rawUrl.startsWith(NOTION_IMAGE_PROXY_PATH)) return false;
  try {
    const url = new URL(rawUrl);
    if (!/(http|https):/.test(url.protocol)) {
      return false;
    }
    return isAllowedProxyHost(url.hostname);
  } catch {
    return false;
  }
}

export function buildNotionImageProxy(rawUrl: string | undefined | null): string | undefined {
  if (!rawUrl) return undefined;
  if (!shouldProxyNotionImage(rawUrl)) {
    return rawUrl;
  }
  return `${NOTION_IMAGE_PROXY_PATH}?src=${encodeURIComponent(rawUrl)}`;
}

export function parseProxyTarget(raw: string | null): URL | null {
  const decoded = decodeProxySource(raw);
  if (!decoded) return null;
  if (decoded.startsWith(NOTION_IMAGE_PROXY_PATH)) {
    return null;
  }
  let candidate: URL;
  try {
    candidate = new URL(decoded);
  } catch {
    return null;
  }
  if (!/(http|https):/.test(candidate.protocol)) {
    return null;
  }
  if (!isAllowedProxyHost(candidate.hostname)) {
    return null;
  }
  return candidate;
}
