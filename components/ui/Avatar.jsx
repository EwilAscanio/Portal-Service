import { cn } from "@/utils/cn";
import { getInitials } from "@/lib/format";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-orange-500 to-red-500",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
];

const STATUS_COLORS = {
  online: "bg-emerald-500",
  busy: "bg-amber-500",
  offline: "bg-slate-400",
};

/** Avatar con iniciales, gradiente determinista y punto de estado opcional */
export function Avatar({ name = "", size = "md", status, className }) {
  const seed = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = GRADIENTS[seed % GRADIENTS.length];

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
          SIZES[size],
          gradient
        )}
      >
        {getInitials(name)}
      </span>
      {status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface",
            STATUS_COLORS[status]
          )}
        />
      )}
    </span>
  );
}
