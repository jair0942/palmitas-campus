"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/hooks/use-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarClock, FileText, BookOpen } from "lucide-react"
import { motion } from "framer-motion"
import PageHeader from "@/components/shared/page-header"
import EmptyState from "@/components/shared/empty-state"
import StatusBadge, { getSubmissionStatus as getAssignmentStatus } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getDaysRemaining(dueDate: string): { text: string; urgency: "low" | "medium" | "high" | "overdue" } {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: "Vencida", urgency: "overdue" }
  if (diff === 0) return { text: "Hoy", urgency: "high" }
  if (diff === 1) return { text: "Mañana", urgency: "high" }
  if (diff <= 3) return { text: `En ${diff} días`, urgency: "medium" }
  return { text: `En ${diff} días`, urgency: "low" }
}

const urgencyStyles = {
  overdue: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  high: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  low: "bg-[#0F6A3B]/10 text-[#0F6A3B]",
}

const filters = ["Todas", "Pendientes", "Entregadas", "Calificadas"] as const

export default function TasksPage() {
  const router = useRouter()
  const { user, getAssignmentsForStudent, getClassesForUser, assignments, getClassById } = useStore()

  const [filter, setFilter] = useState("Todas")

  const isStudent = user?.role === "student"
  const isTeacher = user?.role === "teacher"

  const studentAssignments = useMemo(() => {
    if (!isStudent || !user) return []
    return getAssignmentsForStudent().map((a) => ({
      ...a,
      computedStatus: getAssignmentStatus(a, user.id),
      className: getClassById(a.classId)?.name || "Clase",
    }))
  }, [isStudent, user, getAssignmentsForStudent, getClassById])

  const filteredStudentAssignments = useMemo(() => {
    if (filter === "Todas") return studentAssignments
    return studentAssignments.filter((a) => {
      const statusKey = a.computedStatus
      if (filter === "Pendientes") return statusKey === "pendiente"
      if (filter === "Entregadas") return statusKey === "entregada"
      if (filter === "Calificadas") return statusKey === "calificada"
      return true
    })
  }, [filter, studentAssignments])

  const groupedAssignments = useMemo(() => {
    if (isStudent || !user) return {} as Record<string, { id: string; classId: string; title: string; points: number; dueDate: string; submissions: unknown[] }[]>
    const classes = getClassesForUser()
    const result: Record<string, (typeof assignments[number] & { className: string })[]> = {}
    for (const cls of classes) {
      const classAssignments = assignments
        .filter((a) => a.classId === cls.id)
        .map((a) => ({ ...a, className: cls.name }))
      if (classAssignments.length > 0) {
        result[cls.name] = classAssignments
      }
    }
    return result
  }, [isStudent, user, getClassesForUser, assignments])

  const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  }

  if (!user || user.role === "admin") {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <PageHeader
        icon={CalendarClock}
        title="Tareas"
        description={new Date().toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      {isStudent && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2"
          >
            {filters.map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="rounded-full"
              >
                {f}
              </Button>
            ))}
          </motion.div>

          {filteredStudentAssignments.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No hay tareas con este filtro"
              description="Las tareas aparecerán aquí cuando sean asignadas"
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            >
              {filteredStudentAssignments.map((assignment) => {
                const daysInfo = getDaysRemaining(assignment.dueDate)
                const isOverdue = daysInfo.urgency === "overdue"
                const status = isOverdue ? "vencida" : assignment.computedStatus
                return (
                  <motion.div key={assignment.id} variants={staggerItem}>
                    <Card
                      className={cn(
                        "group cursor-pointer overflow-hidden border transition-all duration-200 hover:shadow-lg hover:border-primary/20",
                        isOverdue && "border-red-200/50 dark:border-red-900/50",
                      )}
                      onClick={() => router.push(`/classes/${assignment.classId}`)}
                    >
                      <div className={cn(
                        "h-1.5 w-full",
                        isOverdue ? "bg-red-500" : status === "pendiente" ? "bg-amber-500" : status === "entregada" ? "bg-[#0F6A3B]" : "bg-emerald-500"
                      )} />
                      <CardContent className="space-y-4 pt-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            isOverdue ? "bg-red-50 dark:bg-red-950/30" : status === "pendiente" ? "bg-amber-50 dark:bg-amber-950/30" : status === "entregada" ? "bg-[#0F6A3B]/10" : "bg-emerald-50 dark:bg-emerald-950/30"
                          )}>
                            <FileText className={cn(
                              "size-5",
                              isOverdue ? "text-red-600 dark:text-red-400" : status === "pendiente" ? "text-amber-600 dark:text-amber-400" : status === "entregada" ? "text-[#0F6A3B]" : "text-emerald-600 dark:text-emerald-400"
                            )} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{assignment.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{assignment.className}</p>
                          </div>
                        </div>

                        {!isOverdue && status === "pendiente" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progreso</span>
                              <span>0%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full w-0 rounded-full bg-amber-500 transition-all duration-500" />
                            </div>
                          </div>
                        )}
                        {status === "entregada" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Revisión</span>
                              <span>Esperando</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full w-1/2 rounded-full bg-[#0F6A3B] transition-all duration-500" />
                            </div>
                          </div>
                        )}
                        {status === "calificada" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Completado</span>
                              <span>100%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full w-full rounded-full bg-emerald-500 transition-all duration-500" />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarClock className="size-3.5" />
                            <span>{formatDate(assignment.dueDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{assignment.points} pts</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <StatusBadge status={status} />
                          <span className={cn("text-xs font-medium rounded-full px-2 py-0.5", urgencyStyles[daysInfo.urgency])}>
                            {daysInfo.text}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </>
      )}

      {isTeacher && (
        <div className="space-y-8">
          {Object.keys(groupedAssignments).length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No hay tareas asignadas"
              description="Crea tareas desde la página de cada clase"
            />
          ) : (
            Object.entries(groupedAssignments).map(([className, classAssignments]) => (
              <motion.section
                key={className}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="size-4.5 text-muted-foreground" />
                  <h2 className="text-base font-semibold tracking-tight text-foreground">{className}</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {classAssignments.map((assignment) => {
                    const daysInfo = getDaysRemaining(assignment.dueDate)
                    const submissionCount = assignment.submissions?.length || 0
                    return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3 }}
                      >
                        <Card
                          className="group cursor-pointer overflow-hidden border transition-all duration-200 hover:shadow-lg hover:border-primary/20"
                          onClick={() => router.push(`/classes/${assignment.classId}`)}
                        >
                          <div className={cn(
                            "h-1.5 w-full",
                            daysInfo.urgency === "overdue" ? "bg-red-500" : daysInfo.urgency === "high" ? "bg-rose-500" : daysInfo.urgency === "medium" ? "bg-amber-500" : "bg-[#0F6A3B]"
                          )} />
                          <CardContent className="space-y-4 pt-4">
                            <div className="flex items-start gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <FileText className="size-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground">{assignment.title}</p>
                                <p className="text-xs text-muted-foreground">{assignment.points} pts</p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Entregas</span>
                                <span>{submissionCount}</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${Math.min(100, submissionCount * 20)}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarClock className="size-3.5" />
                                <span>Vence: {formatDate(assignment.dueDate)}</span>
                              </div>
                              <span className={cn("text-xs font-medium rounded-full px-2.5 py-0.5", urgencyStyles[daysInfo.urgency])}>
                                {daysInfo.text}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.section>
            ))
          )}
        </div>
      )}
    </div>
  )
}
