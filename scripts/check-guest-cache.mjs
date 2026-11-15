// Self-check for src/lib/guestCache.ts. Run: node scripts/check-guest-cache.mjs
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
};

const { readCachedGuest, writeCachedGuest, patchCachedGuest } = await import("../src/lib/guestCache.ts");

const guest = { name: "Priya", rsvp_status: "Pending" };
const DAY = 24 * 60 * 60 * 1000;

assert.equal(readCachedGuest("w", "priya", "k1"), null, "empty cache misses");

writeCachedGuest("w", "priya", "k1", guest, 0);
assert.deepEqual(readCachedGuest("w", "priya", "k1", 1000), guest, "same key hits");
assert.equal(readCachedGuest("w", "priya", "k2", 1000), null, "rotated key misses");
assert.equal(readCachedGuest("w", "other", "k1", 1000), null, "other guest misses");
assert.equal(readCachedGuest("w", "priya", "k1", 60 * DAY), null, "expired entry misses");

patchCachedGuest("w", "priya", { rsvp_status: "Accepted" });
assert.equal(readCachedGuest("w", "priya", "k1", 1000).rsvp_status, "Accepted", "patch is kept");
patchCachedGuest("w", "nobody", { rsvp_status: "Accepted" });
assert.equal(store.size, 1, "patch never creates an entry");

store.set("yt-guest:w:priya", "{not json");
assert.equal(readCachedGuest("w", "priya", "k1"), null, "corrupt entry misses");

globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
assert.equal(readCachedGuest("w", "priya", "k1"), null, "blocked storage misses");
writeCachedGuest("w", "priya", "k1", guest);

console.log("guestCache ok");
