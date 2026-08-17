"use client";

import { useId } from "react";
import { cn } from "@/utils/cn";

/** Interruptor accesible (role="switch") con etiqueta opcional */
export function Switch({ checked, onChange, label, description, id, className }) {
  const autoId = useId();
  const switchId = id ?? autoId;

  const control = (
    <button
      type="button"
      role="switch"
      id={switchId}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300",
          checked && "translate-x-5"
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div>
        <label htmlFor={switchId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {control}
    </div>
  );
}
