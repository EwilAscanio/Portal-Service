"use client";

import { motion } from "framer-motion";
import { Cog, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

/** Spinner inline reutilizable */
export function Spinner({ className }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

/** Pantalla de carga de página completa con la marca Maquitech */
export function PageLoader({ label = "Cargando" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="relative">
        <motion.span
          className="absolute inset-0 rounded-2xl bg-orange-500/30"
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
          <Cog className="h-8 w-8 animate-spin text-white [animation-duration:4s]" />
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold tracking-wide text-foreground">Maquitech</p>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-3.5 w-3.5" />
          {label}
        </p>
      </div>
    </div>
  );
}
