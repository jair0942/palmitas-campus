"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/hooks/use-store";
import AppSidebar from "@/components/layout/app-sidebar";
import AppHeader from "@/components/layout/app-header";
import PageSkeleton from "@/components/shared/page-skeleton";
import MustChangePassword from "@/features/auth/must-change-password";
import { motion } from "framer-motion";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, logout } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebarCollapsed");
      if (saved) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/");
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) {
    return <PageSkeleton />;
  }

  if (user.mustChangePassword) {
    return (
      <MustChangePassword
        onLogout={async () => {
          await logout();
          router.replace("/");
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
