"use client";

/**
 * Optional "Dress Code" block for an event card (all templates).
 * Brush-stroke title + theme line, colour swatches, a free-text note
 * (e.g. "Suit for men · lehenga or saree for women"), and an optional
 * illustration (the couple/figure image the host uploads) beside the text.
 * Everything comes from `event.dress_code`, edited in the dashboard.
 */

import type { DressCode } from "@/lib/types";
import { cldImagePreset } from "@/lib/cloudinary";

type Variant = "classic" | "royal";

const T: Record<Variant, {
  label: string; theme: string; note: string; ring: string; stroke: (c: string) => React.CSSProperties;
}> = {
  classic: {
    label: "font-imperial text-3xl sm:text-4xl leading-none text-sage-dark",
    theme: "font-display font-bold uppercase tracking-wide text-sage-dark text-xs sm:text-sm md:text-base",
    note: "font-body italic text-sage-dark/80 text-xs sm:text-sm leading-snug",
    ring: "ring-2 ring-white shadow-md",
    stroke: (c) => ({ background: `linear-gradient(100deg, ${c}00 0%, ${c}88 8%, ${c}cc 50%, ${c}88 92%, ${c}00 100%)` }),
  },
  royal: {
    label: "font-serif italic text-2xl sm:text-3xl leading-none text-[#863745]",
    theme: "font-serif font-bold uppercase tracking-widest text-[#3b4435] text-[11px] sm:text-sm",
    note: "font-serif italic text-[#4f5348] text-xs sm:text-sm leading-snug",
    ring: "ring-2 ring-[#fdfbf7] shadow-md",
    stroke: (c) => ({ background: `linear-gradient(100deg, ${c}00 0%, ${c}66 10%, ${c}99 50%, ${c}66 90%, ${c}00 100%)` }),
  },
};

export default function DressCodeBlock({ dressCode, variant = "classic" }: {
  dressCode?: DressCode; variant?: Variant;
}) {
  if (!dressCode?.enabled) return null;
  const t = T[variant];
  const shades = (dressCode.shades ?? []).filter(Boolean);
  const hasImage = !!dressCode.image_url;
  const first = shades[0] ?? "#FACC15";

  const text = (
    <div className={`flex flex-col items-center text-center gap-2 ${hasImage ? "" : "w-full"}`}>
      <div className="px-5 py-2 -rotate-1 w-full max-w-[16rem]" style={t.stroke(first)}>
        <p className={t.label}>{dressCode.label || "Dresscode"}</p>
        {dressCode.theme && <p className={`${t.theme} mt-1`}>{dressCode.theme}</p>}
      </div>
      {shades.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {shades.map((c, i) => (
            <span key={i} className={`h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full ${t.ring}`} style={{ backgroundColor: c }} aria-label={`Shade ${c}`} />
          ))}
        </div>
      )}
      {dressCode.note && <p className={`${t.note} max-w-[16rem] whitespace-pre-line`}>{dressCode.note}</p>}
    </div>
  );

  return (
    <div className="w-full my-3 border-y border-current/10 py-3">
      {hasImage ? (
        <div className="grid grid-cols-[36%_1fr] sm:grid-cols-[40%_1fr] items-center gap-2 sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cldImagePreset(dressCode.image_url, "card")} alt="Dress code illustration" loading="lazy" draggable={false}
               className="w-full max-h-48 sm:max-h-56 object-contain" />
          {text}
        </div>
      ) : text}
    </div>
  );
}
