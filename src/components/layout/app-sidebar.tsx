"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  UserCheck,
  BarChart3,
  User,
  Settings,
  Home,
  ClipboardList,
  Award,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { getUserDisplayName, getUserInitials } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const adminNavItems: NavItem[] = [
  { label: "Inicio", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profesores", icon: GraduationCap, href: "/admin/users?tab=teachers" },
  { label: "Estudiantes", icon: Users, href: "/admin/users?tab=students" },
  { label: "Clases", icon: BookOpen, href: "/admin/classes" },
  { label: "Matriculas", icon: UserCheck, href: "/admin/assignments" },
  { label: "Reportes", icon: BarChart3, href: "/admin/reports" },
  { label: "Perfil", icon: User, href: "/profile" },
  { label: "Configuración", icon: Settings, href: "/admin/settings" },
];

const teacherNavItems: NavItem[] = [
  { label: "Inicio", icon: Home, href: "/dashboard" },
  { label: "Mis Clases", icon: BookOpen, href: "/classes" },
  { label: "Tareas", icon: ClipboardList, href: "/tasks" },
  { label: "Calificaciones", icon: Award, href: "/grades" },
  { label: "Perfil", icon: User, href: "/profile" },
];

const studentNavItems = teacherNavItems;

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

function SidebarContent({
  collapsed,
  onToggle,
  onClose,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useStore();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);

  const roleLabel =
    user?.role === "teacher"
      ? "Profesor"
      : user?.role === "admin"
        ? "Admin"
        : "Estudiante";

  const navItems: NavItem[] =
    user?.role === "admin"
      ? adminNavItems
      : user?.role === "teacher"
        ? teacherNavItems
        : studentNavItems;

  function isActive(href: string) {
    const path = href.split("?")[0];
    return pathname === path;
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0F6A3B] to-[#084D2C] backdrop-blur-lg shadow-[4px_0_20px_rgba(0,0,0,0.15)]">
      <div
        className={cn(
          "flex items-center gap-3 px-5 pt-6 pb-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-sm">
          <Image src="/images/logo.jpg" alt="Logo" width={28} height={28} className="rounded-lg" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col">
                <span className="truncate text-base font-bold text-white">
                  Campus Virtual
                </span>
                <span className="truncate text-[12px] text-white/60">
                  I.E. Antonio Brugués Carmona
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="mx-3 w-auto bg-white/10" />

      <div className={cn("flex items-center gap-3 px-5 py-4", collapsed && "justify-center px-0")}>
        <Avatar className="size-10 shrink-0 ring-2 ring-white/20">
          <AvatarFallback className="bg-white/20 text-sm text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-white">
                  {displayName}
                </span>
                <span className="inline-flex w-fit rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/80">
                  {roleLabel}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="mx-3 w-auto bg-white/10" />

      <ScrollArea className="flex-1 px-3 py-4">
        <motion.nav
          className="flex flex-col gap-1"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <motion.div key={item.href} variants={itemVariants}>
                <Link
                  href={item.href}
                  onClick={() => onClose?.()}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] px-4 py-3 text-base font-medium transition-all duration-250",
                    collapsed ? "justify-center px-0" : "",
                    active
                      ? "bg-white text-[#0F6A3B] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="size-5 shrink-0" />
                  </motion.div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>
      </ScrollArea>

      <div className="px-4 py-4">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col items-center gap-2 rounded-[14px] bg-white/5 px-4 py-3 text-center"
            >
              <Image src="/images/logo.jpg" alt="Logo" width={40} height={40} className="rounded-xl opacity-80" />
              <div>
                <p className="text-[11px] font-semibold text-white/90 leading-tight">Institución Educativa</p>
                <p className="text-[11px] text-white/60 leading-tight">Antonio Brugués Carmona</p>
                <p className="text-[11px] text-white/60 leading-tight">Campus Virtual</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="mx-3 w-auto bg-white/10" />

      <div className="flex flex-col gap-1 p-3">
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-3 py-3 text-[15px] text-white/60 hover:text-white hover:bg-white/10",
              collapsed ? "justify-center px-0" : "justify-start px-4",
            )}
            onClick={onToggle}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? (
              <ChevronRight className="size-5" />
            ) : (
              <ChevronLeft className="size-5" />
            )}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Colapsar
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )}
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-3 py-3 text-[15px] text-red-300 hover:bg-white/10 hover:text-red-200",
            collapsed ? "justify-center px-0" : "justify-start px-4",
          )}
          onClick={handleLogout}
          title={collapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut className="size-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Cerrar Sesión
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

export default function AppSidebar({
  open,
  onClose,
  collapsed,
  onToggle,
}: AppSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex h-screen flex-col transition-all duration-300 ease",
          collapsed ? "w-20" : "w-[280px]",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={onToggle}
          onClose={onClose}
        />
      </aside>

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={onClose}>
          <SheetContent side="left" className="w-[320px] p-0">
            <SidebarContent onClose={onClose} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
