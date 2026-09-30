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

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { withBasePath } from "@/lib/basePath";

export type ThemeType = "default" | "mayra" | "bhakti" | "wedding" | "reception";

interface EffectProps {
  imageUrl?: string;
}

// 1. MAYRA: Floating Marigolds
const PetalsEffect = memo(function PetalsEffect({ imageUrl }: EffectProps) {
  const petals = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
    size: 15 + Math.random() * 20,
    rotateStart: Math.random() * 360,
  })), [imageUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {petals.map((p) => (
        <motion.img
          key={p.id}
          src={imageUrl || withBasePath("/marigold.png")}
          alt="falling marigold"
          className="absolute object-contain opacity-90"
          style={{ left: p.left, top: -60, width: p.size, height: p.size }}
          animate={{ y: ["0vh", "105vh"], rotate: [p.rotateStart, p.rotateStart + 360], x: [0, Math.random() * 60 - 30] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
});

// 2. BHAKTI/SANGEET: Rising Diya Lights
const BhaktiEffect = memo(function BhaktiEffect({ imageUrl }: EffectProps) {
  const lights = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: 6 + Math.random() * 4,
    delay: Math.random() * 5,
    size: imageUrl ? 24 + Math.random() * 20 : 4 + Math.random() * 6,
  })), [imageUrl]);

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
            alt="custom particle"
            className="absolute object-contain opacity-80"
            style={{ left: l.left, width: l.size, height: l.size }}
            initial={{ y: "108vh", opacity: 0 }}
            animate={{ y: "-10vh", opacity: [0, 0.9, 0], x: [0, Math.random() * 20 - 10] }}
            transition={{ duration: l.duration, repeat: Infinity, ease: "easeInOut", delay: l.delay }}
          />
        ) : (
          <motion.div
            key={l.id}
            className="absolute rounded-full bg-amber-200"
            style={{ left: l.left, width: l.size, height: l.size, boxShadow: "0 0 15px 2px rgba(251, 191, 36, 0.6)" }}
            initial={{ y: "105vh", opacity: 0 }}
            animate={{ y: "-10vh", opacity: [0, 1, 0], scale: [1, 1.5, 1], x: [0, Math.random() * 20 - 10] }}
            transition={{ duration: l.duration, repeat: Infinity, ease: "easeInOut", delay: l.delay }}
          />
        )
      )}
    </div>
  );
});

// 3. WEDDING: Roses & Rice (Aksat)
const WeddingEffect = memo(function WeddingEffect({ imageUrl }: EffectProps) {
  const rice = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, duration: 3 + Math.random() * 2, delay: Math.random() * 3,
  })), []);
  const roses = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, delay: Math.random() * 5, duration: 6 + Math.random() * 3,
    size: 20 + Math.random() * 20, rotateStart: Math.random() * 360,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {imageUrl ? (
        roses.map((r) => (
          <motion.img
            key={`custom-rose-${r.id}`}
            src={imageUrl}
            alt="custom particle"
            className="absolute object-contain opacity-90"
            style={{ left: r.left, top: -60, width: r.size, height: r.size }}
            animate={{ y: ["0vh", "105vh"], rotate: [r.rotateStart, r.rotateStart + 360], x: [0, Math.random() * 60 - 30] }}
            transition={{ duration: r.duration, repeat: Infinity, ease: "linear", delay: r.delay }}
          />
        ))
      ) : (
        <>
          {rice.map((r) => (
            <motion.div
              key={`rice-${r.id}`}
              className="absolute bg-white/90 rounded-full"
              style={{ left: r.left, top: -20, width: "5px", height: "8px" }}
              animate={{ y: ["0vh", "105vh"], rotateX: [0, 360], rotateZ: [0, 45, 0] }}
              transition={{ duration: r.duration, repeat: Infinity, ease: "linear", delay: r.delay }}
            />
          ))}
          {roses.map((r) => (
            <motion.img
              key={`rose-${r.id}`}
              src={withBasePath("/rose.png")}
              alt="falling rose"
              className="absolute object-contain opacity-90"
              style={{ left: r.left, top: -60, width: r.size, height: r.size }}
              animate={{ y: ["0vh", "105vh"], rotate: [r.rotateStart, r.rotateStart + 360], x: [0, Math.random() * 60 - 30] }}
              transition={{ duration: r.duration, repeat: Infinity, ease: "linear", delay: r.delay }}
            />
          ))}
        </>
      )}
    </div>
  );
});

// 4. RECEPTION: Twinkling Stars
const StarryEffect = memo(function StarryEffect({ imageUrl }: EffectProps) {
  const stars = useMemo(() => Array.from({ length: 60 }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
    size: imageUrl ? 16 + Math.random() * 16 : 7 + Math.random() * 10,
    duration: 1.5 + Math.random() * 3, delay: Math.random() * 2,
  })), [imageUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.img
          key={s.id}
          src={imageUrl || withBasePath("/star.png")}
          alt="star"
          className="absolute object-contain"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, ...(!imageUrl ? { filter: "brightness(0) invert(1)" } : {}) }}
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
      className={`fixed inset-0 -z-10 transition-colors duration-1000 ${getBgClass()}`}
      initial={false}
      animate={{ backgroundColor: currentTheme === "reception" ? "#0f172a" : "#ffffff" }}
    >
      <div className={`absolute inset-0 transition-opacity duration-1000 ${currentTheme === "reception" ? "opacity-0" : "opacity-40 bg-white/50"}`} />
      <AnimatePresence mode="wait">
        {currentTheme === "mayra" && (
          <motion.div key="mayra" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <PetalsEffect imageUrl={customParticleUrl} />
          </motion.div>
        )}
        {currentTheme === "bhakti" && (
          <motion.div key="bhakti" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <BhaktiEffect imageUrl={customParticleUrl} />
          </motion.div>
        )}
        {currentTheme === "wedding" && (
          <motion.div key="wedding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <WeddingEffect imageUrl={customParticleUrl} />
          </motion.div>
        )}
        {currentTheme === "reception" && (
          <motion.div key="reception" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <StarryEffect imageUrl={customParticleUrl} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
