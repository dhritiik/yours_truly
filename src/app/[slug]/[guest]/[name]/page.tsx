import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import WeddingPage from "../../WeddingPage";
import { getWeddingData } from "@/lib/getWeddingData";

/**
 * Secret invite route: /{slug}/{secret}/{guest_slug}
 * e.g. /saloni-jay/ab12cd34/priya-aunty
 *
 * NOTE: here the `guest` segment holds the guest's SECRET (Guest.link_key),
 * not their slug — Next.js needs one param name per path level and the older
 * /{slug}/{guest_slug} route already named this level `guest`. The guest slug
 * is the last segment, `name`.
 *
 * WeddingPage checks the secret against the guest doc and refuses to show
 * the invite when it doesn't match.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string; guest: string; name: string }>;
}

export default async function SecretGuestPage({ params }: PageProps) {
  const { slug, guest: linkKey, name: guestSlug } = await params;
  const wedding = await getWeddingData(slug);

  if (!wedding) {
    notFound();
  }

  // Same as /{slug}/{guest_slug}: guest docs are gone once the wedding is over.
  if (wedding.expired) redirect(`/${slug}`);

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
      <WeddingPage wedding={wedding} guestSlug={guestSlug} linkKey={linkKey} />
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
