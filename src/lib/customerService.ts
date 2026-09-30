/**
 * customerService.ts
 * Firestore CRUD for the customers/{customer_id} collection.
 *
 * Each customer document represents one bride/groom couple. Their invitation
 * draft and guest list are stored in subcollections beneath it:
 *   customers/{customer_id}/invitation/draft
 *   customers/{customer_id}/guests/{guest_id}
 *
 * Admins (users/{uid}.role === "admin") can list/create/update/delete any
 * customer. A customer with owner_uid set can read/write only their own record.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer } from "@/lib/types";

export const customersCollectionPath = () => collection(db, "customers");

export const customerDocPath = (customerId: string) =>
  doc(db, "customers", customerId);

/** Realtime listener for all customers created by the given admin. */
export function subscribeToCustomers(
  adminUid: string,
  callback: (customers: Customer[]) => void
): Unsubscribe {
  const q = query(
    customersCollectionPath(),
    where("created_by", "==", adminUid),
    orderBy("created_at", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Customer));
  });
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const snap = await getDoc(customerDocPath(customerId));
  return snap.exists() ? (snap.data() as Customer) : null;
}

export async function createCustomer(
  adminUid: string,
  input: {
    bride_name: string;
    groom_name: string;
    contact_email?: string;
    contact_phone?: string;
    wedding_date?: string;
    notes?: string;
  }
): Promise<Customer> {
  const customerId = crypto.randomUUID();
  // Firestore's setDoc() rejects `undefined` field values outright — only
  // include optional fields in the written document when they're non-empty.
  const customer: Customer = {
    customer_id: customerId,
    bride_name: input.bride_name.trim(),
    groom_name: input.groom_name.trim(),
    display_name: `${input.bride_name.trim()} & ${input.groom_name.trim()}`,
    created_by: adminUid,
    created_at: new Date().toISOString(),
    status: "active",
    ...(input.contact_email?.trim() ? { contact_email: input.contact_email.trim() } : {}),
    ...(input.contact_phone?.trim() ? { contact_phone: input.contact_phone.trim() } : {}),
    ...(input.wedding_date?.trim() ? { wedding_date: input.wedding_date.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
  await setDoc(customerDocPath(customerId), customer);
  return customer;
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>
): Promise<void> {
  // Partial merge via setDoc(..., { merge: true }) — avoids an extra getDoc()
  // round-trip and doesn't clobber fields written concurrently by another
  // session (previously read-full-doc -> merge in memory -> overwrite).
  const patch: Partial<Customer> = { ...updates };
  if (updates.bride_name || updates.groom_name) {
    const existing = await getCustomer(customerId);
    if (!existing) throw new Error("Customer not found");
    const brideName = updates.bride_name ?? existing.bride_name;
    const groomName = updates.groom_name ?? existing.groom_name;
    patch.display_name = `${brideName} & ${groomName}`;
  }
  // Firestore's setDoc() rejects `undefined` values — strip them so clearing
  // an optional field doesn't throw (use FieldValue.delete() semantics not
  // needed here since callers pass explicit new values, not deletions).
  const next = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  await setDoc(customerDocPath(customerId), next, { merge: true });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  // Note: this only deletes the customer root doc. Subcollections
  // (invitation/, guests/) are left in place unless cleaned up separately —
  // Firestore does not cascade-delete subcollections client-side.
  await deleteDoc(customerDocPath(customerId));
}

export async function getAllCustomersOnce(adminUid: string): Promise<Customer[]> {
  const q = query(
    customersCollectionPath(),
    where("created_by", "==", adminUid),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Customer);
}
