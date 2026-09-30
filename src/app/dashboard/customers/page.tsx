"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Trash2, X, Check, Mail, Phone, Calendar } from "lucide-react";
import { useCustomer } from "@/contexts/CustomerContext";
import { deleteCustomer as deleteCustomerDoc } from "@/lib/customerService";

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const { createCustomer } = useCustomer();
  const [bride, setBride] = useState("");
  const [groom, setGroom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!bride.trim() || !groom.trim()) {
      setError("Please enter both names.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCustomer({
        bride_name: bride,
        groom_name: groom,
        contact_email: email || undefined,
        contact_phone: phone || undefined,
        wedding_date: weddingDate || undefined,
      });
      onClose();
    } catch (e) {
      console.error(e);
      setError("Failed to create customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-[hsl(25,30%,12%)]">Add New Customer</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#F5EFE6]">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-sans text-xs text-muted-foreground mb-1 block">Bride's Name *</label>
              <input value={bride} onChange={(e) => setBride(e.target.value)} placeholder="Saloni"
                className="w-full rounded-lg border border-[#E8E0D8] px-3 py-2 text-sm font-sans outline-none focus:border-[hsl(43,75%,50%)]" />
            </div>
            <div>
              <label className="font-sans text-xs text-muted-foreground mb-1 block">Groom's Name *</label>
              <input value={groom} onChange={(e) => setGroom(e.target.value)} placeholder="Jay"
                className="w-full rounded-lg border border-[#E8E0D8] px-3 py-2 text-sm font-sans outline-none focus:border-[hsl(43,75%,50%)]" />
            </div>
          </div>
          <div>
            <label className="font-sans text-xs text-muted-foreground mb-1 block">Wedding Date</label>
            <input value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} type="date"
              className="w-full rounded-lg border border-[#E8E0D8] px-3 py-2 text-sm font-sans outline-none focus:border-[hsl(43,75%,50%)]" />
          </div>
          <div>
            <label className="font-sans text-xs text-muted-foreground mb-1 block">Contact Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="couple@example.com" type="email"
              className="w-full rounded-lg border border-[#E8E0D8] px-3 py-2 text-sm font-sans outline-none focus:border-[hsl(43,75%,50%)]" />
          </div>
          <div>
            <label className="font-sans text-xs text-muted-foreground mb-1 block">Contact Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210"
              className="w-full rounded-lg border border-[#E8E0D8] px-3 py-2 text-sm font-sans outline-none focus:border-[hsl(43,75%,50%)]" />
          </div>
        </div>

        {error && <p className="font-sans text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full font-sans text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
        >
          {saving ? "Creating…" : "Create Customer"}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function CustomersPage() {
  const { isAdmin, roleLoading, customers, customersLoading, selectedCustomerId, selectCustomer } = useCustomer();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (customerId: string, displayName: string) => {
    if (!confirm(`Delete customer "${displayName}"? Their invitation draft and guest list will remain in Firestore but be unreachable from this dashboard.`)) return;
    setDeletingId(customerId);
    try {
      await deleteCustomerDoc(customerId);
      if (selectedCustomerId === customerId) selectCustomer(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (roleLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center py-16">
        <p className="font-sans text-sm text-muted-foreground">
          Only admins can manage customers. Contact your administrator if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-[hsl(25,30%,12%)]">Customers</h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            Manage every bride & groom couple. Select one to edit their invitation and guest list.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="font-sans text-xs font-semibold px-3 py-2 rounded-xl text-white flex items-center gap-1.5 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Customer
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "hsl(43,75%,50%,0.08)", border: "1px solid hsl(43,75%,50%,0.2)" }}>
            <Users className="h-8 w-8" style={{ color: "hsl(43,75%,50%)" }} />
          </div>
          <h3 className="font-display text-xl text-[hsl(25,30%,12%)] mb-1">No customers yet</h3>
          <p className="font-sans text-sm text-muted-foreground max-w-xs">Add your first bride & groom customer to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <div
              key={c.customer_id}
              className={`rounded-xl border bg-white px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                c.customer_id === selectedCustomerId ? "border-[hsl(43,75%,50%)] bg-[hsl(43,75%,50%)]/5" : "border-[#E8E0D8]"
              }`}
            >
              <div className="min-w-0">
                <p className="font-sans font-semibold text-sm text-[hsl(25,30%,12%)] truncate">{c.display_name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {c.wedding_date && (
                    <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {new Date(c.wedding_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  )}
                  {c.contact_email && (
                    <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {c.contact_email}
                    </span>
                  )}
                  {c.contact_phone && (
                    <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {c.contact_phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.customer_id === selectedCustomerId ? (
                  <span className="flex items-center gap-1 font-sans text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <button
                    onClick={() => selectCustomer(c.customer_id)}
                    className="font-sans text-xs font-medium px-3 py-1.5 rounded-full border border-[#E8E0D8] hover:bg-[#F5EFE6] transition-colors"
                  >
                    Select
                  </button>
                )}
                <button
                  onClick={() => handleDelete(c.customer_id, c.display_name)}
                  disabled={deletingId === c.customer_id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}
