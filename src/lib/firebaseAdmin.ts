/**
 * Server-only Firestore with admin rights — bypasses firestore.rules.
 * Used ONLY by the public /report/{token} page, so a couple can see their
 * report without the report collection being readable by everyone.
 *
 * Needs env FIREBASE_SERVICE_ACCOUNT = the JSON key of the READ-ONLY account
 * report-share-reader@… (role Cloud Datastore Viewer), pasted as one line.
 * Setup: INVITE_EXPIRY_AND_REPORTS.md §13. Never expose it as NEXT_PUBLIC_*.
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
