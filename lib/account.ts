"use client";

// Account + sync status, independent of the Firebase SDK (which is loaded lazily from
// lib/sync.ts only when Firebase is configured).

import { useEffect } from "react";
import { create } from "zustand";
import { firebaseConfigured } from "@/lib/firebase-config";

export type SyncStatus =
  | "disabled" // Firebase not configured: local-only app
  | "loading" // waiting for Firebase Auth to restore the session
  | "signed-out"
  | "syncing" // pulling + merging
  | "synced"
  | "saving" // writes in flight
  | "offline"
  | "error";

export interface AccountUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AccountState {
  status: SyncStatus;
  user: AccountUser | null;
  error: string | null;
  lastSyncedAt: number | null;
}

export const useAccount = create<AccountState>()(() => ({
  status: firebaseConfigured ? "loading" : "disabled",
  user: null,
  error: null,
  lastSyncedAt: null,
}));

const loadSync = () => import("@/lib/sync");

let booted = false;
/** Mount once (AppShell): restores the Firebase session and starts syncing. */
export function useAccountBoot() {
  useEffect(() => {
    if (!firebaseConfigured || booted) return;
    booted = true;
    loadSync()
      .then((m) => m.boot())
      .catch((err: unknown) => {
        useAccount.setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });
  }, []);
}

export async function signIn(): Promise<void> {
  const m = await loadSync();
  await m.signInWithGoogle();
}

export async function signOut(): Promise<void> {
  const m = await loadSync();
  await m.signOutAndClear();
}

export async function syncNow(): Promise<void> {
  const m = await loadSync();
  await m.pullNow();
}
