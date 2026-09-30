/**
 * guestService.ts
 * Firestore CRUD for the guest list.
 *
 * Private path (draft): customers/{customer_id}/guests/{guest_id}
 * Public path (live):   weddings/{slug}/guests/{guest_id}
 *
 * Architecture:
 * - Private collection is the single source of truth for guest data.
 * - Public collection is a mirror for guest-facing magic link views.
 * - RSVP status is written to BOTH collections simultaneously (see /api/rsvp/route.ts).
 * - publishGuestList() uses a smart merge — preserves rsvp_status from public.
 * - Individual guest edits call syncSingleGuestToPublic() — O(1) not O(N×3).
 *
 * Security improvements (§4.1):
 * - phone_number is NEVER written to the public collection. It's only stored in
 *   the private users/{uid}/guests collection where only the owner can read it.
 *   This limits GDPR exposure if the public guest collection is enumerated.
 * - Magic links now include &gid={guest_id} so WeddingPage can do a direct
 *   getDoc() instead of a getDocs() query — enabling Firestore list rules to
 *   be restricted to the wedding owner only.
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  WriteBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Guest } from "@/lib/types";

// Firestore batch limit is 500 operations; use 490 as a safe margin.
const BATCH_CHUNK_SIZE = 490;

// ── Path helpers ─────────────────────────────────────────────────────────────

export const guestCollectionPath = (customerId: string) =>
  collection(db, "customers", customerId, "guests");

export const guestDocPath = (customerId: string, guestId: string) =>
  doc(db, "customers", customerId, "guests", guestId);

// NOTE: keyed by guest_slug (not guest_id) — see generateGuestSlug below.
// This lets the guest-facing page do a direct getDoc() using the readable
// slug straight out of the URL, with no separate lookup/list step needed.
export const publicGuestPath = (slug: string, guestSlug: string) =>
  doc(db, "weddings", slug, "guests", guestSlug);

export const publicGuestCollectionPath = (slug: string) =>
  collection(db, "weddings", slug, "guests");

// ── Guest slug generation ─────────────────────────────────────────────────────

/**
 * Slugify a guest's name into a URL-safe, lowercase, hyphenated string.
 * e.g. "Priya Aunty" -> "priya-aunty", "Dr. R. Menon" -> "dr-r-menon"
 */
function slugifyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || "guest";
}

/**
 * Generate a guest_slug that's unique against `existingSlugs`.
 * On collision, appends -2, -3, etc. (e.g. two guests both named "Priya"
 * become "priya" and "priya-2").
 *
 * Callers must pass the set of slugs already in use for this wedding
 * (existing guests + any already assigned earlier in the same batch).
 */
export function generateGuestSlug(name: string, existingSlugs: Set<string>): string {
  const base = slugifyName(name);
  if (!existingSlugs.has(base)) return base;
  let n = 2;
  while (existingSlugs.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ── Privacy: public guest shape ───────────────────────────────────────────────

/**
 * Strip fields that should NEVER appear in the public Firestore collection.
 *
 * phone_number — belongs only in the private users/{uid}/guests collection.
 *   The host uses it from the admin dashboard to send WhatsApp messages.
 *   Guests do not need to see their own phone number on the invite page.
 *   Removing it from public prevents bulk harvesting via getDocs().
 */
type PublicGuest = Omit<Guest, "phone_number">;

function toPublicGuest(guest: Guest): PublicGuest {
  // Destructure to explicitly omit phone_number — TS will error if we miss it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { phone_number, ...publicGuest } = guest;
  return publicGuest;
}

// ── Internal: chunked batch execution ────────────────────────────────────────

/**
 * Execute an arbitrary list of batch operations in sequential chunks of 490.
 * Handles weddings with 500+ guests without hitting Firestore's batch limit.
 */
async function commitInChunks(
  ops: Array<(batch: WriteBatch) => void>
): Promise<void> {
  if (ops.length === 0) return;
  for (let i = 0; i < ops.length; i += BATCH_CHUNK_SIZE) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_CHUNK_SIZE).forEach((op) => op(batch));
    await batch.commit();
  }
}

// ── Realtime listener ─────────────────────────────────────────────────────────

/**
 * Subscribe to the user's private guest list in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToGuests(
  uid: string,
  callback: (guests: Guest[]) => void
): Unsubscribe {
  const q = query(guestCollectionPath(uid), orderBy("created_at", "asc"));
  return onSnapshot(q, (snap) => {
    const guests = snap.docs.map((d) => d.data() as Guest);
    callback(guests);
  });
}

// ── Write operations ──────────────────────────────────────────────────────────

/** Add or fully overwrite a single guest record in the private collection only. */
export async function saveGuest(uid: string, guest: Guest): Promise<void> {
  await setDoc(guestDocPath(uid, guest.guest_id), guest);
}

/**
 * Batch-write an array of new guests (e.g. from CSV import) to the private collection.
 * Uses chunked batches to support 500+ guests safely.
 * Returns the complete Guest objects with their assigned IDs.
 */
export async function importGuests(
  uid: string,
  weddingId: string,
  guests: Omit<Guest, "guest_id" | "guest_slug">[]
): Promise<Guest[]> {
  const saved: Guest[] = [];
  const ops: Array<(batch: WriteBatch) => void> = [];
  const usedSlugs = new Set<string>();

  for (const g of guests) {
    const id = crypto.randomUUID();
    const slug = generateGuestSlug(g.name, usedSlugs);
    usedSlugs.add(slug);
    const full: Guest = { ...g, guest_id: id, guest_slug: slug, wedding_id: weddingId };
    ops.push((batch) => batch.set(guestDocPath(uid, id), full));
    saved.push(full);
  }

  await commitInChunks(ops);
  return saved;
}

/** Update a guest record in the private collection. */
export async function updateGuest(uid: string, guest: Guest): Promise<void> {
  await setDoc(guestDocPath(uid, guest.guest_id), guest);
}

/**
 * Delete a guest from the private list AND the public collection.
 * Always pass `slug` + `guestSlug` if the invitation is published — keeps
 * both in sync and avoids orphaned guest documents in the public collection.
 */
export async function deleteGuest(
  uid: string,
  guestId: string,
  slug?: string,
  guestSlug?: string
): Promise<void> {
  const ops: Promise<void>[] = [deleteDoc(guestDocPath(uid, guestId))];
  if (slug?.trim() && guestSlug?.trim()) {
    ops.push(deleteDoc(publicGuestPath(slug, guestSlug)));
  }
  await Promise.all(ops);
}

/**
 * Delete ALL guests from the private list AND public collection.
 * Handles 500+ guests via chunked batches.
 * Always pass `slug` for published invitations.
 */
export async function clearGuests(uid: string, slug?: string): Promise<void> {
  const privateSnap = await getDocs(guestCollectionPath(uid));

  const privateOps: Array<(batch: WriteBatch) => void> = [];
  privateSnap.docs.forEach((d) => {
    privateOps.push((batch) => batch.delete(d.ref));
  });
  await commitInChunks(privateOps);

  if (slug?.trim()) {
    const publicSnap = await getDocs(publicGuestCollectionPath(slug));
    const publicOps: Array<(batch: WriteBatch) => void> = [];
    publicSnap.docs.forEach((d) => {
      publicOps.push((batch) => batch.delete(d.ref));
    });
    await commitInChunks(publicOps);
  }
}

// ── Public collection sync ────────────────────────────────────────────────────

/**
 * Sync ONE guest to the public collection (phone_number stripped).
 *
 * Use this for individual guest adds/edits — it's an O(1) operation
 * vs publishGuestList which was O(N×3) for every single change.
 *
 * The guest object already has the correct rsvp_status because the RSVP
 * route writes to both private and public simultaneously.
 */
export async function syncSingleGuestToPublic(
  slug: string,
  guest: Guest
): Promise<void> {
  if (!slug.trim()) return;
  // Guests created before guest_slug existed fall back to guest_id so they
  // still publish (just without a pretty URL) rather than silently no-op.
  const key = guest.guest_slug?.trim() || guest.guest_id;
  // Strip phone_number — it must never appear in the public collection
  await setDoc(publicGuestPath(slug, key), toPublicGuest(guest));
}

/**
 * Smart publish: mirrors the private guest list to weddings/{slug}/guests/.
 *
 * Improvements:
 * 1. RSVP preservation: reads existing public rsvp_status before writing.
 * 2. No destructive delete: only removes public guests deleted from private.
 * 3. Chunked batches: handles 500+ guests safely.
 * 4. Privacy: phone_number is stripped from every public write.
 *
 * Call on: Explicit "Publish" or CSV import. NOT on individual guest edits.
 */
export async function publishGuestList(uid: string, slug: string): Promise<void> {
  const [privateSnap, publicSnap] = await Promise.all([
    getDocs(guestCollectionPath(uid)),
    getDocs(publicGuestCollectionPath(slug)),
  ]);

  // Build a map of guest responses from public — we never want to lose these.
  type RsvpState = {
    rsvp_status: Guest["rsvp_status"];
    rsvp_updated_at?: string;
  };
  const publicRsvpMap = new Map<string, RsvpState>();
  publicSnap.docs.forEach((d) => {
    const data = d.data() as Guest & { rsvp_updated_at?: string };
    if (data.rsvp_status && data.rsvp_status !== "Pending") {
      publicRsvpMap.set(d.id, {
        rsvp_status: data.rsvp_status,
        rsvp_updated_at: data.rsvp_updated_at,
      });
    }
  });

  const privateGuestIds = new Set(privateSnap.docs.map((d) => d.id));
  const allOps: Array<(batch: WriteBatch) => void> = [];

  // Step 1: Delete public guests that no longer exist in private.
  // Public docs are keyed by guest_slug, so match against the private
  // guest's own guest_slug (falling back to guest_id for legacy guests).
  const privateSlugKeys = new Set(
    privateSnap.docs.map((d) => {
      const data = d.data() as Guest;
      return data.guest_slug?.trim() || data.guest_id;
    })
  );
  publicSnap.docs.forEach((d) => {
    if (!privateSlugKeys.has(d.id)) {
      allOps.push((batch) => batch.delete(d.ref));
    }
  });

  // Step 2: Upsert all private guests into public.
  // - Strip phone_number (privacy — public collection must not store phone numbers)
  // - Merge preserved RSVP state if guest has already responded
  // - Assign a guest_slug on the fly for any legacy guest that predates it,
  //   de-duplicated against slugs already used in this wedding.
  const usedSlugs = new Set(privateSlugKeys);
  privateSnap.docs.forEach((d) => {
    const privateData = d.data() as Guest;
    let slugKey = privateData.guest_slug?.trim();
    if (!slugKey) {
      usedSlugs.delete(privateData.guest_id);
      slugKey = generateGuestSlug(privateData.name, usedSlugs);
      usedSlugs.add(slugKey);
    }
    const preservedRsvp = publicRsvpMap.get(slugKey);
    const ref = publicGuestPath(slug, slugKey);

    const publicData: PublicGuest & { rsvp_updated_at?: string } = preservedRsvp
      ? { ...toPublicGuest(privateData), guest_slug: slugKey, ...preservedRsvp }
      : { ...toPublicGuest(privateData), guest_slug: slugKey };

    allOps.push((batch) => batch.set(ref, publicData));
  });

  await commitInChunks(allOps);
}

// ── Magic link ────────────────────────────────────────────────────────────────

/**
 * Build a personalised magic link for a guest.
 *
 * Format: /i/{slug}/{guest_slug}
 *
 * The guest_slug is a recognizable, human-readable identifier (e.g.
 * "priya-aunty") rather than a secret token — the public guest document is
 * keyed by this same slug, so the invite page can resolve it with a single
 * direct getDoc() call. This trades link secrecy for readability; the guest
 * list itself is still protected from enumeration because Firestore `list`
 * is restricted to the wedding owner (only single-document `get` is open).
 *
 * Falls back to the old token-based query format if guest_slug hasn't been
 * assigned yet (guests created before this field existed).
 */
export function buildMagicLink(
  slug: string,
  guest: Pick<Guest, "guest_token" | "guest_id" | "guest_slug">,
  baseUrl?: string
): string {
  const base =
    baseUrl ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/i`
      : "https://www.yourstrulyinvites.com/i");

  if (guest.guest_slug?.trim()) {
    return `${base}/${slug}/${guest.guest_slug}`;
  }
  // Legacy fallback for guests without a guest_slug yet.
  return `${base}/${slug}?t=${guest.guest_token}&gid=${guest.guest_id}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
