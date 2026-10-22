import { cn } from "@/utils/cn";

/** Campo de solo lectura que replica la estructura visual de un Input. */
export function ReadonlyField({ label, icon: Icon, children, className }) {
  return (
    <div className={cn("w-full", className)}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "relative flex h-11 w-full items-center rounded-xl border border-border bg-surface text-sm text-foreground",
          Icon ? "pl-10 pr-3.5" : "px-3.5"
        )}
      >
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        )}
        {children}
      </div>
    </div>
  );
}
