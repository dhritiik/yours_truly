"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { WeddingData } from "@/lib/types";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

// Lazy-load templates to avoid server-side issues
const SaloniJayTemplate = dynamic(() => import("@/templates/SaloniJay_v1"), { ssr: false });
const WeddingElegantTemplate = dynamic(() => import("@/templates/WeddingElegant_v2"), { ssr: false });
const AnniversaryTemplate = dynamic(() => import("@/templates/Anniversary_v3"), { ssr: false });
const RoyalInvitesTemplate = dynamic(() => import("@/templates/RoyalInvites_v1"), { ssr: false });

interface PhonePreviewProps {
  wedding: WeddingData;
}

function TemplateRenderer({ wedding }: { wedding: WeddingData }) {
  const props = { wedding, skipEnvelope: true };
  switch (wedding.template_id) {
    case "SaloniJay_v1":
      return <SaloniJayTemplate {...props} />;
    case "WeddingElegant_v2":
      return <WeddingElegantTemplate {...props} />;
    case "Anniversary_v3":
      return <AnniversaryTemplate {...props} />;

    case "RoyalInvites_v1":
      return <RoyalInvitesTemplate {...props} />;

    default:
      return <SaloniJayTemplate {...props} />;
  }
}

export default function PhonePreview({ wedding }: PhonePreviewProps) {
  // Map template to a representative background colour for the frame chrome
  const frameBg =
    wedding.template_id === "Anniversary_v3"
      ? "#1a1f3a"
      : wedding.template_id === "WeddingElegant_v2"
      ? "#3a2a2a"
      : wedding.template_id === "RoyalInvites_v1"
      ? "#2c1a0e"
      : "#2a1a0a";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone shell */}
      <motion.div
        layout
        key={wedding.template_id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-[6px]"
        style={{
          borderColor: frameBg,
          width: 280,
          height: 560,
          background: "#FDFBF7",
          boxShadow: `0 32px 80px -16px rgba(0,0,0,0.35), 0 0 0 1px ${frameBg}`,
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-50 rounded-b-2xl"
          style={{ width: 90, height: 24, background: frameBg }}
        />

        {/* Content scroll container */}
        <div className="absolute inset-0 overflow-hidden phone-preview-wrapper rounded-[2rem]">
          <div style={{ transform: "scale(0.52)", transformOrigin: "top left", width: "192%", height: "192%" }}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center" style={{ height: 1100 }}>
                  <div
                    className="w-10 h-10 rounded-full border-4 animate-spin"
                    style={{ borderColor: "hsl(43,75%,50%)", borderTopColor: "transparent" }}
                  />
                </div>
              }
            >
              <TemplateRenderer wedding={wedding} />
            </Suspense>
          </div>
        </div>
      </motion.div>

      {/* Labels below phone */}
      <div className="flex items-center gap-3 text-xs font-sans">
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Draft Preview
        </span>
        <span className="text-muted-foreground">·</span>
        <a
          href={`/${wedding.slug || "saloni-jay-demo"}?preview=true`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-muted-foreground hover:text-[hsl(43,75%,50%)] transition-colors"
        >
          Open in new tab <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
