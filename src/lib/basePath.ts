/**
 * Prefixes a root-relative `/public` asset path with the app's Next.js
 * `basePath` ("/i" — see next.config.ts).
 *
 * Next.js only auto-prefixes basePath for `next/image` and `next/link`.
 * Raw `<img src="/foo.png">`, `<audio src="/foo.mp3">`, and CSS
 * `backgroundImage: url(/foo.png)` do NOT get the basePath applied
 * automatically, which caused 404s in production. Use this helper for any
 * hardcoded local `/public` asset reference used outside next/image.
 *
 * Absolute URLs (CMS/Cloudinary assets, e.g. "https://...") are returned
 * unchanged.
 */
// Injected by next.config.ts (`env.NEXT_PUBLIC_BASE_PATH`) so the prefix is
// defined in exactly one place and can never drift from the real `basePath`.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith("//")) return path;
  return path.startsWith("/") ? `${BASE_PATH}${path}` : `${BASE_PATH}/${path}`;
}
