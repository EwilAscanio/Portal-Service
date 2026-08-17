import { cn } from "@/utils/cn";

/** Bloque base de skeleton con pulso */
export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

/** Skeleton para la cuadrícula de KPIs */
export function SkeletonStats({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-32" />
      ))}
    </div>
  );
}

/** Skeleton para tablas */
export function SkeletonTable({ rows = 6 }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-11 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Skeleton para tarjetas de gráficos */
export function SkeletonChart() {
  return <Skeleton className="h-[300px] w-full" />;
}
