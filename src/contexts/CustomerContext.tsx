/**
 * CustomerContext.tsx
 *
 * Admin-facing multi-tenant selector. Admins manage many customers (bride/groom
 * couples); this context resolves whether the logged-in user is an admin,
 * loads their list of customers, and tracks which customer is currently
 * selected for editing in the dashboard. Every other dashboard context
 * (WeddingContext, guest list, share page) reads the selected customer_id
 * from here instead of the raw auth uid.
 *
 * Non-admin users (role === "customer") are treated as owning exactly one
 * customer record (their own), resolved via owner_uid.
 */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";
import { Customer } from "@/lib/types";
import { upsertUserProfile } from "@/lib/userService";
import {
  subscribeToCustomers,
  customersCollectionPath,
  createCustomer as createCustomerDoc,
} from "@/lib/customerService";

interface CustomerContextValue {
  isAdmin: boolean;
  roleLoading: boolean;
  customers: Customer[];
  customersLoading: boolean;
  selectedCustomerId: string | null;
  selectedCustomer: Customer | null;
  selectCustomer: (customerId: string | null) => void;
  createCustomer: (input: {
    bride_name: string;
    groom_name: string;
    contact_email?: string;
    contact_phone?: string;
    wedding_date?: string;
    notes?: string;
  }) => Promise<Customer>;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

const STORAGE_KEY = "yt_selected_customer_id";

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Resolve role from users/{uid}.role.
  // upsertUserProfile MUST run here (not deeper in useInvitationStore) because
  // it creates the users/{uid} doc on first-ever login — without it, a brand
  // new account has no doc for isAdmin()/role checks to read, and every
  // downstream Firestore query in this context would be denied.
  useEffect(() => {
    if (!user) { setRoleLoading(false); return; }
    setRoleLoading(true);

    const auth = getAuth();
    const bootstrap = auth.currentUser
      ? upsertUserProfile(auth.currentUser).catch(console.error)
      : Promise.resolve();

    bootstrap
      .then(() => getDoc(doc(db, "users", user.uid)))
      .then((snap) => setIsAdmin(snap.data()?.role === "admin"))
      .catch(console.error)
      .finally(() => setRoleLoading(false));
  }, [user]);

  // Admins: subscribe to their full customer list.
  // Non-admin customers: resolve the single customer record they own.
  useEffect(() => {
    if (!user || roleLoading) return;
    setCustomersLoading(true);

    if (isAdmin) {
      const unsub = subscribeToCustomers(user.uid, (list) => {
        setCustomers(list);
        setCustomersLoading(false);
      });
      return unsub;
    }

    // Non-admin: find the customer record owned by this uid
    const q = query(customersCollectionPath(), where("owner_uid", "==", user.uid));
    getDocs(q)
      .then((snap) => setCustomers(snap.docs.map((d) => d.data() as Customer)))
      .catch(console.error)
      .finally(() => setCustomersLoading(false));
  }, [user, isAdmin, roleLoading]);

  // Restore last-selected customer from localStorage, or auto-select the
  // only customer available for non-admins / single-customer admins.
  useEffect(() => {
    if (customersLoading) return;
    if (customers.length === 0) { setSelectedCustomerId(null); return; }

    let stored: string | null = null;
    try {
      stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    } catch {
      // localStorage can throw in private-browsing/quota-exceeded/disabled-storage
      // scenarios — fall back to auto-selecting the first customer instead of crashing.
    }
    if (stored && customers.some((c) => c.customer_id === stored)) {
      setSelectedCustomerId(stored);
      return;
    }
    setSelectedCustomerId((prev) => prev ?? customers[0].customer_id);
  }, [customers, customersLoading]);

  const selectCustomer = useCallback((customerId: string | null) => {
    setSelectedCustomerId(customerId);
    try {
      if (typeof window !== "undefined") {
        if (customerId) localStorage.setItem(STORAGE_KEY, customerId);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Non-fatal — selection still works in-memory for this session.
    }
  }, []);

  const createCustomer = useCallback(
    async (input: {
      bride_name: string;
      groom_name: string;
      contact_email?: string;
      contact_phone?: string;
      wedding_date?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      const created = await createCustomerDoc(user.uid, input);
      selectCustomer(created.customer_id);
      return created;
    },
    [user, selectCustomer]
  );

  const selectedCustomer =
    customers.find((c) => c.customer_id === selectedCustomerId) ?? null;

  return (
    <CustomerContext.Provider
      value={{
        isAdmin,
        roleLoading,
        customers,
        customersLoading,
        selectedCustomerId,
        selectedCustomer,
        selectCustomer,
        createCustomer,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error("useCustomer() must be called inside a <CustomerProvider>.");
  }
  return ctx;
}
