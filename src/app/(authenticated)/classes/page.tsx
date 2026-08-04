"use client";

import { motion } from "framer-motion";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { BookOpen, Users } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import RouteGuard from "@/components/auth/route-guard";
import { CLASS_COLORS } from "@/components/shared/gradient-card";
import { getUserDisplayName } from "@/lib/domain";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ClassesPage() {
  const router = useRouter();
  const { user, getClassesForUser, getTeacherForClass, getStudentsInClass } = useStore();

  const isStudent = user?.role === "student";
  const classes = getClassesForUser();

  return (
    <RouteGuard allow={["student", "teacher"]}>
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <PageHeader
        icon={BookOpen}
        title="Mis Clases"
        description={`${classes.length} clase${classes.length !== 1 ? "s" : ""}`}
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={isStudent ? "Sin inscripciones" : "Sin clases"}
          description={isStudent ? "No estás inscrito en ninguna clase." : "No tienes clases asignadas."}
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {classes.map((cls, index) => {
            const teacher = getTeacherForClass(cls.id);
            const students = getStudentsInClass(cls.id);
            return (
              <motion.div
                key={cls.id}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
              >
                <Card
                  className="cursor-pointer overflow-hidden border-0 shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-250 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
                  onClick={() => router.push(`/classes/${cls.id}`)}
                >
                  <div
                    className={`bg-gradient-to-br px-5 py-6 ${CLASS_COLORS[index % CLASS_COLORS.length]}`}
                  >
                    <h3 className="text-[18px] font-bold text-white">{cls.name}</h3>
                    {cls.section && (
                      <p className="mt-0.5 text-[13px] text-white/80">{cls.section}</p>
                    )}
                  </div>
                  <CardContent className="space-y-2 pb-5 pt-4">
                    <p className="text-[15px] text-[#6B7280]">
                      {getUserDisplayName(teacher)}
                    </p>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
                      <Users className="size-3.5" />
                      <span>{students.length} estudiante{students.length !== 1 ? "s" : ""}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
    </RouteGuard>
  );
}
