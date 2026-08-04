"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/hooks/use-store";
import PageSkeleton from "@/components/shared/page-skeleton";

type RouteRole = "admin" | "teacher" | "student";

interface RouteGuardProps {
  allow?: RouteRole[];
  fallback?: string;
  children: React.ReactNode;
}

export default function RouteGuard({ allow, fallback = "/dashboard", children }: RouteGuardProps) {
  const router = useRouter();
  const { user, isHydrated } = useStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (allow && !allow.includes(user.role)) {
      router.replace(fallback);
    }
  }, [isHydrated, user, allow, fallback, router]);

  if (!isHydrated || !user) {
    return <PageSkeleton />;
  }

  if (allow && !allow.includes(user.role)) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
