/**
 * userService.ts
 * Manages the users/{uid} collection in Firestore.
 *
 * Fixes applied:
 *
 * 1. created_at is only written on the FIRST login — subsequent logins no longer
 *    overwrite it with a fresh serverTimestamp(), which was corrupting the account
 *    creation date.
 *
 * 2. Throttled via localStorage: skips the Firestore write if the profile was
 *    synced within the last 24 hours. This eliminates the unnecessary write on
 *    every single dashboard page load/refresh.
 */

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

const PROFILE_SYNC_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Upserts the user profile into `users/{uid}`.
 *
 * Safe to call on every auth state change — throttled via localStorage
 * to at most one Firestore write per 24 hours per user.
 */
export async function upsertUserProfile(user: User): Promise<void> {
  // ── Client-side throttle ───────────────────────────────────────────────────
  // Skip the write if we've synced recently (reduces Firestore write cost).
  if (typeof window !== "undefined") {
    try {
      const storageKey = `yt_profile_sync_${user.uid}`;
      const lastSync = localStorage.getItem(storageKey);
      if (lastSync && Date.now() - parseInt(lastSync, 10) < PROFILE_SYNC_TTL_MS) {
        return; // Profile is fresh — no Firestore write needed
      }
    } catch {
      // localStorage unavailable (private browsing/quota) — fall through and sync anyway.
    }
  }

  const userRef = doc(db, "users", user.uid);

  // ── First-write detection ──────────────────────────────────────────────────
  // We read first to determine whether this is a new account.
  // This prevents created_at from being overwritten on every login.
  const existing = await getDoc(userRef);
  const isFirstWrite = !existing.exists();

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? "",
      display_name: user.displayName ?? "",
      photo_url: user.photoURL ?? "",
      plan: "free",
      // Only set created_at/role on the very first write — preserved by merge:true after that.
      // role defaults to "customer"; promote to "admin" manually via Firestore console.
      ...(isFirstWrite ? { created_at: serverTimestamp(), role: "customer" } : {}),
    },
    { merge: true }
  );

  // Mark as synced in localStorage so we skip for the next 24h
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        `yt_profile_sync_${user.uid}`,
        String(Date.now())
      );
    } catch {
      // Non-fatal — worst case we just sync again next time.
    }
  }
}
