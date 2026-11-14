// Self-check for src/lib/expiry.ts — run: node scripts/check-expiry.mjs
import assert from "node:assert/strict";
import { endOfDay } from "../src/lib/expiry.ts";

const d = endOfDay("14/11/2026");
assert.deepEqual(
  [d.getDate(), d.getMonth() + 1, d.getFullYear(), d.getHours(), d.getMinutes()],
  [14, 11, 2026, 23, 59]
);
// Day-first, never month-first: 03/04 is 3 April.
assert.equal(endOfDay("03/04/2027").getMonth() + 1, 4);
for (const bad of ["", undefined, "2026-11-14", "31/02/2026", "14/13/2026", "1/1/2026"]) {
  assert.equal(endOfDay(bad), null, String(bad));
}
console.log("expiry ok");
