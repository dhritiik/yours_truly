"use client";

/**
 * TEMPLATE: RoyalInvites_v1 ("Royal Invites")
 * Migrated from elegant-invite/src/events/wedding-new (arch hero + rope-pull
 * envelope + unrolling "farman" scroll timeline). Visual design is preserved
 * 1:1 — only the data source changed from URL query params / a local config
 * file to the shared `WeddingData` / `Guest` model, matching the pattern used
 * by SaloniJay_v1.tsx so every template reads from the same DB-backed shape.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import type { WeddingData, Guest } from "@/lib/types";
import { AmbientBackground, ThemeType } from "@/components/TemplateAmbientBackground";
import { withBasePath } from "@/lib/basePath";

export type { ThemeType };

interface TemplateProps {
  wedding: WeddingData;
  guest?: Guest | null;
  skipEnvelope?: boolean;
}

// ---------------------------------------------------------
// Decorative asset paths (design-only, not user content)
// ---------------------------------------------------------
const DARK_BG = withBasePath("/wedding-new-courtyard-dark-m-v03.webp");
const LIT_BG = withBasePath("/wedding-new-courtyard-lit-m-v03.webp");
const ROPE_IMG = withBasePath("/wedding-newrope-hemp-pull-x-v01.webp");
const ARCH_BG = withBasePath("/wedding-new-inv-fr-card-m-v01.webp");
const PANEL_BG = withBasePath("/wedding-new-bg-panel-m-v01.webp");
const GARDEN_BG = withBasePath("/wedding-new-bg-secret-garden-m-v01.webp");
const PEACOCK = withBasePath("/wedding-new-peacock.png");
const MENU_BG = withBasePath("/wedding-new-Menu_background.webp");
const COMPASS_ICON = withBasePath("/wedding-new-compass.webp");
const MUSIC_ICON = withBasePath("/wedding-new-music_icon.webp");
const FARMAN_ROLLED = withBasePath("/wedding-new-farman-rolled-x-v01.webp");
const FARMAN_OPEN = withBasePath("/wedding-new-farman-open-x-v01.webp");
const LOTUS_DIVIDER = "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/invite/pn-inv-div-lotus-divider-x-v01.webp";

const PULL_THRESHOLD = 90;
const MAX_PULL = 160;

// ---------------------------------------------------------
// ENVELOPE — rope-pull to light the courtyard
// ---------------------------------------------------------
const Envelope = ({ onOpen, audioRef }: { onOpen: () => void; audioRef?: React.RefObject<HTMLAudioElement | null> }) => {
  const [stage, setStage] = useState<"idle" | "lit" | "done">("idle");
  const pullY = useMotionValue(0);
  const ropeRotate = useTransform(pullY, [0, MAX_PULL], [0, 3]);
  const bgProgress = useTransform(pullY, [0, PULL_THRESHOLD], [0, 1]);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const triggered = useRef(false);

  const triggerLight = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;
    if (audioRef?.current) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => void 0);
    }
    animate(pullY, MAX_PULL, { type: "spring", stiffness: 300, damping: 20 });
    setTimeout(() => animate(pullY, 0, { type: "spring", stiffness: 120, damping: 18 }), 400);
    setStage("lit");
    setTimeout(() => onOpen(), 1000);
  }, [pullY, onOpen, audioRef]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (stage !== "idle") return;
    isDragging.current = true;
    dragStartY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || stage !== "idle") return;
    const delta = Math.max(0, Math.min(e.clientY - dragStartY.current, MAX_PULL));
    pullY.set(delta);
    if (delta >= PULL_THRESHOLD) triggerLight();
  };
  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (stage === "idle") animate(pullY, 0, { type: "spring", stiffness: 200, damping: 20 });
  };

  return (
    <motion.div className="fixed inset-0 z-50 overflow-hidden select-none bg-[#0a0a0a]" exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
      <img src={DARK_BG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      <motion.img src={LIT_BG} alt="" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        style={{ opacity: stage === "idle" ? bgProgress : 1 }} />
      <div className="absolute inset-0 z-20 flex flex-col items-center pointer-events-none">
        <motion.div
          className="relative flex flex-col items-center cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onClick={() => { if (stage === "idle") triggerLight(); }}
          style={{ pointerEvents: stage === "idle" ? "auto" : "none", y: pullY, rotate: ropeRotate, transformOrigin: "50% 0%", touchAction: "none" }}
        >
          <img src={ROPE_IMG} alt="Pull the rope" draggable={false} className="w-[240px] md:w-[350px] object-contain drop-shadow-2xl"
            style={{ marginTop: "-60vh", height: "150vh", minHeight: "900px" }} />
        </motion.div>
        <AnimatePresence>
          {stage === "idle" && (
            <motion.div className="absolute bottom-[28%] flex flex-col items-center pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-serif italic text-[#e6d5b8] text-2xl md:text-3xl tracking-wider drop-shadow-md">Pull to light us up</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button onClick={onOpen} className="absolute bottom-8 right-8 z-30 text-[#8c8c8c] hover:text-[#e6d5b8] text-xs uppercase tracking-[0.2em] transition-colors cursor-pointer">
        SKIP INTRO
      </button>
    </motion.div>
  );
};

// ---------------------------------------------------------
// EVENT TIMELINE — unrolling "farman" scrolls, alternating left/right
// ---------------------------------------------------------
const getMotifIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("mehendi")) return "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/event/pn-evt-ico-mehendi-x-v01.webp";
  if (t.includes("haldi")) return "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/event/pn-evt-ico-haldi-x-v01.webp";
  if (t.includes("sangeet") || t.includes("bhakti")) return "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/event/pn-evt-ico-sangeet-x-v01.webp";
  if (t.includes("reception")) return "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/event/pn-evt-ico-reception-x-v01.webp";
  if (t.includes("vidaai")) return "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/event/pn-evt-ico-vidaai-x-v01.webp";
  return "https://pub-1cc0f6e993214be9a36badeeb631f4b6.r2.dev/templates/template09/assets/event/pn-evt-ico-shaadi-x-v01.webp";
};

const getThemeForEvent = (title: string): ThemeType => {
  const t = title.toLowerCase();
  if (t.includes("mandap") || t.includes("mameru") || t.includes("haldi")) return "mayra";
  if (t.includes("bhakti") || t.includes("sangeet")) return "bhakti";
  if (t.includes("jaan") || t.includes("hast melap") || t.includes("wedding")) return "wedding";
  if (t.includes("reception")) return "reception";
  return "default";
};

const FarmanStop = ({ event, seatCountText, onThemeChange }: {
  event: WeddingData["events"][0];
  seatCountText: string | null;
  onThemeChange: (theme: ThemeType) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const motif = getMotifIcon(event.event_name);

  return (
    <motion.article
      className="farman-stop"
      onViewportEnter={() => { setIsOpen(true); onThemeChange(getThemeForEvent(event.event_group || event.event_name)); }}
      viewport={{ once: true, amount: 0.25 }}
    >
      {!isOpen && (
        <div className="farman-rolled-wrap">
          <img className="farman-rolled-img" src={FARMAN_ROLLED} alt="" draggable="false" />
        </div>
      )}
      <motion.div className="farman-open-wrap" initial={{ scaleY: 0, opacity: 0 }} animate={isOpen ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
        transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }} style={{ transformOrigin: "top" }} onAnimationComplete={() => setAnimationComplete(true)}>
        <img className="farman-parchment-img" src={FARMAN_OPEN} alt="" aria-hidden="true" draggable="false" />
        <img className="farman-peacock" src={PEACOCK} alt="" aria-hidden="true" draggable="false" />
        <div className="farman-dust-layer" aria-hidden="true">
          <div className="farman-dust-dot dot-1"></div>
          <div className="farman-dust-dot dot-2"></div>
          <div className="farman-dust-dot dot-3"></div>
          <div className="farman-dust-dot dot-4"></div>
        </div>
        <motion.div className="farman-content" initial={{ opacity: 0 }} animate={isOpen ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.6, duration: 0.5 }} aria-label={`${event.event_name} details`}>
          <img className="farman-motif" src={motif} alt="motif" />
          <h3 className="farman-name">{event.event_name}</h3>
          <div className="farman-rule" aria-hidden="true"></div>
          <p className="farman-datetime">{event.date_display} · {event.time_display}</p>
          {event.location_details && <p className="farman-venue">{event.location_details}</p>}
          <div className="farman-note">
            {(typeof event.description === "string" ? event.description : "").split("\n").map((line, i) => (
              <p key={i} className={i > 0 ? "mt-1" : ""}>{line.trim()}</p>
            ))}
          </div>
          {seatCountText && <p className="farman-guest-count">looking forward to welcome: {seatCountText}</p>}
          {event.maps_url && (
            <a className="farman-map" href={event.maps_url} target="_blank" rel="noreferrer">
              <svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
                <path d="M5.5 0C2.46 0 0 2.46 0 5.5c0 4.12 5.5 8.5 5.5 8.5S11 9.62 11 5.5C11 2.46 8.54 0 5.5 0Z" fill="currentColor" opacity=".72"></path>
                <circle cx="5.5" cy="5.5" r="2" fill="#fff" opacity=".88"></circle>
              </svg>Open in Maps
            </a>
          )}
          <div className="farman-map-rule" aria-hidden="true"></div>
        </motion.div>
        {!animationComplete && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full flex justify-center" style={{ marginBottom: "-10px" }}>
            <img src={FARMAN_ROLLED} alt="" style={{ width: "70%", maxWidth: "220px", height: "auto" }} />
          </div>
        )}
      </motion.div>
    </motion.article>
  );
};

const EventTimeline = ({ events, guest, onThemeChange }: {
  events: WeddingData["events"];
  guest?: Guest | null;
  onThemeChange: (theme: ThemeType) => void;
}) => {
  const getGuestEventSeats = (event: WeddingData["events"][0]): number | undefined => {
    if (!guest) return undefined;
    const seats = guest.event_seats?.[event.event_id];
    if (typeof seats === "number") return seats;
    if (guest.event_seats && Object.keys(guest.event_seats).length > 0) return 0;
    return guest.invited_events?.includes(event.event_id) ? 1 : undefined;
  };

  const visibleEvents = useMemo(() => {
    if (guest && (guest.event_seats || guest.invited_events?.length)) {
      return events.filter((e) => {
        const seats = getGuestEventSeats(e);
        return seats !== undefined && seats > 0;
      });
    }
    return events;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, guest]);

  return (
    <div className="evt-journey">
      <style>{`
        .evt-journey { position: relative; width: 100%; padding: 40px 0; }
        .evt-stops { position: relative; z-index: 10; display: flex; flex-direction: column; gap: 60px; width: 100%; }
        .farman-stop { position: relative; width: 98%; max-width: 520px; margin: 0 auto; z-index: 5; }
        .farman-rolled-wrap { width: 100%; display: flex; justify-content: center; align-items: center; padding: 20px 0; }
        .farman-rolled-img { width: 85%; max-width: 280px; height: auto; }
        .farman-open-wrap { position: relative; width: 100%; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.18); }
        .farman-parchment-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; border-radius: 12px; z-index: 1; }
        .farman-peacock { position: absolute; top: -40px; right: -10px; width: 120px; height: auto; z-index: 15; pointer-events: none; opacity: 0.95; }
        @media (min-width: 768px) { .farman-peacock { width: 160px; top: -50px; right: -20px; } }
        .farman-content { position: relative; z-index: 10; padding: 60px 40px; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .farman-motif { width: 75px; height: auto; margin-bottom: 18px; }
        .farman-name { font-family: 'Cinzel', serif; font-size: 1.8rem; font-weight: 700; color: #863745; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .farman-rule { width: 80px; height: 1px; background-color: #d8c29d; margin-bottom: 14px; }
        .farman-datetime { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 700; color: #3b4435; margin-bottom: 8px; }
        .farman-venue { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 600; color: #4f5348; margin-bottom: 12px; }
        .farman-note { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-style: italic; color: #4f5348; }
        .farman-guest-count { margin-top: 12px; font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: #863745; font-weight: 600; }
        .farman-map { display: inline-flex; align-items: center; margin-top: 16px; font-family: 'Cormorant Garamond', serif; font-size: 1rem; color: #863745; text-decoration: underline; }
        .farman-map-rule { width: 60px; height: 1px; background-color: #d8c29d; margin-top: 10px; }
        .farman-dust-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
        .farman-dust-dot { position: absolute; border-radius: 50%; background-color: rgba(216, 169, 87, 0.4); animation: floatDust 6s infinite ease-in-out; }
        .dot-1 { width: 3px; height: 3px; left: 20%; bottom: 25%; animation-duration: 5s; animation-delay: 1s; }
        .dot-2 { width: 4px; height: 4px; right: 25%; top: 30%; animation-duration: 7s; animation-delay: 2s; }
        .dot-3 { width: 2.5px; height: 2.5px; left: 60%; top: 40%; animation-duration: 6s; animation-delay: 0.5s; }
        .dot-4 { width: 3.5px; height: 3.5px; right: 40%; bottom: 35%; animation-duration: 8s; animation-delay: 3s; }
        @keyframes floatDust { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0; } 50% { transform: translateY(-20px) translateX(10px) scale(1.2); opacity: 0.8; } }
        @media (min-width: 768px) { .farman-inter--lotus img { width: 160px; max-width: 200px; } }
      `}</style>

      {visibleEvents.length > 0 ? (
        <div className="evt-stops" role="list">
          {visibleEvents.map((event, index) => {
            const seats = getGuestEventSeats(event);
            const seatCountText = typeof seats === "number" ? `${seats} ${seats === 1 ? "seat" : "seats"} reserved` : null;
            return (
              <React.Fragment key={event.event_id}>
                <FarmanStop event={event} seatCountText={seatCountText} onThemeChange={onThemeChange} />
                {index < visibleEvents.length - 1 && (
                  index === 2 ? (
                    <div className="farman-inter farman-inter--lotus" aria-hidden="true">
                      <img src={LOTUS_DIVIDER} alt="" decoding="async" loading="lazy" />
                    </div>
                  ) : (
                    <div className="farman-inter" aria-hidden="true">
                      <svg width="88" height="18" viewBox="0 0 88 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id={`fgl-${event.event_id}`} x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="rgba(216,169,87,0)"></stop>
                            <stop offset="100%" stopColor="rgba(216,169,87,.48)"></stop>
                          </linearGradient>
                          <linearGradient id={`fgr-${event.event_id}`} x1="56" y1="0" x2="88" y2="0" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="rgba(216,169,87,.48)"></stop>
                            <stop offset="100%" stopColor="rgba(216,169,87,0)"></stop>
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="9" x2="32" y2="9" stroke={`url(#fgl-${event.event_id})`} strokeWidth="1"></line>
                        <circle cx="37" cy="9" r="1.8" fill="rgba(216,169,87,.38)"></circle>
                        <circle cx="44" cy="9" r="3.2" fill="rgba(216,169,87,.58)"></circle>
                        <circle cx="51" cy="9" r="1.8" fill="rgba(216,169,87,.38)"></circle>
                        <line x1="56" y1="9" x2="88" y2="9" stroke={`url(#fgr-${event.event_id})`} strokeWidth="1"></line>
                      </svg>
                    </div>
                  )
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-[#4f5348] italic font-serif">
          <p className="text-xl">Event details will be shared soon.</p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------
// MAIN INVITATION TEMPLATE
// ---------------------------------------------------------
export default function RoyalInvitesTemplate({ wedding, guest, skipEnvelope = false }: TemplateProps) {
  const [showEnvelope, setShowEnvelope] = useState(!skipEnvelope);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>("default");
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (showEnvelope) return;
    const timer = setTimeout(() => {
      const c = containerRef.current;
      if (c && c.scrollTop < 50) {
        const start = c.scrollTop;
        const target = window.innerHeight * 0.3;
        const distance = target - start;
        const duration = 2500;
        let st: number | null = null;
        const anim = (t: number) => {
          if (st === null) st = t;
          const elapsed = t - st;
          const p = Math.min(elapsed / duration, 1);
          const ease = p < 0.5 ? 4 * p ** 3 : 1 - Math.pow(-2 * p + 2, 3) / 2;
          c.scrollTop = start + distance * ease;
          if (elapsed < duration) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [showEnvelope]);

  const groomName = wedding.couple.groom || "Arjun";
  const brideName = wedding.couple.bride || "Meera";
  const bestComplimentsLines = wedding.couple.blessing_families?.length
    ? wedding.couple.blessing_families
    : ["Smt. Kamlaben & Shri Nareshbhai Sharma", "Smt. Induben & Shri Bhaveshbhai Patel"];
  const loveNames = wedding.couple.signoff_names?.length
    ? wedding.couple.signoff_names.join(" · ")
    : "Riya · Karan · Priti";

  return (
    <>
      <audio ref={audioRef} src={wedding.assets.audio_url || "https://n7kwk6h7z8gkdqba.public.blob.vercel-storage.com/intro-audio.mp3"} loop playsInline muted={isMuted} />
      <AnimatePresence>
        {showEnvelope && <Envelope key="envelope" onOpen={() => setShowEnvelope(false)} audioRef={audioRef} />}
      </AnimatePresence>

      <AmbientBackground currentTheme={currentTheme} customParticleUrl={wedding.assets.ambient_particle_url} />

      <motion.div
        ref={containerRef}
        className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#fae9ec]"
        initial={{ opacity: 0 }}
        animate={!showEnvelope ? { opacity: 1 } : { opacity: 0, pointerEvents: "none" }}
        transition={{ duration: 0.8 }}
        onScroll={(e) => {
          if ((e.target as HTMLElement).scrollTop < 500 && currentTheme !== "default") setCurrentTheme("default");
        }}
      >
        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3 pointer-events-none">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 rounded-full bg-[#fdfbf7] shadow-lg border border-[#e5d9c5] flex items-center justify-center hover:scale-105 transition-all relative pointer-events-auto cursor-pointer"
            title={isMuted ? "Unmute Music" : "Mute Music"}
          >
            <img src={MUSIC_ICON} alt="Music" className="w-6 h-6 object-contain" />
            {isMuted && <div className="absolute w-8 h-[2px] bg-[#863745] rotate-45" />}
          </button>
          <a href="#events" className="w-14 h-14 rounded-full bg-[#fdfbf7] shadow-lg border border-[#e5d9c5] flex items-center justify-center hover:scale-105 transition-transform pointer-events-auto" title="View Events">
            <img src={COMPASS_ICON} alt="Menu" className="w-full h-full object-contain scale-110" />
          </a>
        </div>

        {/* Hero / Arch Invite */}
        <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center py-4 bg-cover bg-center bg-no-repeat overflow-hidden" id="invite" style={{ backgroundImage: `url('${PANEL_BG}')` }}>
          <style dangerouslySetInnerHTML={{
            __html: `
            .arch-container { width: 125vw; max-width: 850px; flex-shrink: 0; }
            .font-div-blessings { font-size: 0.85rem; }
            .font-div-name-g { font-size: 3.4rem; }
            .font-div-name-b { font-size: 2.9rem; }
            .font-div-parents { font-size: 0.8rem; }
            .font-div-invite-label { font-size: 0.85rem; }
            .font-div-guest-target { font-size: 1.4rem; }
            .font-div-date-stamp { font-size: 1.9rem; }
            .btn-div-cta { padding: 12px 40px; font-size: 0.8rem; }
            .safe-zone-content { gap: 1rem; }
            @media (min-width: 385px) and (max-width: 640px) {
              .arch-container { width: 95vw !important; }
              .font-div-blessings { font-size: calc(0.75rem + 0.5vw) !important; }
              .font-div-name-g { font-size: calc(2.6rem + 1vw) !important; }
              .font-div-name-b { font-size: calc(2.2rem + 1vw) !important; }
              .font-div-parents { font-size: calc(0.68rem + 0.4vw) !important; }
              .font-div-invite-label { font-size: calc(0.72rem + 0.4vw) !important; }
              .font-div-guest-target { font-size: calc(1.15rem + 0.6vw) !important; }
              .font-div-date-stamp { font-size: calc(1.6rem + 0.8vw) !important; }
              .btn-div-cta { padding: 10px 36px !important; font-size: calc(0.72rem + 0.3vw) !important; }
              .safe-zone-content { gap: 0.5rem !important; padding-top: 4% !important; }
            }
            @media (min-width: 641px) {
              .arch-container { width: 95vw !important; max-width: 850px !important; }
              .font-div-blessings { font-size: 1.15rem; }
              .font-div-name-g { font-size: 4.8rem; }
              .font-div-name-b { font-size: 4rem; }
              .font-div-parents { font-size: 1.05rem; }
              .font-div-invite-label { font-size: 1.05rem; }
              .font-div-guest-target { font-size: 2rem; }
              .font-div-date-stamp { font-size: 2.6rem; }
              .btn-div-cta { padding: 16px 52px; font-size: 0.95rem; }
              .safe-zone-content { gap: 1.5rem; }
            }
          `}} />

          <div className="arch-container relative aspect-[1/1.65] drop-shadow-2xl shrink-0">
            <img src={ARCH_BG} alt="Floral Arch" className="absolute inset-0 w-full h-full object-fill z-10 pointer-events-none" />
            <motion.div
              className="absolute z-20 flex flex-col items-center justify-center text-center"
              style={{ top: "28.5%", bottom: "23%", left: "16%", right: "16%" }}
              initial={{ opacity: 0, y: 20 }} animate={!showEnvelope ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 0.5 }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center safe-zone-content">
                <p className="font-serif italic text-[#4f5348] font-div-blessings leading-tight m-0">
                  {(wedding.religious_header || "With the blessings of the divine\nand the love of our families").split("\n").map((line, i) => (
                    <span key={i}>{i > 0 && <br />}{line}</span>
                  ))}
                </p>

                <div className="w-[65%] h-[1px] bg-[#d8c29d] opacity-40" />

                <div className="flex flex-col items-center leading-none">
                  <h1 className="font-imperial italic font-div-name-g text-[#c79b4a] mb-0.5">{groomName}</h1>
                  <h1 className="font-imperial italic font-div-name-b text-[#c79b4a]">&amp; {brideName}</h1>
                </div>

                <div className="w-[65%] h-[1px] bg-[#d8c29d] opacity-40" />

                <div className="space-y-0.5 text-center w-full">
                  {wedding.couple.bride_parents && (
                    <p className="font-serif text-[#4f5348] font-div-parents italic leading-tight m-0">{wedding.couple.bride_parents}</p>
                  )}
                  {wedding.couple.groom_parents && (
                    <p className="font-serif text-[#4f5348] font-div-parents italic leading-tight m-0">{wedding.couple.groom_parents}</p>
                  )}
                </div>

                {guest?.name ? (
                  <div className="flex flex-col items-center text-center">
                    <p className="font-serif text-[#4f5348] font-div-invite-label italic m-0">cordially invite</p>
                    <span className="block font-serif font-bold font-div-guest-target text-[#8b1a1a] mt-0.5 leading-tight">{guest.name}</span>
                    <p className="font-serif text-[#4f5348] font-div-invite-label italic mt-0.5 m-0">
                      to celebrate their {wedding.occasion_label || "wedding"}
                    </p>
                  </div>
                ) : (
                  <p className="font-serif text-[#4f5348] font-div-invite-label italic m-0">
                    invite you to celebrate their {wedding.occasion_label || "wedding"}
                  </p>
                )}

                <a href="#events" className="bg-[#3b4435] text-[#d8c29d] btn-div-cta tracking-[0.2em] uppercase hover:bg-[#2c3326] transition-colors z-30 shadow-md font-bold">
                  View Events
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Events Timeline */}
        <section id="events" className="relative py-20 bg-[#1e132a]">
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <p className="text-[#c79b4a] uppercase tracking-widest text-xs mb-2 font-bold">Celebration Journey</p>
              <h2 className="font-serif text-4xl text-[#fdfbf7] italic">Our Events</h2>
            </div>
            <EventTimeline events={wedding.events} guest={guest} onThemeChange={setCurrentTheme} />
          </div>
        </section>

        {/* Compliments */}
        <section className="relative py-16 bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: `url('${GARDEN_BG}')` }}>
          <div className="container max-w-2xl mx-auto px-4 text-center relative z-10">
            <motion.div className="bg-[#fdfbf7]/85 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-[#e5d9c5] shadow-lg max-w-xl mx-auto"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-px w-10 bg-[#d8c29d]" /><span className="text-[#c79b4a] text-lg">✦</span><div className="h-px w-10 bg-[#d8c29d]" />
              </div>
              <div className="space-y-6">
                <div>
                  <p className="font-serif text-[#7a5c3a] text-xs uppercase tracking-widest mb-2 font-bold">With Best Compliments</p>
                  <p className="font-serif text-[#4f5348] text-sm md:text-base leading-relaxed italic">
                    {bestComplimentsLines.map((line, i) => (<span key={i}>{i > 0 && <br />}{line}</span>))}
                  </p>
                </div>
                <div>
                  <p className="font-serif text-[#7a5c3a] text-xs uppercase tracking-widest mb-2 font-bold">With Love</p>
                  <p className="font-serif text-[#4f5348] text-sm md:text-base italic">{loveNames}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className="h-px w-10 bg-[#d8c29d]" /><span className="text-[#c79b4a] text-lg">✦</span><div className="h-px w-10 bg-[#d8c29d]" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Blessings strip */}
        <section className="relative py-10 bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: `url('${GARDEN_BG}')` }}>
          <div className="container max-w-2xl mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#c79b4a]" /><span className="text-[#c79b4a] text-sm">✦</span><div className="h-px w-12 bg-gradient-to-l from-transparent to-[#c79b4a]" />
              </div>
              <p className="font-serif text-[#863745] text-lg italic tracking-wide">Your Blessings are the Only Gift We Desire</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#c79b4a]" /><span className="text-[#c79b4a] text-sm">✦</span><div className="h-px w-12 bg-gradient-to-l from-transparent to-[#c79b4a]" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#2c1a0e] pt-8 pb-20 relative overflow-hidden">
          <img src={PEACOCK} alt="" className="absolute right-0 bottom-0 w-32 md:w-48 opacity-10 pointer-events-none select-none" />
          <img src={PEACOCK} alt="" className="absolute left-0 bottom-0 w-32 md:w-48 opacity-10 pointer-events-none select-none" style={{ transform: "scaleX(-1)" }} />
          <div className="text-center relative z-10 flex flex-col items-center gap-3">
            <img src={MENU_BG} alt={`${groomName} & ${brideName}`} className="w-28 h-28 md:w-40 md:h-40 object-contain opacity-90 drop-shadow-lg" />
            <p className="font-serif text-[#e8b4b8]/70 text-sm tracking-widest">{brideName} &amp; {groomName}</p>
            <p className="font-serif text-[#c79b4a]/50 text-xs tracking-widest uppercase">With Love &amp; Joy</p>
          </div>
        </footer>
      </motion.div>
    </>
  );
}
