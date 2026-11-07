/**
 * Cloudinary URL transformation helpers.
 *
 * Every template renders user-uploaded assets (hero/logo/event-card images,
 * ambient particles, intro video, background audio) via these two helpers so
 * that:
 *   1. Images are served auto-optimized (format + quality + responsive size)
 *      instead of the raw uploaded file, cutting bandwidth drastically.
 *   2. Presets are centralized here — one place to tune per-use-case sizing
 *      instead of hunting across 4 near-identical templates.
 *
 * `cldImagePreset` / `cldVideo` are no-ops (return the URL unchanged) for any
 * non-Cloudinary URL (Vercel Blob defaults, Unsplash/Pexels placeholders,
 * manually pasted URLs), so they're always safe to call.
 */

type ImagePreset = "hero" | "logo" | "card" | "particle";

// width/height are upper bounds — `c_limit` never upscales smaller sources.
// f_auto negotiates AVIF/WebP per-browser; q_auto picks the best quality for
// the smallest byte size. dpr_auto adapts to the device pixel ratio.
const IMAGE_PRESETS: Record<ImagePreset, string> = {
  hero: "f_auto,q_auto,dpr_auto,c_limit,w_1600",
  logo: "f_auto,q_auto,dpr_auto,c_limit,w_400",
  card: "f_auto,q_auto,dpr_auto,c_limit,w_800",
  // Particles are small repeating PNGs with transparency — keep PNG-capable
  // f_auto but cap size aggressively since they're tiled/animated sprites.
  particle: "f_auto,q_auto,dpr_auto,c_limit,w_200",
};

// Matches ".../upload/" (optionally followed by existing transformations or
// a version segment like "v1700000000/") in any res.cloudinary.com URL.
const CLOUDINARY_UPLOAD_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload)\/(?:[^/]+\/)*?(v\d+\/.*)$/i;

function isCloudinaryUrl(url: string): boolean {
  return /^https?:\/\/res\.cloudinary\.com\//i.test(url);
}

/**
 * Inserts a transformation string right after `/upload/` in a Cloudinary
 * delivery URL, stripping any transformations that may already be present
 * (e.g. if the stored URL was saved with ad-hoc params by an older upload).
 * Falls back to the original URL unchanged if it doesn't match the expected
 * Cloudinary shape (e.g. it's a non-Cloudinary URL, or missing a version
 * segment).
 */
function injectTransform(url: string, transform: string): string {
  const match = url.match(CLOUDINARY_UPLOAD_RE);
  if (!match) return url;
  const [, base, rest] = match;
  return `${base}/${transform}/${rest}`;
}

/**
 * Applies a named optimization preset to a Cloudinary image URL. Returns the
 * input unchanged (including `undefined`/empty) for non-Cloudinary URLs so it
 * can always be called with `wedding.assets.hero_image` etc. directly.
 */
export function cldImagePreset(url: string | undefined | null, preset: ImagePreset): string {
  if (!url) return "";
  if (!isCloudinaryUrl(url)) return url;
  return injectTransform(url, IMAGE_PRESETS[preset]);
}

// Video/audio: q_auto picks an efficient bitrate; f_auto negotiates codec
// container (e.g. mp4/webm) per requesting browser. No width cap — intro
// videos are already uploaded at delivery resolution.
const VIDEO_TRANSFORM = "f_auto,q_auto";

/**
 * Applies streaming-friendly optimization to a Cloudinary video/audio URL.
 * Non-Cloudinary URLs (e.g. Vercel Blob default intro video, plain audio
 * links) pass through unchanged.
 */
export function cldVideo(url: string | undefined | null): string {
  if (!url) return "";
  if (!isCloudinaryUrl(url)) return url;
  return injectTransform(url, VIDEO_TRANSFORM);
}
