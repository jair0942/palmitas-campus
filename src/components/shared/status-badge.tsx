"use client";

import { cn } from "@/lib/utils";
import type { Submission } from "@/types";
import { Clock, CheckCircle, Award, AlertCircle, RefreshCw, FileEdit } from "lucide-react";

export type SubmissionStatus = "pendiente" | "entregada" | "requiere_correcciones" | "reenviada" | "calificada" | "vencida";

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

const config: Record<SubmissionStatus, { icon: React.ComponentType<{ className?: string }>; label: string; classes: string }> = {
  pendiente: {
    icon: Clock,
    label: "Pendiente",
    classes: "bg-[#F2C230]/10 text-[#B8860B] border-[#F2C230]/30",
  },
  entregada: {
    icon: CheckCircle,
    label: "Entregada",
    classes: "bg-[#0F6A3B]/10 text-[#0F6A3B] border-[#0F6A3B]/30",
  },
  requiere_correcciones: {
    icon: FileEdit,
    label: "Requiere correcciones",
    classes: "bg-[#D62828]/10 text-[#D62828] border-[#D62828]/30",
  },
  reenviada: {
    icon: RefreshCw,
    label: "Reenviada",
    classes: "bg-[#0F6A3B]/10 text-[#0F6A3B] border-[#0F6A3B]/30",
  },
  calificada: {
    icon: Award,
    label: "Calificada",
    classes: "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30",
  },
  vencida: {
    icon: AlertCircle,
    label: "Vencida",
    classes: "bg-[#D62828]/10 text-[#D62828] border-[#D62828]/30",
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { icon: Icon, label, classes } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium", classes, className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

export function getSubmissionsForStudent(assignment: { submissions: Submission[] }, studentId: string) {
  return assignment.submissions
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => b.version - a.version);
}

export function getLatestSubmission(assignment: { submissions: Submission[] }, studentId: string) {
  return getSubmissionsForStudent(assignment, studentId)[0] || null;
}

export function getSubmissionStatus(
  assignment: { submissions: Submission[]; dueDate: string },
  studentId: string,
): SubmissionStatus {
  const latest = getLatestSubmission(assignment, studentId);
  if (!latest) {
    const dueDate = new Date(assignment.dueDate);
    return dueDate < new Date() ? "vencida" : "pendiente";
  }
  if (latest.grade) return "calificada";
  if (latest.correctionsRequest) return "requiere_correcciones";
  if (latest.version > 1) return "reenviada";
  return "entregada";
}
