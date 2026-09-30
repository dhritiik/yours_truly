import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,

  // Mounts the entire app under /i so it can live behind a rewrite at
  // https://www.yourstrulyinvites.com/i/* while the marketing site (a
  // separate Vercel project) continues to own the root path. All Next.js
  // routes, assets, and server actions are automatically prefixed.
  // Disabled in dev so `localhost:3000/` works directly without the /i prefix.
  basePath: process.env.NODE_ENV === "production" ? "/i" : "",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "n7kwk6h7z8gkdqba.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.googleapis.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
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
