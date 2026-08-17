"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Select nativo estilizado (accesible y liviano).
 * `options`: [{ value, label }] o children <option>.
 */
export function Select({ label, options = [], id, className, children, ...props }) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-surface pl-3.5 pr-9 text-sm font-medium text-foreground transition-colors duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-blue-500/15 dark:hover:border-slate-600"
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
