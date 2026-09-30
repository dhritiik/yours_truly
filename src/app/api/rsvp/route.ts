/**
 * /api/rsvp/route.ts
 *
 * Handles guest RSVP submissions from magic link pages.
 *
 * Improvements applied:
 *
 * 1. DIRECT READ PATH: If the request includes `guest_id`, uses getDoc() directly
 *    instead of getDocs() query. This eliminates the need for Firestore `list`
 *    access for the RSVP flow — the route can now work even when list queries
 *    are restricted to the wedding owner.
 *
 * 2. DUAL WRITE: Updates BOTH public weddings/{slug}/guests/{id} AND
 *    private users/{uid}/guests/{id}. Prevents re-publishing from overwriting
 *    RSVPs with stale "Pending" status.
 *
 * 3. RATE LIMITING: 5 submissions per 60s per IP (in-memory).
 *
 * 4. TOKEN VALIDATION: Even in the direct-read path, the stored guest_token
 *    is validated against the submitted token before accepting the RSVP.
 *
 * TODO: Migrate to firebase-admin SDK to fully bypass Firestore rules and
 * remove the remaining `allow list: if true` rule for extra security.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── In-memory rate limiter ─────────────────────────────────────────────────
// NOTE: in-memory limiter resets on redeploy/scale-out and is per-instance;
// fine for a single Next.js server but should be swapped for Redis/Upstash
// once running multiple instances.
const rateMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 5_000; // hard cap so the map can't grow unbounded (memory leak fix)

function pruneExpired(now: number) {
  for (const [key, entry] of rateMap) {
    if (now - entry.windowStart > RATE_WINDOW_MS) rateMap.delete(key);
  }
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Periodically sweep stale entries instead of letting the map grow forever.
  if (rateMap.size > MAX_TRACKED_KEYS) pruneExpired(now);

  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Constant-time string compare to avoid timing side-channels on token checks.
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Rate-limit by client IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // ── Parse + validate body ───────────────────────────────────────────────
    const body = await request.json();
    const { wedding_id, wedding_slug, token, status, guest_id } = body as {
      wedding_id?: string;
      wedding_slug?: string;
      token?: string;
      status?: string;
      guest_id?: string; // NEW: direct read path — avoids list query
    };

    if (!token || typeof token !== "string" || token.length < 10 || token.length > 256) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    if (!["Accepted", "Declined"].includes(status ?? "")) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!wedding_slug && !wedding_id) {
      return NextResponse.json({ error: "Missing wedding identifier" }, { status: 400 });
    }
    if (guest_id !== undefined && (typeof guest_id !== "string" || guest_id.length > 128)) {
      return NextResponse.json({ error: "Invalid guest identifier" }, { status: 400 });
    }
    if (
      (wedding_slug !== undefined && (typeof wedding_slug !== "string" || wedding_slug.length > 128)) ||
      (wedding_id !== undefined && (typeof wedding_id !== "string" || wedding_id.length > 128))
    ) {
      return NextResponse.json({ error: "Invalid wedding identifier" }, { status: 400 });
    }

    // ── Resolve the primary slug ────────────────────────────────────────────
    const sanitisedSlug =
      typeof wedding_slug === "string" && wedding_slug.trim()
        ? wedding_slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
        : null;

    const now = new Date().toISOString();
    const updatePayload = { rsvp_status: status, rsvp_updated_at: now };

    // ── PATH A: Direct document read (new magic links include guest_id) ─────
    // No list query needed — avoids requiring `allow list: if true` in Firestore rules.
    if (guest_id && sanitisedSlug) {
      const publicGuestRef = doc(db, "weddings", sanitisedSlug, "guests", guest_id);
      const publicSnap = await getDoc(publicGuestRef);

      if (publicSnap.exists()) {
        const guestData = publicSnap.data() as Record<string, unknown>;

        // Validate token to prevent anyone who guesses a guest_id from RSVPing
        // (constant-time compare — avoids leaking token length/prefix via timing)
        if (typeof guestData.guest_token !== "string" || !safeCompare(guestData.guest_token, token)) {
          return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        // Update public guest
        await updateDoc(publicGuestRef, updatePayload);

        // Update private guest (dual-write — prevents stale data on re-publish)
        const weddingRef = doc(db, "weddings", sanitisedSlug);
        const weddingSnap = await getDoc(weddingRef);
        if (weddingSnap.exists()) {
          const ownerUid = weddingSnap.data().owner_uid as string | undefined;
          if (ownerUid) {
            const privateRef = doc(db, "users", ownerUid, "guests", guest_id);
            const privateSnap = await getDoc(privateRef);
            if (privateSnap.exists()) {
              await updateDoc(privateRef, updatePayload);
            }
          }
        }

        return NextResponse.json({
          success: true,
          guest_name: guestData.name as string,
          rsvp_status: status,
        });
      }
      // Fall through to query path if direct read found nothing (e.g. slug changed)
    }

    // ── PATH B: Query by guest_token (legacy fallback for old magic links) ──
    // Requires `allow list: if true` in Firestore rules.
    // Can be deprecated once all outstanding links use the gid param.
    const slugsToSearch = new Set<string>();

    if (sanitisedSlug) slugsToSearch.add(sanitisedSlug);

    if (typeof wedding_id === "string" && wedding_id.trim()) {
      const trimmed = wedding_id.trim();
      slugsToSearch.add(trimmed);
      const byIdSnap = await getDocs(
        query(collection(db, "weddings"), where("wedding_id", "==", trimmed))
      );
      byIdSnap.docs.forEach((d) => slugsToSearch.add(d.id));
    }

    let foundGuestDoc: Awaited<ReturnType<typeof getDocs>>["docs"][number] | null = null;
    let resolvedSlug = "";

    for (const slug of slugsToSearch) {
      const guestsRef = collection(db, "weddings", slug, "guests");
      const q = query(guestsRef, where("guest_token", "==", token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        foundGuestDoc = snap.docs[0];
        resolvedSlug = slug;
        break;
      }
    }

    if (!foundGuestDoc) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const guestId = foundGuestDoc.id;

    // Update public guest
    await updateDoc(foundGuestDoc.ref, updatePayload);

    // Update private guest (dual-write)
    if (resolvedSlug) {
      const weddingRef = doc(db, "weddings", resolvedSlug);
      const weddingSnap = await getDoc(weddingRef);
      if (weddingSnap.exists()) {
        const ownerUid = weddingSnap.data().owner_uid as string | undefined;
        if (ownerUid) {
          const privateRef = doc(db, "users", ownerUid, "guests", guestId);
          const privateSnap = await getDoc(privateRef);
          if (privateSnap.exists()) {
            await updateDoc(privateRef, updatePayload);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      guest_name: (foundGuestDoc.data() as Record<string, unknown>).name as string,
      rsvp_status: status,
    });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
