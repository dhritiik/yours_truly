"use client";

/**
 * WeddingPage (Client Component)
 *
 * Receives WeddingData from the ISR server component.
 * CSR-handles:
 *   1. Resolving the guest, in priority order:
 *      a. `guestSlug` (+ `linkKey`) props — /{slug}/{secret}/{guest_slug}
 *         (src/app/[slug]/[guest]/[name]/page.tsx). Single direct getDoc()
 *         keyed by the guest slug, refused unless the secret matches the
 *         doc's link_key; then cached in localStorage under that secret
 *         (see src/lib/guestCache.ts). /{slug}/{guest_slug} without a secret
 *         only opens for older guests that have no link_key yet.
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
import { readCachedGuest, writeCachedGuest } from "@/lib/guestCache";
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
  /**
   * The guest's secret from /{slug}/{secret}/{guest_slug}. Must equal the
   * guest doc's link_key or the invite is refused; also the localStorage
   * cache key (see src/lib/guestCache.ts).
   */
  linkKey?: string;
}

export default function WeddingPage({ wedding, guestSlug, linkKey }: WeddingPageProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const gid = searchParams.get("gid"); // guest_id embedded in legacy-format magic links

  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(!wedding.expired && (!!token || !!guestSlug));
  // Expired/deleted invite: no guest doc to personalise from, so ask for a name.
  const [askName, setAskName] = useState(!!wedding.expired);
  // Personal link that doesn't resolve to a guest (wrong name or secret).
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    // Expired: no guest docs left to read (and rules deny them) — skip the reads.
    if (wedding.expired) return;

    // ── Path C (current): recognizable path segment /{slug}/{guest_slug} ────
    // The guest doc is keyed by guest_slug, so this is a single direct
    // getDoc(), then the link's secret is checked against the doc's link_key.
    if (guestSlug) {
      // Repeat visit on the same link: reuse the cached doc, no Firestore read.
      const cached = linkKey && readCachedGuest(wedding.slug, guestSlug, linkKey);
      if (cached) {
        setGuest(cached);
        setLoading(false);
        return;
      }
      setLoading(true);
      const guestRef = doc(db, "weddings", wedding.slug, "guests", guestSlug);
      getDoc(guestRef)
        .then((snap) => {
          const g = snap.data() as Guest | undefined;
          // The secret must match. Guests created before link_key existed have
          // none, so their already-sent /{slug}/{guest_slug} links still open.
          if (!g || (g.link_key || "") !== (linkKey || "")) {
            setInvalid(true);
            return;
          }
          setGuest(g);
          if (linkKey) writeCachedGuest(wedding.slug, guestSlug, linkKey, g);
        })
        .catch((err) => {
          console.error("Guest fetch error:", err);
          setInvalid(true);
        })
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
  }, [token, gid, linkKey, guestSlug, wedding.wedding_id, wedding.slug, wedding.expired]);

  if (loading) return <FullPageSpinner />;

  if (invalid) {
    return (
      <div className="fixed inset-0 bg-[#FDFBF7] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-2xl text-stone-700">Invitation not found</h1>
        <p className="font-sans text-sm text-stone-600 max-w-xs">
          This link isn&apos;t valid. Please open the latest link you were sent, or ask the hosts for a new one.
        </p>
      </div>
    );
  }

  if (askName) {
    return (
      <form
        className="fixed inset-0 bg-[#FDFBF7] flex flex-col items-center justify-center gap-4 p-6 text-center"
        onSubmit={(e) => {
          e.preventDefault();
          const name = new FormData(e.currentTarget).get("name")?.toString().trim();
          // Name only — no event_seats, so the template shows every event.
          if (name) setGuest({ name } as Guest);
          setAskName(false);
        }}
      >
        <h1 className="font-display text-2xl text-stone-700">
          {wedding.couple.bride} &amp; {wedding.couple.groom}
        </h1>
        <p className="font-sans text-sm text-stone-600 max-w-xs">
          Oops, you&apos;re late for the wedding! 🎉 The shaadi is over, the food is gone,
          and the DJ went home. But you can still peek at the invite.
        </p>
        <label htmlFor="guest-name" className="font-sans text-sm text-stone-500">
          Enter your name to get an invite with your name on it
        </label>
        <input
          id="guest-name"
          name="name"
          autoFocus
          maxLength={60}
          autoComplete="name"
          placeholder="Your name"
          className="w-full max-w-xs rounded-xl border border-[#E8E0D8] bg-white px-4 py-3 text-center font-sans text-base outline-none focus:border-[hsl(43,75%,50%)]"
        />
        <button
          type="submit"
          className="font-sans text-sm font-semibold px-6 py-3 rounded-xl text-white"
          style={{ background: "hsl(43,75%,45%)" }}
        >
          Open Invitation
        </button>
        <button
          type="button"
          onClick={() => setAskName(false)}
          className="font-sans text-sm text-stone-500 underline underline-offset-4"
        >
          View default template
        </button>
      </form>
    );
  }

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
