"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} />;
}

interface PageSkeletonProps {
  className?: string;
}

export default function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn("mx-auto max-w-7xl space-y-6 p-6", className)} aria-busy="true" role="status">
      <span className="sr-only">Cargando</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    </div>
  );
}
