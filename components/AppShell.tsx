"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, Flame, House, Settings, Target, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AccountBox, AccountCompact } from "@/components/AccountBox";
import { SubjectDot } from "@/components/SubjectIcon";
import { useAccountBoot } from "@/lib/account";
import { useRehydrateOnMount } from "@/lib/hydration";
import { SUBJECT_LIST } from "@/lib/subjects";

const NAV: { href: string; label: string; short: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: House },
  { href: "/diagnostic", label: "Familiarization test", short: "Test", icon: Target },
  { href: "/grind", label: "Grinder", short: "Grind", icon: Flame },
  { href: "/progress", label: "Progress", short: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-on-accent">
        <Flame className="size-5" aria-hidden />
      </span>
      <span className="text-lg">IB Grind</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  useRehydrateOnMount();
  useAccountBoot();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-4 py-5 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, href) ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className={clsx("size-4", isActive(pathname, href) && "text-accent")} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-3 text-xs font-medium uppercase tracking-wide text-muted">Subjects</div>
        <nav className="mt-2 flex flex-col gap-1" aria-label="Subjects">
          {SUBJECT_LIST.map((s) => {
            const href = `/subjects/${s.id}`;
            return (
              <Link
                key={s.id}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(pathname, href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <SubjectDot subject={s.id} />
                {s.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-6">
          <AccountBox />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
          <Logo />
          <AccountCompact />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Main"
        >
          {NAV.map(({ href, short, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                isActive(pathname, href) ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {short}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
