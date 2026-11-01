"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useProgress } from "@/lib/store";

function subscribe(callback: () => void) {
  return useProgress.persist.onFinishHydration(callback);
}

/** True once saved progress has been loaded from localStorage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => useProgress.persist.hasHydrated(),
    () => false,
  );
}

/** Mount once (in the root layout) to load saved progress after the first render. */
export function useRehydrateOnMount() {
  useEffect(() => {
    if (!useProgress.persist.hasHydrated()) void useProgress.persist.rehydrate();
  }, []);
}

// A shared, minute-resolution clock so render stays pure (no Date.now() in render).
let nowValue = 0;
const nowListeners = new Set<() => void>();
let nowTimer: ReturnType<typeof setInterval> | null = null;

function subscribeNow(callback: () => void) {
  nowListeners.add(callback);
  nowValue = Date.now();
  if (!nowTimer) {
    nowTimer = setInterval(() => {
      nowValue = Date.now();
      nowListeners.forEach((l) => l());
    }, 60_000);
  }
  return () => {
    nowListeners.delete(callback);
    if (nowListeners.size === 0 && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}

/** Current time (ms), refreshed every minute. 0 during server render. */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, () => nowValue, () => 0);
}
