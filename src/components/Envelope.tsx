"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Fallback assets if none provided via props
const DEFAULT_VIDEO = "https://n7kwk6h7z8gkdqba.public.blob.vercel-storage.com/intro.mp4";
const DEFAULT_BG = "https://n7kwk6h7z8gkdqba.public.blob.vercel-storage.com/bg.png";

interface EnvelopeProps {
  onOpen: () => void;
  isMuted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  introVideo?: string;  // overrides default — set from wedding.assets.intro_video
  introBg?: string;     // overrides default — set from wedding.assets.intro_bg
}

const Envelope = ({
  onOpen,
  isMuted = false,
  onMuteChange,
  audioRef,
  introVideo,
  introBg,
}: EnvelopeProps) => {
  const videoSrc = introVideo || DEFAULT_VIDEO;
  const bgSrc = introBg || DEFAULT_BG;

  const [phase, setPhase] = useState<"idle" | "playing" | "fallback">("idle");
  const [loadFailed, setLoadFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasOpenedRef = useRef(false);

  const triggerOpen = useCallback(() => {
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    onOpen();
  }, [onOpen]);

  // Auto-skip after 16 s for users who never interact
  useEffect(() => {
    const skip = setTimeout(triggerOpen, 16000);
    return () => clearTimeout(skip);
  }, [triggerOpen]);

  // Attempt unmuted play on mount (works on most desktop browsers)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      // Autoplay blocked — show tap-to-open fallback
      setPhase("fallback");
    });
  }, []);

  const startVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.currentTime = 0;
    v.play().then(() => setPhase("playing")).catch(() => setPhase("fallback"));

    // Start background audio on explicit user gesture
    if (audioRef?.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    }
  }, [audioRef]);

  const handleScreenTap = () => {
    if (phase === "fallback") {
      startVideo();
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMuteChange?.(!isMuted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f0f] cursor-pointer select-none" onClick={handleScreenTap}>
      {/* Video layer — always mounted so browser can buffer */}
      <video
        ref={videoRef}
        src={videoSrc}
        className={`w-full h-full object-cover transition-opacity duration-700 ${phase === "playing" ? "opacity-100" : "opacity-0"}`}
        playsInline
        muted
        preload="auto"
        onPlaying={() => setPhase("playing")}
        onEnded={triggerOpen}
        onError={() => { setLoadFailed(true); setPhase("fallback"); }}
      />

      {/* ==== Fallback / idle UI ==== */}
      <AnimatePresence>
        {(phase === "idle" || phase === "fallback") && (
          <motion.div
            key="fallback"
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Background image */}
            <img
              src={bgSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Tap prompt */}
            <motion.div
              className="relative z-10 flex flex-col items-center gap-6 text-center px-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {/* Envelope icon */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full border-2 border-white/60 flex items-center justify-center backdrop-blur-sm bg-white/10"
              >
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </motion.div>

              <div>
                <p className="text-white/70 text-sm tracking-[0.2em] uppercase font-light mb-1">You've received an invitation</p>
                <p className="text-white text-xl tracking-widest font-light">Tap to Open</p>
              </div>

              <motion.button
                onClick={(e) => { e.stopPropagation(); startVideo(); }}
                className="mt-2 px-8 py-3 rounded-full border border-white/50 text-white text-sm tracking-widest font-light backdrop-blur-sm hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                OPEN INVITATION
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute toggle (always visible) */}
      <motion.button
        onClick={handleMuteToggle}
        className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </motion.button>

      {/* Skip button after 3 s */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        onClick={(e) => { e.stopPropagation(); triggerOpen(); }}
        className="fixed top-6 right-6 z-50 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs tracking-widest backdrop-blur-sm transition-all"
      >
        SKIP →
      </motion.button>
    </div>
  );
};

export default Envelope;
