"use client";

/**
 * TEMPLATE 1: SaloniJay_v1 (Elegant Indian Wedding)
 * Refactored for 100% exact UI fidelity based on elegant-invite.
 * Accepts `WeddingData` via props.
 */

import React, { useEffect, useState, useRef, useImperativeHandle, useMemo } from "react";
import { motion } from "framer-motion";
import { WeddingData, Guest } from "@/lib/types";
import Envelope from "@/components/Envelope"; // Wait, I will use a shared one but identical
import { RenderCustomText } from "@/components/RenderCustomText";
import { AmbientBackground, ThemeType } from "@/components/TemplateAmbientBackground";

export type { ThemeType };

interface TemplateProps {
  wedding: WeddingData;
  guest?: Guest | null;
  skipEnvelope?: boolean;
}


// ---------------------------------------------------------
// EVENT TIMELINE
// ---------------------------------------------------------
const getTitleStyles = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('mandap') || t.includes('muhurat')) return 'bg-[#f74862] text-white';
  if (t.includes('mameru')) return 'bg-[#9d56f5] text-white';
  if (t.includes('haldi')) return 'bg-[#FACC15] text-white'; 
  if (t.includes('bhakti')) return 'bg-[#6a9dfc] text-white';
  if (t.includes('jaan') || t.includes('wedding') || t.includes('hast melap')) {
    return 'bg-gradient-to-r from-[#FACC15] to-[#E11D48] text-white';
  }
  return 'bg-[#0c0f4a] text-[#FDFBF7]'; 
};

// This wrapper handles the card animation and flip logic exactly like elegant-invite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EventCard = React.forwardRef(function EventCard(
  { event, guestCountSuffix, onUserInteraction, eventSeats, customNote }: 
  { event: WeddingData['events'][0]; guestCountSuffix: string | null; onUserInteraction: (id: string) => void; eventSeats?: number; customNote?: string; },
  ref: React.Ref<any>
) {
  const [isFlipped, setIsFlipped] = useState(false);
  const noteText = customNote?.trim();
  const seatCountText = typeof eventSeats === 'number'
    ? `${eventSeats} ${eventSeats === 1 ? 'seat' : 'seats'} reserved`
    : null;
  
  useImperativeHandle(ref, () => ({
    setFlippedState: (val: boolean) => setIsFlipped(val),
  }), []);
  
  const isMameru = event.event_name.toLowerCase().includes('mameru');

  const handleVenueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.maps_url) window.open(event.maps_url, '_blank');
  };

  const [venueName, ...venueAddressParts] = event.location_details ? event.location_details.split(',') : ["", ""];
  const venueAddress = venueAddressParts.join(',').trim();

  return (
    <motion.div
      className={`${isMameru ? 'w-80 h-[32rem] md:w-96 md:h-[32rem]' : 'w-80 h-[30rem] md:w-96 md:h-[30rem]'} z-10 cursor-pointer`}
      onClick={() => { setIsFlipped(!isFlipped); onUserInteraction(event.event_id); }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          className="absolute w-full h-full bg-cream rounded-lg overflow-hidden invitation-shadow"
          style={{ backfaceVisibility: "hidden" }}
        >
          {event.image_url ? (
            <img src={event.image_url} alt={event.event_name} className="w-full h-full object-cover object-bottom" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gold/20 to-sage/20 flex items-center justify-center">
              <p className="text-center text-muted-foreground font-display text-xl">{event.event_name}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="absolute w-full h-full bg-cream rounded-lg p-6 invitation-shadow flex flex-col overflow-y-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex flex-col items-center justify-center mb-4">
            <span className="font-display text-black text-md mb-1">{event.date_display}</span>
            <div className="text-black text-md font-display font-bold">{event.time_display}</div>
          </div>
          
          <div className="flex justify-center mb-3">
            <motion.h3 
              className={`font-display text-xl md:text-2xl px-6 py-2 rounded-full shadow-sm text-center ${getTitleStyles(event.event_name)}`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {event.event_name}
            </motion.h3>
          </div>
          
          <div className="font-body text-black leading-snug text-base flex-grow text-center flex flex-col justify-center">
             {(typeof event.description === 'string' ? event.description : '').split('\n').map((line, i) => {
               const trimmed = line.trim();
               if (trimmed.toLowerCase().includes('dinner') && trimmed.includes('-')) {
                  const [timePart, labelPart] = trimmed.split('-');
                  return (
                      <p key={i} className="mt-1 flex items-baseline justify-center gap-2">
                          <span className="lining-nums">{timePart.trim()}</span>
                          <span className="not-italic font-sans" style={{ fontStyle: "normal" }}>-</span>
                          <span>{labelPart.trim()}</span>
                      </p>
                  );
               }
               return <p key={i} className={i > 0 ? "mt-1" : ""}>{trimmed}</p>;
             })}
          </div>

          {seatCountText && (
            <div className="mt-3 mb-2 text-center">
              <span className="block text-yellow-600 font-display text-sm">looking forward to welcome</span>
              <span className="block text-yellow-600 font-display text-sm mt-1 font-bold">{seatCountText}</span>
            </div>
          )}

          {noteText && (
            <div className="mt-3 mb-2 px-3 py-2 bg-gold/10 rounded border border-gold/30 text-center">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-sage-dark/70 font-semibold font-body not-italic">Personal note</span>
              <span className="block text-sage-dark font-body text-xs italic mt-1">{noteText}</span>
            </div>
          )}

          {event.location_details && (
            <div className="w-full flex flex-col items-center gap-1 font-body text-sage-dark italic border-t border-sage/20 pt-3 mt-auto">
              <motion.button
                onClick={handleVenueClick}
                className="w-full flex flex-col items-center gap-1 hover:text-gold transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex items-center gap-1 text-center leading-tight">
                    <span className="text-xl">📍</span>
                    <span className="text-lg font-bold font-display not-italic">{venueName}</span>
                </div>
                {venueAddress && <span className="text-sm opacity-90 font-semibold font-body italic">{venueAddress}</span>}
              </motion.button>
              <div className="text-center font-body text-sm text-sage-dark italic -mt-2 pt-0">
                <p>(Tap Above for the Google Maps.)</p>
                {event.parking_note && <p className="mt-2 text-sm opacity-90 font-semibold font-body italic">({event.parking_note})</p>}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
});
EventCard.displayName = 'EventCard';

const EventTimeline = ({ events, filteredEventIds, guestCountText, onThemeChange, onParticleChange, occasionLabel, guest }: 
  { events: WeddingData['events']; filteredEventIds?: string[]; guestCountText?: string; onThemeChange: (t: ThemeType) => void; onParticleChange?: (url: string | undefined) => void; occasionLabel?: string; guest?: Guest | null }) => {
  
  // Map ambient_effect to ThemeType for AmbientBackground rendering
  const getThemeFromAmbientEffect = (effect?: string | null): ThemeType => {
    switch (effect) {
      case 'petals': return 'mayra';
      case 'lights': return 'bhakti';
      case 'rice_roses': return 'wedding';
      case 'stars': return 'reception';
      case 'none': return 'default';
      default: return 'default';
    }
  };

  // Fallback to derived theme for backward compatibility
  const getThemeForGroup = (groupTitle: string): ThemeType => {
    const t = groupTitle.toLowerCase();
    if (t.includes('mandap') || t.includes('mameru') || t.includes('haldi') || t.includes('mehendi')) return 'mayra';
    if (t.includes('bhakti') || t.includes('sandhya')) return 'bhakti';
    if (t.includes('wedding') || t.includes('hast') || t.includes('jaan')) return 'wedding';
    if (t.includes('reception')) return 'reception';
    return 'default';
  };

  const getGuestEventSeats = (event: WeddingData['events'][0]): number | undefined => {
    if (!guest) return undefined;
    const seats = guest.event_seats?.[event.event_id];
    if (typeof seats === 'number') return seats;
    if (guest.event_seats && Object.keys(guest.event_seats).length > 0) return 0;
    return guest.invited_events?.includes(event.event_id) ? 1 : undefined;
  };

  const visibleGroups = useMemo(() => {
    // Priority: If guest exists with event_seats or invited_events, filter by that. Otherwise use filteredEventIds (legacy)
    let allFiltered: WeddingData['events'];
    
    if (guest && (guest.event_seats || guest.invited_events?.length)) {
      allFiltered = events.filter(event => {
        const seatCount = getGuestEventSeats(event);
        return seatCount !== undefined && seatCount > 0;
      });
    } else if (filteredEventIds && filteredEventIds.length > 0) {
      // Legacy fallback: use invited_events array if present
      allFiltered = events.filter(e => filteredEventIds.includes(e.event_id));
    } else {
      // No filtering - show all events
      allFiltered = events;
    }
    
    const groups: { title: string; events: WeddingData['events'] }[] = [];
    
    allFiltered.forEach(event => {
      const groupTitle = event.event_group?.trim() || event.event_name.trim();
      
      if (groups.length > 0 && groups[groups.length - 1].title.toLowerCase() === groupTitle.toLowerCase()) {
        groups[groups.length - 1].events.push(event);
      } else {
        groups.push({ title: groupTitle, events: [event] });
      }
    });

    return groups;
  }, [events, filteredEventIds, guest]);

  const elementRefs = useRef<Record<string, HTMLElement | null>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardApiRefs = useRef<Record<string, React.RefObject<any>>>({});
  const lastInteractionRef = useRef<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const intersectionRatiosRef = useRef<Record<string, number>>({});
  const activeCardIdRef = useRef<string | null>(null);
  const eventMapRef = useRef<Record<string, WeddingData['events'][0]>>({});

  const handleUserInteraction = (id: string) => { lastInteractionRef.current[id] = Date.now(); };

  useEffect(() => {
    // Build event map for quick lookup
    const newEventMap: typeof eventMapRef.current = {};
    visibleGroups.forEach(group => {
      group.events.forEach(event => {
        newEventMap[event.event_id] = event;
      });
    });
    eventMapRef.current = newEventMap;
  }, [visibleGroups]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const idStr = (entry.target as HTMLElement).dataset.eventId;
        if (idStr) intersectionRatiosRef.current[idStr] = entry.intersectionRatio;
      });

      let bestId: string | null = null;
      let maxRatio = 0;
      Object.entries(intersectionRatiosRef.current).forEach(([idStr, ratio]) => {
        if (ratio > maxRatio) { maxRatio = ratio; bestId = idStr; }
      });
      if (maxRatio < 0.4) bestId = null;

      // Update theme + particle based on currently visible event
      if (bestId !== null && eventMapRef.current[bestId]) {
        const event = eventMapRef.current[bestId];
        const theme = getThemeFromAmbientEffect(event.ambient_effect);
        onThemeChange(theme);
        onParticleChange?.(event.particle_image_url || undefined);
      }

      if (activeCardIdRef.current !== bestId) {
        const prevId = activeCardIdRef.current;
        activeCardIdRef.current = bestId;

        if (prevId !== null) {
          const prevApi = cardApiRefs.current[prevId]?.current;
          clearTimeout(timersRef.current[prevId]);
          if (prevApi) timersRef.current[prevId] = setTimeout(() => { prevApi.setFlippedState(false); }, 600);
        }

        if (bestId !== null) {
          const nextApi = cardApiRefs.current[bestId]?.current;
          clearTimeout(timersRef.current[bestId]);
          if (nextApi) {
            timersRef.current[bestId] = setTimeout(() => {
              const lastInt = lastInteractionRef.current[bestId!] || 0;
              if (Date.now() - lastInt > 2000) nextApi.setFlippedState(true);
            }, 4000);
          }
        }
      }
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });

    Object.values(elementRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => { observer.disconnect(); Object.values(timersRef.current).forEach(clearTimeout); };
  }, [visibleGroups, getThemeFromAmbientEffect, onThemeChange, onParticleChange]);

  return (
    <div className="relative">
      {visibleGroups.length > 0 ? (
        visibleGroups.map((group, groupIndex) => (
          <motion.div 
            key={groupIndex} 
            className="pt-0 pb-20 md:pt-4 md:pb-32 relative overflow-hidden"
            viewport={{ amount: 0.3 }}
          >
            <div className="relative z-10 w-full flex flex-col items-center">
              <motion.h3 
                className={`text-center font-display text-2xl md:text-3xl mb-8 transition-colors duration-500 ${
                  getThemeForGroup(group.title) === 'reception' ? 'text-white' : 'text-foreground'
                }`}
                initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              >
                {group.title}
              </motion.h3>

              <div className="relative w-full max-w-4xl mx-auto px-6 flex flex-col items-center">
                <div className="space-y-12 md:space-y-20 w-full flex flex-col items-center">
                  {group.events.map((event, eventIndex) => {
                    if (!cardApiRefs.current[event.event_id]) cardApiRefs.current[event.event_id] = React.createRef();
                    const eventSeats = getGuestEventSeats(event);
                    return (
                      <div key={event.event_id} className="w-full flex flex-col items-center">
                        <motion.div
                          className={`relative flex items-center justify-center gap-6 md:gap-0 ${
                            eventIndex % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                          }`}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: eventIndex * 0.15 }}
                        >
                          <div
                            data-event-id={event.event_id}
                            ref={(el) => { elementRefs.current[event.event_id] = el; }}
                            className={`w-80 md:w-96 z-10 relative mx-auto ${eventIndex % 2 === 0 ? "md:mr-auto" : "md:ml-auto"}`}
                          >
                            <EventCard ref={cardApiRefs.current[event.event_id]} event={event} guestCountSuffix={guestCountText || null} onUserInteraction={handleUserInteraction} eventSeats={eventSeats} customNote={guest?.custom_note} />
                            <motion.p
                              className={`text-center font-bold font-body text-sm mt-3 italic transition-colors duration-500 ${
                                  getThemeForGroup(group.title) === 'reception' ? 'text-white/60' : 'text-muted-foreground'
                              }`}
                              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
                            >
                              Tap Above to Flip
                            </motion.p>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {groupIndex < visibleGroups.length - 1 && (
              <motion.div 
                className="flex items-center justify-center gap-4 mt-20 relative z-20"
                initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="h-px w-12 bg-[#FACC15]/50" />
                <span className="text-[#FACC15] text-2xl">✦</span>
                <div className="h-px w-12 bg-[#FACC15]/50" />
              </motion.div>
            )}
          </motion.div>
        ))
      ) : (
         <div className="py-20 text-center text-muted-foreground"><p className="font-display text-xl">Event details will be shared soon.</p></div>
      )}
    </div>
  );
};


// ---------------------------------------------------------
// MAIN INVITATION CARD TEMPLATE
// ---------------------------------------------------------
export default function SaloniJayTemplate({ wedding, guest, skipEnvelope = false }: TemplateProps) {
  const [showEnvelope, setShowEnvelope] = useState(!skipEnvelope);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const [currentParticleUrl, setCurrentParticleUrl] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const logo = wedding.assets.logo_image || "/logo_sj.png";
  const heroImg = wedding.assets.hero_image || "/hero-background.jpg";

  return (
    <>
      <audio ref={audioRef} src={wedding.assets.audio_url || "/wedding-audio.mp3"} loop muted={isMuted} />
      {showEnvelope && <Envelope onOpen={() => setShowEnvelope(false)} isMuted={isMuted} onMuteChange={setIsMuted} audioRef={audioRef} introVideo={wedding.assets.intro_video} introBg={wedding.assets.intro_bg} />}
      
      <AmbientBackground currentTheme={currentTheme} customParticleUrl={currentParticleUrl ?? wedding.assets.ambient_particle_url} />

      <motion.div
        ref={containerRef}
        className="fixed inset-0 overflow-y-auto overflow-x-hidden"
        initial={{ opacity: 0 }}
        animate={!showEnvelope ? { opacity: 1 } : { opacity: 0, pointerEvents: "none" }}
        transition={{ duration: 1.2, delay: 0.8 }}
        onScroll={(e) => {
          if ((e.target as HTMLElement).scrollTop < 500 && currentTheme !== 'default') setCurrentTheme('default');
        }}
      >
        {/* Mute Button */}
        {!showEnvelope && (
          <motion.button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            )}
          </motion.button>
        )}
        
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pb-20 md:pb-24 pt-10">
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70" style={{ backgroundImage: `url(${heroImg})` }}></div>
          
          <motion.div
            className="relative z-10 text-center px-4 md:px-6 flex flex-col items-center w-full"
            initial={{ opacity: 0, y: 40 }} animate={!showEnvelope ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 1.2 }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={!showEnvelope ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 1, delay: 1.4 }} className="mb-0 md:mb-12 -mt-80 md:mt-0">
              <img src={logo} alt="Wedding Logo" className="w-64 h-64 md:w-72 md:h-72 object-contain mx-auto drop-shadow-lg" />
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={!showEnvelope ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 1, delay: 1.8 }} className="w-full text-center mt-2 md:mt-0">
              <motion.h1 
                className="font-imperial text-red-700 mb-0 tracking-wide leading-none [text-shadow:0.5px_0_0_currentColor]"
                animate={{ textShadow: ["0.5px 0 0 currentColor", "0.5px 0 0 currentColor, 0 0 15px rgba(255, 215, 0, 0.3)", "0.5px 0 0 currentColor"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="text-6xl md:text-8xl lg:text-[9rem]">{wedding.couple.bride} </span>
                <span className="text-4xl md:text-6xl lg:text-[6rem] px-2"> &  </span>
                <span className="text-6xl md:text-8xl lg:text-[9rem]"> {wedding.couple.groom} </span>
              </motion.h1>
            </motion.div>
          </motion.div>
          
          <motion.div
            className="absolute bottom-10 md:bottom-14 left-0 right-0 flex flex-col items-center justify-center gap-1 z-20"
            initial={{ opacity: 0 }} animate={!showEnvelope ? { opacity: 1, y: [0, 10, 0] } : {}} transition={{ opacity: { duration: 0.8, delay: 2.5 }, y: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 } }}
          >
            <motion.p className="text-black font-bold text-xl md:text-2xl tracking-widest uppercase" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 5, repeat: Infinity }}>
              Scroll for more
            </motion.p>
            <motion.svg className="w-6 h-6 md:w-8 md:h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" animate={{ y: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </motion.svg>
          </motion.div>
        </section>
        
        {/* Family Blessing Section */}
        <section className="relative bg-white/90 backdrop-blur-sm py-16 md:py-24 overflow-hidden transition-colors duration-700">
          <div className="container max-w-3xl mx-auto px-2 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              {wedding.religious_header && (
                <motion.p 
                  className={`font-display font-bold tracking-widest mb-8 leading-loose uppercase ${wedding.religious_header_style?.color || "text-sage-dark/80"} ${wedding.religious_header_style?.fontSize || "text-xs md:text-sm"}`}
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}
                >
                  {wedding.religious_header}
                </motion.p>
              )}

              <RenderCustomText 
                data={wedding.theme_texts?.blessing_intro}
                defaultText="With the divine grace & blessings of,"
                className="mb-2"
                delay={0.4}
              />
              <div className="mb-4">
                {wedding.couple.blessing_families?.map((fam, i) => (
                  <span key={i} className="block font-body text-xl md:text-2xl text-black italic font-bold leading-relaxed">{fam}</span>
                ))}
              </div>
              <RenderCustomText 
                data={wedding.theme_texts?.main_invite}
                defaultText="we warmly seek your gracious presence and blessings as we celebrate the union of two hearts and families."
                className="mb-10"
                delay={0.45}
              />
              
              <motion.div className="font-body text-xl md:text-2xl text-black mb-4" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5 }}>
                {guest?.name ? (
                  <>
                    <span className="block">We cordially invite <span className="font-display font-bold text-1xl md:text-2xl text-sage-dark">{guest.name}</span></span>
                  </>
                ) : (
                  <span className="block">We cordially invite <span className="font-display font-bold text-sage-dark">You</span></span>
                )}
              </motion.div>

              <p className="font-body text-xl md:text-2xl text-black leading-relaxed mb-3 max-w-xl mx-auto italic">to grace the {wedding.occasion_label || "wedding ceremony"} of</p>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.6 }} className="mb-6">
                {wedding.couple.bride_parents && <p className="font-body font-black text-base md:text-base uppercase tracking-wide mb-1">({wedding.couple.bride_parents})</p>}
                <h2 className="font-imperial text-7xl md:text-7xl text-gold mb-0 tracking-wide leading-none">{wedding.couple.bride}</h2>
                <div className="my-2"><span className="font-display text-5xl text-sage-dark/60">&</span></div>
                <h2 className="font-imperial text-7xl md:text-7xl text-gold mb-3 tracking-wide leading-none">{wedding.couple.groom}</h2>
                {wedding.couple.groom_parents && <p className="font-body font-black text-base md:text-base uppercase tracking-wide mt-2 mb-2">({wedding.couple.groom_parents})</p>}
              </motion.div>

              <RenderCustomText 
                data={wedding.theme_texts?.closing_message}
                defaultText="As they embark on their journey of love and togetherness, your presence will make their special day even more memorable."
                className="mt-4 mb-10"
                delay={0.7}
              />

              {wedding.couple.signoff_names && (
                <motion.div className="border-t border-gold/30 pt-8 mt-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.8 }}>
                  <p className="font-display text-sage-dark text-sm mb-1">With Best Compliments</p>
                  <p className="font-display text-gold text-lg md:text-base font-bold">
                    {wedding.couple.signoff_names.map((n, i) => <span key={i} className="block">{n}</span>)}
                  </p>
                </motion.div>
              )}
              
              <motion.div className="flex items-center justify-center gap-4 mt-6" initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.9 }}>
                <div className="h-px w-16 md:w-24 bg-gold/50" />
                <span className="text-gold text-xl">✦</span>
                <div className="h-px w-16 md:w-24 bg-gold/50" />
              </motion.div>
            </motion.div>
          </div>
        </section>
        
        {/* Timeline Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="container max-w-4xl mx-auto px-6 relative z-10">
             <div className="text-center mb-2">
                <h2 className={`font-display text-3xl md:text-5xl mb-2 transition-colors duration-500 ${currentTheme === 'reception' ? 'text-white' : 'text-foreground'}`}>
                  {wedding.occasion_label || "the celebration"}
                </h2>
             </div>
             <EventTimeline events={wedding.events} filteredEventIds={guest?.invited_events} onThemeChange={setCurrentTheme} onParticleChange={setCurrentParticleUrl} occasionLabel={wedding.occasion_label} guest={guest} />
          </div>
        </section>

        {/* Additional Details Section */}
        <section className="relative bg-cream-light paper-texture py-8 md:py-8 overflow-hidden">
          <div className="container max-w-2xl mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <motion.div className="flex items-center justify-center gap-3 mt-6" initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.35 }}>
                <div className="h-px w-12 md:w-20 bg-gold/50" /><span className="text-gold text-xl">✦</span><div className="h-px w-12 md:w-20 bg-gold/50" />
              </motion.div>
              <div className="font-body font-black text-lg text-black leading-relaxed my-4">
                <p>Your Blessings are the Only Gift We Desire</p>
              </div>
              <motion.div className="flex items-center justify-center gap-3" initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.35 }}>
                <div className="h-px w-12 md:w-20 bg-gold/50" /><span className="text-gold text-xl">✦</span><div className="h-px w-12 md:w-20 bg-gold/50" />
              </motion.div>
            </motion.div>
          </div>
        </section>
        
        {/* Footer Section */}
        <footer className="bg-sage pt-4 pb-12 md:pt-6 md:pb-16 relative overflow-hidden">
          <div className="text-center relative z-10 flex flex-col items-center">
            <img src={logo} alt="Wedding Logo" className="w-56 h-56 md:w-74 md:h-74 object-contain mb-4 opacity-90 drop-shadow-md" />
            <p className="font-body text-cream-light/70 text-sm">{wedding.couple.bride} & {wedding.couple.groom}</p>
          </div>
        </footer>

      </motion.div>
    </>
  );
}
