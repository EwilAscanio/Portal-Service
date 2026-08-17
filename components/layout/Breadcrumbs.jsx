"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronRight, Home } from "lucide-react";
import { ROUTE_LABELS } from "@/lib/constants";
import { cn } from "@/utils/cn";

/** Breadcrumbs generados a partir de la ruta actual */
export function Breadcrumbs({ className }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm", className)}
    >
      <Link
        href="/dashboard"
        aria-label="Inicio"
        className="flex items-center rounded-md p-1 text-muted transition-colors hover:text-foreground"
      >
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label = ROUTE_LABELS[segment] ?? segment;
        const isLast = index === segments.length - 1;
        return (
          <Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted/50" />
            {isLast ? (
              <span aria-current="page" className="font-semibold text-foreground">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="text-muted transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
