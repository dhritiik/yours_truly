// Core multi-tenant data types for the YoursTruly platform

export interface WeddingEvent {
  event_id: string;
  event_name: string;        // e.g., "Dinner and Dancing"
  event_group?: string;      // e.g., "Sangeet" (optional, main header)
  timestamp: string;         // ISO string or human-readable
  time_display: string;      // e.g., "7:30 PM"
  date_display: string;      // e.g., "Sunday, 8th March"
  location_details: string;  // Full venue name + address
  maps_url: string;
  description: string;
  image_url?: string;        // Cloudinary URL
  parking_note?: string;
  // Customization fields
  ambient_effect?: 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none'; // Background effect
  particle_image_url?: string; // Custom image URL for falling particles (PNG with transparency)
  isDescriptionCustomized?: boolean;  // Track if user customized description
}

export interface Guest {
  guest_id: string;
  wedding_id: string;
  name: string;
  phone_number?: string;         // E.164 format for WhatsApp, e.g. "+919876543210"
  guest_token: string;           // Unique magic-link token
  /**
   * Human-readable URL segment, e.g. "priya-aunty". Derived from `name` at
   * creation time and de-duplicated against sibling guests (see
   * generateGuestSlug in guestService.ts). This is what the public guest
   * document is keyed by (weddings/{slug}/guests/{guest_slug}) and what
   * appears in the personalized invite link: /{slug}/{guest_slug}.
   * Optional only for backward compat with guest docs created before this
   * field existed — those guests won't have a personalized path link.
   */
  guest_slug?: string;
  // Per-event seat map: key = event_id, value = seat count (0 means not invited)
  event_seats: Record<string, number>;
  /**
   * @deprecated Do not write this field in new code.
   * It is always derivable from event_seats:
   *   Object.keys(event_seats).filter(id => event_seats[id] > 0)
   * Kept optional for backward compat with existing Firestore documents.
   */
  invited_events?: string[];
  rsvp_status: "Pending" | "Accepted" | "Declined";
  custom_note?: string;          // Personal message shown on their invite
  created_at: string;
  imported_via?: "csv" | "manual";
}

// Represents a user account in the users/{uid} collection
export interface AppUser {
  uid: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  created_at: string;         // ISO timestamp of account creation
  plan: "free" | "pro";       // Stripe plan tier
  invitation_slug?: string;   // Slug of their active invitation
  /**
   * "admin" — manages all customer (bride/groom) records from the dashboard.
   * "customer" — a couple who may optionally log in to view their own invite.
   * Defaults to "customer" on first write; only manually promoted accounts
   * (or the ADMIN_EMAILS allowlist) are treated as admin.
   */
  role?: "admin" | "customer";
}

// Represents one bride/groom couple managed by an admin.
// Each customer owns exactly one invitation draft + one guest list,
// stored at customers/{customer_id}/invitation/draft and
// customers/{customer_id}/guests/{guest_id}.
export interface Customer {
  customer_id: string;
  bride_name: string;
  groom_name: string;
  /** Convenience display label, e.g. "Saloni & Jay" */
  display_name: string;
  /** uid of the admin who created/manages this customer record */
  created_by: string;
  /**
   * Optional uid of the couple's own login, if they've been invited to
   * view/edit their own invitation directly. Null/undefined = admin-managed only.
   */
  owner_uid?: string;
  contact_email?: string;
  contact_phone?: string;
  /** ISO date string (YYYY-MM-DD), e.g. "2026-11-14". Used by the Planner section. */
  wedding_date?: string;
  notes?: string;
  created_at: string;
  status?: "active" | "archived";
}

export interface WeddingData {
  wedding_id: string;
  slug: string;              // e.g., "saloni-jay-2025"
  template_id: "SaloniJay_v1" | "WeddingElegant_v2" | "Anniversary_v3" | "RoyalInvites_v1";
  couple: {
    bride: string;
    groom: string;
    bride_parents?: string;
    groom_parents?: string;
    story_text?: string;
    blessing_families?: string[];
    signoff_names?: string[];
  };
  assets: {
    hero_image: string;     // Cloudinary URL
    logo_image: string;     // Cloudinary URL
    intro_video?: string;   // Cloudinary URL
    intro_bg?: string;      // Cloudinary URL (fallback image)
    audio_url?: string;     // Background music URL
    ambient_particle_url?: string; // Global custom particle image (overridden per-event by particle_image_url)
  };
  events: WeddingEvent[];
  religious_header?: string;
  religious_header_style?: {
    fontSize: string;       // e.g. "text-xl", "text-2xl"
    color: string;          // e.g. "text-gold", "text-black"
  };
  occasion_label?: string;   // e.g., "wedding ceremony" or "50th Anniversary Celebration"
  theme_texts?: Record<string, CustomTextSection>;
  created_at: string;
  published_at?: string;     // Set when user explicitly publishes — null means draft-only
  owner_uid?: string;        // The uid of the user who owns this invitation
}


export interface CustomTextSection {
  text: string;
  fontFamily: string; // e.g. "font-body", "font-display"
  fontSize: string; // e.g. "text-xl", "text-sm", "text-base"
  color: string; // e.g. "text-gold", "text-sage-dark", "text-black", "text-red-500"
  isItalic: boolean;
  isCustomized?: boolean; // Track if user has customized this section
}

// Default templates collection - stores default values for fast retrieval
export interface DefaultEventDescriptions {
  [eventNameLower: string]: string; // e.g., { "haldi": "As turmeric's golden...", ... }
}

export interface DefaultThemeTexts {
  blessing_intro: CustomTextSection;
  main_invite: CustomTextSection;
  closing_message: CustomTextSection;
  [key: string]: CustomTextSection;
}

export interface DefaultsCollection {
  event_descriptions: DefaultEventDescriptions;
  theme_texts: DefaultThemeTexts;
  ambient_effects: {
    [eventType: string]: 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none';
  };
}
