import { doc, getDoc } from "firebase/firestore";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/firebase";
import { WeddingData } from "@/lib/types";

/**
 * Fetch the public wedding document from Firestore.
 *
 * Shared between src/app/[slug]/page.tsx (generic invite) and
 * src/app/[slug]/[guest]/page.tsx (personalized invite) so both route
 * variants share the same unstable_cache entry per slug — one Firestore
 * read serves every guest's page render within the revalidation window,
 * regardless of which of the two routes they land on.
 *
 * Security: owner_uid is STRIPPED from the object returned to the template.
 * It stays in Firestore (required for ownership rules) but is never embedded
 * in the HTML/JS bundle served to guests (security §4.2).
 */
export const getWeddingData = unstable_cache(
  async (slug: string): Promise<WeddingData | null> => {
    // ── Demo mock data ─────────────────────────────────────────────────────
    if (slug === "saloni-jay-demo") {
      return {
        wedding_id: "demo_1",
        slug: "saloni-jay-demo",
        template_id: "SaloniJay_v1",
        couple: {
          bride: "Saloni",
          groom: "Jay",
          bride_parents: "Mr. Ramesh & Mrs. Sunita Sharma",
          groom_parents: "Mr. Anil & Mrs. Kavita Patel",
          blessing_families: ["The Sharma Family", "The Patel Family"],
          signoff_names: ["Aarav", "Riya", "Rohan"],
        },
        assets: {
          hero_image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
          logo_image: "https://n7kwk6h7z8gkdqba.public.blob.vercel-storage.com/logo-saloni-jay.png",
          intro_video: "https://n7kwk6h7z8gkdqba.public.blob.vercel-storage.com/intro.mp4",
        },
        events: [
          {
            event_id: "e1",
            event_name: "Mandap Muhurat",
            timestamp: "2025-03-08T09:00:00Z",
            time_display: "9:00 AM",
            date_display: "Sunday, 8th March",
            location_details: "The Taj Mahal Palace, Mumbai",
            maps_url: "https://maps.google.com",
            description: "Seeking the blessings of Lord Ganesha.",
          },
          {
            event_id: "e2",
            event_name: "Bhakti Sandhya",
            timestamp: "2025-03-08T18:00:00Z",
            time_display: "6:00 PM",
            date_display: "Sunday, 8th March",
            location_details: "The Taj Mahal Palace, Mumbai",
            maps_url: "https://maps.google.com",
            description: "An evening of devotional songs.",
          },
          {
            event_id: "e3",
            event_name: "Wedding",
            timestamp: "2025-03-10T16:00:00Z",
            time_display: "4:00 PM",
            date_display: "Tuesday, 10th March",
            location_details: "The Taj Mahal Palace, Mumbai",
            maps_url: "https://maps.google.com",
            description: "The sacred union.",
          },
        ],
        created_at: new Date().toISOString(),
      };
    } else if (slug === "priya-rahul-demo") {
      return {
        wedding_id: "demo_2",
        slug: "priya-rahul-demo",
        template_id: "WeddingElegant_v2",
        couple: { bride: "Priya", groom: "Rahul" },
        assets: { hero_image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", logo_image: "" },
        events: [
          { event_id: "e1", event_name: "Mandap", timestamp: "2025-04-10T10:00:00Z", time_display: "10:00 AM", date_display: "10th April", location_details: "St. Regis, Mumbai", maps_url: "https://maps.google.com", description: "Mandap Muhurat" },
          { event_id: "e2", event_name: "Sangeet", timestamp: "2025-04-11T19:00:00Z", time_display: "7:00 PM", date_display: "11th April", location_details: "St. Regis, Mumbai", maps_url: "https://maps.google.com", description: "Dance and celebration" },
        ],
        created_at: new Date().toISOString(),
      };
    } else if (slug === "ayesha-vikram-demo") {
      return {
        wedding_id: "demo_3",
        slug: "ayesha-vikram-demo",
        template_id: "Anniversary_v3",
        occasion_label: "50th Anniversary Celebration",
        couple: { bride: "Ayesha", groom: "Vikram" },
        assets: { hero_image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", logo_image: "" },
        events: [
          { event_id: "e1", event_name: "Gala Dinner", timestamp: "2025-05-20T20:00:00Z", time_display: "8:00 PM", date_display: "20th May", location_details: "Taj Lands End, Mumbai", maps_url: "https://maps.google.com", description: "Celebrating 50 years of togetherness" },
        ],
        created_at: new Date().toISOString(),
      };
    }
    // ── End demo mock data ─────────────────────────────────────────────────

    try {
      // Direct document read — O(1), no index needed.
      // Wedding document is keyed by slug: weddings/{slug}
      const docRef = doc(db, "weddings", slug);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const data = snap.data() as WeddingData;

      // Strip owner_uid before passing to the template component.
      // It stays in Firestore for ownership rule validation, but must NOT
      // be embedded in the HTML/JS bundle served to guests (security §4.2).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { owner_uid, ...publicData } = data as WeddingData & { owner_uid?: string };
      return publicData;
    } catch (error) {
      console.error("Error fetching wedding data:", error);
      return null;
    }
  },
  // Cache key: per-slug so each wedding has its own cache entry
  ["wedding-data"],
  {
    // Match the page revalidation period
    revalidate: 300,
    // Tag allows on-demand purge: revalidateTag(`wedding-${slug}`) on publish
    tags: ["wedding-data"],
  }
);
