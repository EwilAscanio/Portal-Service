"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

const TONES = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
  teal: "bg-teal-500",
  red: "bg-red-500",
};

/** Barra de progreso animada al entrar en viewport */
export function ProgressBar({ value, tone = "blue", className }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(value, 100)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className={cn("h-full rounded-full", TONES[tone])}
      />
    </div>
  );
}
