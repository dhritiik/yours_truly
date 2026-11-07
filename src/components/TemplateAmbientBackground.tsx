"use client";

/**
 * TemplateAmbientBackground
 *
 * Shared ambient particle-effect background used by every invitation template
 * (SaloniJay_v1, WeddingElegant_v2, Anniversary_v3, RoyalInvites_v1).
 *
 * This used to be copy-pasted into each of the 4 template files (~90 lines
 * duplicated x4 = ~360 lines of identical code). Consolidating it here means:
 *   1. One place to fix bugs / tune performance instead of four.
 *   2. Next.js can split this into a single shared chunk reused by every
 *      template's dynamic import, instead of re-shipping the same JS in
 *      every template bundle.
 *
 * Performance note: each effect's random particle layout is generated ONCE
 * per mount (via useMemo) and each effect + the root component are wrapped
 * in React.memo. Previously the random arrays were recomputed on every
 * render, so every particle's animation restarted (visible jank) whenever
 * ANY parent state changed — e.g. every keystroke while editing wedding text
 * in the dashboard live preview.
 */

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { withBasePath } from "@/lib/basePath";

export type ThemeType = "default" | "mayra" | "bhakti" | "wedding" | "reception";

/**
 * Falling/rising particles (petals, diyas, rice/roses) used to animate with
 * `vh` units (e.g. "0vh" -> "105vh"), which only covers one viewport's worth
 * of vertical travel. Since the events section they live in stacks several
 * tall cards (often 3000px+ total), particles only ever fell through the
 * first event and then looped forever in that same band near the top —
 * never visibly reaching later events.
 *
 * This measures the actual rendered height of the ambient background's
 * container (which matches the full height of the events section) via
 * ResizeObserver, so particle travel distance can be expressed in real
 * pixels spanning the WHOLE section instead of a fixed viewport height.
 */
function useContainerHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

/**
 * Particle counts are the single biggest driver of jank on phones: every
 * particle is an independently animated element driven by framer-motion's
 * rAF loop, so 60 of them on a mid-range Android means 60 style writes per
 * frame. We render roughly a third as many below the `md` breakpoint, which
 * is visually indistinguishable at that size but keeps the main thread free.
 */
function useParticleBudget(full: number): number {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsSmall(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isSmall ? Math.max(6, Math.round(full * 0.35)) : full;
}

// Particles only ever move/fade, so pinning them to their own compositor
// layer keeps the browser from re-painting the page behind them each frame.
const LAYER_STYLE = { willChange: "transform, opacity" } as const;

interface EffectProps {
  imageUrl?: string;
  /** Full pixel height to fall/rise across — the whole events section, not just one viewport. */
  fallDistance: number;
}

// 1. MAYRA: Floating Marigolds
const PetalsEffect = memo(function PetalsEffect({ imageUrl, fallDistance }: EffectProps) {
  const count = useParticleBudget(25);
  const petals = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
    size: 15 + Math.random() * 20,
    rotateStart: Math.random() * 360,
    drift: Math.random() * 60 - 30,
  })), [imageUrl, count]);

  const travel = fallDistance + 120;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {petals.map((p) => (
        <motion.img
          key={p.id}
          src={imageUrl || withBasePath("/marigold.webp")}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute object-contain opacity-90"
          style={{ left: p.left, top: -60, width: p.size, height: p.size, ...LAYER_STYLE }}
          animate={{ y: [0, travel], rotate: [p.rotateStart, p.rotateStart + 360], x: [0, p.drift] }}
          transition={{ duration: p.duration * (travel / 800), repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
});

// 2. BHAKTI/SANGEET: Rising Diya Lights
const BhaktiEffect = memo(function BhaktiEffect({ imageUrl, fallDistance }: EffectProps) {
  const count = useParticleBudget(25);
  const lights = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: 6 + Math.random() * 4,
    delay: Math.random() * 5,
    size: imageUrl ? 24 + Math.random() * 20 : 4 + Math.random() * 6,
    drift: Math.random() * 20 - 10,
  })), [imageUrl, count]);

  const travel = fallDistance + 130;
  const startY = travel - 20;
  const endY = -20;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {!imageUrl && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-purple-100/30 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      )}
      {lights.map((l) =>
        imageUrl ? (
          <motion.img
            key={l.id}
            src={imageUrl}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute object-contain opacity-80"
            style={{ left: l.left, width: l.size, height: l.size, ...LAYER_STYLE }}
            initial={{ y: startY, opacity: 0 }}
            animate={{ y: endY, opacity: [0, 0.9, 0], x: [0, l.drift] }}
            transition={{ duration: l.duration * (travel / 800), repeat: Infinity, ease: "easeInOut", delay: l.delay }}
          />
        ) : (
          <motion.div
            key={l.id}
            aria-hidden
            className="absolute rounded-full bg-amber-200"
            style={{ left: l.left, width: l.size, height: l.size, boxShadow: "0 0 15px 2px rgba(251, 191, 36, 0.6)", ...LAYER_STYLE }}
            initial={{ y: startY, opacity: 0 }}
            animate={{ y: endY, opacity: [0, 1, 0], scale: [1, 1.5, 1], x: [0, l.drift] }}
            transition={{ duration: l.duration * (travel / 800), repeat: Infinity, ease: "easeInOut", delay: l.delay }}
          />
        )
      )}
    </div>
  );
});

// 3. WEDDING: Roses & Rice (Aksat)
const WeddingEffect = memo(function WeddingEffect({ imageUrl, fallDistance }: EffectProps) {
  const count = useParticleBudget(20);
  const rice = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, duration: 3 + Math.random() * 2, delay: Math.random() * 3,
  })), [count]);
  const roses = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, delay: Math.random() * 5, duration: 6 + Math.random() * 3,
    size: 20 + Math.random() * 20, rotateStart: Math.random() * 360, drift: Math.random() * 60 - 30,
  })), [count]);

  const travel = fallDistance + 120;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {imageUrl ? (
        roses.map((r) => (
          <motion.img
            key={`custom-rose-${r.id}`}
            src={imageUrl}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute object-contain opacity-90"
            style={{ left: r.left, top: -60, width: r.size, height: r.size, ...LAYER_STYLE }}
            animate={{ y: [0, travel], rotate: [r.rotateStart, r.rotateStart + 360], x: [0, r.drift] }}
            transition={{ duration: r.duration * (travel / 800), repeat: Infinity, ease: "linear", delay: r.delay }}
          />
        ))
      ) : (
        <>
          {rice.map((r) => (
            <motion.div
              key={`rice-${r.id}`}
              aria-hidden
              className="absolute bg-white/90 rounded-full"
              style={{ left: r.left, top: -20, width: "5px", height: "8px", ...LAYER_STYLE }}
              animate={{ y: [0, travel], rotateX: [0, 360], rotateZ: [0, 45, 0] }}
              transition={{ duration: r.duration * (travel / 800), repeat: Infinity, ease: "linear", delay: r.delay }}
            />
          ))}
          {roses.map((r) => (
            <motion.img
              key={`rose-${r.id}`}
              src={withBasePath("/rose.webp")}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="absolute object-contain opacity-90"
              style={{ left: r.left, top: -60, width: r.size, height: r.size, ...LAYER_STYLE }}
              animate={{ y: [0, travel], rotate: [r.rotateStart, r.rotateStart + 360], x: [0, r.drift] }}
              transition={{ duration: r.duration * (travel / 800), repeat: Infinity, ease: "linear", delay: r.delay }}
            />
          ))}
        </>
      )}
    </div>
  );
});

// 4. RECEPTION: Twinkling Stars
const StarryEffect = memo(function StarryEffect({ imageUrl }: EffectProps) {
  const count = useParticleBudget(60);
  const stars = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
    size: imageUrl ? 16 + Math.random() * 16 : 7 + Math.random() * 10,
    duration: 1.5 + Math.random() * 3, delay: Math.random() * 2,
  })), [imageUrl, count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.img
          key={s.id}
          src={imageUrl || withBasePath("/star.webp")}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute object-contain"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, ...LAYER_STYLE, ...(!imageUrl ? { filter: "brightness(0) invert(1)" } : {}) }}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.1, 0.8], rotate: [0, 30, 0] }}
          transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}
    </div>
  );
});

interface AmbientBackgroundProps {
  currentTheme: ThemeType;
  customParticleUrl?: string;
}

// Memoized so unrelated re-renders of the parent template (e.g. every
// keystroke while editing wedding text in the dashboard) don't remount this
// entire particle tree — it only re-renders when currentTheme or
// customParticleUrl actually change.
export const AmbientBackground = memo(function AmbientBackground({ currentTheme, customParticleUrl }: AmbientBackgroundProps) {
  // Honour the OS "reduce motion" setting: keep the themed background colour
  // (it carries the mood of each event) but drop the animated particles, which
  // are pure decoration and the most expensive part of the page.
  const prefersReducedMotion = useReducedMotion();
  // Measures the real height of the events section so falling/rising
  // particles can travel its FULL length (see useContainerHeight above),
  // instead of only the first viewport-height's worth near the top.
  const [containerRef, containerHeight] = useContainerHeight();
  const fallDistance = containerHeight || (typeof window !== "undefined" ? window.innerHeight : 800);

  const getBgClass = () => {
    switch (currentTheme) {
      case "mayra": return "bg-gradient-to-br from-amber-50 to-orange-100";
      case "bhakti": return "bg-gradient-to-b from-slate-50 to-purple-100";
      case "wedding": return "bg-gradient-to-br from-red-50 via-rose-50 to-amber-50";
      case "reception": return "bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900";
      default: return "bg-white";
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={`absolute inset-0 -z-10 transition-colors duration-1000 ${getBgClass()}`}
      initial={false}
      animate={{ backgroundColor: currentTheme === "reception" ? "#0f172a" : "#ffffff" }}
    >
      <div className={`absolute inset-0 transition-opacity duration-1000 ${currentTheme === "reception" ? "opacity-0" : "opacity-40 bg-white/50"}`} />
      <AnimatePresence mode="wait">
        {!prefersReducedMotion && currentTheme === "mayra" && (
          <motion.div key="mayra" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <PetalsEffect imageUrl={customParticleUrl} fallDistance={fallDistance} />
          </motion.div>
        )}
        {!prefersReducedMotion && currentTheme === "bhakti" && (
          <motion.div key="bhakti" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <BhaktiEffect imageUrl={customParticleUrl} fallDistance={fallDistance} />
          </motion.div>
        )}
        {!prefersReducedMotion && currentTheme === "wedding" && (
          <motion.div key="wedding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <WeddingEffect imageUrl={customParticleUrl} fallDistance={fallDistance} />
          </motion.div>
        )}
        {!prefersReducedMotion && currentTheme === "reception" && (
          <motion.div key="reception" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <StarryEffect imageUrl={customParticleUrl} fallDistance={fallDistance} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
