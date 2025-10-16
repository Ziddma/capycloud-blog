import { getPostsFromCache, getWordCount } from "@/lib/notion";
import { format } from "date-fns";
import { SmartImage } from "@/components/smart-image";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import MarkdownClient from "@/components/markdown-client";

import { Badge } from "@/components/ui/badge";
import { calculateReadingTime } from "@/lib/utils";
import { PostToc } from "@/components/post-toc";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: PostPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPostsFromCache();
  const post = posts.find((p) => p.slug === slug);

  if (!post) return { title: "Post Not Found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://capycloud.my.id";
  const coverImage = post.coverImage ?? post.coverImageOriginal ?? `${siteUrl}/opengraph-image.png`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${siteUrl}/posts/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `${siteUrl}/posts/${post.slug}`,
      publishedTime: new Date(post.date).toISOString(),
      authors: post.author ? [post.author] : [],
      tags: post.tags,
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [
        {
          url: coverImage,
          alt: post.title,
        },
      ],
    },
  };
}

export const runtime = "nodejs";

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const posts = await getPostsFromCache();
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  const wordCount = post.content ? getWordCount(post.content) : 0;
  const readingTime = calculateReadingTime(wordCount);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-site.com";
  const coverImage = post.coverImage ?? post.coverImageOriginal ?? `${siteUrl}/opengraph-image.png`;
  const coverImageFallback = post.coverImageOriginal && post.coverImageOriginal !== coverImage ? post.coverImageOriginal : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: coverImage,
    datePublished: new Date(post.date).toISOString(),
    author: { "@type": "Person", name: post.author || "Guest Author" },
    publisher: {
      "@type": "Organization",
      name: "Your Site Name",
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/posts/${post.slug}` },
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:pl-0 lg:pr-28 xl:mt-8">
        <main className="px-auto xl:pl-0 2xl:pl-0">
          <article className="w-full">
          {(post.coverImage || post.coverImageOriginal) && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-3xl border border-border/40 bg-muted/20">
              <SmartImage
                src={coverImage}
                fallbackSrc={coverImageFallback ?? "/images/fallback-cover.png"}
                alt={post.title}
                width={1200}
                height={630}
                priority
                maxRetries={5}
                retryDelayMs={2000}
              />
            </div>
          )}

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <time dateTime={new Date(post.date).toISOString()}>
                {format(new Date(post.date), "MMMM d, yyyy")}
              </time>
              {post.author && <span>By {post.author}</span>}
              <span>{readingTime}</span>
              <span>{wordCount} words</span>
            </div>

            <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground md:text-5xl">
              {post.title}
            </h1>

            {post.description && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {post.description}
              </p>
            )}

            {(post.category || (post.tags && post.tags.length > 0)) && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {post.category && (
                  <Badge variant="secondary" className="rounded-full">
                    {post.category}
                  </Badge>
                )}
                {post.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <hr className="mt-8 border-border/60" />
          </header>

          <div className="mt-10 text-base leading-relaxed text-foreground">
            <MarkdownClient>
              {post.content}
            </MarkdownClient>
          </div>
          </article>
        </main>
      </div>

      {post.headings?.length ? (
        <aside className="pointer-events-none fixed inset-x-0 top-24 hidden justify-end px-6 xl:flex">
          <div className="pointer-events-auto w-72">
            <PostToc items={post.headings} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
