"use client";

import { motion } from "framer-motion";
import type { Assignment } from "@/types";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CalendarClock, Star, Paperclip, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  assignment: Assignment;
  classId: string;
  onClick?: () => void;
  index?: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysRemaining(dueDate: string): { text: string; urgency: "low" | "medium" | "high" | "overdue" } {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Vencida", urgency: "overdue" };
  if (diff === 0) return { text: "Hoy", urgency: "high" };
  if (diff === 1) return { text: "Mañana", urgency: "high" };
  if (diff <= 3) return { text: `En ${diff} días`, urgency: "medium" };
  return { text: `En ${diff} días`, urgency: "low" };
}

const urgencyColors = {
  overdue: { bar: "bg-red-500", icon: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" },
  high: { bar: "bg-rose-500", icon: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400" },
  medium: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
  low: { bar: "bg-blue-500", icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
};

export default function AssignmentCard({ assignment, classId, onClick, index = 0 }: AssignmentCardProps) {
  const { user, getStudentSubmission } = useStore();
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const daysInfo = getDaysRemaining(assignment.dueDate);
  const isOverdue = daysInfo.urgency === "overdue";
  const colors = urgencyColors[daysInfo.urgency];

  let submission = null;
  if (isStudent) {
    submission = getStudentSubmission(assignment.id, user!.id);
  }

  const progressWidth = submission?.grade ? "100%" : submission ? "50%" : "0%";
  const progressColor = submission?.grade ? "bg-emerald-500" : submission ? "bg-blue-500" : "bg-amber-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className="group relative cursor-pointer overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:shadow-lg"
        onClick={onClick}
      >
        <div className={cn("h-1 w-full", colors.bar)} />
        <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary/80 to-primary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <CardContent className="space-y-3 py-4 pl-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <motion.div
                className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors", colors.icon)}
                whileHover={{ rotate: [0, -10, 10, -5, 0], transition: { duration: 0.4 } }}
              >
                <FileText className="size-5" />
              </motion.div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {assignment.title}
                </p>
                {assignment.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {assignment.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {isStudent && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{submission?.grade ? "Calificado" : submission ? "Entregado" : "Pendiente"}</span>
                <span>{submission?.grade ? "100%" : submission ? "50%" : "0%"}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", progressColor)}
                  style={{ width: progressWidth }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-muted-foreground/70" />
              <span className={isOverdue ? "font-medium text-destructive" : ""}>
                {formatDate(assignment.dueDate)}
              </span>
            </div>
            {isOverdue && (
              <div className="flex items-center gap-1 text-destructive">
                <Clock className="size-3.5" />
                <span className="font-medium">Vencida</span>
              </div>
            )}
            <div className="flex items-center gap-1 rounded-md bg-primary/5 px-2 py-0.5 font-medium text-primary">
              <Star className="size-3" />
              {assignment.points} pts
            </div>
            {assignment.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground/70">
                <Paperclip className="size-3.5" />
                <span>{assignment.attachments.length} archivo{assignment.attachments.length !== 1 ? "s" : ""}</span>
              </div>
            )}
            {isTeacher && (
              <motion.span
                className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {assignment.submissions.length} entrega{assignment.submissions.length !== 1 ? "s" : ""}
              </motion.span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
