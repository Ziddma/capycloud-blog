import { getPostsFromCache, Post } from "@/lib/notion";
import { MetadataRoute } from "next";

export const runtime = "nodejs";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://capycloud.my.id";

  const posts = await getPostsFromCache();
  const postUrls = posts.map((post: Post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...postUrls,
  ];
}
