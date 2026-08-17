"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/utils/cn";

const toggleButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors";

/**
 * Alternador de vista (tabla / cards).
 * Props: view ("table" | "cards") y onChange.
 */
export function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      <Tooltip label="Vista de tabla">
        <button
          type="button"
          onClick={() => onChange("table")}
          aria-pressed={view === "table"}
          aria-label="Vista de tabla"
          className={cn(
            toggleButton,
            view === "table"
              ? "bg-blue-600 text-white"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Table2 className="h-4 w-4" />
        </button>
      </Tooltip>
      <Tooltip label="Vista de cards">
        <button
          type="button"
          onClick={() => onChange("cards")}
          aria-pressed={view === "cards"}
          aria-label="Vista de cards"
          className={cn(
            toggleButton,
            view === "cards"
              ? "bg-blue-600 text-white"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </Tooltip>
    </div>
  );
}
