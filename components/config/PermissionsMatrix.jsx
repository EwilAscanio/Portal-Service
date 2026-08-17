"use client";

import { Check, Minus } from "lucide-react";
import { ROUTE_LABELS } from "@/lib/constants";
import { cn } from "@/utils/cn";

const SHORT_ROLE_LABELS = {
  Administrador: "Admin",
  Supervisor: "Supervisor",
  Coordinador: "Coord.",
  Técnico: "Técnico",
  Usuario: "Usuario",
};

export function PermissionsMatrix({ permissions, availableRoles }) {
  const rows = permissions.map((entry) => ({
    prefix: entry.prefix,
    label: ROUTE_LABELS[entry.prefix.replace("/", "")] ?? entry.prefix,
    roles: entry.roles,
  }));

  return (
    <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-muted">
              Módulo
            </th>
            {availableRoles.map((role) => (
              <th
                key={role}
                className="pb-3 px-3 text-center text-xs font-semibold uppercase tracking-wider text-muted"
              >
                <span className="hidden lg:inline">{role}</span>
                <span className="lg:hidden">
                  {SHORT_ROLE_LABELS[role] ?? role}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.prefix}
              className="border-b border-border/50 transition-colors hover:bg-surface-2/50"
            >
              <td className="py-2.5 pr-6 font-medium text-foreground">
                {row.label}
              </td>
              {availableRoles.map((role) => {
                const hasAccess = row.roles.includes(role);
                return (
                  <td key={role} className="py-2.5 px-3 text-center">
                    {hasAccess ? (
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full",
                          "bg-green-500/10 text-green-600 dark:text-green-400"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-muted/50">
                        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
