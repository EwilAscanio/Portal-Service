import { cn } from "@/utils/cn";

const VARIANTS = {
  success:
    "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  warning:
    "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400",
  info: "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
  purple:
    "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400",
  brand:
    "bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400",
  neutral: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-400",
};

/** Etiqueta de estado con punto opcional */
export function Badge({ variant = "neutral", dot = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
