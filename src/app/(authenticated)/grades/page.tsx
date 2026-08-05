"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/hooks/use-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/page-header"
import EmptyState from "@/components/shared/empty-state"
import SectionTitle from "@/components/shared/section-title"
import RouteGuard from "@/components/auth/route-guard"
import { Award, TrendingUp, BookOpen, BarChart3, CheckCircle2, Clock, XCircle, Pencil, Send, Star } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getUserDisplayName } from "@/lib/domain"
import { isAssignmentPublished } from "@/lib/domain"
import { classAveragePercent, gradedScoresByAssignment, meanPercent } from "@/lib/grading"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function getPercentage(score: number | null, maxScore: number): number | null {
  if (score === null) return null
  return Math.round((score / maxScore) * 100)
}

function getGradeColor(percentage: number | null): string {
  if (percentage === null) return "text-muted-foreground"
  if (percentage >= 90) return "text-emerald-600 dark:text-emerald-400"
  if (percentage >= 70) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function getStatusLabel(sub: { grade: unknown } | undefined): { label: string; color: string; icon: React.ComponentType<{ className?: string }> } {
  if (!sub) return { label: "Pendiente", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800", icon: Clock }
  if (sub.grade) return { label: "Calificada", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 }
  return { label: "Entregada", color: "bg-[#0F6A3B]/10 text-[#0F6A3B] border-[#0F6A3B]/30", icon: Send }
}

export default function GradesPage() {
  const { user, assignments, getClassesForUser, getClassById, getStudentsInClass, getUserName, gradeSubmission, getStudentSubmission } = useStore()

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [editGradeSubId, setEditGradeSubId] = useState<string | null>(null)
  const [editGradeScore, setEditGradeScore] = useState("")
  const [editGradeFeedback, setEditGradeFeedback] = useState("")
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null)

  const userClasses = useMemo(() => getClassesForUser(), [getClassesForUser])
  const selectedClass = useMemo(() => selectedClassId ? getClassById(selectedClassId) : null, [selectedClassId, getClassById])
  const studentsInClass = useMemo(() => selectedClassId ? getStudentsInClass(selectedClassId) : [], [selectedClassId, getStudentsInClass])
  const classAssignments = useMemo(() => {
    if (!selectedClassId) return []
    return assignments
      .filter((a) => a.classId === selectedClassId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [selectedClassId, assignments])

  const isStudent = user?.role === "student"
  const isTeacher = user?.role === "teacher"

  function handleEditGrade(assignmentId: string, submissionId: string, currentScore: number | null, currentFeedback: string) {
    setEditAssignmentId(assignmentId)
    setEditGradeSubId(submissionId)
    setEditGradeScore(currentScore?.toString() || "")
    setEditGradeFeedback(currentFeedback || "")
  }

  function handleSaveGrade() {
    if (!editAssignmentId || !editGradeSubId || !editGradeScore) return
    gradeSubmission(editAssignmentId, editGradeSubId, Number(editGradeScore), editGradeFeedback)
    setEditGradeSubId(null)
    setEditGradeScore("")
    setEditGradeFeedback("")
    setEditAssignmentId(null)
  }

  if (!user) return null

  if (isStudent) {
    const classesWithData = userClasses.map((cls) => {
      const clsAssignments = assignments
        .filter((a) => a.classId === cls.id)
        .filter((a) => isAssignmentPublished(a.publishAt))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const gradesData = clsAssignments.map((a) => {
        const sub = a.submissions.find((s) => s.studentId === user.id)
        const status = getStatusLabel(sub)
        const pct = sub?.grade ? getPercentage(sub.grade.score, a.points) : null
        return { assignment: a, submission: sub, status, pct }
      })
      const avg = classAveragePercent(assignments, cls.id, user.id)
      return { class: cls, grades: gradesData, average: avg }
    }).filter((c) => c.grades.length > 0)

    const overallAverage = meanPercent(classesWithData.map((c) => c.average))

    return (
      <RouteGuard allow={["student", "teacher"]}>
        <div className="mx-auto max-w-7xl space-y-8 p-6">
        <PageHeader icon={Award} title="Mis Calificaciones" />

        {overallAverage !== null && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="relative overflow-hidden border-transparent bg-gradient-to-br from-primary/5 to-primary/0 shadow-lg">
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0F6A3B] to-[#16A34A]" />
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F6A3B] to-[#16A34A] shadow-sm">
                  <TrendingUp className="size-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Promedio General</p>
                  <p className="text-3xl font-bold tracking-tight text-foreground">{overallAverage}%</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {classesWithData.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No hay calificaciones disponibles"
            description="Las calificaciones aparecerán cuando los profesores califiquen tus entregas"
          />
        ) : (
          classesWithData.map(({ class: cls, grades: gData, average: avg }, idx) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="size-5 text-muted-foreground" />
                    {cls.name}
                    {avg !== null && <Badge variant="secondary">{avg}%</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Tarea</TableHead>
                        <TableHead className="font-semibold">Entrega</TableHead>
                        <TableHead className="font-semibold">Calificación</TableHead>
                        <TableHead className="font-semibold">Porcentaje</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="hidden sm:table-cell font-semibold">Retroalimentación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gData.map(({ assignment: a, submission: sub, status, pct }) => {
                        const StatusIcon = status.icon
                        return (
                          <TableRow key={a.id} className="transition-colors hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-sm">{a.title}</p>
                                <p className="text-xs text-muted-foreground">Vence: {formatDate(a.dueDate)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {sub ? (
                                <span className="text-xs text-muted-foreground">{formatDateTime(sub.submittedAt)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">&mdash;</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {sub?.grade ? (
                                <span className="font-semibold">{sub.grade.score}/{a.points}</span>
                              ) : (
                                <span className="text-muted-foreground">&mdash;</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {pct !== null ? (
                                <span className={cn("font-semibold", getGradeColor(pct))}>{pct}%</span>
                              ) : (
                                <span className="text-muted-foreground">&mdash;</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", status.color)}>
                                <StatusIcon className="size-3" />
                                {status.label}
                              </span>
                            </TableCell>
                            <TableCell className="hidden max-w-[200px] sm:table-cell">
                              {sub?.grade?.feedback ? (
                                <p className="text-xs text-muted-foreground line-clamp-2">{sub.grade.feedback}</p>
                              ) : sub?.grade ? (
                                <span className="text-xs text-muted-foreground">Sin retroalimentación</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">&mdash;</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
    </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard allow={["student", "teacher"]}>
      <div className="mx-auto max-w-7xl space-y-8 p-6">
      <PageHeader icon={Award} title="Calificaciones" description="Gestiona las calificaciones de tus estudiantes" />

      <div className="flex flex-wrap gap-2">
        {userClasses.map((cls) => (
          <Button
            key={cls.id}
            variant={selectedClassId === cls.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedClassId(cls.id)}
            className="rounded-full"
          >
            {cls.name}
          </Button>
        ))}
      </div>

      {!selectedClassId && (
        <EmptyState
          icon={BookOpen}
          title="Selecciona una clase"
          description="Elige una clase para ver las calificaciones de los estudiantes"
        />
      )}

      {selectedClassId && selectedClass && (
        <motion.div key={selectedClassId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {classAssignments.length === 0 ? (
            <EmptyState icon={BarChart3} title="No hay tareas en esta clase" description="Crea tareas para comenzar a calificar" />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44 font-semibold">Estudiante</TableHead>
                    {classAssignments.map((a) => (
                      <TableHead key={a.id} className="min-w-[120px] text-center text-xs font-semibold">
                        {a.title}
                        <div className="text-2xs font-normal text-muted-foreground">{a.points} pts</div>
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-center font-semibold">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsInClass.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={classAssignments.length + 2} className="py-12 text-center text-muted-foreground">
                        No hay estudiantes en esta clase
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentsInClass.map((student) => {
                      const studentRows = gradedScoresByAssignment(assignments, selectedClassId, student.id)
                      const studentAverage = classAveragePercent(assignments, selectedClassId, student.id)
                      return (
                        <TableRow key={student.id} className="transition-colors hover:bg-muted/30">
                          <TableCell className="font-medium">{getUserDisplayName(student)}</TableCell>
                          {classAssignments.map((a) => {
                            const sub = a.submissions.find((s) => s.studentId === student.id)
                            const row = studentRows.get(a.id)
                            const score = row?.score ?? null
                            const pct = getPercentage(score, a.points)
                            const isGraded = score != null
                            return (
                              <TableCell key={a.id} className="text-center">
                                {sub ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {score !== null ? (
                                      <span className={cn("font-semibold", getGradeColor(pct))}>
                                        {score}/{a.points}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-[#0F6A3B]">Entregado</span>
                                    )}
                                    <Dialog>
                                      <DialogTrigger render={
                                        <Button variant="ghost" size="xs" className="h-6 gap-1 text-2xs" onClick={() => {
                                          handleEditGrade(a.id, sub.id, sub.grade?.score ?? null, sub.grade?.feedback ?? "")
                                        }}>
                                          <Pencil className="size-2.5" />
                                          {isGraded ? "Editar" : "Calificar"}
                                        </Button>
                                      } />
                                      <DialogContent className="sm:max-w-sm">
                                        <DialogHeader><DialogTitle>{isGraded ? "Editar calificación" : "Calificar"} - {getUserDisplayName(student)}</DialogTitle></DialogHeader>
                                        <div className="space-y-3 py-2">
                                          <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Tarea: {a.title}</label>
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Puntaje (máx. {a.points})</label>
                                            <Input type="number" max={a.points} value={editGradeScore}
                                              onChange={(e) => setEditGradeScore(e.target.value)}
                                              placeholder={`0 - ${a.points}`} />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Retroalimentación</label>
                                            <Textarea value={editGradeFeedback}
                                              onChange={(e) => setEditGradeFeedback(e.target.value)}
                                              placeholder="Escribe tu retroalimentación..." rows={3} />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                                          <DialogClose render={
                                            <Button onClick={handleSaveGrade} disabled={!editGradeScore}>
                                              <Star className="size-3.5" />
                                              {isGraded ? "Guardar cambios" : "Guardar calificación"}
                                            </Button>
                                          } />
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">&mdash;</span>
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center">
                            {studentAverage !== null ? (
                              <span className={cn("font-semibold", getGradeColor(studentAverage))}>
                                {studentAverage}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      )}
    </div>
    </RouteGuard>
  )
}
