/**
 * WeddingContext.tsx
 *
 * Lifts useInvitationStore() to the dashboard layout level so all dashboard
 * pages share ONE Firestore read of customers/{customer_id}/invitation/draft
 * instead of fetching it independently (3 separate reads before this fix).
 *
 * The data is now keyed by the currently selected customer (bride/groom
 * couple) from CustomerContext, not the raw auth uid — this lets one admin
 * manage many customers' invitations from a single dashboard.
 *
 * Usage:
 *   const { wedding, loading, saving, updateCouple, ... } = useWedding();
 */
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useInvitationStore } from "@/hooks/useInvitationStore";
import { useCustomer } from "./CustomerContext";

// The return type of the store hook — all fields and callbacks
type WeddingStore = ReturnType<typeof useInvitationStore>;

const WeddingContext = createContext<WeddingStore | null>(null);

export function WeddingProvider({ children }: { children: ReactNode }) {
  const { selectedCustomerId } = useCustomer();
  // useInvitationStore is safe to call with null customerId (returns loading state)
  const store = useInvitationStore(selectedCustomerId);

  return (
    <WeddingContext.Provider value={store}>{children}</WeddingContext.Provider>
  );
}


/**
 * Access the shared wedding store from any dashboard child component.
 * Must be used inside a <WeddingProvider>.
 */
export function useWedding(): WeddingStore {
  const ctx = useContext(WeddingContext);
  if (!ctx) {
    throw new Error(
      "useWedding() must be called inside a <WeddingProvider>. " +
        "Ensure the dashboard layout wraps children with <WeddingProvider>."
    );
  }
  return ctx;
}
