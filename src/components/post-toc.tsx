"use client";

import type { Post } from "@/lib/notion";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

export function PostToc({ items }: { items: Post["headings"] }) {
  const headings = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        label: item.text
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/[*_`~]/g, "")
          .trim(),
      })),
    [items]
  );

  const baseLevel = useMemo(() => {
    if (!headings.length) return 1;
    return headings.reduce((min, h) => Math.min(min, h.level), headings[0].level);
  }, [headings]);

  const [activeSlug, setActiveSlug] = useState(headings[0]?.slug ?? "");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target?.id) setActiveSlug(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter(Boolean) as HTMLElement[];

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    if (!listRef.current || !activeSlug) return;
    const current = listRef.current.querySelector<HTMLElement>(
      `[data-slug="${activeSlug}"]`
    );
    if (!current) return;

    const parent = listRef.current;
    const target =
      current.offsetTop -
      parent.clientHeight / 2 +
      current.offsetHeight / 2;

    parent.scrollTo({
      top: Math.max(0, Math.min(target, parent.scrollHeight - parent.clientHeight)),
      behavior: "smooth",
    });
  }, [activeSlug]);

  const handleClick =
    (slug: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const el = document.getElementById(slug);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${slug}`);
      setActiveSlug(slug);
    };

  if (!headings.length) return null;

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24">
        <div className="max-h-[calc(90vh-10rem)] w-64 overflow-y-auto rounded-xl border border-border/40 bg-muted/10 px-5 py-6 shadow-sm backdrop-blur">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">
            On This Page
          </p>
          <ul ref={listRef} className="space-y-2 text-sm">
            {headings.map((item) => {
              const indent = Math.max(0, item.level - baseLevel);
              return (
                <li key={item.slug}>
                  <a
                    data-slug={item.slug}
                    href={`#${item.slug}`}
                    onClick={handleClick(item.slug)}
                    style={{ paddingLeft: indent * 16 }}
                    className={cn(
                      "block rounded py-1 pr-2 transition-colors",
                      activeSlug === item.slug
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:text-primary focus:text-primary"
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
