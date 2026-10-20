/**
 * Default remote assets served from Vercel Blob storage.
 *
 * These are intentionally absolute CDN URLs rather than `/public` files:
 * they are large media (video/audio) that shouldn't ship in the repo, and
 * being absolute means they are unaffected by the app's `basePath` ("/i").
 *
 * The hostname is allow-listed in next.config.ts `images.remotePatterns`.
 */
const BLOB_BASE = "https://n7kwk6h7z8gkdqba.public.blob.vercel-storage.com";

export const DEFAULT_INTRO_VIDEO = `${BLOB_BASE}/intro.mp4`;
export const DEFAULT_INTRO_BG = `${BLOB_BASE}/bg.png`;

// Background music has no default on purpose — there is no stock audio file in
// blob storage, and a hardcoded fallback would make every invite play the same
// track. Audio is opt-in: set `assets.audio_url` from the dashboard
// (Background Music section) and the <audio> element appears in the template.
// export const DEFAULT_AUDIO = `${BLOB_BASE}/intro-audio.mp3`;
