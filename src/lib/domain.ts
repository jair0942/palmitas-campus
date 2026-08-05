import type { AcademicGroup, Class, Cycle, Subject, User } from "@/types";

export function getUserDisplayName(user?: Pick<User, "firstName" | "lastName" | "username"> | null) {
  if (!user) return "Usuario";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.username || "Usuario";
}

export function getUserInitials(user?: Pick<User, "firstName" | "lastName" | "username"> | null) {
  const displayName = getUserDisplayName(user);
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function isCycle2(cycle?: Pick<Cycle, "order" | "usesSubjects"> | null) {
  return !!cycle && cycle.order === 2 && !cycle.usesSubjects;
}

export function getAcademicGroupStudentName(group?: Pick<AcademicGroup, "nameForStudents"> | null) {
  return group?.nameForStudents || "Grupo academico";
}

export function getClassDisplayName(
  cls: Pick<Class, "name" | "subjectId">,
  group?: AcademicGroup | null,
  cycle?: Cycle | null,
  subject?: Subject | null,
) {
  if (isCycle2(cycle)) return getAcademicGroupStudentName(group);
  return cls.name || subject?.name || getAcademicGroupStudentName(group);
}

export function isAssignmentPublished(publishAt?: string | null): boolean {
  if (!publishAt) return true;
  return new Date(publishAt).getTime() <= Date.now();
}
