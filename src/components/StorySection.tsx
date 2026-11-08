"use client";

/**
 * Optional "Our Story" section shared by all templates.
 *
 * A swipeable card stack: drag the front card left/right (or tap a side card,
 * use the arrows, or the arrow keys) to move through the couple's story. The
 * date shows above the photo and the description below, and both cross-fade
 * as the card changes. Fully responsive — card and typography scale from
 * phones through tablets to laptops. Styling follows the template via `variant`.
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import type { WeddingData, StoryCard } from "@/lib/types";
import { cldImagePreset } from "@/lib/cloudinary";

type Variant = "classic" | "royal";

const THEME: Record<Variant, {
  section: string; eyebrow: string; heading: string; date: string; title: string;
  desc: string; frame: string; placeholder: string; dotOn: string; dotOff: string;
  arrow: string; hint: string;
}> = {
  classic: {
    section: "relative bg-cream-light paper-texture py-16 md:py-24 overflow-hidden",
    eyebrow: "font-body text-gold uppercase tracking-[0.3em] text-xs font-bold",
    heading: "font-display text-3xl sm:text-4xl md:text-5xl text-sage-dark",
    date: "font-display text-gold text-lg sm:text-xl md:text-2xl tracking-wide",
    title: "font-display text-sage-dark text-xl sm:text-2xl md:text-3xl",
    desc: "font-body text-black/70 text-sm sm:text-base md:text-lg leading-relaxed",
    frame: "bg-white p-2 sm:p-2.5 shadow-[0_18px_40px_-12px_rgba(60,60,40,0.45)] border border-gold/30",
    placeholder: "bg-gradient-to-br from-sage/30 via-cream to-gold/30 text-gold",
    dotOn: "bg-gold w-6",
    dotOff: "bg-sage/30 w-2",
    arrow: "border-gold/50 text-sage-dark hover:bg-gold/10",
    hint: "font-body text-black/40 text-xs tracking-widest uppercase",
  },
  royal: {
    section: "relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-[#2c1a0e] via-[#241530] to-[#1e132a]",
    eyebrow: "text-[#c79b4a] uppercase tracking-[0.3em] text-xs font-bold",
    heading: "font-serif italic text-3xl sm:text-4xl md:text-5xl text-[#fdfbf7]",
    date: "font-serif italic text-[#c79b4a] text-lg sm:text-xl md:text-2xl tracking-wide",
    title: "font-serif text-[#fdfbf7] text-xl sm:text-2xl md:text-3xl",
    desc: "font-serif italic text-[#e8d9bd]/80 text-sm sm:text-base md:text-lg leading-relaxed",
    frame: "bg-[#fdfbf7] p-2 sm:p-2.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] border border-[#c79b4a]/60",
    placeholder: "bg-gradient-to-br from-[#863745]/60 via-[#3a2150] to-[#c79b4a]/50 text-[#c79b4a]",
    dotOn: "bg-[#c79b4a] w-6",
    dotOff: "bg-[#c79b4a]/30 w-2",
    arrow: "border-[#c79b4a]/60 text-[#c79b4a] hover:bg-[#c79b4a]/10",
    hint: "font-serif italic text-[#e8d9bd]/40 text-xs tracking-widest",
  },
};

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 450;

export default function StorySection({ wedding, variant = "classic" }: {
  wedding: WeddingData; variant?: Variant;
}) {
  const t = THEME[variant];
  const cards: StoryCard[] = wedding.story_cards ?? [];
  const [index, setIndex] = useState(0);

  const go = useCallback((next: number) => {
    setIndex((i) => Math.min(cards.length - 1, Math.max(0, next === i ? i : next)));
  }, [cards.length]);

  if (!wedding.story_enabled || cards.length === 0) return null;

  const safeIndex = Math.min(index, cards.length - 1);
  const active = cards[safeIndex];

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) go(safeIndex + 1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) go(safeIndex - 1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(safeIndex + 1);
    if (e.key === "ArrowLeft") go(safeIndex - 1);
  };

  return (
    <section id="story" className={t.section} aria-roledescription="carousel" aria-label="Our story">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
        >
          <p className={`${t.eyebrow} mb-2`}>How It All Began</p>
          <h2 className={t.heading}>{wedding.story_heading || "Our Story"}</h2>
        </motion.div>

        {/* Date above the photo */}
        <div className="h-9 md:h-11 mb-4 md:mb-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={active.id + "-date"} className={t.date}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25 }}
            >
              {active.date}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Card stack */}
        <div
          className="relative mx-auto flex items-center justify-center outline-none
                     w-full h-[min(430px,95vw)] sm:h-[480px] md:h-[560px] lg:h-[600px]"
          tabIndex={0} onKeyDown={onKey}
        >
          {/* Desktop/tablet arrows */}
          <button
            aria-label="Previous"
            onClick={() => go(safeIndex - 1)} disabled={safeIndex === 0}
            className={`hidden md:flex absolute left-0 lg:left-8 z-30 h-12 w-12 items-center justify-center rounded-full border backdrop-blur-sm transition disabled:opacity-20 ${t.arrow}`}
          >‹</button>
          <button
            aria-label="Next"
            onClick={() => go(safeIndex + 1)} disabled={safeIndex === cards.length - 1}
            className={`hidden md:flex absolute right-0 lg:right-8 z-30 h-12 w-12 items-center justify-center rounded-full border backdrop-blur-sm transition disabled:opacity-20 ${t.arrow}`}
          >›</button>

          {cards.map((c, i) => {
            const off = i - safeIndex;
            if (Math.abs(off) > 2) return null;
            const isFront = off === 0;
            return (
              <motion.div
                key={c.id}
                className={`absolute rounded-2xl ${t.frame} ${isFront ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                            w-[68vw] max-w-[300px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[420px]`}
                style={{ zIndex: 10 - Math.abs(off), touchAction: "pan-y" }}
                initial={false}
                animate={{
                  x: `${off * 38}%`,
                  scale: 1 - Math.abs(off) * 0.1,
                  rotate: off * 5,
                  opacity: Math.abs(off) === 2 ? 0.35 : Math.abs(off) === 1 ? 0.75 : 1,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                drag={isFront ? "x" : false}
                dragSnapToOrigin
                dragElastic={0.6}
                onDragEnd={isFront ? onDragEnd : undefined}
                onClick={!isFront ? () => go(i) : undefined}
                aria-hidden={!isFront}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cldImagePreset(c.image_url, "card")} alt={c.title || c.date}
                      draggable={false} loading="lazy"
                      className="h-full w-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center text-6xl ${t.placeholder}`}>♥</div>
                  )}
                  {c.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-12 pb-4">
                      <p className="font-display text-white text-xl sm:text-2xl drop-shadow">{c.title}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Description below the photo */}
        <div className="mx-auto max-w-xl text-center mt-6 md:mt-8 min-h-[7rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id + "-desc"}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            >
              {active.title && <p className={`${t.title} mb-2`}>{active.title}</p>}
              <p className={t.desc}>{active.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots + hint */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {cards.map((c, i) => (
              <button
                key={c.id} aria-label={`Go to story ${i + 1}`} onClick={() => go(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === safeIndex ? t.dotOn : t.dotOff}`}
              />
            ))}
          </div>
          {cards.length > 1 && <p className={t.hint}>Swipe to continue the story</p>}
        </div>
      </div>
    </section>
  );
}
