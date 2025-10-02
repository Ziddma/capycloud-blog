import Link from "next/link";
import { getPostsFromCache } from "@/lib/notion";
import PostCard from "@/components/post-card";
import { LayoutTextFlip } from "@/components/ui/layout-text-flip";
import { Compare } from "@/components/ui/compare";
import { WavyBackground } from "@/components/ui/wavy-background";

export const runtime = "nodejs";

export default async function Home() {
  const posts = await getPostsFromCache();

  return (
    <div className="space-y-16">
      <section className="relative isolate overflow-hidden ">
        <WavyBackground
          containerClassName="pointer-events-none absolute inset-0 h-full w-full"
          className="pointer-events-none h-full w-full"
          blur={10}
          waveOpacity={3}
          speed="slow"
          backgroundFill="rgba(12, 12, 12, 0.35)"
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-16 lg:py-40">
          <div className="relative z-10 flex w-full max-w-xl flex-col gap-6 text-left">
            <LayoutTextFlip
              text="Lives in Open Source"
              words={["collaboration", "meritocracy", "community-oriented", "do-ocracy", "empowerment", "transparency", "respect", "reciprocity", "innovation"]}
              duration={2600}
            />
            <p className="text-base text-white md:text-lg">
              But open source is more than that - it’s about a way of thinking, working and collaborating. Open source software and open source culture have transformed countless industries by encouraging innovation and collaboration.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/posts/deploy-ocp-on-aws-with-ipi-method-part-1-testtt"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Read Latest Guide
              </Link>
              <Link
                href="/blog"
                className="rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Browse All Posts
              </Link>
            </div>
          </div>
          <div className="relative z-10 w-full max-w-md ">
            <Compare
              className="w-full max-w-xl h-[220px] rounded-3xl border border-white/10 bg-black/40 backdrop-blur shadow-2xl sm:h-[270px] md:h-[400px]"
              firstImage="https://assets.aceternity.com/code-problem.png"
              secondImage="https://assets.aceternity.com/code-solution.png"
              firstImageClassName="object-cover object-left-top"
              secondImageClassname="object-cover object-left-top"
              slideMode="hover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          {/* <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Welcome to My Blog
          </h1> */}
          {/* <p className="text-lg text-muted-foreground">
            Discover interesting articles and insights
          </p> */}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}




