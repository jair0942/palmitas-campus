import type { CampusScope } from "./campus-scope";

// Visibilidad de matrículas según el usuario autenticado (resuelto en backend).
// ESTUDIANTE: únicamente sus propias matrículas.
// PROFESOR: únicamente matrículas de los grupos que administra o enseña
//           (manager del grupo, o grupo con clases bajo su TeachingAssignment,
//            o grupo referenciado directamente por su TeachingAssignment).
// ADMIN de sede / admin global con sede seleccionada: matrículas de esa sede.
// Admin global sin sede: acceso global (allowed por el diseño administrativo actual).
export function enrollmentReadWhere(scope: CampusScope): Record<string, unknown> {
  if (scope.role === "student") {
    return { studentId: scope.userId };
  }

  if (scope.role === "teacher") {
    return {
      academicGroup: {
        ...(scope.campusId ? { campusId: scope.campusId } : {}),
        OR: [
          { managerTeacherId: scope.userId },
          { classes: { some: { teachingAssignment: { teacherId: scope.userId } } } },
          { teachingAssignments: { some: { teacherId: scope.userId } } },
        ],
      },
    };
  }

  if (scope.campusId) {
    return { academicGroup: { campusId: scope.campusId } };
  }

  return {};
}