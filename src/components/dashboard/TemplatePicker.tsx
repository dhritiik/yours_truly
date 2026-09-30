"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { WeddingData } from "@/lib/types";

const TEMPLATES: {
  id: WeddingData["template_id"];
  name: string;
  description: string;
  accent: string;
  preview: string;
}[] = [
  {
    id: "SaloniJay_v1",
    name: "Saloni & Jay",
    description: "Elegant Indian Wedding — marigolds, rich reds & gold",
    accent: "#c9a96e",
    preview: "/hero-background.jpg",
  },
  {
    id: "WeddingElegant_v2",
    name: "Elegant",
    description: "Modern minimalist — clean lines, soft florals",
    accent: "#d4a0a7",
    preview: "/hero-wedding2.jpg",
  },
  {
    id: "Anniversary_v3",
    name: "Anniversary",
    description: "Milestone celebrations — deep blues and champagne",
    accent: "#a0b4d4",
    preview: "/hero-anni.jpg",
  },
  {
    id: "RoyalInvites_v1",
    name: "Royal Invites",
    description: "Regal courtyard arch — rope-pull reveal & unrolling scrolls",
    accent: "#c79b4a",
    preview: "/wedding-new-inv-fr-card-m-v01.webp",
  },
];

interface TemplatePickerProps {
  selected: WeddingData["template_id"];
  onSelect: (id: WeddingData["template_id"]) => void;
}

export default function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {TEMPLATES.map((t) => {
        const isActive = selected === t.id;
        return (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="relative group rounded-2xl overflow-hidden border-2 text-left transition-all duration-200"
            style={{
              borderColor: isActive ? t.accent : "#E8E0D8",
              boxShadow: isActive ? `0 0 0 3px ${t.accent}30` : "none",
            }}
          >
            {/* Thumbnail */}
            <div className="aspect-[3/4] relative overflow-hidden">
              <img
                src={t.preview}
                alt={t.name}
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {isActive && (
                <div
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: t.accent }}
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="font-display text-xs text-white leading-tight drop-shadow">{t.name}</p>
              </div>
            </div>
            {/* Label */}
            <div className="px-2.5 py-2">
              <p className="font-sans text-[10px] text-muted-foreground leading-tight">{t.description}</p>
              {isActive && (
                <p className="font-sans text-[10px] font-bold mt-0.5" style={{ color: t.accent }}>
                  ✓ Selected
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
