"use client";

import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { cn } from "@/utils/cn";

/** Estado vacío elegante para tablas, búsquedas y módulos sin datos */
export function EmptyState({
  icon: Icon = Inbox,
  title = "No hay resultados",
  description,
  action,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
