import { cn } from "@/utils/cn";

const POSITIONS = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

/** Tooltip ligero por CSS (hover/focus), sin dependencias */
export function Tooltip({ label, children, side = "top", className }) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 scale-95 group-hover/tip:scale-100 group-hover/tip:opacity-100",
          POSITIONS[side]
        )}
      >
        {label}
      </span>
    </span>
  );
}
