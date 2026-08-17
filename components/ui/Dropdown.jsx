"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { useClickOutside } from "@/hooks/useClickOutside";

const DropdownContext = createContext(null);

function useDropdown() {
  return useContext(DropdownContext);
}

/**
 * Menú desplegable componible:
 * <Dropdown>
 *   <DropdownTrigger>…</DropdownTrigger>
 *   <DropdownContent>
 *     <DropdownItem>…</DropdownItem>
 *   </DropdownContent>
 * </Dropdown>
 */
export function Dropdown({ children, className }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className={cn("relative inline-block", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({ children, className, ariaLabel }) {
  const { open, setOpen } = useDropdown();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={() => setOpen(!open)}
      className={className}
    >
      {children}
    </button>
  );
}

export function DropdownContent({ children, align = "right", className }) {
  const { open } = useDropdown();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.12 } }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/5 dark:shadow-black/40",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DropdownItem({ icon: Icon, danger = false, onClick, children }) {
  const { setOpen } = useDropdown();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
        danger
          ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
          : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }) {
  return (
    <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </p>
  );
}

export function DropdownSeparator() {
  return <div className="mx-1 my-1.5 h-px bg-border" />;
}
