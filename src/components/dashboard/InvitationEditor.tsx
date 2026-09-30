"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Share2, Globe, Palette, PencilLine, Calendar,
  Music, Image, Plus, Trash2, ChevronDown, ArrowUp, ArrowDown,
  ChevronUp, Sparkles, CheckCircle2, Type, Settings2,
} from "lucide-react";
import { useWedding } from "@/contexts/WeddingContext";
import TemplatePicker from "./TemplatePicker";
import PhonePreview from "./PhonePreview";
import ImageUploader from "./ImageUploader";
import { WeddingData, WeddingEvent } from "@/lib/types";

// ---------- Small helpers ----------
function SectionCard({ title, icon: Icon, children, accent = "gold" }: {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
  accent?: "gold" | "rose";
}) {
  const color = accent === "gold" ? "hsl(43,75%,50%)" : "hsl(347,80%,60%)";
  return (
    <div className="rounded-2xl border border-[#E8E0D8] bg-white overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E8E0D8]/60"
        style={{ background: "linear-gradient(to right, #FDFBF7, #fff)" }}>
        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
        <h3 className="font-sans font-semibold text-sm text-[hsl(25,30%,12%)]">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-sans text-xs font-semibold mb-1" style={{ color: "hsl(43,75%,40%)" }}>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 font-sans text-sm text-[hsl(25,30%,12%)] outline-none transition-all focus:border-[hsl(43,75%,50%)] focus:ring-2 focus:ring-[hsl(43,75%,50%)]/15 placeholder:text-[hsl(25,10%,65%)]"
    />
  );
}

function Toggle({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#E8E0D8] px-4 py-3 hover:bg-[#FDFBF7] transition-colors">
      <div className="flex-1 mr-3">
        <p className="font-sans text-sm font-medium text-[hsl(25,30%,12%)]">{label}</p>
        {hint && <p className="font-sans text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none"
        style={{ background: checked ? "hsl(43,75%,50%)" : "#E2E8F0" }}
      >
        <span
          className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0px)" }}
        />
      </button>
    </div>
  );
}


function EventsEditor({ wedding, updateEvent, addEvent, removeEvent, moveEvent, updateEventAmbientEffect, revertEventDescriptionToDefault }: {
  wedding: WeddingData;
  updateEvent: (id: string, field: keyof WeddingEvent, val: string) => void;
  addEvent: () => void;
  removeEvent: (id: string) => void;
  moveEvent: (id: string, direction: "up" | "down") => void;
  updateEventAmbientEffect?: (eventId: string, effect: 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none') => void;
  revertEventDescriptionToDefault?: (eventId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(wedding.events[0]?.event_id ?? null);

  return (
    <div className="space-y-2">
      {wedding.events.map((event, idx) => (
        <div key={event.event_id} className="rounded-xl border border-[#E8E0D8] overflow-hidden">
          {/* Accordion header */}
          <div
            onClick={() => setExpandedId(expandedId === event.event_id ? null : event.event_id)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#FDFBF7] hover:bg-[#F5EFE6] transition-colors text-left cursor-pointer"
          >
            <span className="font-sans text-xs font-semibold text-[hsl(25,30%,12%)]">
              Event {idx + 1}: {event.event_name || "Untitled"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveEvent(event.event_id, "up"); }}
                className="p-1 rounded-full hover:bg-black/5 transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={idx === 0}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveEvent(event.event_id, "down"); }}
                className="p-1 rounded-full hover:bg-black/5 transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={idx === wedding.events.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeEvent(event.event_id); }}
                className="p-1 ml-1 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {expandedId === event.event_id ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              )}
            </div>
          </div>

          {/* Expanded fields */}
          <AnimatePresence>
            {expandedId === event.event_id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-2 border-t border-[#E8E0D8]">
                  <div>
                    <Label>Group Title / Main Header (Optional)</Label>
                    <TextInput value={event.event_group || ""} onChange={(v) => updateEvent(event.event_id, "event_group", v)} placeholder="e.g. Sangeet or Wedding Day" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Sub-Event Name</Label>
                      <TextInput value={event.event_name} onChange={(v) => updateEvent(event.event_id, "event_name", v)} placeholder="e.g. Mehndi" />
                    </div>
                    <div>
                      <Label>Time Display</Label>
                      <TextInput value={event.time_display} onChange={(v) => updateEvent(event.event_id, "time_display", v)} placeholder="7:00 PM" />
                    </div>
                  </div>
                  <div>
                    <Label>Date Display</Label>
                    <TextInput value={event.date_display} onChange={(v) => updateEvent(event.event_id, "date_display", v)} placeholder="Sunday, 8th March" />
                  </div>
                  <div>
                    <Label>Venue</Label>
                    <TextInput value={event.location_details} onChange={(v) => updateEvent(event.event_id, "location_details", v)} placeholder="The Grand Palace, Mumbai" />
                  </div>
                  <div>
                    <ImageUploader
                      label="Event Cover Photo"
                      value={event.image_url || ""}
                      onUpload={(url) => updateEvent(event.event_id, "image_url", url)}
                      hint="Shown on the front of the event flip-card. PNG/JPG recommended."
                      previewHeight={120}
                    />
                  </div>
                  <div>
                    <Label>Google Maps URL</Label>
                    <TextInput value={event.maps_url} onChange={(v) => updateEvent(event.event_id, "maps_url", v)} placeholder="https://maps.google.com/..." />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <div className="flex gap-2 items-start">
                      <textarea
                        value={event.description}
                        onChange={(v) => { updateEvent(event.event_id, "description", v.target.value); }}
                        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                        className="w-full min-h-[60px] rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] p-2 font-sans text-xs text-[hsl(25,30%,12%)] outline-none transition-all focus:border-[hsl(43,75%,50%)] focus:ring-2 focus:ring-[hsl(43,75%,50%)]/15 resize-y"
                        placeholder="Event description..."
                      />
                      {revertEventDescriptionToDefault && (
                        <button
                          type="button"
                          onClick={() => revertEventDescriptionToDefault(event.event_id)}
                          className="mt-1 px-2 py-1 text-[10px] font-sans font-medium text-muted-foreground border border-[#E8E0D8] rounded hover:bg-[#F5EFE6] transition-colors whitespace-nowrap"
                          title="Revert to default description"
                        >
                          Use Default
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Background Ambient Effect</Label>
                    <select 
                      value={event.ambient_effect || "petals"}
                      onChange={(e) => updateEventAmbientEffect?.(event.event_id, e.target.value as 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none')}
                      className="w-full h-9 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-2 font-sans text-xs outline-none"
                    >
                      <option value="petals">🌼 Falling Marigolds &amp; Petals</option>
                      <option value="lights">💡 Floating Lights (Bhakti)</option>
                      <option value="rice_roses">🌹 Falling Rice &amp; Roses</option>
                      <option value="stars">⭐ Starry Night</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <ImageUploader
                      label="✨ Custom Particle Image (Optional)"
                      value={(event as any).particle_image_url || ""}
                      onUpload={(url) => updateEvent(event.event_id, "particle_image_url" as any, url)}
                      hint="Upload a PNG with transparent background (e.g. a flower, diya, rose). This replaces the default falling shapes for this event."
                      previewHeight={90}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      <button
        type="button"
        onClick={addEvent}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[#E8E0D8] text-xs font-sans font-medium text-muted-foreground hover:border-[hsl(43,75%,50%)]/40 hover:text-[hsl(43,75%,50%)] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Event
      </button>
    </div>
  );
}

// ---------- Typography Editor ----------

const FONTS = [
  { label: "Imperial Script", value: "font-imperial" },
  { label: "Pinyon Script", value: "font-elegant" },
  { label: "Cinzel", value: "font-display" },
  { label: "Cormorant Garamond", value: "font-body" },
  { label: "Playfair Display", value: "font-playfair" },
  { label: "Italianno", value: "font-italianno" },
  { label: "Montserrat", value: "font-sans" },
];

const COLORS = [
  // Brand Palette
  { label: "Gold", value: "text-gold" },
  { label: "Sage Green", value: "text-sage-dark" },
  { label: "Warm Black", value: "text-black" },
  { label: "Rose", value: "text-rose" },
  { label: "Cream", value: "text-cream-light" },
  { label: "White", value: "text-white" },
  // Standard Palette
  { label: "Slate Gray", value: "text-slate-800" },
  { label: "Dark Red", value: "text-red-800" },
  { label: "Navy Blue", value: "text-blue-900" },
  { label: "Forest Green", value: "text-green-800" },
  { label: "Deep Purple", value: "text-purple-900" },
];

const SIZES = [
  { label: "Small", value: "text-sm" },
  { label: "Standard", value: "text-base" },
  { label: "Large", value: "text-lg" },
  { label: "XL", value: "text-xl" },
  { label: "2XL", value: "text-2xl" },
  { label: "3XL", value: "text-3xl" },
  { label: "4XL", value: "text-4xl" },
  { label: "5XL", value: "text-5xl" },
];

function TextThemeEditor({ title, data, onChange, onRevert }: { title: string; data?: { text: string; fontFamily: string; fontSize: string; color: string; isItalic: boolean; isCustomized?: boolean; }; onChange: (updates: any) => void; onRevert?: () => void; }) {
  const defaultData = { text: "", fontFamily: "font-body", fontSize: "text-base", color: "text-black", isItalic: false };
  const val = data || defaultData;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[#E8E0D8] overflow-hidden">
      <div onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2.5 bg-[#FDFBF7] hover:bg-[#F5EFE6] transition-colors cursor-pointer">
        <span className="font-sans text-xs font-semibold text-[hsl(25,30%,12%)]">{title}</span>
        <div className="flex items-center gap-2">
          {onRevert && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRevert(); }}
              className="px-2 py-1 text-[10px] font-sans font-medium text-muted-foreground border border-[#E8E0D8] rounded hover:bg-[#F5EFE6] transition-colors"
              title="Reset to default"
            >
              Reset
            </button>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 space-y-3 border-t border-[#E8E0D8]">
              <div>
                <Label>Text Content</Label>
                <textarea
                  value={val.text}
                  onChange={(e) => onChange({ text: e.target.value })}
                  onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                  className="w-full min-h-[80px] rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] p-3 font-sans text-sm text-[hsl(25,30%,12%)] outline-none transition-all focus:border-[hsl(43,75%,50%)] focus:ring-2 focus:ring-[hsl(43,75%,50%)]/15 resize-y"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Font Family</Label>
                  <select value={val.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })} className="w-full h-9 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-2 font-sans text-xs outline-none">
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Font Size</Label>
                  <select value={val.fontSize} onChange={(e) => onChange({ fontSize: e.target.value })} className="w-full h-9 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-2 font-sans text-xs outline-none">
                    {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>Color</Label>
                  <select value={val.color} onChange={(e) => onChange({ color: e.target.value })} className="w-full h-9 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-2 font-sans text-xs outline-none">
                    {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" id={`italic-${title}`} checked={val.isItalic} onChange={(e) => onChange({ isItalic: e.target.checked })} className="w-4 h-4 rounded border-[#E8E0D8] text-[hsl(43,75%,50%)] focus:ring-[hsl(43,75%,50%)]" />
                  <label htmlFor={`italic-${title}`} className="text-xs font-sans font-medium text-[hsl(25,30%,12%)]">Italic</label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Main Editor ----------
// No props required — auth is guaranteed by DashboardLayout, and wedding data
// comes from the shared WeddingContext (single Firestore read for all dashboard pages).
export default function InvitationEditor() {
  const router = useRouter();
  const {
    wedding, loading, saving,
    updateCouple, updateTemplate, updateField,
    addEvent, updateEvent, removeEvent,
    updateThemeText, moveEvent,
    publishInvitation,
    updateEventAmbientEffect,
    revertThemeTextToDefaults,
    revertEventDescriptionToDefault,
  } = useWedding();

  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishMsg(null);
    const result = await publishInvitation();
    setPublishing(false);
    if (result.success) {
      setPublishMsg({ text: `Live at /${result.slug || wedding?.slug} ✓`, ok: true });
    } else {
      setPublishMsg({ text: result.error ?? "Publish failed", ok: false });
    }
    setTimeout(() => setPublishMsg(null), 5000);
  };

  const updateBlessingFamily = (index: number, val: string) => {
    const current = wedding?.couple?.blessing_families || ["The Bride's Family", "The Groom's Family"];
    const next = [...current];
    next[index] = val;
    updateCouple("blessing_families", next);
  };

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  if (loading || !wedding) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }} />
          <p className="font-sans text-sm text-muted-foreground">Loading your invitation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-0px)] lg:h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ── Left panel: Editor form ── */}
      <div className="flex flex-col w-full lg:w-[45%] lg:max-w-[560px] bg-white border-r border-[#E8E0D8] overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#E8E0D8] bg-white/95 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <PencilLine className="h-4 w-4 text-[hsl(43,75%,50%)]" />
            <h1 className="font-sans font-semibold text-sm text-[hsl(25,30%,12%)]">My Invitation</h1>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="font-sans text-[10px] text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3 animate-pulse" /> Saving…
              </span>
            )}
            {!saving && (
              <span className="font-sans text-[10px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
              {publishMsg && (
                <span className={`font-sans text-[10px] px-2 py-1 rounded-full ${publishMsg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                  {publishMsg.text}
                </span>
              )}
              <button
                onClick={() => router.push("/dashboard/share")}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-[#E8E0D8] text-xs font-sans font-medium text-muted-foreground hover:bg-[#F5EFE6] transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Draft
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-sans font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
              >
                {publishing ? (
                  <><div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Publishing…</>
                ) : (
                  <><Globe className="h-3.5 w-3.5" /> Publish</>
                )}
              </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* ── Couple Details ── */}
          <SectionCard title="Couple Details" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Partner 1 (Bride)</Label>
                <TextInput value={wedding.couple.bride} onChange={(v) => updateCouple("bride", v)} placeholder="First name" />
              </div>
              <div>
                <Label>Partner 2 (Groom)</Label>
                <TextInput value={wedding.couple.groom} onChange={(v) => updateCouple("groom", v)} placeholder="First name" />
              </div>
            </div>

            <Toggle
              checked={!!(wedding.couple.bride_parents || wedding.couple.groom_parents)}
              onChange={() => {}}
              label="Show Parents' Names"
              hint="Displayed beneath the couple's names"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bride's Parents</Label>
                <TextInput value={wedding.couple.bride_parents || ""} onChange={(v) => updateCouple("bride_parents", v)} placeholder="Mr. & Mrs. Sharma" />
              </div>
              <div>
                <Label>Groom's Parents</Label>
                <TextInput value={wedding.couple.groom_parents || ""} onChange={(v) => updateCouple("groom_parents", v)} placeholder="Mr. & Mrs. Patel" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bride's Blessing Family Name</Label>
                <TextInput value={wedding.couple.blessing_families?.[0] || "The Bride's Family"} onChange={(v) => updateBlessingFamily(0, v)} placeholder="The Bride's Family" />
              </div>
              <div>
                <Label>Groom's Blessing Family Name</Label>
                <TextInput value={wedding.couple.blessing_families?.[1] || "The Groom's Family"} onChange={(v) => updateBlessingFamily(1, v)} placeholder="The Groom's Family" />
              </div>
            </div>

            <div>
              <Label>Religious / Blessing Header</Label>
              <TextInput value={wedding.religious_header || ""} onChange={(v) => updateField("religious_header", v)} placeholder="॥ श्री गणेशाय नमः ॥" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Font Size</Label>
                  <select 
                    value={wedding.religious_header_style?.fontSize || "text-2xl"} 
                    onChange={(e) => {
                      const base = { fontSize: "text-2xl", color: "text-gold", ...wedding.religious_header_style };
                      updateField("religious_header_style", { ...base, fontSize: e.target.value });
                    }} 
                    className="w-full h-9 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-2 font-sans text-xs outline-none"
                  >
                    {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Color</Label>
                  <select 
                    value={wedding.religious_header_style?.color || "text-gold"} 
                    onChange={(e) => {
                      const base = { fontSize: "text-2xl", color: "text-gold", ...wedding.religious_header_style };
                      updateField("religious_header_style", { ...base, color: e.target.value });
                    }} 
                    className="w-full h-9 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-2 font-sans text-xs outline-none"
                  >
                    {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <Label>Occasion Label</Label>
              <TextInput value={wedding.occasion_label || ""} onChange={(v) => updateField("occasion_label", v)} placeholder="wedding ceremony" />
            </div>

            <div>
              <Label>Invitation URL Slug (Public Link)</Label>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-xs text-muted-foreground whitespace-nowrap">yourstruly.co/</span>
                <TextInput
                  value={wedding.slug || ""}
                  onChange={(v) => updateField("slug", v)}
                  placeholder="mahee-neel-2025"
                />
              </div>
              {wedding.published_at && (
                <p className="font-sans text-[10px] text-emerald-600 mt-1">✓ Published · Last live: {new Date(wedding.published_at).toLocaleString()}</p>
              )}
            </div>
          </SectionCard>

          {/* ── Typography & Story ── */}
          <SectionCard title="Typography & Storyline" icon={Type}>
             <div className="space-y-2">
                <TextThemeEditor 
                  title="Grace & Blessings Intro" 
                  data={wedding.theme_texts?.blessing_intro} 
                  onChange={(d) => updateThemeText("blessing_intro", d)}
                  onRevert={() => revertThemeTextToDefaults("blessing_intro")}
                />
                <TextThemeEditor 
                  title="Main Invitation Paragraph" 
                  data={wedding.theme_texts?.main_invite} 
                  onChange={(d) => updateThemeText("main_invite", d)}
                  onRevert={() => revertThemeTextToDefaults("main_invite")}
                />
                <TextThemeEditor 
                  title="Closing Message" 
                  data={wedding.theme_texts?.closing_message} 
                  onChange={(d) => updateThemeText("closing_message", d)}
                  onRevert={() => revertThemeTextToDefaults("closing_message")}
                />
             </div>
          </SectionCard>

          {/* ── Design Template (Advanced) ── */}
          <div className="rounded-2xl border border-[#E8E0D8] bg-white overflow-hidden">
            <details>
              <summary className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E8E0D8]/60 cursor-pointer select-none"
                style={{ background: "linear-gradient(to right, #FDFBF7, #fff)" }}>
                <Settings2 className="h-4 w-4 shrink-0" style={{ color: "hsl(43,75%,50%)" }} />
                <h3 className="font-sans font-semibold text-sm text-[hsl(25,30%,12%)]">Advanced — Design Template</h3>
              </summary>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-sans text-xs text-muted-foreground">
                    Current: <strong className="text-[hsl(25,30%,12%)]">{wedding.template_id.replace(/_v\d+/, "")}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="text-xs font-sans font-medium px-3 h-7 rounded-full border border-[#E8E0D8] hover:bg-[#F5EFE6] transition-colors"
                    style={{ color: "hsl(43,75%,40%)" }}
                  >
                    {showTemplatePicker ? "Collapse" : "Change Template"}
                  </button>
                </div>
                <AnimatePresence>
                  {showTemplatePicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <TemplatePicker
                        selected={wedding.template_id}
                        onSelect={(id) => { updateTemplate(id); setShowTemplatePicker(false); }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </details>
          </div>

          {/* ── Events ── */}
          <SectionCard title="Celebration Events" icon={Calendar}>
             <EventsEditor 
                wedding={wedding} 
                updateEvent={updateEvent} 
                addEvent={addEvent} 
                removeEvent={removeEvent} 
                moveEvent={moveEvent}
                updateEventAmbientEffect={updateEventAmbientEffect}
                revertEventDescriptionToDefault={revertEventDescriptionToDefault}
             />
          </SectionCard>

          {/* ── Media Assets ── */}
          <SectionCard title="Photos, Logo &amp; Video" icon={Image}>
            <ImageUploader
              label="Hero Background Photo"
              value={wedding.assets.hero_image}
              onUpload={(url) => updateField("assets", { ...wedding.assets, hero_image: url })}
              hint="Full-screen background on the hero section. Recommended: 1200×800px JPG/PNG."
              previewHeight={160}
            />
            <ImageUploader
              label="Custom Logo / Monogram"
              value={wedding.assets.logo_image}
              onUpload={(url) => updateField("assets", { ...wedding.assets, logo_image: url })}
              hint="Shown above the couple's names. PNG with transparent background, ~400×400px."
              previewHeight={120}
            />
            <ImageUploader
              label="🌸 Global Particle Image (Optional)"
              value={wedding.assets.ambient_particle_url || ""}
              onUpload={(url) => updateField("assets", { ...wedding.assets, ambient_particle_url: url || undefined })}
              hint="A custom image that falls as particles across all events (unless overridden per-event). Upload a PNG with transparent background — e.g. a flower or leaf."
              previewHeight={90}
            />
            <div>
              <Label>Tap Intro Video URL</Label>
              <TextInput
                value={wedding.assets.intro_video || ""}
                onChange={(v) => updateField("assets", { ...wedding.assets, intro_video: v || undefined })}
                placeholder="https://.../intro.mp4"
              />
              <p className="font-sans text-[10px] text-muted-foreground mt-1.5">
                Used in the Tap-to-Open envelope screen. Leave blank to skip.
              </p>
            </div>
            <div>
              <Label>Intro Fallback Background URL</Label>
              <TextInput
                value={wedding.assets.intro_bg || ""}
                onChange={(v) => updateField("assets", { ...wedding.assets, intro_bg: v || undefined })}
                placeholder="https://.../intro-fallback.jpg"
              />
              <p className="font-sans text-[10px] text-muted-foreground mt-1.5">
                Shown before video starts or if autoplay is blocked.
              </p>
            </div>
          </SectionCard>

          {/* ── Background Music ── */}
          <SectionCard title="Background Music" icon={Music}>
            <Toggle
              checked={!!wedding.assets.audio_url}
              onChange={() => {}}
              label="Music on open"
              hint="Auto-plays when guests open the invite"
            />
            <div>
              <Label>Audio URL</Label>
              <TextInput
                value={wedding.assets.audio_url || ""}
                onChange={(v) => updateField("assets", { ...wedding.assets, audio_url: v })}
                placeholder="/wedding-audio.mp3 or Cloudinary URL"
              />
            </div>
          </SectionCard>

        </div>
      </div>

      {/* ── Right panel: Phone preview ── */}
      <div className="hidden lg:flex flex-1 bg-[#F5EFE6] items-center justify-center p-8 overflow-y-auto">
        <PhonePreview wedding={wedding} />
      </div>
    </div>
  );
}
