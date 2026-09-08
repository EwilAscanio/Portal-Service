"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

const inputBase =
  "w-full rounded-xl border bg-surface text-sm text-foreground placeholder:text-muted/60 transition-colors duration-200 focus:outline-none focus-visible:outline-none";
const inputState =
  "border-border hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:hover:border-slate-600";
const inputError =
  "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15";

/**
 * Campo de texto con label, icono, hint y mensaje de error.
 * `icon`: componente Lucide a la izquierda. `trailing`: nodo a la derecha.
 */
export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    icon: Icon,
    trailing,
    id,
    className,
    containerClassName,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            inputBase,
            "h-11",
            error ? inputError : inputState,
            Icon ? "pl-10" : "pl-3.5",
            trailing ? "pr-11" : "pr-3.5",
            className
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export function Textarea({ label, hint, error, id, className, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          inputBase,
          "min-h-24 p-3.5",
          error ? inputError : inputState,
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
