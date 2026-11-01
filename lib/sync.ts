"use client";

// Firebase Auth + Firestore sync. Loaded lazily (see lib/account.ts) only when Firebase is
// configured, so the Firebase SDK never ships to a local-only build.
//
// Firestore layout (rules: firestore.rules):
//   users/{uid}              { settings, settingsUpdatedAt, resets, resetsUpdatedAt,
//                              diagnostics: { [id]: DiagnosticRecord }, updatedAt }
//   users/{uid}/days/{date}  { attempts: Attempt[] }   one document per calendar day
//
// Flow: on sign-in we pull everything, merge with this device (lib/merge.ts), apply the
// result locally and upload whatever the server is missing. After that every new answer is
// appended to its day document, and profile changes are written (debounced). Returning to
// the tab re-pulls, so progress from another device shows up.

import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  FieldPath,
  arrayUnion,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  serverTimestamp,
  setDoc,
  waitForPendingWrites,
  writeBatch,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { useAccount, type AccountUser } from "@/lib/account";
import { firebaseConfig, firebaseEmulatorsEnabled } from "@/lib/firebase-config";
import { groupByDay, mergeSynced, newAttempts, resetsAdvanced } from "@/lib/merge";
import { DEFAULT_SETTINGS, useProgress, whenHydrated, type ProgressState, type SyncedData } from "@/lib/store";
import type { Attempt } from "@/lib/types";

const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch
const PROFILE_DEBOUNCE_MS = 1000;
const REPULL_AFTER_MS = 30_000;

let auth: Auth | null = null;
let db: Firestore | null = null;

function init(): { auth: Auth; db: Firestore } {
  if (!auth || !db) {
    if (!firebaseConfig) throw new Error("Firebase isn't configured");
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    if (firebaseEmulatorsEnabled) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  }
  return { auth, db };
}

function toAccountUser(u: User): AccountUser {
  return { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL };
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    if (err.code === "permission-denied") return "The database refused access. Check the Firestore security rules.";
    if (err.code === "auth/unauthorized-domain") return "This site's domain isn't authorised in Firebase Authentication.";
    if (err.code === "auth/popup-blocked") return "The sign-in popup was blocked. Allow popups for this site and try again.";
  }
  return err instanceof Error ? err.message : String(err);
}

function syncedFrom(s: ProgressState): SyncedData {
  return {
    attempts: s.attempts,
    diagnostics: s.diagnostics,
    settings: s.settings,
    settingsUpdatedAt: s.settingsUpdatedAt,
    resets: s.resets,
    resetsUpdatedAt: s.resetsUpdatedAt,
  };
}

function parseRemote(profile: DocumentData | undefined, days: DocumentData[]): SyncedData {
  return {
    attempts: days.flatMap((d) => (Array.isArray(d.attempts) ? (d.attempts as Attempt[]) : [])),
    diagnostics: profile?.diagnostics ? Object.values(profile.diagnostics) : [],
    settings: { ...DEFAULT_SETTINGS, ...(profile?.settings ?? {}) },
    settingsUpdatedAt: profile?.settingsUpdatedAt ?? 0,
    resets: profile?.resets ?? {},
    resetsUpdatedAt: profile?.resetsUpdatedAt ?? 0,
  };
}

class Session {
  private stopped = false;
  private applying = false;
  private pending = 0;
  private lastPull = 0;
  private pulling: Promise<void> | null = null;
  private profileTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    readonly uid: string,
    private readonly db: Firestore,
  ) {}

  private userRef() {
    return doc(this.db, "users", this.uid);
  }
  private daysRef() {
    return collection(this.db, "users", this.uid, "days");
  }

  async start() {
    await whenHydrated();
    const local = useProgress.getState();
    // Local data from a different account must never leak into this one.
    if (local.ownerUid && local.ownerUid !== this.uid) local.clearLocal();
    await this.pull();
    if (this.stopped) return;
    this.unsubscribe = useProgress.subscribe((s, prev) => this.onLocalChange(s, prev));
    document.addEventListener("visibilitychange", this.onVisible);
    window.addEventListener("online", this.refreshStatus);
    window.addEventListener("offline", this.refreshStatus);
  }

  stop() {
    this.stopped = true;
    this.unsubscribe?.();
    if (this.profileTimer) clearTimeout(this.profileTimer);
    document.removeEventListener("visibilitychange", this.onVisible);
    window.removeEventListener("online", this.refreshStatus);
    window.removeEventListener("offline", this.refreshStatus);
  }

  /** Pull the server copy, merge it with this device, upload what the server lacks. */
  pull(): Promise<void> {
    this.pulling ??= this.doPull().finally(() => {
      this.pulling = null;
    });
    return this.pulling;
  }

  private async doPull() {
    useAccount.setState({ status: "syncing", error: null });
    try {
      const [profileSnap, daysSnap] = await Promise.all([getDoc(this.userRef()), getDocs(this.daysRef())]);
      if (this.stopped) return;
      const remote = parseRemote(profileSnap.data(), daysSnap.docs.map((d) => d.data()));
      const merged = mergeSynced(syncedFrom(useProgress.getState()), remote);

      this.applying = true;
      try {
        useProgress.getState().applySynced({ ...merged.data, ownerUid: this.uid });
      } finally {
        this.applying = false;
      }

      if (merged.remoteNeedsRewrite) {
        await this.rewriteRemote();
      } else {
        if (merged.uploadAttempts.length) await this.pushAttempts(merged.uploadAttempts);
        if (merged.uploadProfile || !profileSnap.exists()) await this.writeProfile(false);
      }
      this.lastPull = Date.now();
      useAccount.setState({ lastSyncedAt: Date.now() });
      this.refreshStatus();
    } catch (err) {
      this.fail(err);
    }
  }

  private onVisible = () => {
    if (document.visibilityState === "visible" && Date.now() - this.lastPull > REPULL_AFTER_MS) void this.pull();
  };

  refreshStatus = () => {
    if (this.stopped) return;
    if (useAccount.getState().status === "error" && this.pending === 0) return;
    const online = typeof navigator === "undefined" || navigator.onLine;
    useAccount.setState({ status: !online ? "offline" : this.pending > 0 ? "saving" : "synced" });
  };

  private onLocalChange(s: ProgressState, prev: ProgressState) {
    if (this.applying || this.stopped) return;

    // A reset: the server must forget the reset data too.
    if (s.resetsUpdatedAt !== prev.resetsUpdatedAt && resetsAdvanced(prev.resets, s.resets)) {
      void this.track(this.rewriteRemote());
      return;
    }
    if (s.attempts !== prev.attempts) {
      const added = newAttempts(prev.attempts, s.attempts);
      if (added.length) void this.track(this.pushAttempts(added));
    }
    if (
      s.diagnostics !== prev.diagnostics ||
      s.settingsUpdatedAt !== prev.settingsUpdatedAt ||
      s.resetsUpdatedAt !== prev.resetsUpdatedAt
    ) {
      this.scheduleProfile();
    }
  }

  private scheduleProfile() {
    if (this.profileTimer) clearTimeout(this.profileTimer);
    this.profileTimer = setTimeout(() => {
      this.profileTimer = null;
      void this.track(this.writeProfile(false));
    }, PROFILE_DEBOUNCE_MS);
  }

  private async track(work: Promise<void>) {
    this.pending++;
    this.refreshStatus();
    try {
      await work;
      if (useAccount.getState().status === "error") useAccount.setState({ error: null, status: "synced" });
    } catch (err) {
      this.fail(err);
    } finally {
      this.pending--;
      this.refreshStatus();
    }
  }

  private fail(err: unknown) {
    console.error("[sync]", err);
    useAccount.setState({ status: "error", error: errorMessage(err) });
  }

  /** Append answers to their day documents. arrayUnion makes retries harmless. */
  private async pushAttempts(attempts: Attempt[]) {
    const days = [...groupByDay(attempts)];
    for (let i = 0; i < days.length; i += BATCH_LIMIT) {
      const batch = writeBatch(this.db);
      for (const [day, list] of days.slice(i, i + BATCH_LIMIT)) {
        batch.set(doc(this.daysRef(), day), { attempts: arrayUnion(...list) }, { merge: true });
      }
      await batch.commit();
    }
  }

  /** Write settings, reset markers and test results. `overwrite` drops anything not local. */
  private async writeProfile(overwrite: boolean) {
    const s = useProgress.getState();
    const data = {
      settings: s.settings,
      settingsUpdatedAt: s.settingsUpdatedAt,
      resets: s.resets,
      resetsUpdatedAt: s.resetsUpdatedAt,
      diagnostics: Object.fromEntries(s.diagnostics.map((d) => [d.id, d])),
      updatedAt: serverTimestamp(),
    };
    if (overwrite) {
      await setDoc(this.userRef(), data);
    } else {
      // Replace settings/resets wholesale, but only add/update individual test results so
      // results saved from another device in the meantime are kept.
      await setDoc(this.userRef(), data, {
        mergeFields: [
          "settings",
          "settingsUpdatedAt",
          "resets",
          "resetsUpdatedAt",
          "updatedAt",
          ...s.diagnostics.map((d) => new FieldPath("diagnostics", d.id)),
        ],
      });
    }
  }

  /** Make the server an exact copy of this device (after a reset). */
  private async rewriteRemote() {
    const s = useProgress.getState();
    const days = groupByDay(s.attempts);
    const existing = await getDocs(this.daysRef());
    type Op = { kind: "delete"; id: string } | { kind: "set"; id: string; attempts: Attempt[] };
    const ops: Op[] = [
      ...existing.docs.filter((d) => !days.has(d.id)).map((d): Op => ({ kind: "delete", id: d.id })),
      ...[...days].map(([id, attempts]): Op => ({ kind: "set", id, attempts })),
    ];
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = writeBatch(this.db);
      for (const op of ops.slice(i, i + BATCH_LIMIT)) {
        const ref = doc(this.daysRef(), op.id);
        if (op.kind === "delete") batch.delete(ref);
        else batch.set(ref, { attempts: op.attempts });
      }
      await batch.commit();
    }
    await this.writeProfile(true);
  }

  async flush(timeoutMs = 5000) {
    if (this.profileTimer) {
      clearTimeout(this.profileTimer);
      this.profileTimer = null;
      await this.writeProfile(false).catch(() => {});
    }
    await Promise.race([waitForPendingWrites(this.db), new Promise((r) => setTimeout(r, timeoutMs))]);
  }
}

let session: Session | null = null;

export async function boot() {
  const { auth, db } = init();
  onAuthStateChanged(auth, (user) => {
    if (session && session.uid !== user?.uid) {
      session.stop();
      session = null;
    }
    if (!user) {
      useAccount.setState({ status: "signed-out", user: null, error: null });
      return;
    }
    useAccount.setState({ user: toAccountUser(user) });
    if (!session) {
      session = new Session(user.uid, db);
      void session.start();
    }
  });
}

export async function signInWithGoogle() {
  const { auth } = init();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    useAccount.setState({ error: errorMessage(err) });
    throw err;
  }
}

/** Sign out and remove this account's data from the device (it stays in the cloud). */
export async function signOutAndClear() {
  const { auth } = init();
  if (session) {
    await session.flush();
    session.stop();
    session = null;
  }
  await signOut(auth);
  useProgress.getState().clearLocal();
  useAccount.setState({ status: "signed-out", user: null, error: null, lastSyncedAt: null });
}

export async function pullNow() {
  await session?.pull();
}
