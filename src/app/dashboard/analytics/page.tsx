"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Check, Link2, RefreshCw, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { deleteCustomerData, getShareLink, recountGuests, saveReport } from "@/lib/reportService";
import { Customer, WeddingReport } from "@/lib/types";
import ReportView from "@/components/ReportView";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { customers, isAdmin } = useCustomer();
  const [reports, setReports] = useState<WeddingReport[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live view of wedding_reports — one small doc per wedding, already
  // consolidated. No guest documents are read here.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, "wedding_reports"), where("created_by", "==", user.uid)),
      (snap) => setReports(snap.docs.map((d) => d.data() as WeddingReport)),
      (e) => {
        console.error(e);
        setError("Could not load reports. Check that the latest firestore.rules are deployed.");
        setReports([]);
      }
    );
  }, [user]);

  const handleShare = async (r: WeddingReport) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(await getShareLink(r));
      setCopied(r.slug);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error(e);
      setError("Could not create the share link. Please try again.");
    }
  };

  // Full recount from the guest lists (2 reads per guest), only when asked.
  const handleRefresh = async (r: WeddingReport) => {
    setRefreshing(r.slug);
    setError(null);
    try {
      await saveReport(r.slug, await recountGuests(r.customer_id, r.slug));
    } catch (e) {
      console.error(e);
      setError(`Could not refresh "${r.bride_name} & ${r.groom_name}". Please try again.`);
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (c: Customer, r: WeddingReport) => {
    if (!confirm(
      `Permanently delete all data for "${r.bride_name} & ${r.groom_name}"?\n\n` +
      "This removes their invitation draft, the whole guest list and every personal guest link from Firebase. " +
      "Only this report (and its share link) and the keepsake invite stay. This cannot be undone."
    )) return;
    setBusy(c.customer_id);
    setError(null);
    try {
      await deleteCustomerData(c, !!r.final);
    } catch (e) {
      console.error(e);
      setError(`Could not finish deleting "${r.bride_name} & ${r.groom_name}". The report is safe — press Delete data again to retry.`);
    } finally {
      setBusy(null);
    }
  };

  if (!reports) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl text-[hsl(25,30%,12%)]">Insights</h1>
        <p className="font-sans text-sm text-muted-foreground mt-0.5">
          Numbers for every published invitation. Press Refresh on a card to recount it from the guest list. Copy a report link to share it with the couple — they see only that report, not your dashboard.
        </p>
      </div>

      {error && <p role="alert" className="font-sans text-xs text-red-500">{error}</p>}

      {reports.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground py-16 text-center">
          No reports yet. A report is created when an invitation is published.
        </p>
      ) : (
        reports.map((r) => {
          const c = customers.find((x) => x.customer_id === r.customer_id && x.invitation_slug === r.slug);
          return (
            <ReportView
              key={r.slug}
              report={r}
              deletion={c?.deletion}
              action={isAdmin && !r.final && !c?.deletion && (
                <button
                  onClick={() => handleRefresh(r)}
                  disabled={refreshing !== null}
                  aria-label={`Refresh numbers for ${r.bride_name} & ${r.groom_name}`}
                  className="inline-flex items-center gap-1.5 font-sans text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E8E0D8] text-[hsl(43,75%,35%)] hover:bg-[#F5EFE6] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing === r.slug ? "animate-spin" : ""}`} />
                  {refreshing === r.slug ? "Refreshing…" : "Refresh"}
                </button>
              )}
            >
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleShare(r)}
                    className="inline-flex items-center gap-1.5 font-sans text-xs font-medium px-2.5 py-1.5 rounded-lg text-[hsl(43,75%,35%)] hover:bg-[#F5EFE6] transition-colors"
                  >
                    {copied === r.slug ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copied === r.slug ? "Link copied" : "Copy share link"}
                  </button>
                  {c && c.deletion !== "done" && (
                    <button
                      onClick={() => handleDelete(c, r)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 font-sans text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {busy === c.customer_id ? "Deleting…" : "Delete data"}
                    </button>
                  )}
                </div>
              )}
            </ReportView>
          );
        })
      )}
    </div>
  );
}
