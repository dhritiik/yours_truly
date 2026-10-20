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

export const DEFAULT_AUDIO = `${BLOB_BASE}/intro-audio.mp3`;
export const DEFAULT_INTRO_VIDEO = `${BLOB_BASE}/intro.mp4`;
export const DEFAULT_INTRO_BG = `${BLOB_BASE}/bg.png`;
