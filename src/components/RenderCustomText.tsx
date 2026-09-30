import { CustomTextSection } from "@/lib/types";
import { motion } from "framer-motion";

interface RenderCustomTextProps {
  data?: CustomTextSection;
  defaultText: string;
  defaultFont?: string;
  defaultSize?: string;
  defaultColor?: string;
  defaultItalic?: boolean;
  className?: string;
  delay?: number;
}

export function RenderCustomText({
  data,
  defaultText,
  defaultFont = "font-body",
  defaultSize = "text-xl md:text-2xl",
  defaultColor = "text-black",
  defaultItalic = true,
  className = "",
  delay = 0,
}: RenderCustomTextProps) {
  const text = data?.text ?? defaultText;
  const font = data?.fontFamily ?? defaultFont;
  const size = data?.fontSize ?? defaultSize;
  const color = data?.color ?? defaultColor;
  const italicClass = (data?.isItalic ?? defaultItalic) ? "italic" : "not-italic";

  const lines = text.split("\n");

  return (
    <motion.div
      className={`${font} ${size} ${color} ${italicClass} ${className} text-center leading-relaxed max-w-xl mx-auto`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line || "\u00A0"}
        </span>
      ))}
    </motion.div>
  );
}
