import { notFound } from "next/navigation";
import { Suspense } from "react";
import WeddingPage from "./WeddingPage";
import { getWeddingData } from "@/lib/getWeddingData";

/**
 * ISR: revalidate every 5 minutes (300s).
 *
 * Increased from 60s — a published wedding invitation rarely changes after
 * publish, so 60s was over-eager. 300s cuts Firestore reads by 5× while
 * still keeping the public page reasonably fresh.
 *
 * On-demand revalidation: call /api/revalidate?slug={slug} from the
 * publish flow to invalidate the cache immediately after a republish.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ── Page component ────────────────────────────────────────────────────────────

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const wedding = await getWeddingData(slug);

  if (!wedding) {
    notFound();
  }

  // Pass the hydrated wedding data to the client component.
  // WeddingPage uses useSearchParams internally — must be wrapped in Suspense.
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[#FDFBF7] flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full border-4 animate-spin"
            style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <WeddingPage wedding={wedding} />
    </Suspense>
  );
}

// ── Metadata ──────────────────────────────────────────────────────────────────

/**
 * generateMetadata reuses the same cached getWeddingData() call as the page.
 * Previously this caused a SECOND Firestore read per page visit — now it's zero
 * extra reads thanks to unstable_cache deduplication within a single request.
 */
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const wedding = await getWeddingData(slug);

  if (!wedding) {
    return { title: "Invitation Not Found" };
  }

  return {
    title: `${wedding.couple.bride} & ${wedding.couple.groom} – You're Invited!`,
    description: `Join us in celebrating the ${wedding.occasion_label || "wedding"} of ${wedding.couple.bride} and ${wedding.couple.groom}. View the full invitation and RSVP.`,
  };
}
