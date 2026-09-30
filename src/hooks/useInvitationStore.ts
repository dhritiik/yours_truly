"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { publishGuestList } from "@/lib/guestService";
import { db } from "@/lib/firebase";
import { WeddingData, WeddingEvent, CustomTextSection } from "@/lib/types";
import { upsertUserProfile } from "@/lib/userService";
import { getAuth } from "firebase/auth";
import { getDefaultDescriptionForEvent, getDefaultAmbientEffectForEvent, DEFAULT_THEME_TEXTS } from "@/lib/defaults";
import { withBasePath } from "@/lib/basePath";

const sanitizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

// Default draft state for a brand-new customer record
function createDefaultWedding(customerId: string): WeddingData {
  return {
    wedding_id: customerId,
    slug: "",
    template_id: "SaloniJay_v1",
    couple: {
      bride: "",
      groom: "",
      bride_parents: "",
      groom_parents: "",
      blessing_families: ["The Bride's Family", "The Groom's Family"],
      signoff_names: [],
      story_text: "",
    },
    assets: {
      hero_image: withBasePath("/hero-background.jpg"),
      logo_image: withBasePath("/logo_sj.png"),
      audio_url: withBasePath("/wedding-audio.mp3"),
    },
    events: [
      {
        event_id: "e1",
        event_name: "Wedding Ceremony",
        timestamp: new Date().toISOString(),
        time_display: "6:00 PM",
        date_display: "Saturday, 1st November",
        location_details: "Your Venue Name, City",
        maps_url: "https://maps.google.com",
        description: "The sacred union of two families.",
        ambient_effect: "rice_roses",
        isDescriptionCustomized: false,
      },
    ],
    religious_header: "॥ श्री गणेशाय नमः ॥",
    religious_header_style: {
      fontSize: "text-2xl",
      color: "text-gold",
    },
    occasion_label: "wedding ceremony",
    theme_texts: {
      blessing_intro: { ...DEFAULT_THEME_TEXTS.blessing_intro },
      main_invite: { ...DEFAULT_THEME_TEXTS.main_invite },
      closing_message: {
        text: "As they embark on their journey of love and togetherness, your presence will make their special day even more memorable.",
        fontFamily: "font-body",
        fontSize: "text-2xl",
        color: "text-black",
        isItalic: true,
      }
    },
    created_at: new Date().toISOString(),
  };
}

export function useInvitationStore(customerId: string | null) {
  const [wedding, setWedding] = useState<WeddingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dirty-flag: stores the JSON of the last data successfully written to Firestore.
  // The debounced save is skipped entirely if data hasn't changed — eliminates
  // wasted writes from rapid edits that are immediately reverted.
  const lastSavedRef = useRef<string | null>(null);

  // Load from Firestore on mount, and upsert the user profile
  useEffect(() => {
    if (!customerId) { setLoading(false); return; }

    // Upsert user profile in the users/ collection
    const auth = getAuth();
    if (auth.currentUser) {
      upsertUserProfile(auth.currentUser).catch(console.error);
    }

    const docRef = doc(db, "customers", customerId, "invitation", "draft");
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as WeddingData;
        setWedding(data);
        lastSavedRef.current = JSON.stringify(data); // track initial load as "saved"
      } else {
        const defaultData = createDefaultWedding(customerId);
        setWedding(defaultData);
        setDoc(docRef, defaultData);
        lastSavedRef.current = JSON.stringify(defaultData);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [customerId]);

  // Clear any pending debounced save on unmount (or before a new customerId
  // takes over) so a stale timer doesn't fire a setDoc()/setSaving() call
  // after the component tree that owns it has gone away.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [customerId]);

  // Debounced save to Firestore with dirty-flag check
  const saveToFirestore = useCallback((data: WeddingData) => {
    if (!customerId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      // Dirty-flag check: skip write if data hasn't changed since last save.
      // This eliminates wasted Firestore writes from rapid edits that are
      // immediately reverted (e.g. typing then deleting text).
      const serialised = JSON.stringify(data);
      if (serialised === lastSavedRef.current) return;

      setSaving(true);
      try {
        const docRef = doc(db, "customers", customerId, "invitation", "draft");
        await setDoc(docRef, data);
        lastSavedRef.current = serialised; // mark as saved
      } catch (e) {
        console.error("Save failed", e);
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [customerId]);

  // Update helper for nested couple fields — accepts string or string[] for array fields
  const updateCouple = useCallback((field: keyof WeddingData["couple"], value: string | string[]) => {
    setWedding((prev) => {
      if (!prev) return prev;
      const next = { ...prev, couple: { ...prev.couple, [field]: value } };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const updateTemplate = useCallback((templateId: WeddingData["template_id"]) => {
    setWedding((prev) => {
      if (!prev) return prev;
      
      let newHero = withBasePath("/hero-background.jpg");
      let newLogo = withBasePath("/logo_sj.png");
      
      if (templateId === "Anniversary_v3") {
        newHero = withBasePath("/hero-anni.jpg");
        newLogo = withBasePath("/logo-anni.png");
      } else if (templateId === "WeddingElegant_v2") {
        newHero = withBasePath("/hero-wedding2.jpg");
        newLogo = withBasePath("/logo-wedding2.png");
      } else if (templateId === "RoyalInvites_v1") {
        newHero = withBasePath("/wedding-new-inv-fr-card-m-v01.webp");
        newLogo = withBasePath("/wedding-new-Menu_background.webp");
      }

      const next: WeddingData = { 
        ...prev, 
        template_id: templateId,
        assets: {
          ...prev.assets,
          hero_image: newHero,
          logo_image: newLogo,
        }
      };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const updateField = useCallback(<K extends keyof WeddingData>(field: K, value: WeddingData[K]) => {
    setWedding((prev) => {
      if (!prev) return prev;
      const normalizedValue =
        field === "slug" && typeof value === "string"
          ? (sanitizeSlug(value) as WeddingData[K])
          : value;
      const next = { ...prev, [field]: normalizedValue };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const addEvent = useCallback(() => {
    setWedding((prev) => {
      if (!prev) return prev;
      const newEvent: WeddingEvent = {
        event_id: `e_${Date.now()}`,
        event_name: "New Event",
        timestamp: new Date().toISOString(),
        time_display: "7:00 PM",
        date_display: "",
        location_details: "",
        maps_url: "",
        description: "",
      };
      const next = { ...prev, events: [...prev.events, newEvent] };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const updateEvent = useCallback((eventId: string, field: keyof WeddingEvent, value: string) => {
    setWedding((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        events: prev.events.map((e) =>
          e.event_id === eventId ? { ...e, [field]: value } : e
        ),
      };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const removeEvent = useCallback((eventId: string) => {
    setWedding((prev) => {
      if (!prev) return prev;
      const next = { ...prev, events: prev.events.filter((e) => e.event_id !== eventId) };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const updateThemeText = useCallback((sectionKey: string, updates: Partial<CustomTextSection>) => {
    setWedding((prev) => {
      if (!prev) return prev;
      
      const currentSection = prev.theme_texts?.[sectionKey] || {
        text: "", fontFamily: "font-body", fontSize: "text-xl", color: "text-black", isItalic: false
      };
      
      const next = {
        ...prev,
        theme_texts: {
          ...prev.theme_texts,
          [sectionKey]: { ...currentSection, ...updates }
        }
      };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  const moveEvent = useCallback((eventId: string, direction: "up" | "down") => {
    setWedding((prev) => {
      if (!prev) return prev;
      const idx = prev.events.findIndex((e) => e.event_id === eventId);
      if (idx < 0) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.events.length - 1) return prev;

      const newEvents = [...prev.events];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      
      const temp = newEvents[idx];
      newEvents[idx] = newEvents[targetIdx];
      newEvents[targetIdx] = temp;

      const next = { ...prev, events: newEvents };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  /**
   * publishInvitation — copies the current draft to the public `weddings/{slug}` collection.
   * Sets published_at and owner_uid so the public URL resolves correctly.
   * Returns { success, error }.
   */
  const publishInvitation = useCallback(async (): Promise<{ success: boolean; error?: string; slug?: string }> => {
    if (!customerId || !wedding) return { success: false, error: "Not authenticated" };
    if (!wedding.slug?.trim()) return { success: false, error: "Please set an invitation slug (URL path) before publishing." };

    try {
      const normalizedSlug = sanitizeSlug(wedding.slug);
      if (!normalizedSlug) {
        return { success: false, error: "Please enter a valid slug using letters, numbers, or hyphens." };
      }

      // Slug collision guard: do not allow publishing over another customer's live invitation.
      const publicRef = doc(db, "weddings", normalizedSlug);
      const existingPublicSnap = await getDoc(publicRef);
      if (existingPublicSnap.exists()) {
        const existingData = existingPublicSnap.data() as Partial<WeddingData>;
        const existingOwnerUid = existingData.owner_uid;
        const sameWedding = existingData.wedding_id === wedding.wedding_id;
        const sameOwner = existingOwnerUid === customerId;
        // Block if a DIFFERENT customer owns this slug, OR the wedding_id changed
        // (stricter than the previous && which allowed edge-case overwrites)
        if (!sameOwner || !sameWedding) {
          return { success: false, error: "This URL slug is already in use. Please choose another slug." };
        }
      }

      // Build the public document: owner_uid now stores the customer_id
      // (required for Firestore rules to validate ownership on future updates).
      const publishedData: WeddingData = {
        ...wedding,
        slug: normalizedSlug,
        owner_uid: customerId,
        published_at: new Date().toISOString(),
      };

      // Write public wedding doc
      await setDoc(publicRef, publishedData);

      // Also update the draft with published_at so UI knows it's live
      const draftRef = doc(db, "customers", customerId, "invitation", "draft");
      await setDoc(draftRef, { published_at: publishedData.published_at, slug: normalizedSlug }, { merge: true });

      // Update local state
      setWedding((prev) => prev ? { ...prev, published_at: publishedData.published_at, slug: normalizedSlug } : prev);

      // Update customers/{customerId} with the active slug
      const customerRef = doc(db, "customers", customerId);
      await setDoc(customerRef, { invitation_slug: normalizedSlug }, { merge: true });

      // Sync private guest list to public weddings/{slug}/guests/ collection
      await publishGuestList(customerId, normalizedSlug);

      return { success: true, slug: normalizedSlug };
    } catch (e) {
      console.error("Publish failed", e);
      return { success: false, error: "Failed to publish. Please try again." };
    }
  }, [customerId, wedding]);

  // Update event ambient effect
  const updateEventAmbientEffect = useCallback((eventId: string, effect: 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none') => {
    setWedding((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        events: prev.events.map((e) =>
          e.event_id === eventId ? { ...e, ambient_effect: effect } : e
        ),
      };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  // Revert theme text to defaults
  const revertThemeTextToDefaults = useCallback((sectionKey: string) => {
    setWedding((prev) => {
      if (!prev) return prev;
      const defaults = { ...DEFAULT_THEME_TEXTS };
      const defaultSection = (defaults as any)[sectionKey];
      if (!defaultSection) return prev;
      
      const next = {
        ...prev,
        theme_texts: {
          ...prev.theme_texts,
          [sectionKey]: { ...defaultSection, isCustomized: false }
        }
      };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  // Revert event description to default
  const revertEventDescriptionToDefault = useCallback((eventId: string) => {
    setWedding((prev) => {
      if (!prev) return prev;
      const event = prev.events.find((e) => e.event_id === eventId);
      if (!event) return prev;
      
      const defaultDescription = getDefaultDescriptionForEvent(event.event_name);
      const next = {
        ...prev,
        events: prev.events.map((e) =>
          e.event_id === eventId 
            ? { ...e, description: defaultDescription, isDescriptionCustomized: false }
            : e
        ),
      };
      saveToFirestore(next);
      return next;
    });
  }, [saveToFirestore]);

  return { 
    wedding, 
    loading, 
    saving, 
    updateCouple, 
    updateTemplate, 
    updateField, 
    addEvent, 
    updateEvent, 
    removeEvent, 
    updateThemeText, 
    moveEvent, 
    publishInvitation,
    updateEventAmbientEffect,
    revertThemeTextToDefaults,
    revertEventDescriptionToDefault,
  };
}
