/**
 * reportService.ts
 * wedding_reports/{slug} — one consolidated report per published wedding.
 *
 * Kept current by small increments at every place a number changes (guest
 * added / edited / removed here in the dashboard, RSVP in RsvpSection), so
 * reading it never needs a recount. Publishing recounts once and overwrites,
 * which also repairs any drift. deleteCustomerData() freezes it (`final`)
 * before the guest data goes; firestore.rules then rejects further changes.
 */
import { doc, setDoc, updateDoc, getDocs, deleteDoc, increment, onSnapshot, FieldValue, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer, Guest, WeddingReport } from "@/lib/types";
import { updateCustomer } from "@/lib/customerService";
import { clearGuests, guestCollectionPath, publicGuestCollectionPath } from "@/lib/guestService";

type Counts = Pick<WeddingReport, "invites" | "accepted" | "declined" | "pending"> & {
  event_seats: Record<string, number>;
};
const NUM_KEYS = ["invites", "accepted", "declined", "pending"] as const;

const STATUS_KEY = { Pending: "pending", Accepted: "accepted", Declined: "declined" } as const;

const reportRef = (slug: string) => doc(db, "wedding_reports", slug);

/** What one guest record contributes to the report. */
function contribution(g?: Guest): Counts {
  const c: Counts = { invites: 0, accepted: 0, declined: 0, pending: 0, event_seats: {} };
  if (!g) return c;
  c.invites = 1;
  c[STATUS_KEY[g.rsvp_status] ?? "pending"] = 1;
  for (const [id, seats] of Object.entries(g.event_seats ?? {})) if (seats > 0) c.event_seats[id] = seats;
  return c;
}

export function countGuests(guests: Guest[]): Counts {
  const total = contribution();
  guests.forEach((g) => {
    const c = contribution(g);
    NUM_KEYS.forEach((k) => (total[k] += c[k]));
    for (const [id, seats] of Object.entries(c.event_seats)) total.event_seats[id] = (total.event_seats[id] ?? 0) + seats;
  });
  return total;
}

/**
 * Overwrite the given report fields with absolute values (creates the doc if
 * needed). mergeFields replaces each listed field whole — so a fresh
 * event_seats map drops counts for events that no longer exist — while
 * leaving every other field (share_token, names…) untouched.
 */
export async function saveReport(slug: string, fields: Partial<WeddingReport>): Promise<void> {
  const data = { ...fields, slug, updated_at: new Date().toISOString() };
  await setDoc(reportRef(slug), data, { mergeFields: Object.keys(data) });
}

/**
 * Apply one guest change as increments: pass (undefined, guest) for an add,
 * (guest, undefined) for a delete, (before, after) for an edit.
 * Best-effort — never blocks the guest edit itself. It fails (harmlessly)
 * when the wedding was never published or its report is frozen.
 */
export async function bumpReport(slug: string | undefined, before?: Guest, after?: Guest): Promise<void> {
  if (!slug?.trim()) return;
  const a = contribution(after), b = contribution(before);
  const delta: Record<string, FieldValue> = {};
  NUM_KEYS.forEach((k) => { if (a[k] !== b[k]) delta[k] = increment(a[k] - b[k]); });
  for (const id of new Set([...Object.keys(a.event_seats), ...Object.keys(b.event_seats)])) {
    const d = (a.event_seats[id] ?? 0) - (b.event_seats[id] ?? 0);
    if (d) delta[`event_seats.${id}`] = increment(d); // dotted key = nested field path
  }
  if (Object.keys(delta).length === 0) return;
  await updateDoc(reportRef(slug), { ...delta, updated_at: new Date().toISOString() }).catch((e) =>
    console.warn("Report not updated:", e)
  );
}

/** Live report doc; null when missing or unreadable (non-admins can't read it). */
export function subscribeToReport(slug: string, cb: (r: WeddingReport | null) => void): Unsubscribe {
  return onSnapshot(reportRef(slug), (s) => cb(s.exists() ? (s.data() as WeddingReport) : null), () => cb(null));
}

/** True when the stored report already shows these counts (zero seats = absent). */
export function reportMatches(r: WeddingReport, c: Counts): boolean {
  const seats = (m: Record<string, number> = {}) =>
    JSON.stringify(Object.entries(m).filter(([, n]) => n).sort(([a], [b]) => a.localeCompare(b)));
  return NUM_KEYS.every((k) => (r[k] ?? 0) === c[k]) && seats(r.event_seats) === seats(c.event_seats);
}

/** Full recount from Firestore. Only for publish and the pre-delete freeze. */
export async function recountGuests(customerId: string, slug: string): Promise<Counts> {
  const [privateSnap, publicSnap] = await Promise.all([
    getDocs(guestCollectionPath(customerId)),
    getDocs(publicGuestCollectionPath(slug)),
  ]);
  // Guests write their RSVP to the public doc, so an actual answer there wins
  // (same rule as the Guest List screen: a public "Pending" doesn't override).
  const rsvps = new Map(
    publicSnap.docs
      .map((d) => [d.id, (d.data() as Guest).rsvp_status] as const)
      .filter(([, s]) => s && s !== "Pending")
  );
  return countGuests(
    privateSnap.docs.map((d) => {
      const g = d.data() as Guest;
      return { ...g, rsvp_status: rsvps.get(g.guest_slug || g.guest_id) ?? g.rsvp_status };
    })
  );
}

/** Public read-only link for a report; creates its secret token on first use. */
export async function getShareLink(report: WeddingReport): Promise<string> {
  let token = report.share_token;
  if (!token) {
    token = crypto.randomUUID();
    await updateDoc(reportRef(report.slug), { share_token: token });
  }
  // Must match the public domain used for invite links (see buildMagicLink).
  return `https://yourstrulyinvites.com/i/report/${token}`;
}

/**
 * Admin-triggered (Insights page), irreversible: freeze the report, THEN
 * delete the draft, the private guest list (phone numbers) and the live
 * public docs. Only the report, the customer doc and wedding_archives/{slug}
 * remain. Safe to re-run after a partial failure: pass `frozen` (the
 * report's `final`) and the report is not recounted from half-deleted data.
 */
export async function deleteCustomerData(customer: Customer, frozen: boolean): Promise<void> {
  const { customer_id: id, invitation_slug: slug } = customer;
  if (customer.deletion === "done" || !slug?.trim()) return;
  await updateCustomer(id, { deletion: "started" });
  if (!frozen) await saveReport(slug, { ...(await recountGuests(id, slug)), final: true });
  await clearGuests(id, slug);
  await deleteDoc(doc(db, "weddings", slug));
  await deleteDoc(doc(db, "customers", id, "invitation", "draft"));
  await updateCustomer(id, { deletion: "done" });
}
