import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { CampusScope } from "./campus-scope";

// Guard de autorización backend para objetos que dependen de una clase
// (assignments, posts). NUNCA confiar en ids enviados por el cliente:
// la relación docente→class y estudiante→academicGroup se resuelve contra el modelo.
//   - ADMIN: conserva el comportamiento administrativo (alcance por sede).
//   - TEACHER: solo clases donde exista un TeachingAssignment con su teacherId.
//   - STUDENT: solo clases del academicGroup donde esté matriculado.

export const FORBIDDEN_CLASS = NextResponse.json(
  { error: "No tienes acceso a esta clase" },
  { status: 403 }
);

export async function findScopeClass(scope: CampusScope, classId: string) {
  return prisma.class.findFirst({
    where: {
      id: classId,
      ...(scope.campusId
        ? { academicGroup: { campusId: scope.campusId } }
        : {}),
    },
    include: { teachingAssignment: true },
  });
}

type GuardResult = {
  cls: Awaited<ReturnType<typeof findScopeClass>>;
  error: NextResponse | null;
};

// Cualquier actor (admin/teacher/student) que pueda operar sobre una clase.
export async function assertClassActor(
  scope: CampusScope,
  classId: string,
  opts: { students?: boolean } = {}
): Promise<GuardResult> {
  const cls = await findScopeClass(scope, classId);
  if (!cls) return { cls: null, error: NextResponse.json({ error: "Class not found" }, { status: 404 }) };

  if (scope.role === "teacher") {
    if (cls.teachingAssignment?.teacherId !== scope.userId) {
      return { cls, error: FORBIDDEN_CLASS };
    }
    return { cls, error: null };
  }

  if (scope.role === "student") {
    if (!opts.students) return { cls, error: FORBIDDEN_CLASS };
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: scope.userId, academicGroupId: cls.academicGroupId },
    });
    if (!enrolled) return { cls, error: FORBIDDEN_CLASS };
    return { cls, error: null };
  }

  // admin (global o de sede): comportamiento administrativo actual
  return { cls, error: null };
}

export async function assertAssignmentWritable(scope: CampusScope, assignmentId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      ...(scope.campusId
        ? { class: { academicGroup: { campusId: scope.campusId } } }
        : {}),
    },
    include: { class: { include: { teachingAssignment: true } } },
  });
  if (!assignment) return { assignment: null, error: NextResponse.json({ error: "Assignment not found" }, { status: 404 }) };
  if (scope.role === "teacher" && assignment.class.teachingAssignment?.teacherId !== scope.userId) {
    return { assignment, error: FORBIDDEN_CLASS };
  }
  return { assignment, error: null };
}

export async function assertPostWritable(scope: CampusScope, postId: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      ...(scope.campusId
        ? { class: { academicGroup: { campusId: scope.campusId } } }
        : {}),
    },
    include: { class: { include: { teachingAssignment: true } } },
  });
  if (!post) return { post: null, error: NextResponse.json({ error: "Post not found" }, { status: 404 }) };
  if (scope.role === "teacher") {
    const teaches = post.class.teachingAssignment?.teacherId === scope.userId;
    const isAuthor = post.authorId === scope.userId;
    if (!teaches && !isAuthor) {
      return { post, error: FORBIDDEN_CLASS };
    }
  }
  return { post, error: null };
}