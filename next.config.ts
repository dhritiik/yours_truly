import type { NextConfig } from "next";

// Mounts the entire app under /i so it can live behind a rewrite at
// https://www.yourstrulyinvites.com/i/* while the marketing site (a
// separate Vercel project) continues to own the root path. All Next.js
// routes, assets, and server actions are automatically prefixed.
// Disabled in dev so `localhost:3000/` works directly without the /i prefix.
//
// This is the SINGLE SOURCE OF TRUTH. It is re-exported to the client via
// `env` below so src/lib/basePath.ts never has to hardcode it again.
const basePath = process.env.NODE_ENV === "production" ? "/i" : "";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,

  basePath,

  // Exposes the resolved basePath to client bundles so raw <img>/<audio>/CSS
  // url() references (which Next.js does NOT auto-prefix) can use it.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "n7kwk6h7z8gkdqba.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.googleapis.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // With `basePath: "/i"` nothing is served at the domain root, so hitting the
  // bare deployment URL (e.g. https://<project>.vercel.app/) returns a Vercel
  // 404 instead of the app. On www.yourstrulyinvites.com this is fine because
  // the marketing project owns "/" and only proxies "/i/*" here, but on the
  // raw vercel.app domain it looks like a broken deployment. Send "/" to "/i".
  // `basePath: false` stops Next.js from prefixing the source/destination
  // (otherwise this would become "/i" -> "/i/i").
  async redirects() {
    if (!basePath) return [];
    return [
      {
        source: "/",
        destination: basePath,
        basePath: false,
        permanent: false,
      },
    ];
  },

  // FIX: Place it here at the root level for Next.js 16+
  allowedDevOrigins: ["localhost:3000", "192.168.29.142:3000"],

  // Allow framer-motion and firebase to work correctly
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "192.168.29.142",
        "admin.yourstrulyinvites.com",
        "www.yourstrulyinvites.com",
      ],
    },
  },
};

export default nextConfig;
