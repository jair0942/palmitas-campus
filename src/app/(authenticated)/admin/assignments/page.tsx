"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, History, School, UserCheck, Users, X } from "lucide-react";
import type { Enrollment } from "@/types";
import { useStore } from "@/hooks/use-store";
import { getAcademicGroupStudentName, getUserDisplayName } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";
import RouteGuard from "@/components/auth/route-guard";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminAssignmentsPage() {
  const {
    user,
    semesters,
    cycles,
    academicGroups,
    enrollments,
    getStudents,
    getActiveSemester,
    getEnrollmentsForSemester,
    addEnrollment,
    removeEnrollment,
  } = useStore();

  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [academicGroupId, setAcademicGroupId] = useState("");

  const activeSemester = getActiveSemester();
  const students = getStudents();
  const currentSemesterId = selectedSemesterId || activeSemester?.id || semesters[0]?.id || "";
  const currentSemester = semesters.find((semester) => semester.id === currentSemesterId);
  const semesterGroups = academicGroups.filter((group) => group.semesterId === currentSemesterId && group.active);
  const activeEnrollments = currentSemesterId ? getEnrollmentsForSemester(currentSemesterId) : [];
  const enrolledStudentIds = new Set(activeEnrollments.map((enrollment) => enrollment.studentId));
  const availableStudents = students.filter((student) => !enrolledStudentIds.has(student.id));
  const semesterHistory = enrollments.filter((enrollment) => enrollment.semesterId === currentSemesterId);
  const withdrawnEnrollments = semesterHistory.filter((enrollment) => enrollment.status === "withdrawn");

  function getStudentName(id: string) {
    return getUserDisplayName(students.find((student) => student.id === id));
  }

  function getCycleName(groupId: string) {
    const group = academicGroups.find((item) => item.id === groupId);
    const cycle = cycles.find((item) => item.id === group?.cycleId);
    return cycle?.name || "Ciclo";
  }

  async function handleCreateEnrollment() {
    if (!studentId || !academicGroupId || !currentSemesterId) return;
    const created = await addEnrollment(studentId, currentSemesterId, academicGroupId);
    if (!created) {
      alert("Este estudiante ya tiene una matricula activa en el semestre seleccionado.");
      return;
    }
    setStudentId("");
    setAcademicGroupId("");
  }

  async function handleWithdrawEnrollment(enrollment: Enrollment) {
    if (confirm("Esta accion conserva el historial y marca la matricula como retirada. Continuar?")) {
      await removeEnrollment(enrollment.id);
    }
  }

  return (
    <RouteGuard allow={["admin"]}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader icon={UserCheck} title="Matriculas Academicas" description="Matricula estudiantes por semestre y grupo academico sin modificar el historial" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <School className="size-4 text-primary" />
              </div>
              Nueva matricula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Semestre</label>
              <Select value={currentSemesterId} onValueChange={(value) => { setSelectedSemesterId(value ?? ""); setAcademicGroupId(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar semestre" /></SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id}>{semester.name}{semester.active ? " (Activo)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Estudiante</label>
              <Select value={studentId} onValueChange={(value) => setStudentId(value ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccionar estudiante" /></SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>{getUserDisplayName(student)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Grupo academico</label>
              <Select value={academicGroupId} onValueChange={(value) => setAcademicGroupId(value ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                <SelectContent>
                  {semesterGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.nameInternal} - {getCycleName(group.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreateEnrollment} disabled={!currentSemesterId || !studentId || !academicGroupId} className="w-full gap-1.5">
              <UserCheck className="size-3.5" />
              Matricular estudiante
            </Button>

            {currentSemester && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium text-foreground">{currentSemester.name}</p>
                <p className="text-xs text-muted-foreground">{activeEnrollments.length} estudiante{activeEnrollments.length !== 1 ? "s" : ""} con matricula activa</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {semesterGroups.length === 0 ? (
            <EmptyState icon={BarChart3} title="No hay grupos academicos" description="Crea clases para generar grupos academicos del semestre." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {semesterGroups.map((group) => {
                const groupEnrollments = activeEnrollments.filter((enrollment) => enrollment.academicGroupId === group.id);
                return (
                  <Card key={group.id} className="h-full shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between gap-3 text-base">
                        <span>
                          {group.nameInternal}
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{getAcademicGroupStudentName(group)} - {getCycleName(group.id)}</span>
                        </span>
                        <Badge variant="secondary">{groupEnrollments.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupEnrollments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin estudiantes matriculados.</p>
                      ) : (
                        <div className="space-y-2">
                          {groupEnrollments.map((enrollment) => (
                            <div key={enrollment.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                  <Users className="size-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{getStudentName(enrollment.studentId)}</p>
                                  <p className="text-xs text-muted-foreground">{formatDate(enrollment.enrolledAt)}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon-xs" className="text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleWithdrawEnrollment(enrollment)}>
                                <X className="size-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><History className="size-4 text-primary" />Historial del semestre</CardTitle>
            </CardHeader>
            <CardContent>
              {semesterHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aun no hay matriculas en este semestre.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{activeEnrollments.length} activas</Badge>
                  <Badge variant="outline">{withdrawnEnrollments.length} retiradas</Badge>
                  <Badge variant="secondary">{semesterHistory.length} registros conservados</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
    </RouteGuard>
  );
}
