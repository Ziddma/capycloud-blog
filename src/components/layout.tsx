import Link from "next/link";
import { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-foreground">
            Capycloud Blog
          </Link>

          {/* <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-border px-4 py-1 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Home
            </Link>
            <Link
              href="/blog"
              className="rounded-full border border-border px-4 py-1 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Blog
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-border px-4 py-1 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              About
            </Link>

            <ModeToggle />
          </div> */}
        </nav>
      </header>

      <main className="pb-12">
        {children}
      </main>

      <footer className="border-t bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-muted-foreground sm:px-6 lg:px-8">
          Copyright {new Date().getFullYear()} Capycloud Blog. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

