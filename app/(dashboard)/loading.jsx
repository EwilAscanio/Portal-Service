import {
  Skeleton,
  SkeletonChart,
  SkeletonStats,
  SkeletonTable,
} from "@/components/ui/Skeleton";

/** Estado de carga a nivel de ruta (área administrativa) */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonStats />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
