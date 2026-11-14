/**
 * Read-only report card. Shared by the dashboard Insights page (client) and
 * the public /report/{token} page (server) — no hooks, so it renders in both.
 * Admin-only controls are passed in as `children`.
 */
import { ReactNode } from "react";
import { WeddingReport } from "@/lib/types";

export function reportStatus(r: WeddingReport, deletion?: "started" | "done") {
  if (deletion === "started") return { label: "Delete incomplete", cls: "bg-red-50 text-red-600" };
  if (r.final) return { label: "Wedding complete", cls: "bg-stone-100 text-stone-600" };
  if (r.expires_at && Date.parse(r.expires_at) < Date.now()) return { label: "Expired", cls: "bg-amber-50 text-amber-700" };
  return { label: "Live", cls: "bg-emerald-50 text-emerald-700" };
}

export default function ReportView({ report: r, deletion, children, action }: {
  report: WeddingReport;
  deletion?: "started" | "done";
  children?: ReactNode;
  /** Admin control (Refresh) shown in place of the "Live" badge. */
  action?: ReactNode;
}) {
  const status = reportStatus(r, deletion);
  const seats = r.event_seats ?? {};
  // Events in invitation order, then any counted event missing from the
  // list (added after the last publish) so no seats are silently hidden.
  const listed = r.event_list ?? [];
  const rows = [
    ...listed.map((e) => ({ id: e.event_id, name: e.name })),
    ...Object.keys(seats)
      .filter((id) => !listed.some((e) => e.event_id === id))
      .map((id) => ({ id, name: "Event added after publishing" })),
  ];
  const stats: [string, number | undefined][] = [
    ["Invites", r.invites], ["Accepted", r.accepted], ["Declined", r.declined], ["Pending", r.pending],
  ];

  return (
    <section className="rounded-2xl border border-[#E8E0D8] bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl text-[hsl(25,30%,12%)] break-words">{r.bride_name} &amp; {r.groom_name}</h2>
          <p className="font-sans text-xs text-muted-foreground mt-0.5">
            {r.end_date ? `Wedding ends ${r.end_date}` : "No end date set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!(action && status.label === "Live") && (
            <span className={`font-sans text-xs font-medium px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
          )}
          {action}
        </div>
      </div>

      <div>
        <h3 className="font-sans text-xs font-semibold text-[hsl(43,75%,40%)] mb-2">Guests invited per event</h3>
        {rows.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rows.map((e) => (
              <li key={e.id} className="rounded-xl bg-[#FDFBF7] border border-[#E8E0D8] px-3 py-2">
                <p className="font-sans text-[11px] text-muted-foreground break-words">{e.name}</p>
                <p className="font-sans text-lg font-semibold tabular-nums text-[hsl(25,30%,12%)]">{seats[e.id] ?? 0}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-xs text-muted-foreground">
            Publish the invitation again to start counting guests per event.
          </p>
        )}
      </div>

      <div>
        <h3 className="font-sans text-xs font-semibold text-[hsl(43,75%,40%)] mb-2">Invites &amp; RSVPs</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map(([label, n]) => (
            <div key={label} className="rounded-xl bg-[#FDFBF7] border border-[#E8E0D8] px-3 py-2">
              <dt className="font-sans text-[11px] text-muted-foreground">{label}</dt>
              <dd className="font-sans text-lg font-semibold tabular-nums text-[hsl(25,30%,12%)]">{n ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-[11px] text-muted-foreground">
          Per-event numbers count every reserved seat (a family of 3 = 3) · Invites = personal links sent · Updated {new Date(r.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        {children}
      </div>
    </section>
  );
}
