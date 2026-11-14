import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReportView from "@/components/ReportView";
import { adminDb } from "@/lib/firebaseAdmin";
import { WeddingReport } from "@/lib/types";

/**
 * Public, read-only wedding report: /report/{share_token}.
 * The link itself is the password (a random UUID made in Insights). The
 * report is read on the server with firebase-admin, so wedding_reports stays
 * admin-only in firestore.rules and nothing else becomes readable.
 * One small document read per view.
 */
export const metadata: Metadata = {
  title: "Wedding Report",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedReportPage({ params }: PageProps) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/.test(token)) notFound();

  const snap = await adminDb().collection("wedding_reports").where("share_token", "==", token).limit(1).get();
  if (snap.empty) notFound();
  const report = snap.docs[0].data() as WeddingReport;

  return (
    <main className="min-h-screen bg-[#FDFBF7] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="font-sans text-xs uppercase tracking-widest text-muted-foreground text-center">Your wedding report</p>
        <ReportView report={report} />
        <p className="font-sans text-[11px] text-muted-foreground text-center">
          Refresh the page for the latest numbers. Anyone with this link can see this page.
        </p>
      </div>
    </main>
  );
}
