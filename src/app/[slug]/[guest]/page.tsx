import { notFound } from "next/navigation";
import { Suspense } from "react";
import WeddingPage from "../WeddingPage";
import { getWeddingData } from "@/lib/getWeddingData";

/**
 * Personalized invite route: /{slug}/{guest_slug}
 * e.g. /saloni-jay/priya-aunty
 *
 * Thin wrapper around the generic /{slug} route — reuses the same cached
 * getWeddingData(slug) (shared unstable_cache entry, no extra Firestore
 * reads) and just forwards the `guest` path segment down as `guestSlug`,
 * which WeddingPage resolves via a direct getDoc() keyed by guest_slug.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string; guest: string }>;
}

export default async function SlugGuestPage({ params }: PageProps) {
  const { slug, guest } = await params;
  const wedding = await getWeddingData(slug);

  if (!wedding) {
    notFound();
  }

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
      <WeddingPage wedding={wedding} guestSlug={guest} />
    </Suspense>
  );
}

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
