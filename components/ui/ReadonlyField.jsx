import { cn } from "@/utils/cn";

/** Campo de solo lectura que replica la estructura visual de un Input. */
export function ReadonlyField({ label, children, className }) {
  return (
    <div className={cn("w-full", className)}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex h-11 w-full items-center rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}
