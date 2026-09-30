"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Save } from "lucide-react";
import { useCustomer } from "@/contexts/CustomerContext";
import { updateCustomer } from "@/lib/customerService";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PlannerPage() {
  const { selectedCustomer, selectedCustomerId, customersLoading } = useCustomer();
  const [dateInput, setDateInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDateInput(selectedCustomer?.wedding_date ?? "");
  }, [selectedCustomer?.wedding_date]);

  const handleSave = async () => {
    if (!selectedCustomerId) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateCustomer(selectedCustomerId, { wedding_date: dateInput || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!selectedCustomerId) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center py-16">
        <p className="font-sans text-sm text-muted-foreground">Select a customer to plan their wedding date.</p>
      </div>
    );
  }

  const remaining = dateInput ? daysUntil(dateInput) : null;

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div>
          <h1 className="font-display text-2xl text-[hsl(25,30%,12%)]">Wedding Planner</h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            Set the wedding date for {selectedCustomer?.display_name}.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8E0D8] bg-white p-4 space-y-3">
          <label className="font-sans text-xs font-semibold flex items-center gap-1.5" style={{ color: "hsl(43,75%,40%)" }}>
            <CalendarDays className="h-3.5 w-3.5" /> Wedding Date
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full rounded-xl border border-[#E8E0D8] px-3 py-2.5 text-sm font-sans outline-none focus:border-[hsl(43,75%,50%)]"
          />

          {remaining !== null && (
            <p className="font-sans text-sm text-[hsl(25,30%,20%)]">
              {remaining > 0
                ? `${remaining} day${remaining !== 1 ? "s" : ""} to go`
                : remaining === 0
                ? "It's today! 🎉"
                : `${Math.abs(remaining)} day${Math.abs(remaining) !== 1 ? "s" : ""} ago`}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 w-fit"
            style={{ background: saved ? "hsl(142,76%,36%)" : "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Date"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
