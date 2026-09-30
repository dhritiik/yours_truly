"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWedding } from "@/contexts/WeddingContext";

export default function SharePage() {
  // Auth and wedding data from shared contexts — no independent subscriptions
  const { user } = useAuth();
  const { wedding } = useWedding();
  const [copied, setCopied] = useState(false);

  const slug = wedding?.slug || "saloni-jay-demo";
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div>
          <h2 className="font-display text-2xl text-[hsl(25,30%,12%)] mb-1">Share Your Invitation</h2>
          <p className="font-sans text-sm text-muted-foreground">
            Copy your unique link and send it to your guests via WhatsApp, email, or any platform.
          </p>
        </div>

        {/* Link box */}
        <div className="rounded-2xl border border-[#E8E0D8] bg-white p-4 space-y-3">
          <p className="font-sans text-xs font-semibold" style={{ color: "hsl(43,75%,40%)" }}>Your Invitation Link</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-[#FDFBF7] border border-[#E8E0D8] px-3 py-2.5 font-mono text-xs text-[hsl(25,30%,25%)] truncate">
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-sans font-semibold transition-all"
              style={{
                background: copied ? "hsl(142,76%,36%)" : "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))",
                color: "white",
              }}
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-[hsl(43,75%,50%)] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        </div>

        {/* WhatsApp */}
        <div className="rounded-2xl border border-[#E8E0D8] bg-white p-4">
          <p className="font-sans text-xs font-semibold mb-3" style={{ color: "hsl(43,75%,40%)" }}>Share via WhatsApp</p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`You're invited! View your personalised invitation: ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-sm font-semibold text-white transition-all hover:opacity-90 w-fit"
            style={{ background: "#25D366" }}
          >
            <Send className="h-4 w-4" />
            Open WhatsApp
          </a>
        </div>

        {user && (
          <p className="font-sans text-xs text-muted-foreground text-center">
            Signed in as {user.email}
          </p>
        )}
      </motion.div>
    </div>
  );
}
