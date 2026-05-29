// App chrome: top nav + wordmark + sign-out. Wraps every page except /login.
// Active link gets the honey-300 accent. Sign-out POSTs /api/auth/logout then hard-navigates home.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const NAV: { href: string; label: string }[] = [
  { href: "/", label: "Overview" },
  { href: "/runs", label: "Runs" },
  { href: "/ledger", label: "Ledger" },
  { href: "/fleet", label: "Fleet" },
  { href: "/cooks", label: "Cooks" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-honey-300" aria-hidden="true">
              🐝
            </span>
            <span className="font-semibold tracking-tight text-paper">DefendableDash</span>
            <span className="text-paper/35">·</span>
            <span className="text-sm text-paper/50">The Office</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-honey-300/10 font-semibold text-honey-300"
                      : "text-paper/60 hover:text-paper"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={signOut}
            className="ml-auto rounded-md border border-white/10 px-3 py-1.5 text-sm text-paper/70 transition-colors hover:border-white/25 hover:text-paper"
          >
            Sign out
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
