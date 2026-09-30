"use client";

/**
 * WeddingPage (Client Component)
 *
 * Receives WeddingData from the ISR server component.
 * CSR-handles:
 *   1. Resolving the guest, in priority order:
 *      a. `guestSlug` prop — new personalized path /{slug}/{guest_slug}
 *         (set by src/app/[slug]/[guest]/page.tsx). Single direct getDoc()
 *         keyed by the human-readable slug, e.g. "priya-aunty".
 *      b. Legacy ?t=&gid= query string — direct getDoc() by guest_id, then
 *         token-validated.
 *      c. Legacy ?t= only (no gid) — getDocs() query by guest_token.
 *   2. Mounting the correct template via dynamic import (code-splitting)
 *   3. Injecting guest-specific event masking
 */


import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WeddingData, Guest } from "@/lib/types";
import dynamic from "next/dynamic";

// Dynamic per-template imports — each template's JS is only loaded when needed.
const SaloniJayTemplate = dynamic(() => import("@/templates/SaloniJay_v1"), {
  loading: () => <FullPageSpinner />,
  ssr: false,
});
const WeddingElegantTemplate = dynamic(() => import("@/templates/WeddingElegant_v2"), {
  loading: () => <FullPageSpinner />,
  ssr: false,
});
const AnniversaryTemplate = dynamic(() => import("@/templates/Anniversary_v3"), {
  loading: () => <FullPageSpinner />,
  ssr: false,
});
const RoyalInvitesTemplate = dynamic(() => import("@/templates/RoyalInvites_v1"), {
  loading: () => <FullPageSpinner />,
  ssr: false,
});


function FullPageSpinner() {
  return (
    <div className="fixed inset-0 bg-[#FDFBF7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }}
        />
        <p className="font-display text-sm tracking-widest uppercase text-stone-400">
          Opening your invitation...
        </p>
      </div>
    </div>
  );
}

interface WeddingPageProps {
  wedding: WeddingData;
  /**
   * Present when the guest arrived via the new personalized path form
   * /{slug}/{guest_slug} (see src/app/[slug]/[guest]/page.tsx). Takes
   * priority over the legacy ?t=&gid= query-string form below.
   */
  guestSlug?: string;
}

export default function WeddingPage({ wedding, guestSlug }: WeddingPageProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const gid = searchParams.get("gid"); // guest_id embedded in legacy-format magic links

  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(!!token || !!guestSlug);

  useEffect(() => {
    // ── Path C (current): recognizable path segment /{slug}/{guest_slug} ────
    // The guest doc is keyed by guest_slug, so this is a single direct
    // getDoc() — no token to validate since the slug itself isn't a secret.
    if (guestSlug) {
      setLoading(true);
      const guestRef = doc(db, "weddings", wedding.slug, "guests", guestSlug);
      getDoc(guestRef)
        .then((snap) => {
          if (snap.exists()) setGuest(snap.data() as Guest);
          else console.warn("No guest found for slug:", guestSlug);
        })
        .catch((err) => console.error("Guest fetch error:", err))
        .finally(() => setLoading(false));
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    const fetchGuest = async () => {
      try {
        // ── Path A (legacy, preferred over B): Direct read via guest_id ──────
        // Old-format magic links include &gid={guest_id}.
        if (gid) {
          const guestRef = doc(db, "weddings", wedding.slug, "guests", gid);
          const snap = await getDoc(guestRef);
          if (snap.exists()) {
            const data = snap.data() as Guest;
            // Validate token matches — prevents anyone guessing a guest_id
            if (data.guest_token === token) {
              setGuest(data);
              return;
            }
            // Token mismatch: treat as unauthenticated (no guest personalisation)
            console.warn("Guest token mismatch for gid:", gid);
            return;
          }
          // gid not found in primary slug collection — fall through to query path
        }

        // ── Path B (legacy fallback): Query by guest_token ────────────────────
        // Used for magic links sent before the gid param was added.
        // Can be deprecated once all outstanding magic links have been re-sent.
        const slugGuestRef = collection(db, "weddings", wedding.slug, "guests");
        let snap = await getDocs(query(slugGuestRef, where("guest_token", "==", token)));

        // Secondary fallback to legacy wedding_id path
        if (snap.empty && wedding.wedding_id && wedding.wedding_id !== wedding.slug) {
          const idGuestRef = collection(db, "weddings", wedding.wedding_id, "guests");
          snap = await getDocs(query(idGuestRef, where("guest_token", "==", token)));
        }

        if (!snap.empty) {
          setGuest(snap.docs[0].data() as Guest);
        }
      } catch (err) {
        console.error("Guest fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGuest();
  }, [token, gid, guestSlug, wedding.wedding_id, wedding.slug]);

  if (loading) return <FullPageSpinner />;

  const commonProps = { wedding, guest };

  switch (wedding.template_id) {
    case "SaloniJay_v1":
      return (
        <Suspense fallback={<FullPageSpinner />}>
          <SaloniJayTemplate {...commonProps} />
        </Suspense>
      );
    case "WeddingElegant_v2":
      return (
        <Suspense fallback={<FullPageSpinner />}>
          <WeddingElegantTemplate {...commonProps} />
        </Suspense>
      );
    case "Anniversary_v3":
      return (
        <Suspense fallback={<FullPageSpinner />}>
          <AnniversaryTemplate {...commonProps} />
        </Suspense>
      );

    case "RoyalInvites_v1":
      return (
        <Suspense fallback={<FullPageSpinner />}>
          <RoyalInvitesTemplate {...commonProps} />
        </Suspense>
      );

    default:
      return (
        <Suspense fallback={<FullPageSpinner />}>
          <SaloniJayTemplate {...commonProps} />
        </Suspense>
      );
  }
}
