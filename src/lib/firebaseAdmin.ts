/**
 * Server-only Firestore with admin rights — bypasses firestore.rules.
 * Used ONLY by the public /report/{token} page, so a couple can see their
 * report without the report collection being readable by everyone.
 *
 * Needs env FIREBASE_SERVICE_ACCOUNT = the full service-account JSON
 * (Firebase console → Project settings → Service accounts → Generate new
 * private key), pasted as one line. Never expose it as NEXT_PUBLIC_*.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function adminDb() {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return getFirestore();
}
