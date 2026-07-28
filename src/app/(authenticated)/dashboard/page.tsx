"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useStore } from "@/hooks/use-store";
import { getSubmissionStatus } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  BookOpen, CalendarClock, FileText, GraduationCap, Users,
  BarChart3, UserCheck, Settings, School, Activity,
  ChevronRight, Bell, TrendingUp, CheckCircle, Clock,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatCard from "@/components/shared/stat-card";
import EmptyState from "@/components/shared/empty-state";
import SectionTitle from "@/components/shared/section-title";
import { CLASS_COLORS } from "@/components/shared/gradient-card";
import { getUserDisplayName } from "@/lib/domain";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardHover = {
  whileHover: { y: -4, transition: { duration: 0.25 } },
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    users,
    classes,
    assignments,
    semesters,
    cycles,
    subjects,
    enrollments,
    getClassesForUser,
    getUpcomingAssignments,
    getUpcomingPosts,
    getTeacherForClass,
    getClassById,
    getStudentSubmission,
    getTeachers,
    getStudents,
    getActiveSemester,
  } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!user) return null;

  if (user.role === "admin") {
    const teachers = getTeachers();
    const students = getStudents();
    const totalClasses = classes.length;
    const totalTeachers = teachers.length;
    const totalStudents = students.length;
    const activeSem = getActiveSemester();
    const totalCycles = cycles.length;
    const totalSubjects = subjects.length;
    const totalAssignments = assignments.length;
    const activeEnrollments = activeSem
      ? enrollments.filter((e) => e.semesterId === activeSem.id).length
      : 0;

    const statCards = [
      { icon: School, value: activeSem?.name || "N/A", label: "Semestre Activo", colorKey: "teachers" },
      { icon: GraduationCap, value: totalTeachers, label: "Profesores", colorKey: "teachers" },
      { icon: Users, value: activeEnrollments, label: "Estudiantes Matriculados", colorKey: "students" },
      { icon: BookOpen, value: totalClasses, label: "Clases", colorKey: "classes" },
      { icon: BarChart3, value: totalCycles, label: "Ciclos", colorKey: "tasks" },
      { icon: FileText, value: totalAssignments, label: "Tareas", colorKey: "tasks" },
    ];

    const quickLinks = [
      { label: "Semestres", icon: School, href: "/admin/settings#semestres" },
      { label: "Ciclos", icon: BarChart3, href: "/admin/settings#ciclos" },
      { label: "Materias", icon: BookOpen, href: "/admin/settings#materias" },
      { label: "Profesores", icon: GraduationCap, href: "/admin/users?tab=teachers", count: totalTeachers },
      { label: "Estudiantes", icon: Users, href: "/admin/users?tab=students", count: totalStudents },
      { label: "Clases", icon: BookOpen, href: "/admin/classes", count: totalClasses },
      { label: "Matrículas", icon: UserCheck, href: "/admin/assignments" },
      { label: "Reportes", icon: BarChart3, href: "/admin/reports" },
      { label: "Configuración", icon: Settings, href: "/admin/settings" },
    ];

    const recentActivity = [
      ...classes.map((c) => ({ label: `Clase "${c.name}" creada`, date: c.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <motion.div {...scaleIn} transition={{ duration: 0.5 }}>
          <motion.div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0F6A3B] via-[#0F6A3B] to-[#084D2C] px-8 py-10 text-white shadow-lg">
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-[0.04] pointer-events-none">
              <Image
                src="/images/logo.jpg"
                alt=""
                width={400}
                height={400}
                className="h-full w-full object-contain object-right"
              />
            </div>
            <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/5" />
            <div className="relative z-10">
              <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                Bienvenido nuevamente, {getUserDisplayName(user).split(" ")[0] || "Usuario"}
              </h1>
              <p className="mt-1.5 text-[16px] text-white/75">
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[15px] text-white/65">
                <School className="size-4" />
                <span>{activeSem ? `Semestre activo: ${activeSem.name}` : "Sin semestre activo"}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </motion.div>

        <section>
          <SectionTitle
            icon={BarChart3}
            title="Acceso Rápido"
            className="mb-4"
          />
          <motion.div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <motion.div key={link.href} variants={fadeUp} {...cardHover}>
                  <Card
                    className="cursor-pointer transition-all duration-250 hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)]"
                    onClick={() => router.push(link.href)}
                  >
                    <CardContent className="flex items-center gap-4 py-5">
                      <div className="flex size-11 items-center justify-center rounded-full bg-[#0F6A3B]/10">
                        <Icon className="size-5 text-[#0F6A3B]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[16px] font-medium text-[#111827]">{link.label}</p>
                        {link.count !== undefined && (
                          <p className="text-[14px] text-[#6B7280]">{link.count} registrados</p>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-[#6B7280]" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        <section>
          <SectionTitle
            icon={Activity}
            title="Actividad Reciente"
            className="mb-4"
          />
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Sin actividad reciente"
              description="La actividad aparecerá aquí cuando haya cambios"
            />
          ) : (
            <motion.div
              className="space-y-2"
              variants={stagger}
              initial="initial"
              animate="animate"
            >
              {recentActivity.map((item, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <div className="flex items-center justify-between rounded-[16px] border border-[#E5E7EB] bg-white px-5 py-4 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-[#0F6A3B]/10">
                        <Activity className="size-4 text-[#0F6A3B]" />
                      </div>
                      <p className="text-[16px] text-[#111827]">{item.label}</p>
                    </div>
                    <span className="text-[14px] text-[#6B7280]">{formatDate(item.date)}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    );
  }

  const myClasses = getClassesForUser().slice(0, 4);
  const upcomingAssignments = getUpcomingAssignments(5);
  const recentPosts = getUpcomingPosts(5);

  function getAssignmentStatus(assignmentId: string) {
    if (user?.role !== "student" || !user) return null;
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return null;
    return getSubmissionStatus(assignment, user.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <motion.div {...scaleIn} transition={{ duration: 0.5 }}>
        <motion.div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0F6A3B] via-[#0F6A3B] to-[#084D2C] px-8 py-10 text-white shadow-lg">
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-[0.04] pointer-events-none">
            <Image
              src="/images/logo.jpg"
              alt=""
              width={400}
              height={400}
              className="h-full w-full object-contain object-right"
            />
          </div>
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/5" />
          <div className="relative z-10">
            <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              Bienvenido, {getUserDisplayName(user).split(" ")[0] || "Usuario"}
            </h1>
            <p className="mt-1.5 text-[16px] text-white/75">
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[15px] text-white/65">
              <BookOpen className="size-4" />
              <span>{myClasses.length} clases activas</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <section>
        <SectionTitle
          icon={BookOpen}
          title="Tus Clases"
          className="mb-4"
        />
        {myClasses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No hay clases asignadas"
            description="Las clases aparecerán aquí cuando sean asignadas"
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {myClasses.map((cls, index) => {
              const teacher = getTeacherForClass(cls.id);
              return (
                <motion.div key={cls.id} variants={fadeUp} {...cardHover}>
                  <Card
                    className="cursor-pointer overflow-hidden border-0 shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-250 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
                    onClick={() => router.push(`/classes/${cls.id}`)}
                  >
                    <div className={`bg-gradient-to-r ${CLASS_COLORS[index % CLASS_COLORS.length]} px-5 py-5`}>
                      <h3 className="text-[18px] font-bold text-white">{cls.name}</h3>
                      {cls.section && <p className="mt-0.5 text-[13px] text-white/80">{cls.section}</p>}
                    </div>
                    <CardContent className="pb-4 pt-4">
                      <p className="text-[15px] text-[#6B7280]">{getUserDisplayName(teacher) || "Profesor"}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      <section>
        <SectionTitle
          icon={CalendarClock}
          title="Próximas Tareas"
          className="mb-4"
        />
        {upcomingAssignments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No hay tareas próximas"
            description="Las tareas aparecerán aquí cuando sean creadas"
          />
        ) : (
          <motion.div
            className="space-y-3"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {upcomingAssignments.map((assignment) => {
              const cls = getClassById(assignment.classId);
              const status = getAssignmentStatus(assignment.id);
              const statusLabels: Record<string, string> = {
                pendiente: "Pendiente", entregada: "Entregada", calificada: "Calificada",
                requiere_correcciones: "Requiere correcciones", reenviada: "Reenviada", vencida: "Vencida",
              };
              const statusColors: Record<string, string> = {
                pendiente: "text-[#D62828] bg-[#D62828]/10",
                entregada: "text-[#0F6A3B] bg-[#0F6A3B]/10",
                calificada: "text-[#16A34A] bg-[#16A34A]/10",
                requiere_correcciones: "text-[#F2C230] bg-[#F2C230]/10",
                reenviada: "text-[#0F6A3B] bg-[#0F6A3B]/10",
                vencida: "text-[#D62828] bg-[#D62828]/10",
              };
              return (
                <motion.div key={assignment.id} variants={fadeUp} {...cardHover}>
                  <Card
                    className="cursor-pointer transition-all duration-250 hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)]"
                    onClick={() => router.push(`/classes/${assignment.classId}`)}
                  >
                    <CardContent className="flex items-start gap-4 py-5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0F6A3B]/10">
                        <FileText className="size-5 text-[#0F6A3B]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-medium text-[#111827]">{assignment.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-[14px] text-[#6B7280]">
                          <span>{cls?.name || "Clase"}</span>
                          <span>&middot;</span>
                          <span>Vence: {formatDate(assignment.dueDate)}</span>
                        </div>
                        {assignment.points && (
                          <span className="mt-1 inline-flex text-[12px] font-medium text-[#6B7280]">
                            {assignment.points} pts
                          </span>
                        )}
                      </div>
                      {status && (
                        <Badge
                          variant="outline"
                          className={statusColors[status] || ""}
                        >
                          {statusLabels[status] || status}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      <section>
        <SectionTitle
          icon={Bell}
          title="Últimas Publicaciones"
          className="mb-4"
        />
        {recentPosts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No hay publicaciones recientes"
            description="Las publicaciones aparecerán aquí cuando sean creadas"
          />
        ) : (
          <motion.div
            className="space-y-3"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {recentPosts.map((post) => {
              const cls = getClassById(post.classId);
              const teacher = cls ? getTeacherForClass(cls.id) : undefined;
              return (
                <motion.div key={post.id} variants={fadeUp} {...cardHover}>
                  <Card
                    className="cursor-pointer transition-all duration-250 hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)]"
                    onClick={() => router.push(`/classes/${post.classId}`)}
                  >
                    <CardContent className="py-5">
                      <p className="text-[16px] text-[#111827]">{post.content}</p>
                      <div className="mt-3 flex items-center gap-3 text-[14px] text-[#6B7280]">
                        <div className="flex items-center gap-1.5">
                          <div className="flex size-6 items-center justify-center rounded-full bg-[#0F6A3B]/10 text-[11px] font-medium text-[#0F6A3B]">
                            {getUserDisplayName(teacher).charAt(0) || "?"}
                          </div>
                          <span>{getUserDisplayName(teacher)}</span>
                        </div>
                        <span>&middot;</span>
                        <span>{cls?.name || "Clase"}</span>
                        <span>&middot;</span>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
}
