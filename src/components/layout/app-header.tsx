"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Menu, Search, Bell, Sun, Moon, CheckCheck, MessageCircle, FileText, ClipboardList, Star, Users, BookOpen } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useStore } from "@/hooks/use-store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AppHeaderProps {
  onMenuClick: () => void;
}

const notifColors: Record<string, string> = {
  new_assignment: "bg-[#0F6A3B]",
  grade: "bg-[#F2C230]",
  comment: "bg-[#D62828]",
  new_post: "bg-[#0F6A3B]",
  submission: "bg-[#16A34A]",
  new_user: "bg-[#0F6A3B]",
  new_class: "bg-[#0F6A3B]",
};

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diff < 1) return "Ahora";
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const notifIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  new_post: MessageCircle,
  new_assignment: FileText,
  submission: ClipboardList,
  grade: Star,
  comment: MessageCircle,
  new_user: Users,
  new_class: BookOpen,
};

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const {
    getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
    semesters, getActiveSemester, setActiveSemester,
  } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const notifications = getNotifications();
  const unreadCount = getUnreadCount();
  const activeSem = getActiveSemester();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const buttonHover = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
  };

  function handleNotifClick(notif: typeof notifications[number]) {
    if (!notif.isRead) markNotificationRead(notif.id);
    if (notif.classId) router.push(`/classes/${notif.classId}`);
    else if (notif.type === "new_user") router.push("/admin/users");
    else if (notif.type === "new_class") router.push("/admin/classes");
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-white px-4 shadow-sm border-b-2 border-[#0F6A3B]/10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <motion.div {...buttonHover}>
            <Menu className="size-5" />
          </motion.div>
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#0F6A3B]/10">
            <Image src="/images/logo.jpg" alt="Logo" width={24} height={24} className="rounded-lg" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-[#111827]">Campus Virtual</span>
          </div>
        </div>
      </div>

      <div className="relative hidden w-64 sm:block md:w-72">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-[14px] border-[#E5E7EB] bg-[#F8FAFC] pl-9 h-10 text-[15px]"
        />
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <Select
            value={activeSem?.id || ""}
            onValueChange={(v) => { if (v) setActiveSemester(v); }}
          >
            <SelectTrigger size="sm" className="h-10 border-[#E5E7EB] bg-[#F8FAFC] text-[14px]">
              <SelectValue placeholder="Semestre" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.active ? "(Activo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          <motion.div {...buttonHover}>
            {theme === "light" ? <Sun className="size-5 text-[#6B7280]" /> : <Moon className="size-5 text-[#6B7280]" />}
          </motion.div>
        </Button>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="relative">
                <motion.div {...buttonHover} className="relative">
                  <Bell className="size-5 text-[#6B7280]" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[#D62828] text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </motion.div>
              </Button>
            }
          />
          <PopoverContent align="end" sideOffset={8} className="w-96 p-0 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <span className="text-[17px] font-semibold text-[#111827]">Notificaciones</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="xs" className="gap-1 text-[14px] h-auto py-1.5 text-[#0F6A3B]" onClick={markAllNotificationsRead}>
                  <CheckCheck className="size-3.5" />
                  Marcar todas
                </Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="size-8 text-[#6B7280]/30" />
                <p className="text-[15px] text-[#6B7280]">No hay notificaciones</p>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-0.5 p-1">
                  {notifications.map((n) => {
                    const Icon = notifIcons[n.type] || Bell;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left text-[15px] transition-colors hover:bg-[#F0F7F3]",
                          !n.isRead && "bg-[#F0F7F3]"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          notifColors[n.type] || "bg-[#0F6A3B]/10",
                          (notifColors[n.type] || "").includes("F2C230") ? "text-[#111827]" : "text-white"
                        )}>
                          {Icon && <Icon className="size-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[15px] leading-snug", !n.isRead && "font-semibold text-[#111827]")}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-[13px] text-[#6B7280] line-clamp-2">
                            {n.message}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B7280]/60">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div className="mt-1.5 size-2 shrink-0 rounded-full bg-[#0F6A3B]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
