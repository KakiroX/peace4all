"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Cloud, CloudOff, Loader2, LogIn, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { signIn, signOut, syncNow, useAccount, type AccountUser, type SyncStatus } from "@/lib/account";

const STATUS_TEXT: Record<SyncStatus, string> = {
  disabled: "Saved in this browser",
  loading: "Checking sign-in…",
  "signed-out": "Not signed in",
  syncing: "Syncing…",
  synced: "Synced",
  saving: "Saving…",
  offline: "Offline: will sync when back online",
  error: "Sync problem",
};

function initials(user: AccountUser) {
  const source = user.name || user.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Avatar({ user, size = "md" }: { user: AccountUser; size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-on-accent",
        size === "sm" ? "size-7 text-xs" : "size-9 text-sm",
      )}
      aria-hidden
    >
      {initials(user)}
    </span>
  );
}

export function StatusLine({ status, error }: { status: SyncStatus; error: string | null }) {
  const busy = status === "syncing" || status === "saving" || status === "loading";
  const Icon = busy ? Loader2 : status === "offline" ? CloudOff : status === "error" ? AlertTriangle : Cloud;
  const color =
    status === "error" ? "var(--critical)" : status === "offline" ? "var(--warning)" : status === "synced" ? "var(--good)" : "var(--muted)";
  return (
    <span className="flex min-w-0 items-start gap-1.5 text-xs text-ink-2" role="status">
      <Icon className={clsx("mt-px size-3.5 shrink-0", busy && "animate-spin")} style={{ color }} aria-hidden />
      <span className="min-w-0">{status === "error" && error ? error : STATUS_TEXT[status]}</span>
    </span>
  );
}

function useSignIn() {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async () => {
      setBusy(true);
      try {
        await signIn();
      } catch {
        // error is surfaced through useAccount().error
      } finally {
        setBusy(false);
      }
    },
  };
}

export async function confirmSignOut() {
  if (confirm("Sign out? Your progress stays saved in your account and is removed from this device.")) await signOut();
}

/** Sidebar footer: sign-in prompt or account + sync status. */
export function AccountBox() {
  const { status, user, error } = useAccount();
  const signin = useSignIn();

  if (status === "disabled") {
    return <p className="px-3 text-xs leading-relaxed text-muted">Progress is saved in this browser. Back it up from Settings.</p>;
  }
  if (status === "loading") return <div className="mx-3 h-10 animate-pulse rounded-lg bg-surface-2" />;

  if (!user) {
    return (
      <div className="px-1">
        <p className="mb-2 px-2 text-xs leading-relaxed text-ink-2">Sign in to save progress to your account and sync it across devices.</p>
        <Button className="w-full" size="sm" onClick={signin.run} disabled={signin.busy}>
          {signin.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
          Sign in with Google
        </Button>
        {error && <p className="mt-2 px-2 text-xs text-ink-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center gap-2.5">
        <Avatar user={user} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
          {user.name && user.email && <div className="truncate text-xs text-muted">{user.email}</div>}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <StatusLine status={status} error={error} />
        <button
          type="button"
          onClick={() => void confirmSignOut()}
          className="shrink-0 rounded p-1 text-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Mobile header: avatar (links to Settings) or a sign-in button. */
export function AccountCompact() {
  const { status, user } = useAccount();
  const signin = useSignIn();
  if (status === "disabled" || status === "loading") return null;
  if (!user) {
    return (
      <Button size="sm" variant="secondary" onClick={signin.run} disabled={signin.busy}>
        <LogIn className="size-4" aria-hidden /> Sign in
      </Button>
    );
  }
  const dot =
    status === "error" ? "var(--critical)" : status === "offline" ? "var(--warning)" : status === "synced" ? "var(--good)" : "var(--muted)";
  return (
    <Link href="/settings" className="relative" aria-label={`Account: ${STATUS_TEXT[status]}`}>
      <Avatar user={user} size="sm" />
      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface" style={{ backgroundColor: dot }} aria-hidden />
    </Link>
  );
}

/** Settings page card. */
export function AccountCard() {
  const { status, user, error, lastSyncedAt } = useAccount();
  const signin = useSignIn();

  if (status === "disabled") {
    return (
      <>
        <p className="text-sm text-ink-2">
          Cloud sync isn&apos;t switched on for this site yet, so progress is saved in this browser only. Use the backup buttons below to move it
          between devices.
        </p>
      </>
    );
  }
  if (!user) {
    return (
      <div>
        <p className="mb-3 text-sm text-ink-2">
          Sign in with Google to save your progress to your account. It syncs automatically between your phone, laptop and any other device you
          sign in on. Anything you&apos;ve done on this device so far is added to your account.
        </p>
        <Button onClick={signin.run} disabled={signin.busy || status === "loading"}>
          {signin.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
          Sign in with Google
        </Button>
        {error && <p className="mt-3 text-sm text-ink-2">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <div className="truncate font-medium">{user.name ?? user.email}</div>
          {user.name && user.email && <div className="truncate text-sm text-muted">{user.email}</div>}
        </div>
      </div>
      <div className="mt-4">
        <StatusLine status={status} error={error} />
        {lastSyncedAt && <p className="mt-1 text-xs text-muted">Last synced {new Date(lastSyncedAt).toLocaleTimeString()}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void syncNow()} disabled={status === "syncing"}>
          <RefreshCw className="size-4" aria-hidden /> Sync now
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void confirmSignOut()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </Button>
      </div>
    </div>
  );
}
