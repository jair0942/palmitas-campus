import { prisma } from "@/lib/prisma";

export async function getStudentEnrollmentGroupIds(studentId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { campusId: true },
  });
  if (!user?.campusId) return [];

  const semester = await prisma.semester.findFirst({
    where: { campusId: user.campusId, active: true },
  });
  if (!semester) return [];

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      semesterId: semester.id,
      status: "ACTIVE",
    },
  });
  if (!enrollment) return [];
  return [enrollment.academicGroupId];
}
