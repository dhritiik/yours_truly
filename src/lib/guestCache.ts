/**
 * Browser cache for the guest doc on the personal invite page, so repeat
 * page loads don't re-read Firestore.
 *
 * An entry is only valid for the `link_key` it was stored under (the secret
 * in the guest's link). Editing a guest in the dashboard rotates link_key, so
 * the new link misses the cache and reads fresh data.
 */

import type { Guest } from "@/lib/types";

// A device holding the OLD link would otherwise show pre-edit data forever.
const TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

type Entry = { k: string; at: number; guest: Guest };

const storageKey = (slug: string, guestSlug: string) => `yt-guest:${slug}:${guestSlug}`;

// localStorage throws in private mode / when blocked — then we just don't cache.
function load(slug: string, guestSlug: string): Entry | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey(slug, guestSlug)) ?? "null");
  } catch {
    return null;
  }
}

function save(slug: string, guestSlug: string, entry: Entry): void {
  try {
    localStorage.setItem(storageKey(slug, guestSlug), JSON.stringify(entry));
  } catch {}
}

export function readCachedGuest(slug: string, guestSlug: string, linkKey: string, now = Date.now()): Guest | null {
  const e = load(slug, guestSlug);
  return e && e.k === linkKey && now - e.at < TTL_MS ? e.guest : null;
}

export function writeCachedGuest(slug: string, guestSlug: string, linkKey: string, guest: Guest, now = Date.now()): void {
  save(slug, guestSlug, { k: linkKey, at: now, guest });
}

/** Keep the cached copy in step with a write this device just made (RSVP). */
export function patchCachedGuest(slug: string, guestSlug: string, patch: Partial<Guest>): void {
  const e = load(slug, guestSlug);
  if (e) save(slug, guestSlug, { ...e, guest: { ...e.guest, ...patch } });
}
