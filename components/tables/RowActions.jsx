"use client";

import { MoreHorizontal } from "lucide-react";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/Dropdown";

/**
 * Menú de acciones por fila de tabla.
 * actions: [{ label, icon, danger?, onClick(row) }]
 * En desktop aparece al hacer hover sobre la fila (siempre visible en táctil).
 */
export function RowActions({ row, actions }) {
  return (
    <Dropdown>
      <DropdownTrigger
        ariaLabel="Abrir acciones de la fila"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all hover:bg-surface-2 hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownTrigger>
      <DropdownContent>
        {actions.map((action) => (
          <DropdownItem
            key={action.label}
            icon={action.icon}
            danger={action.danger}
            onClick={() => action.onClick(row)}
          >
            {action.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
