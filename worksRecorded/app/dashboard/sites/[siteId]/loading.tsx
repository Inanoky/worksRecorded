import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[240px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
      </div>

      <div className="rounded-xl border bg-background p-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-[85%]" />
        </div>
      </div>
    </div>
  );
}
