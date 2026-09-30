"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Upload, Plus, Trash2, Copy, Check, MessageCircle,
  ChevronDown, ChevronUp, Search, X, AlertTriangle, FileText,
  CheckCircle2, Clock, XCircle, Download,
} from "lucide-react";
import { useCustomer } from "@/contexts/CustomerContext";
import { useWedding } from "@/contexts/WeddingContext";
import { Guest, WeddingData, WeddingEvent } from "@/lib/types";
import { parseGuestCsv, buildGuestsFromCsvRows, CsvImportResult } from "@/lib/csvImporter";
import {
  subscribeToGuests,
  importGuests,
  saveGuest,
  updateGuest,
  deleteGuest,
  clearGuests,
  publishGuestList,
  syncSingleGuestToPublic,
  buildMagicLink,
  buildWhatsAppUrl,
  generateGuestSlug,
} from "@/lib/guestService";

// ── Small UI helpers ──────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[#E8E0D8] bg-white px-4 py-3 flex flex-col gap-1">
      <span className="font-sans text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="font-sans text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function RsvpPill({ status }: { status: Guest["rsvp_status"] }) {
  const cfg = {
    Pending: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
    Accepted: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
    Declined: { bg: "bg-red-50", text: "text-red-600", icon: XCircle },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-sans font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} title="Copy link" className="p-1.5 rounded-lg hover:bg-[#F5EFE6] transition-colors text-muted-foreground">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── CSV Import Panel ──────────────────────────────────────────────────────────

function CsvImportPanel({
  events,
  onImport,
  wedding,
}: {
  events: WeddingEvent[];
  onImport: (result: CsvImportResult, csvText: string) => void;
  wedding: WeddingData;
}) {
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<CsvImportResult | null>(null);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setParsed(parseGuestCsv(text, events));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-[hsl(43,75%,50%)] bg-[hsl(43,75%,50%)]/5" : "border-[#E8E0D8] hover:border-[hsl(43,75%,50%)]/40"
        }`}
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="font-sans text-sm text-[hsl(25,30%,20%)] font-medium">Drop your CSV here</p>
        <p className="font-sans text-xs text-muted-foreground mt-1">or click to browse · Format: Name, Event1, Event2…</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      </div>

      {/* Format hint */}
      <div className="rounded-lg bg-[#FDFBF7] border border-[#E8E0D8] p-3">
        <p className="font-sans text-[11px] text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Expected CSV format</p>
        <pre className="font-mono text-[10px] text-[hsl(25,30%,30%)] whitespace-pre-wrap">
{`Name,Mandap,Bhakti,Marriage,Reception
"Guest Name",Family,1,1,-`}
        </pre>
        <p className="font-sans text-[10px] text-muted-foreground mt-1">• <b>Family</b> = 4 seats · <b>number</b> = exact seats · <b>-</b> or blank = not invited</p>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {parsed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {parsed.unmatchedHeaders.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="font-sans text-xs text-amber-700">
                  Unmatched columns (will be skipped): <b>{parsed.unmatchedHeaders.join(", ")}</b>
                </p>
              </div>
            )}
            <div className="rounded-xl border border-[#E8E0D8] overflow-hidden">
              <div className="bg-[#FDFBF7] border-b border-[#E8E0D8] px-3 py-2 flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-[hsl(25,30%,12%)]">
                  Preview — {parsed.rows.length} guest{parsed.rows.length !== 1 ? "s" : ""} found
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setParsed(null); setCsvText(""); }} className="font-sans text-xs text-muted-foreground hover:text-red-500">
                    Clear
                  </button>
                  <button
                    onClick={() => onImport(parsed, csvText)}
                    className="font-sans text-xs font-semibold px-3 py-1 rounded-full text-white transition-all"
                    style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
                  >
                    Import {parsed.rows.length} guests →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#E8E0D8]">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                      {parsed.csvHeaders.map((h) => (
                        <th key={h} className={`text-center px-2 py-2 font-medium ${parsed.unmatchedHeaders.includes(h) ? "text-amber-500" : "text-muted-foreground"}`}>
                          {h} {parsed.unmatchedHeaders.includes(h) ? "⚠️" : `(${events.find(e => e.event_id === parsed.matchedMap[h])?.event_name ?? ""})`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#FDFBF7]"}>
                        <td className="px-3 py-1.5 font-medium text-[hsl(25,30%,12%)]">{row.name}</td>
                        {parsed.csvHeaders.map((h) => (
                          <td key={h} className="text-center px-2 py-1.5">
                            {row.columnSeats[h] > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                                {row.columnSeats[h]}
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsed.rows.length > 8 && (
                      <tr><td colSpan={parsed.csvHeaders.length + 1} className="px-3 py-1.5 text-muted-foreground text-center italic">
                        +{parsed.rows.length - 8} more…
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Need useRef for CsvImportPanel
import { useRef } from "react";

// ── Guest Row / Edit Panel ────────────────────────────────────────────────────

function GuestRow({
  guest,
  events,
  wedding,
  uid,
  onDelete,
}: {
  guest: Guest;
  events: WeddingEvent[];
  wedding: WeddingData;
  uid: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState({ ...guest });
  const [saving, setSaving] = useState(false);

  const magicLink = buildMagicLink(wedding.slug || "demo", guest);

  const handleSave = async () => {
    setSaving(true);
    // invited_events is deprecated — it's always derivable from event_seats.
    // We no longer compute and store it to eliminate the redundant field.
    const updated: Guest = { ...editing };

    // Update private collection (source of truth)
    await updateGuest(uid, updated);

    // Update only THIS guest in the public collection — O(1) instead of O(N×3)
    if (wedding.slug?.trim()) {
      await syncSingleGuestToPublic(wedding.slug, updated);
    }

    setSaving(false);
    setExpanded(false);
  };

  const totalSeats = Object.values(guest.event_seats).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-[#E8E0D8] overflow-hidden bg-white">
      {/* Summary row */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}>
          {guest.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-semibold text-[hsl(25,30%,12%)] truncate">{guest.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {events.filter(e => (guest.event_seats[e.event_id] ?? 0) > 0).map(e => (
              <span key={e.event_id} className="inline-block px-1.5 py-0.5 rounded-full bg-[hsl(43,75%,50%)]/10 text-[hsl(43,75%,40%)] text-[10px] font-medium">
                {e.event_group || e.event_name} ×{guest.event_seats[e.event_id]}
              </span>
            ))}
            {totalSeats === 0 && <span className="text-[10px] text-muted-foreground italic">No events assigned</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <RsvpPill status={guest.rsvp_status} />
          <CopyBtn text={magicLink} />
          {guest.phone_number && (
            <a
              href={buildWhatsAppUrl(guest.phone_number, `Hi ${guest.name}! You're invited 🎊 Open your personalised invitation: ${magicLink}`)}
              target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-green-50 transition-colors text-muted-foreground hover:text-green-600"
              title="Send via WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-[#F5EFE6] transition-colors text-muted-foreground">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#E8E0D8] p-3 space-y-3 bg-[#FDFBF7]">
              {/* Name & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Name</label>
                  <input
                    value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full h-8 rounded-lg border border-[#E8E0D8] bg-white px-2 font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)]"
                  />
                </div>
                <div>
                  <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Phone (for WhatsApp)</label>
                  <input
                    value={editing.phone_number ?? ""} onChange={(e) => setEditing({ ...editing, phone_number: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full h-8 rounded-lg border border-[#E8E0D8] bg-white px-2 font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)]"
                  />
                </div>
              </div>

              {/* Per-event seat counts */}
              <div>
                <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Event Invitations (seats)</label>
                <div className="grid grid-cols-2 gap-2">
                  {events.map((event) => (
                    <div key={event.event_id} className="flex items-center gap-2 rounded-lg border border-[#E8E0D8] bg-white px-2 py-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-xs font-medium text-[hsl(25,30%,12%)] truncate">{event.event_group || event.event_name}</p>
                        <p className="font-sans text-[10px] text-muted-foreground truncate">{event.event_name}</p>
                      </div>
                      <input
                        type="number" min={0} max={20}
                        value={editing.event_seats[event.event_id] ?? 0}
                        onChange={(e) => setEditing(prev => ({
                          ...prev,
                          event_seats: { ...prev.event_seats, [event.event_id]: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-12 h-7 rounded border border-[#E8E0D8] text-center font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom note */}
              <div>
                <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Personal Note (optional)</label>
                <textarea
                  value={editing.custom_note ?? ""}
                  onChange={(e) => setEditing({ ...editing, custom_note: e.target.value })}
                  placeholder="A personal message to this guest..."
                  rows={2}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-2 py-1.5 font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)] resize-none"
                />
              </div>

              {/* RSVP override */}
              <div>
                <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">RSVP Status</label>
                <select
                  value={editing.rsvp_status}
                  onChange={(e) => setEditing({ ...editing, rsvp_status: e.target.value as Guest["rsvp_status"] })}
                  className="w-full h-8 rounded-lg border border-[#E8E0D8] bg-white px-2 font-sans text-sm outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              {/* Magic link display */}
              <div className="rounded-lg bg-white border border-[#E8E0D8] p-2 flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">{magicLink}</span>
                <CopyBtn text={magicLink} />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button onClick={() => setExpanded(false)} className="font-sans text-xs px-3 py-1.5 rounded-lg border border-[#E8E0D8] text-muted-foreground hover:bg-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="font-sans text-xs font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-60 transition-all"
                  style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add Guest Modal ───────────────────────────────────────────────────────────

function AddGuestModal({
  events,
  wedding,
  uid,
  onClose,
  existingGuestSlugs,
}: {
  events: WeddingEvent[];
  wedding: WeddingData;
  uid: string;
  onClose: () => void;
  existingGuestSlugs: Set<string>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState<Record<string, number>>(
    Object.fromEntries(events.map((e) => [e.event_id, 0]))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const guest: Guest = {
      guest_id: crypto.randomUUID(),
      wedding_id: wedding.wedding_id,
      name: name.trim(),
      phone_number: phone.trim() || undefined,
      guest_token: crypto.randomUUID(),
      guest_slug: generateGuestSlug(name.trim(), existingGuestSlugs),
      event_seats: seats,
      // invited_events omitted — deprecated field, always derivable from event_seats
      rsvp_status: "Pending",
      created_at: new Date().toISOString(),
      imported_via: "manual",
    };

    // Write to private (source of truth)
    await saveGuest(uid, guest);

    // Write only this guest to public — not a full publishGuestList
    if (wedding.slug?.trim()) {
      await syncSingleGuestToPublic(wedding.slug, guest);
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-[#E8E0D8] shadow-2xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-[hsl(25,30%,12%)]">Add Guest</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F5EFE6] transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="w-full h-9 rounded-lg border border-[#E8E0D8] px-3 font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)]" />
          </div>
          <div className="col-span-2">
            <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Phone (WhatsApp)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full h-9 rounded-lg border border-[#E8E0D8] px-3 font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)]" />
          </div>
        </div>

        <div>
          <label className="font-sans text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Events (seats per event)</label>
          <div className="space-y-1.5">
            {events.map((event) => (
              <div key={event.event_id} className="flex items-center gap-3 rounded-lg border border-[#E8E0D8] px-3 py-2">
                <span className="font-sans text-sm flex-1">{event.event_group || event.event_name}</span>
                <input
                  type="number" min={0} max={20}
                  value={seats[event.event_id] ?? 0}
                  onChange={(e) => setSeats(prev => ({ ...prev, [event.event_id]: parseInt(e.target.value) || 0 }))}
                  className="w-16 h-7 rounded border border-[#E8E0D8] text-center font-sans text-sm outline-none focus:border-[hsl(43,75%,50%)]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="font-sans text-sm px-4 py-2 rounded-xl border border-[#E8E0D8] text-muted-foreground hover:bg-[#F5EFE6] transition-colors">Cancel</button>
          <button
            onClick={handleSave} disabled={saving || !name.trim()}
            className="font-sans text-sm font-semibold px-5 py-2 rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
          >
            {saving ? "Saving…" : "Add Guest"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  // Customer selection and wedding data come from shared contexts — no redundant Firestore reads
  const { selectedCustomerId } = useCustomer();
  const { wedding } = useWedding();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | Guest["rsvp_status"]>("All");
  const [showImport, setShowImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importing, setImporting] = useState(false);

  // Realtime guest listener (private collection — source of truth)
  useEffect(() => {
    if (!selectedCustomerId) return;
    const unsub = subscribeToGuests(selectedCustomerId, (g) => {
      setGuests(g);
      setGuestsLoading(false);
    });
    return unsub;
  }, [selectedCustomerId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /**
   * CSV import: clear both private + public, batch-write to private,
   * then smart-publish to public (publishGuestList handles the full mirror).
   */
  const handleCsvImport = async (result: CsvImportResult) => {
    if (!selectedCustomerId || !wedding) return;
    setImporting(true);

    const toImport = buildGuestsFromCsvRows(
      result.rows,
      result.matchedMap,
      wedding.wedding_id
    );

    // clearGuests now also clears the public collection when slug is provided
    await clearGuests(
      selectedCustomerId,
      wedding.slug?.trim() ? wedding.slug : undefined
    );

    await importGuests(selectedCustomerId, wedding.wedding_id, toImport);

    // Full sync to public (only called on import, not on individual edits)
    if (wedding.slug?.trim()) {
      await publishGuestList(selectedCustomerId, wedding.slug);
    }

    setImporting(false);
    setShowImport(false);
  };

  /**
   * Delete a guest from BOTH collections atomically.
   * Previously only deleted from private — left orphans in the public collection.
   */
  const handleDelete = async (guestId: string, guestSlug?: string) => {
    if (!selectedCustomerId) return;
    await deleteGuest(
      selectedCustomerId,
      guestId,
      wedding?.slug?.trim() ? wedding.slug : undefined,
      guestSlug
    );
  };

  const handleClearAll = async () => {
    if (!selectedCustomerId || guests.length === 0) return;
    if (!confirm(`Delete all ${guests.length} guests? This cannot be undone.`)) return;
    await clearGuests(
      selectedCustomerId,
      wedding?.slug?.trim() ? wedding.slug : undefined
    );
  };

  const events = wedding?.events ?? [];

  // Filter & search (client-side — no extra Firestore reads)
  const filtered = guests.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || g.rsvp_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: guests.length,
    pending: guests.filter((g) => g.rsvp_status === "Pending").length,
    accepted: guests.filter((g) => g.rsvp_status === "Accepted").length,
    declined: guests.filter((g) => g.rsvp_status === "Declined").length,
    totalSeats: guests.reduce(
      (sum, g) => sum + Math.max(...Object.values(g.event_seats ?? {}), 0),
      0
    ),
  };

  if (guestsLoading || !selectedCustomerId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-[hsl(25,30%,12%)]">Guest List</h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            {guests.length} guests · {stats.totalSeats} total seats across all events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {guests.length > 0 && (
            <button onClick={handleClearAll} className="font-sans text-xs px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
          <button
            onClick={() => setShowImport(!showImport)}
            className={`font-sans text-xs px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${showImport ? "border-[hsl(43,75%,50%)] bg-[hsl(43,75%,50%)]/5 text-[hsl(43,75%,40%)]" : "border-[#E8E0D8] text-muted-foreground hover:bg-[#F5EFE6]"}`}
          >
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="font-sans text-xs font-semibold px-3 py-2 rounded-xl text-white flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Guest
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Guests" value={stats.total} color="hsl(43,75%,40%)" />
        <StatCard label="Pending" value={stats.pending} color="hsl(43,80%,45%)" />
        <StatCard label="Accepted" value={stats.accepted} color="hsl(145,50%,40%)" />
        <StatCard label="Declined" value={stats.declined} color="hsl(0,65%,50%)" />
      </div>

      {/* CSV Import */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#E8E0D8] bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-sans text-sm font-semibold text-[hsl(25,30%,12%)]">Import from CSV</h3>
                {importing && <span className="font-sans text-xs text-muted-foreground animate-pulse">Importing…</span>}
              </div>
              {wedding ? (
                <CsvImportPanel events={events} wedding={wedding} onImport={handleCsvImport} />
              ) : (
                <p className="font-sans text-sm text-muted-foreground">Load your invitation first to match event columns.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No events warning */}
      {wedding && events.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="font-sans text-sm text-amber-700">Add events to your invitation first so you can assign guests to them.</p>
        </div>
      )}

      {/* Search & Filter */}
      {guests.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl border border-[#E8E0D8] bg-white px-3 h-9">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guests…"
              className="flex-1 font-sans text-sm outline-none bg-transparent"
            />
            {search && <button onClick={() => setSearch("")}><X className="h-3 w-3 text-muted-foreground hover:text-red-400" /></button>}
          </div>
          {(["All", "Pending", "Accepted", "Declined"] as const).map((s) => (
            <button
              key={s} onClick={() => setFilterStatus(s)}
              className={`font-sans text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === s ? "border-[hsl(43,75%,50%)] bg-[hsl(43,75%,50%)]/10 text-[hsl(43,75%,40%)] font-medium" : "border-[#E8E0D8] text-muted-foreground hover:bg-[#F5EFE6]"}`}
            >
              {s} {s !== "All" ? `(${stats[s.toLowerCase() as keyof typeof stats]})` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Guest list */}
      {guests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "hsl(43,75%,50%,0.08)", border: "1px solid hsl(43,75%,50%,0.2)" }}>
            <Users className="h-8 w-8" style={{ color: "hsl(43,75%,50%)" }} />
          </div>
          <h3 className="font-display text-xl text-[hsl(25,30%,12%)] mb-1">No guests yet</h3>
          <p className="font-sans text-sm text-muted-foreground max-w-xs">Import your CSV or add guests manually to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 font-sans text-sm text-muted-foreground">No guests match your filter.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((guest) => (
            <GuestRow
              key={guest.guest_id}
              guest={guest}
              events={events}
              wedding={wedding!}
              uid={selectedCustomerId}
              onDelete={() => handleDelete(guest.guest_id, guest.guest_slug)}
            />
          ))}
        </div>
      )}

      {/* Add guest modal */}
      <AnimatePresence>
        {showAddModal && wedding && (
          <AddGuestModal
            events={events}
            wedding={wedding}
            uid={selectedCustomerId}
            onClose={() => setShowAddModal(false)}
            existingGuestSlugs={new Set(guests.map((g) => g.guest_slug).filter((s): s is string => !!s))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
