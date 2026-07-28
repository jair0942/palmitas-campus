"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import {
  BarChart3, School, GraduationCap, Users, TrendingUp, Award,
  FileText, CheckCircle2, Clock, Filter,
} from "lucide-react";
import { getUserDisplayName } from "@/lib/domain";

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.p
      className="text-3xl font-bold tracking-tight text-foreground"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      {value}{suffix}
    </motion.p>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, classes, assignments, grades, teachingAssignments, getTeachers, getStudents, getStudentsInClass, getTeacherForClass, getUserName } = useStore();

  const teachers = getTeachers();
  const students = getStudents();
  const totalClasses = classes.length;
  const totalTeachers = teachers.length;
  const totalStudents = students.length;
  const totalAssignments = assignments.length;
  const totalSubmissions = assignments.reduce((sum, a) => sum + a.submissions.length, 0);
  const totalGraded = assignments.reduce((sum, a) =>
    sum + a.submissions.filter((s) => s.grade).length, 0
  );

  const [filterClass, setFilterClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");

  const filteredAssignments = (() => {
    let result = assignments;
    if (filterClass) result = result.filter((a) => a.classId === filterClass);
    if (filterTeacher) {
      const teacherClassIds = classes
        .filter((c) => {
          const ta = teachingAssignments.find((a) => a.id === c.teachingAssignmentId);
          return ta?.teacherId === filterTeacher;
        })
        .map((c) => c.id);
      result = result.filter((a) => teacherClassIds.includes(a.classId));
    }
    return result;
  })();

  const gradeEntries = (() => {
    const entries: {
      className: string; teacherName: string; studentName: string;
      assignmentTitle: string; score: number | null; maxScore: number;
      status: string; gradedAt: string | null;
    }[] = [];
    for (const a of filteredAssignments) {
      const cls = classes.find((c) => c.id === a.classId);
      const teacher = cls ? getTeacherForClass(cls.id) : undefined;
      for (const sub of a.submissions) {
        const student = students.find((s) => s.id === sub.studentId);
        entries.push({
          className: cls?.name || "—",
          teacherName: getUserDisplayName(teacher),
          studentName: student ? getUserDisplayName(student) : getUserName(sub.studentId),
          assignmentTitle: a.title,
          score: sub.grade?.score ?? null,
          maxScore: a.points,
          status: sub.grade ? "Calificada" : "Entregada",
          gradedAt: sub.grade?.gradedAt ?? null,
        });
      }
    }
    return entries.sort((a, b) => {
      if (b.status === "Calificada" && a.status !== "Calificada") return 1;
      if (a.status === "Calificada" && b.status !== "Calificada") return -1;
      return 0;
    });
  })();

  if (!user || user.role !== "admin") {
    router.push("/dashboard");
    return null;
  }

  const classesWithCounts = classes
    .map((c) => ({ ...c, studentCount: getStudentsInClass(c.id).length }))
    .sort((a, b) => b.studentCount - a.studentCount);

  const maxCount = classesWithCounts[0]?.studentCount || 0;

  const stats = [
    { icon: School, value: totalClasses, label: "Total Clases", gradient: "from-[#0F6A3B] to-[#16A34A]" },
    { icon: GraduationCap, value: totalTeachers, label: "Profesores", gradient: "from-[#0F6A3B] to-[#084D2C]" },
    { icon: Users, value: totalStudents, label: "Estudiantes", gradient: "from-[#F2C230] to-[#D4A020]" },
    { icon: FileText, value: totalAssignments, label: "Tareas creadas", gradient: "from-[#D62828] to-[#B82020]" },
    { icon: Clock, value: totalSubmissions, label: "Entregas recibidas", gradient: "from-[#0F6A3B] to-[#16A34A]" },
    { icon: CheckCircle2, value: totalGraded, label: "Tareas calificadas", gradient: "from-[#16A34A] to-[#0F6A3B]" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Estadísticas generales y supervisión de calificaciones"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="relative overflow-hidden border-transparent bg-gradient-to-br from-card to-card/95 shadow-lg shadow-black/5">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.08]`} />
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient}`} />
                <CardContent className="relative flex items-center gap-3 py-4">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                    <Icon className="size-5 text-white" />
                  </div>
                  <div>
                    <CountUp value={stat.value} />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Clases con más estudiantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classesWithCounts.length === 0 ? (
                <EmptyState icon={BarChart3} title="No hay clases creadas" />
              ) : (
                <div className="space-y-4">
                  {classesWithCounts.map((c, index) => {
                    const percentage = maxCount > 0 ? (c.studentCount / maxCount) * 100 : 0;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * index }}
                        className="flex items-center gap-4"
                      >
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          index === 1 ? "bg-gray-400/20 text-gray-400" :
                          index === 2 ? "bg-orange-500/20 text-orange-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index < 3 ? <Award className="size-4" /> : `#${index + 1}`}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{c.name}</p>
                            <p className="text-xs font-medium text-muted-foreground">{c.studentCount} estudiante{c.studentCount !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="mt-1.5 h-2.5 w-full rounded-full bg-muted">
                            <motion.div
                              className="h-2.5 rounded-full"
                              style={{ backgroundColor: index === 0 ? "#0F6A3B" : index === 1 ? "#16A34A" : index === 2 ? "#F2C230" : "#D62828" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + 0.05 * index, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-primary" />
                Resumen de calificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-foreground">Total tareas</span>
                <Badge variant="outline">{totalAssignments}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-foreground">Total entregas</span>
                <Badge variant="outline">{totalSubmissions}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-foreground">Calificadas</span>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  {totalGraded}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-foreground">Pendientes de calificar</span>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  {totalSubmissions - totalGraded}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-foreground">Promedio general</span>
                <Badge variant="secondary" className="bg-[#0F6A3B]/10 text-[#0F6A3B]">
                  {totalGraded > 0
                    ? `${Math.round(grades.reduce((s, g) => s + (g.average ?? 0), 0) / Math.max(1, grades.filter((g) => g.average !== null).length))}%`
                    : "—"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4 text-primary" />
              Supervisión de calificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="w-full sm:w-56 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Filtrar por clase</label>
                <Select value={filterClass} onValueChange={(v) => { setFilterClass(v ?? ""); setFilterTeacher(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las clases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las clases</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-56 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Filtrar por profesor</label>
                <Select value={filterTeacher} onValueChange={(v) => { setFilterTeacher(v ?? ""); setFilterClass(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los profesores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los profesores</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{getUserDisplayName(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {gradeEntries.length === 0 ? (
              <EmptyState icon={BarChart3} title="No hay entregas registradas" description="Las entregas aparecerán cuando los estudiantes comiencen a enviar tareas" />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Estudiante</TableHead>
                      <TableHead className="font-semibold">Clase</TableHead>
                      <TableHead className="font-semibold">Profesor</TableHead>
                      <TableHead className="font-semibold">Tarea</TableHead>
                      <TableHead className="text-center font-semibold">Nota</TableHead>
                      <TableHead className="text-center font-semibold">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeEntries.map((entry, idx) => (
                      <TableRow key={idx} className="transition-colors hover:bg-muted/30">
                        <TableCell className="font-medium">{entry.studentName}</TableCell>
                        <TableCell>{entry.className}</TableCell>
                        <TableCell>{entry.teacherName}</TableCell>
                        <TableCell>{entry.assignmentTitle}</TableCell>
                        <TableCell className="text-center">
                          {entry.score !== null ? (
                            <span className="font-semibold">{entry.score}/{entry.maxScore}</span>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.status === "Calificada" ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              Calificada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-[#0F6A3B]/10 text-[#0F6A3B]">
                              Entregada
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
