"use client";

/**
 * Optional RSVP block shared by all templates. Rendered only when
 * `wedding.rsvp_enabled` is true and the visitor arrived via a personal link
 * (we need a guest identity). Styling follows the template via `variant`.
 * Responses are written directly to Firestore and show up in the dashboard guest list.
 */

import { useState } from "react";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WeddingData, Guest } from "@/lib/types";

// rsvp_status -> counter field on wedding_reports/{slug}
const KEY = { Pending: "pending", Accepted: "accepted", Declined: "declined" } as const;

type Variant = "classic" | "royal";

const STYLES: Record<Variant, {
  section: string; card: string; eyebrow: string; title: string; body: string;
  yes: string; no: string; note: string; changeBtn: string;
}> = {
  classic: {
    section: "relative bg-cream-light paper-texture py-12 md:py-16 overflow-hidden",
    card: "container max-w-md mx-auto px-4 text-center relative z-10",
    eyebrow: "font-body text-gold uppercase tracking-widest text-xs font-bold mb-2",
    title: "font-display text-3xl text-sage-dark mb-2",
    body: "font-body text-black/70 text-base mb-6",
    yes: "flex-1 rounded-full bg-sage text-cream-light font-body font-bold py-3 px-6 hover:opacity-90 disabled:opacity-50 transition",
    no: "flex-1 rounded-full border-2 border-sage text-sage-dark font-body font-bold py-3 px-6 hover:bg-sage/10 disabled:opacity-50 transition",
    note: "font-body text-sm text-black/60 mt-4",
    changeBtn: "underline font-body text-sm text-sage-dark mt-3",
  },
  royal: {
    section: "relative py-14 bg-[#1e132a]",
    card: "container max-w-md mx-auto px-4 text-center relative z-10",
    eyebrow: "text-[#c79b4a] uppercase tracking-widest text-xs mb-2 font-bold",
    title: "font-serif text-3xl italic text-[#fdfbf7] mb-2",
    body: "font-serif text-[#e8d9bd]/80 text-sm italic mb-6",
    yes: "flex-1 rounded-full bg-[#c79b4a] text-[#2c1a0e] font-serif font-bold py-3 px-6 hover:opacity-90 disabled:opacity-50 transition",
    no: "flex-1 rounded-full border border-[#c79b4a] text-[#c79b4a] font-serif py-3 px-6 hover:bg-[#c79b4a]/10 disabled:opacity-50 transition",
    note: "font-serif text-sm text-[#e8d9bd]/70 mt-4 italic",
    changeBtn: "underline font-serif text-sm text-[#c79b4a] mt-3",
  },
};

export default function RsvpSection({ wedding, guest, variant = "classic" }: {
  wedding: WeddingData; guest?: Guest | null; variant?: Variant;
}) {
  const s = STYLES[variant];
  const [status, setStatus] = useState<Guest["rsvp_status"]>(guest?.rsvp_status ?? "Pending");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!wedding.rsvp_enabled) return null;

  const submit = async (choice: "Accepted" | "Declined") => {
    if (!guest) return;
    setBusy(true); setError("");
    try {
      // Straight to Firestore (no API route). firestore.rules lets anyone change
      // only rsvp_status / rsvp_updated_at on an unexpired guest doc.
      const now = new Date().toISOString();
      await updateDoc(doc(db, "weddings", wedding.slug, "guests", guest.guest_slug || guest.guest_id), {
        rsvp_status: choice,
        rsvp_updated_at: now,
      });
      // Move this invite between the report's counters. Best-effort: the RSVP
      // is already saved; a missing/frozen report must not fail it, and any
      // drift is fixed by the dashboard's Refresh / Guest List self-heal.
      const prev = KEY[status], next = KEY[choice];
      if (prev !== next) {
        updateDoc(doc(db, "wedding_reports", wedding.slug), {
          [prev]: increment(-1), [next]: increment(1), updated_at: now,
        }).catch(() => {});
      }
      setStatus(choice); setEditing(false);
    } catch {
      setError("Sorry, we couldn't save your response. Please try again.");
    } finally { setBusy(false); }
  };

  const answered = status !== "Pending" && !editing;
  const first = guest?.name.split(" ")[0] ?? "";

  return (
    <section id="rsvp" className={s.section}>
      <div className={s.card}>
        <p className={s.eyebrow}>Kindly Reply</p>
        <h2 className={s.title}>RSVP</h2>
        {answered ? (
          <>
            <p className={s.body}>
              {status === "Accepted"
                ? `Thank you, ${first}! We can't wait to celebrate with you.`
                : `Thank you for letting us know, ${first}. You will be missed.`}
            </p>
            <button className={s.changeBtn} onClick={() => setEditing(true)}>Change my response</button>
          </>
        ) : (
          <>
            <p className={s.body}>{first ? `${first}, will you be joining us?` : "Will you be joining us?"}</p>
            <div className="flex gap-3">
              <button className={s.yes} disabled={busy || !guest} onClick={() => submit("Accepted")}>Joyfully Accept</button>
              <button className={s.no} disabled={busy || !guest} onClick={() => submit("Declined")}>Regretfully Decline</button>
            </div>
          </>
        )}
        {!guest && <p className={s.note}>Open your personal invitation link to respond.</p>}
        {error && <p className={s.note} role="alert">{error}</p>}
      </div>
    </section>
  );
}
