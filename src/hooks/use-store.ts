"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  AcademicGroup,
  Assignment,
  Attachment,
  AuditLog,
  Campus,
  Class,
  Comment,
  Cycle,
  Enrollment,
  FileAsset,
  InstitutionSettings,
  Notification,
  NotificationType,
  Post,
  Semester,
  StudentGrade,
  Subject,
  Submission,
  TeachingAssignment,
  User,
} from "@/types";
import { getUserDisplayName } from "@/lib/domain";

interface AppState {
  user: User | null;
  users: User[];
  campuses: Campus[];
  semesters: Semester[];
  cycles: Cycle[];
  subjects: Subject[];
  academicGroups: AcademicGroup[];
  teachingAssignments: TeachingAssignment[];
  enrollments: Enrollment[];
  classes: Class[];
  posts: Post[];
  assignments: Assignment[];
  grades: StudentGrade[];
  notifications: Notification[];
  fileAssets: FileAsset[];
  institutionSettings: InstitutionSettings;
  auditLogs: AuditLog[];
}

const emptyInstitutionSettings: InstitutionSettings = {
  id: "institution-settings",
  schoolName: "Institución Educativa Antonio Brugués Carmona",
  activeSemesterId: null,
  primaryColor: "#0F6A3B",
  secondaryColor: "#F2C230",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let globalState: AppState = {
  user: null,
  users: [],
  campuses: [],
  semesters: [],
  cycles: [],
  subjects: [],
  academicGroups: [],
  teachingAssignments: [],
  enrollments: [],
  classes: [],
  posts: [],
  assignments: [],
  grades: [],
  notifications: [],
  fileAssets: [],
  institutionSettings: emptyInstitutionSettings,
  auditLogs: [],
};

let listeners: Array<() => void> = [];

let isLoading = true;
let isHydrated = false;

function notify() {
  for (const listener of listeners) listener();
}

function nowIso() {
  return new Date().toISOString();
}

function isActiveEnrollment(enrollment: Enrollment) {
  return enrollment.status !== "withdrawn";
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}



function getActiveSemesterFromState(state = globalState) {
  return state.semesters.find((semester) => semester.id === state.institutionSettings.activeSemesterId)
    || state.semesters.find((semester) => semester.active);
}

function getActiveEnrollmentForStudent(studentId: string, semesterId: string, state = globalState) {
  return state.enrollments.find((enrollment) =>
    enrollment.studentId === studentId &&
    enrollment.semesterId === semesterId &&
    isActiveEnrollment(enrollment)
  );
}

function getAcademicGroupById(academicGroupId: string, state = globalState) {
  return state.academicGroups.find((group) => group.id === academicGroupId);
}

function getStudentIdsForClass(cls: Class, state = globalState) {
  return state.enrollments
    .filter((enrollment) => enrollment.academicGroupId === cls.academicGroupId && isActiveEnrollment(enrollment))
    .map((enrollment) => enrollment.studentId);
}

function mapApiUserToStore(apiUser: Record<string, unknown>): User {
  return {
    id: apiUser.id as string,
    username: apiUser.username as string,
    password: "",
    passwordHash: "",
    documentType: (apiUser.documentType as string) || "",
    documentNumber: (apiUser.documentNumber as string) || "",
    firstName: apiUser.firstName as string,
    lastName: (apiUser.lastName as string) || "",
    phone: (apiUser.phone as string) || "",
    email: (apiUser.email as string) || null,
    role: apiUser.role as "admin" | "teacher" | "student",
    avatar: (apiUser.avatar as string) || "",
    campusId: (apiUser.campusId as string) || null,
    campus: (apiUser.campus as { id: string; name: string; code: string } | undefined) || null,
    active: apiUser.active as boolean,
    blocked: apiUser.blocked as boolean,
    mustChangePassword: (apiUser.mustChangePassword as boolean) || false,
    lastLoginAt: (apiUser.lastLoginAt as string) || null,
    createdAt: (apiUser.createdAt as string) || new Date().toISOString(),
    updatedAt: (apiUser.updatedAt as string) || new Date().toISOString(),
  };
}

const CAMPUS_STORAGE_KEY = "campusVirtual.activeCampusId";

function getStoredCampusId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CAMPUS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function isGlobalAdminUser(user: User | null): boolean {
  return !!user && user.role === "admin" && !user.campusId;
}

async function fetchApi(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (isGlobalAdminUser(globalState.user)) {
    const campusId = getStoredCampusId();
    if (campusId) headers.set("x-campus-id", campusId);
  }
  return fetch(input, { ...init, headers });
}

function mapApiSubmissionToOldFormat(sub: Record<string, unknown>): Submission & { assignmentId?: string } {
  const versions = sub.versions as Array<Record<string, unknown>> | undefined;
  const latestVersion = versions?.[0];
  const openCorrection = (sub.correctionRequests as Array<Record<string, unknown>> | undefined)?.find((c) => c.status === "open");
  return {
    id: sub.id as string,
    studentId: sub.studentId as string,
    assignmentId: sub.assignmentId as string,
    version: (latestVersion?.versionNumber as number) || 1,
    content: (latestVersion?.content as string) || "",
    attachments: (latestVersion?.attachments as Attachment[]) || [],
    submittedAt: ((latestVersion?.submittedAt as string) || (sub.createdAt as string)),
    grade: sub.grade ? { score: (sub.grade as Record<string, unknown>).score as number, feedback: (sub.grade as Record<string, unknown>).feedback as string, gradedAt: (sub.grade as Record<string, unknown>).gradedAt as string } : null,
    comments: [],
    correctionsRequest: openCorrection ? { feedback: openCorrection.observations as string, requestedAt: openCorrection.createdAt as string } : null,
  };
}

async function notifyUsers(userIds: string[], type: NotificationType, title: string, message: string, classId?: string, relatedId?: string) {
  const adminId = globalState.users.find((user) => user.role === "admin")?.id;
  const seen = new Set<string>();
  const allIds = [...new Set([...userIds, ...(adminId && !userIds.includes(adminId) ? [adminId] : [])])];
  for (const userId of allIds) {
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    try {
      const res = await fetchApi("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type, title, message, classId, relatedId }),
      });
      if (res.ok) {
        const notif = await res.json();
        globalState = { ...globalState, notifications: [...globalState.notifications, notif] };
      }
    } catch {}
  }
}

async function logAction(
  action: string,
  module: string,
  result: "success" | "failure" = "success",
  metadata?: Record<string, unknown>,
  tableName?: string,
  recordId?: string,
) {
  const userId: string | null = globalState.user?.id || null;
  try {
    const res = await fetchApi("/api/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, module, result, metadata, tableName, recordId }),
    });
    if (res.ok) {
      const log = await res.json();
      globalState = { ...globalState, auditLogs: [...globalState.auditLogs, log] };
    }
  } catch {}
}

export function useStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((tick) => tick + 1);
    listeners.push(handler);

    loadAll().finally(handler);

    return () => {
      listeners = listeners.filter((listener) => listener !== handler);
    };
  }, []);

  const loadAll = useCallback(async () => {
    isLoading = true;
    notify();
    try {
      const [meRes, usersRes, semestersRes, cyclesRes, subjectsRes, tasRes, settingsRes, groupsRes, enrollmentsRes, classesRes, postsRes, assignmentsRes, fileAssetsRes, submissionsRes, campusesRes] = await Promise.all([
        fetchApi("/api/auth/me"),
        fetchApi("/api/users"),
        fetchApi("/api/semesters"),
        fetchApi("/api/cycles"),
        fetchApi("/api/subjects"),
        fetchApi("/api/teaching-assignments"),
        fetchApi("/api/institution-settings"),
        fetchApi("/api/academic-groups"),
        fetchApi("/api/enrollments"),
        fetchApi("/api/classes"),
        fetchApi("/api/posts"),
        fetchApi("/api/assignments"),
        fetchApi("/api/file-assets"),
        fetchApi("/api/submissions"),
        fetchApi("/api/campuses"),
      ]);
        if (usersRes.ok) {
          const apiUsers = await usersRes.json();
          globalState = { ...globalState, users: apiUsers.map(mapApiUserToStore) };
        }
        if (semestersRes.ok) {
          globalState = { ...globalState, semesters: await semestersRes.json() };
        }
        if (cyclesRes.ok) {
          globalState = { ...globalState, cycles: await cyclesRes.json() };
        }
        if (subjectsRes.ok) {
          globalState = { ...globalState, subjects: await subjectsRes.json() };
        }
        if (tasRes.ok) {
          globalState = { ...globalState, teachingAssignments: await tasRes.json() };
        }
        if (settingsRes.ok) {
          globalState = { ...globalState, institutionSettings: await settingsRes.json() };
        }
        if (groupsRes.ok) {
          globalState = { ...globalState, academicGroups: await groupsRes.json() };
        }
        if (enrollmentsRes.ok) {
          globalState = { ...globalState, enrollments: await enrollmentsRes.json() };
        }
        if (classesRes.ok) {
          globalState = { ...globalState, classes: await classesRes.json() };
        }
        if (postsRes.ok) {
          const apiPosts = await postsRes.json();
          globalState = { ...globalState, posts: apiPosts };
        }
        if (assignmentsRes.ok) {
          const apiAssignments = await assignmentsRes.json();
          let apiSubmissions: (Submission & { assignmentId?: string })[] = [];
          if (submissionsRes.ok) {
            const rawSubs = await submissionsRes.json();
            apiSubmissions = (rawSubs as Array<Record<string, unknown>>).map(mapApiSubmissionToOldFormat);
          }
          const merged = apiAssignments.map((a: Record<string, unknown>) => ({
            ...a,
            submissions: apiSubmissions.filter((s) => s.assignmentId === a.id),
          }));
          globalState = { ...globalState, assignments: merged as Assignment[] };
        }
        if (fileAssetsRes.ok) {
          globalState = { ...globalState, fileAssets: await fileAssetsRes.json() };
        }
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            const meUser = mapApiUserToStore(meData.user);
            globalState = { ...globalState, user: meUser };
            if (isGlobalAdminUser(meUser)) {
              const stored = getStoredCampusId();
              if (!stored) {
                const firstCampus = (campusesRes.ok ? await campusesRes.json() : globalState.campuses)[0];
                if (firstCampus) {
                  try {
                    localStorage.setItem(CAMPUS_STORAGE_KEY, firstCampus.id);
                  } catch {}
                }
              }
            }
          }
        }
        if (campusesRes.ok) {
          const apiCampuses = await campusesRes.json();
          globalState = { ...globalState, campuses: apiCampuses };
        }
      } catch {
        // API unavailable
        isHydrated = true;
      }
      isLoading = false;
      isHydrated = true;
      notify();
    }, []);

  const login = useCallback(async (username: string, password: string): Promise<User | null> => {
    try {
      const res = await fetchApi("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify();
        return null;
      }
      const storeUser = mapApiUserToStore(data.user);
      globalState = { ...globalState, user: storeUser };
      const idx = globalState.users.findIndex((u) => u.id === storeUser.id);
      if (idx >= 0) {
        globalState.users[idx] = storeUser;
      } else {
        globalState.users.push(storeUser);
      }
      notify();
      return storeUser;
    } catch {
      notify();
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchApi("/api/auth/logout", { method: "POST" });
    } catch {}
    globalState = { ...globalState, user: null };
    notify();
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetchApi("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: data.error || "No se pudo cambiar la contraseña" };
      }
      try {
        const meRes = await fetchApi("/api/auth/me");
        if (meRes.ok) {
          const meData = (await meRes.json()) as { user?: Record<string, unknown> };
          if (meData.user) {
            globalState = { ...globalState, user: mapApiUserToStore(meData.user) };
          }
        }
      } catch {}
      notify();
      return { ok: true };
    } catch {
      return { ok: false, error: "Error de conexión. Intenta de nuevo." };
    }
  }, []);

  const getClassesForUser = useCallback((): Class[] => {
    const user = globalState.user;
    if (!user || user.role === "admin") return [];
    const activeSemester = getActiveSemesterFromState();
    if (!activeSemester) return [];
    if (user.role === "teacher") {
      return globalState.classes.filter((cls) => {
        const group = getAcademicGroupById(cls.academicGroupId);
        const ta = globalState.teachingAssignments.find((a) => a.id === cls.teachingAssignmentId);
        return ta?.teacherId === user.id && group?.semesterId === activeSemester.id;
      });
    }
    const enrollment = getActiveEnrollmentForStudent(user.id, activeSemester.id);
    if (!enrollment) return [];
    return globalState.classes.filter((cls) => cls.academicGroupId === enrollment.academicGroupId);
  }, []);

  const getPostsForClass = useCallback((classId: string): Post[] => {
    return globalState.posts
      .filter((post) => post.classId === classId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, []);

  const getAssignmentsForClass = useCallback((classId: string): Assignment[] => {
    return globalState.assignments
      .filter((assignment) => assignment.classId === classId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, []);

  const getAssignmentsForStudent = useCallback((): Assignment[] => {
    const user = globalState.user;
    if (!user || user.role !== "student") return [];
    const activeSemester = getActiveSemesterFromState();
    if (!activeSemester) return [];
    const enrollment = getActiveEnrollmentForStudent(user.id, activeSemester.id);
    if (!enrollment) return [];
    const classes = globalState.classes.filter((cls) => cls.academicGroupId === enrollment.academicGroupId);
    return globalState.assignments
      .filter((assignment) => classes.some((cls) => cls.id === assignment.classId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, []);

  const getUpcomingAssignments = useCallback((limit = 5): Assignment[] => {
    const now = new Date();
    const classes = getClassesForUser();
    return globalState.assignments
      .filter((assignment) => classes.some((cls) => cls.id === assignment.classId))
      .filter((assignment) => new Date(assignment.dueDate) > now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, limit);
  }, [getClassesForUser]);

  const getUpcomingPosts = useCallback((limit = 5): Post[] => {
    const classes = getClassesForUser();
    return globalState.posts
      .filter((post) => classes.some((cls) => cls.id === post.classId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [getClassesForUser]);

  const getUserName = useCallback((userId: string): string => {
    return getUserDisplayName(globalState.users.find((user) => user.id === userId));
  }, []);

  const getClassById = useCallback((classId: string): Class | undefined => {
    return globalState.classes.find((cls) => cls.id === classId);
  }, []);

  const getAcademicGroupForClass = useCallback((classId: string): AcademicGroup | undefined => {
    const cls = globalState.classes.find((item) => item.id === classId);
    return cls ? getAcademicGroupById(cls.academicGroupId) : undefined;
  }, []);

  const getCycleForGroup = useCallback((academicGroupId: string): Cycle | undefined => {
    const group = getAcademicGroupById(academicGroupId);
    return group ? globalState.cycles.find((cycle) => cycle.id === group.cycleId) : undefined;
  }, []);

  const getStudentsInClass = useCallback((classId: string): User[] => {
    const cls = globalState.classes.find((item) => item.id === classId);
    if (!cls) return [];
    const studentIds = getStudentIdsForClass(cls);
    return globalState.users.filter((user) => user.role === "student" && studentIds.includes(user.id));
  }, []);

  const getTeachers = useCallback((): User[] => globalState.users.filter((user) => user.role === "teacher"), []);
  const getStudents = useCallback((): User[] => globalState.users.filter((user) => user.role === "student"), []);

  const getTeacherForClass = useCallback((classId: string): User | undefined => {
    const cls = globalState.classes.find((item) => item.id === classId);
    if (!cls) return undefined;
    const ta = globalState.teachingAssignments.find((a) => a.id === cls.teachingAssignmentId);
    return ta ? globalState.users.find((user) => user.id === ta.teacherId) : undefined;
  }, []);

  const getStudentSubmission = useCallback((assignmentId: string, studentId: string): Submission | undefined => {
    const assignment = globalState.assignments.find((item) => item.id === assignmentId);
    return assignment?.submissions
      .filter((submission) => submission.studentId === studentId)
      .sort((a, b) => b.version - a.version)[0];
  }, []);

  const getStudentSubmissions = useCallback((assignmentId: string, studentId: string): Submission[] => {
    const assignment = globalState.assignments.find((item) => item.id === assignmentId);
    return assignment?.submissions
      .filter((submission) => submission.studentId === studentId)
      .sort((a, b) => a.version - b.version) || [];
  }, []);

  const getGradesForStudentInClass = useCallback((classId: string, studentId: string): StudentGrade | undefined => {
    return globalState.grades.find((grade) => grade.classId === classId && grade.studentId === studentId);
  }, []);

  const getNotifications = useCallback((): Notification[] => {
    const user = globalState.user;
    if (!user) return [];
    return globalState.notifications
      .filter((notification) => notification.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, []);

  const getUnreadCount = useCallback((): number => {
    const user = globalState.user;
    if (!user) return 0;
    return globalState.notifications.filter((notification) => notification.userId === user.id && !notification.isRead).length;
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetchApi(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        notifications: globalState.notifications.map((n) =>
          n.id === notificationId ? updated : n
        ),
      };
      notify();
    } catch {}
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) return;
      globalState = {
        ...globalState,
        notifications: globalState.notifications.map((n) =>
          n.userId === user.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
      };
      notify();
    } catch {}
  }, []);

  const getActiveSemester = useCallback((): Semester | undefined => getActiveSemesterFromState(), []);

  const setActiveSemester = useCallback(async (semesterId: string) => {
    try {
      const res = await fetchApi("/api/semesters/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semesterId }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        semesters: globalState.semesters.map((s) => ({ ...s, active: s.id === semesterId })),
        institutionSettings: { ...globalState.institutionSettings, activeSemesterId: semesterId },
      };
      notify();
    } catch {}
  }, []);

  const addSemester = useCallback(async (data: { code: string; name: string; startDate: string; endDate: string }): Promise<Semester | null> => {
    try {
      const res = await fetchApi("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const semester = await res.json();
      globalState = { ...globalState, semesters: [...globalState.semesters, semester] };
      notify();
      return semester;
    } catch {
      return null;
    }
  }, []);

  const updateSemester = useCallback(async (semesterId: string, data: Partial<Pick<Semester, "code" | "name" | "startDate" | "endDate">>) => {
    try {
      const res = await fetchApi(`/api/semesters/${semesterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        semesters: globalState.semesters.map((s) => (s.id === semesterId ? updated : s)),
      };
      notify();
    } catch {}
  }, []);

  const deleteSemester = useCallback(async (semesterId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/semesters/${semesterId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = {
        ...globalState,
        semesters: globalState.semesters.filter((s) => s.id !== semesterId),
      };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const addCycle = useCallback(async (data: { code: string; name: string; description: string; order: number; usesSubjects?: boolean }): Promise<Cycle | null> => {
    try {
      const res = await fetchApi("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const cycle = await res.json();
      globalState = { ...globalState, cycles: [...globalState.cycles, cycle] };
      notify();
      return cycle;
    } catch {
      return null;
    }
  }, []);

  const updateCycle = useCallback(async (cycleId: string, data: Partial<Pick<Cycle, "code" | "name" | "description" | "order" | "usesSubjects" | "active">>) => {
    try {
      const res = await fetchApi(`/api/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        cycles: globalState.cycles.map((c) => (c.id === cycleId ? updated : c)),
      };
      notify();
    } catch {}
  }, []);

  const deleteCycle = useCallback(async (cycleId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/cycles/${cycleId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = {
        ...globalState,
        cycles: globalState.cycles.filter((c) => c.id !== cycleId),
      };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const addSubject = useCallback(async (data: { name: string; code: string; color?: string; icon?: string; active?: boolean }): Promise<Subject | null> => {
    try {
      const res = await fetchApi("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const subject = await res.json();
      globalState = { ...globalState, subjects: [...globalState.subjects, subject] };
      notify();
      return subject;
    } catch {
      return null;
    }
  }, []);

  const updateSubject = useCallback(async (subjectId: string, data: Partial<Pick<Subject, "name" | "code" | "color" | "icon" | "active">>) => {
    try {
      const res = await fetchApi(`/api/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        subjects: globalState.subjects.map((s) => (s.id === subjectId ? updated : s)),
      };
      notify();
    } catch {}
  }, []);

  const deleteSubject = useCallback(async (subjectId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/subjects/${subjectId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = {
        ...globalState,
        subjects: globalState.subjects.filter((s) => s.id !== subjectId),
      };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const addAcademicGroup = useCallback(async (data: { semesterId: string; cycleId: string; managerTeacherId?: string | null; nameInternal: string; nameForStudents: string }): Promise<AcademicGroup | null> => {
    try {
      const res = await fetchApi("/api/academic-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const group = await res.json();
      globalState = { ...globalState, academicGroups: [...globalState.academicGroups, group] };
      notify();
      return group;
    } catch {
      return null;
    }
  }, []);

  const addEnrollment = useCallback(async (studentId: string, semesterId: string, academicGroupId: string): Promise<Enrollment | null> => {
    try {
      const res = await fetchApi("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, semesterId, academicGroupId }),
      });
      if (!res.ok) return null;
      const enrollment = await res.json();
      globalState = { ...globalState, enrollments: [...globalState.enrollments, enrollment] };
      notify();
      return enrollment;
    } catch {
      return null;
    }
  }, []);

  const removeEnrollment = useCallback(async (enrollmentId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WITHDRAWN" }),
      });
      if (!res.ok) return false;
      const enrollment = await res.json();
      globalState = {
        ...globalState,
        enrollments: globalState.enrollments.map((e) =>
          e.id === enrollmentId ? enrollment : e
        ),
      };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const getEnrollmentsForSemester = useCallback((semesterId: string): Enrollment[] => {
    return globalState.enrollments.filter((enrollment) => enrollment.semesterId === semesterId && isActiveEnrollment(enrollment));
  }, []);

  const getEnrolledStudentsInGroup = useCallback((academicGroupId: string): User[] => {
    const enrolled = globalState.enrollments.filter((enrollment) =>
      enrollment.academicGroupId === academicGroupId && isActiveEnrollment(enrollment)
    );
    return globalState.users.filter((user) => enrolled.some((enrollment) => enrollment.studentId === user.id));
  }, []);

  const getAcademicGroupForStudent = useCallback((studentId: string, semesterId: string): AcademicGroup | undefined => {
    const enrollment = getActiveEnrollmentForStudent(studentId, semesterId);
    return enrollment ? getAcademicGroupById(enrollment.academicGroupId) : undefined;
  }, []);

  const getStudentEnrollments = useCallback((studentId: string): Enrollment[] => {
    return globalState.enrollments
      .filter((enrollment) => enrollment.studentId === studentId)
      .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
  }, []);

  const addPost = useCallback(async (classId: string, content: string, attachments: Attachment[]) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, content, attachments, authorId: user.id }),
      });
      if (!res.ok) return;
      const post = await res.json();
      const cls = globalState.classes.find((item) => item.id === classId);
      if (cls) {
        notifyUsers(getStudentIdsForClass(cls), "new_post", "Nueva publicacion", `${getUserDisplayName(user)} publico en ${cls.name}`, classId, post.id);
      }
      globalState = { ...globalState, posts: [...globalState.posts, post] };
      notify();
    } catch {}
  }, []);

  const addClass = useCallback(async (data: {
    semesterId?: string;
    cycleId?: string;
    academicGroupId?: string;
    subjectId?: string | null;
    teacherId: string;
    name: string;
    section: string;
    description: string;
  }): Promise<Class | null> => {
    try {
      let academicGroupId = data.academicGroupId;
      if (!academicGroupId) {
        const semesterId = data.semesterId || getActiveSemesterFromState()?.id || globalState.semesters[0]?.id || "";
        const cycleId = data.cycleId || "cycle-3";
        const existingGroup = globalState.academicGroups.find((g) =>
          g.semesterId === semesterId && g.cycleId === cycleId && (g.managerTeacherId || null) === (data.teacherId || null)
        );
        if (existingGroup) {
          academicGroupId = existingGroup.id;
        } else {
          const groupRes = await fetchApi("/api/academic-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              semesterId,
              cycleId,
              managerTeacherId: data.teacherId,
              nameInternal: data.name,
              nameForStudents: data.name,
            }),
          });
          if (!groupRes.ok) return null;
          const newGroup = await groupRes.json();
          academicGroupId = newGroup.id;
          globalState = { ...globalState, academicGroups: [...globalState.academicGroups, newGroup] };
        }
      }
      const cycleId = data.cycleId || globalState.academicGroups.find((g) => g.id === academicGroupId)?.cycleId || "cycle-3";
      let taId = globalState.teachingAssignments.find((ta) =>
        ta.teacherId === data.teacherId &&
        ta.cycleId === cycleId &&
        (ta.subjectId || null) === (data.subjectId || null) &&
        (ta.academicGroupId || null) === (academicGroupId || null)
      )?.id;
      if (!taId) {
        const taRes = await fetchApi("/api/teaching-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: data.teacherId,
            cycleId,
            subjectId: data.subjectId || null,
            academicGroupId: academicGroupId || null,
          }),
        });
        if (!taRes.ok) return null;
        const newTA = await taRes.json();
        taId = newTA.id;
        globalState = { ...globalState, teachingAssignments: [...globalState.teachingAssignments, newTA] };
      }
      const classRes = await fetchApi("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicGroupId,
          subjectId: data.subjectId || null,
          teachingAssignmentId: taId,
          name: data.name,
          section: data.section,
          description: data.description,
        }),
      });
      if (!classRes.ok) return null;
      const cls = await classRes.json();
      globalState = { ...globalState, classes: [...globalState.classes, cls] };
      notify();
      return cls;
    } catch {
      return null;
    }
  }, []);

  const updateClass = useCallback(async (classId: string, data: Partial<Pick<Class, "name" | "description" | "section" | "subjectId" | "academicGroupId" | "teachingAssignmentId">>) => {
    try {
      const res = await fetchApi(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const cls = await res.json();
      globalState = { ...globalState, classes: globalState.classes.map((c) => c.id === classId ? cls : c) };
      notify();
    } catch {}
  }, []);

  const deleteClass = useCallback(async (classId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/classes/${classId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = { ...globalState, classes: globalState.classes.filter((c) => c.id !== classId) };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const addUser = useCallback(async (data: {
    username: string;
    password: string;
    role: "admin" | "teacher" | "student";
    firstName: string;
    lastName?: string;
    email?: string;
    documentType?: string;
    documentNumber?: string;
    phone?: string;
  }): Promise<User | null> => {
    try {
      const res = await fetchApi("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        if (process.env.NODE_ENV !== "production") console.error("addUser error:", err);
        return null;
      }
      const apiUser = await res.json();
      const user = mapApiUserToStore(apiUser);
      globalState = { ...globalState, users: [...globalState.users, user] };
      notify();
      return user;
    } catch {
      return null;
    }
  }, []);

  const updateUser = useCallback(async (userId: string, data: Partial<Pick<User, "username" | "password" | "firstName" | "lastName" | "email" | "role" | "documentType" | "documentNumber" | "phone" | "active" | "blocked" | "mustChangePassword">>) => {
    try {
      const res = await fetchApi(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const apiUser = await res.json();
      const user = mapApiUserToStore(apiUser);
      globalState = {
        ...globalState,
        users: globalState.users.map((u) => (u.id === userId ? user : u)),
      };
      if (globalState.user?.id === userId) {
        globalState = { ...globalState, user };
      }
      notify();
    } catch {}
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = { ...globalState, users: globalState.users.filter((u) => u.id !== userId) };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const assignStudentToClass = useCallback(async (classId: string, studentId: string) => {
    const cls = globalState.classes.find((item) => item.id === classId);
    const group = cls ? getAcademicGroupById(cls.academicGroupId) : undefined;
    if (!cls || !group) return;
    const existing = globalState.enrollments.find((enrollment) =>
      enrollment.studentId === studentId &&
      enrollment.semesterId === group.semesterId &&
      isActiveEnrollment(enrollment)
    );
    if (!existing) {
      try {
        const res = await fetchApi("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, semesterId: group.semesterId, academicGroupId: group.id }),
        });
        if (res.ok) {
          const enrollment = await res.json();
          globalState = { ...globalState, enrollments: [...globalState.enrollments, enrollment] };
        }
      } catch {}
    }
    const student = globalState.users.find((user) => user.id === studentId);
    if (student) {
      notifyUsers([studentId], "comment", "Asignado a clase", `Has sido asignado a ${cls.name}`, classId);
    }
    notify();
  }, []);

  const removeStudentFromClass = useCallback(async (classId: string, studentId: string) => {
    const cls = globalState.classes.find((item) => item.id === classId);
    if (!cls) return;
    const enrollment = globalState.enrollments.find((e) =>
      e.studentId === studentId && e.academicGroupId === cls.academicGroupId && isActiveEnrollment(e)
    );
    if (!enrollment) return;
    try {
      const res = await fetchApi(`/api/enrollments/${enrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WITHDRAWN" }),
      });
      if (res.ok) {
        const updated = await res.json();
        globalState = {
          ...globalState,
          enrollments: globalState.enrollments.map((e) => e.id === enrollment.id ? updated : e),
        };
      }
    } catch {}
    notify();
  }, []);

  const assignTeacherToClass = useCallback(async (classId: string, teacherId: string) => {
    const cls = globalState.classes.find((item) => item.id === classId);
    if (!cls) return;
    const ta = globalState.teachingAssignments.find((a) => a.id === cls.teachingAssignmentId);
    if (ta) {
      try {
        const res = await fetchApi(`/api/teaching-assignments/${ta.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId }),
        });
        if (res.ok) {
          const updated = await res.json();
          globalState = {
            ...globalState,
            teachingAssignments: globalState.teachingAssignments.map((a) =>
              a.id === ta.id ? updated : a
            ),
          };
        }
      } catch {}
    }
    const teacher = globalState.users.find((user) => user.id === teacherId);
    if (teacher) {
      notifyUsers([teacherId], "new_class", "Asignado como profesor", `Has sido asignado como profesor de ${cls.name}`, classId);
    }
    notify();
  }, []);

  const addAssignment = useCallback(async (data: { classId: string; title: string; description: string; points: number; dueDate: string; publishAt?: string; attachments: Attachment[] }) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: data.classId,
          title: data.title,
          description: data.description,
          points: data.points,
          dueDate: data.dueDate,
          publishAt: data.publishAt,
          attachments: data.attachments,
        }),
      });
      if (!res.ok) return;
      const assignment = await res.json();
      const cls = globalState.classes.find((item) => item.id === data.classId);
      if (cls) {
        notifyUsers(getStudentIdsForClass(cls), "new_assignment", "Nueva tarea", `Nueva tarea en ${cls.name}: ${data.title}`, data.classId, assignment.id);
      }
      globalState = { ...globalState, assignments: [...globalState.assignments, { ...assignment, submissions: [] }] };
      notify();
    } catch {}
  }, []);

  const deleteAssignment = useCallback(async (assignmentId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = { ...globalState, assignments: globalState.assignments.filter((a) => a.id !== assignmentId) };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const gradeSubmission = useCallback(async (assignmentId: string, submissionId: string, score: number, feedback: string) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi(`/api/submissions/${submissionId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradedBy: user.id, score, feedback }),
      });
      if (!res.ok) return;
      const gradedAt = nowIso();
      const assignment = globalState.assignments.find((item) => item.id === assignmentId);
      const submission = assignment?.submissions.find((item) => item.id === submissionId);
      if (!assignment || !submission) return;
      const { studentId } = submission;
      const classId = assignment.classId;
      const maxScore = assignment.points;
      const assignments = globalState.assignments.map((item) =>
        item.id === assignmentId
          ? { ...item, submissions: item.submissions.map((sub) => sub.id === submissionId ? { ...sub, grade: { score, feedback, gradedAt }, correctionsRequest: null } : sub) }
          : item
      );
      const existingGradeIndex = globalState.grades.findIndex((grade) => grade.studentId === studentId && grade.classId === classId);
      let grades: StudentGrade[];
      if (existingGradeIndex >= 0) {
        grades = globalState.grades.map((grade, index) => {
          if (index !== existingGradeIndex) return grade;
          const assignmentGradeIndex = grade.assignments.findIndex((item) => item.assignmentId === assignmentId);
          const nextAssignments = [...grade.assignments];
          if (assignmentGradeIndex >= 0) nextAssignments[assignmentGradeIndex] = { ...nextAssignments[assignmentGradeIndex], score, maxScore };
          else nextAssignments.push({ assignmentId, score, maxScore });
          const scored = nextAssignments.filter((item) => item.score !== null);
          const average = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score!, 0) / scored.length) : null;
          return { ...grade, assignments: nextAssignments, average };
        });
      } else {
        grades = [...globalState.grades, { id: `grade-${Date.now()}`, classId, studentId, assignments: [{ assignmentId, score, maxScore }], average: score }];
      }
      notifyUsers([studentId], "grade", "Tarea calificada", `Tu tarea "${assignment.title}" fue calificada con ${score}/${maxScore}`, classId, assignmentId);
      globalState = { ...globalState, assignments, grades };
      logAction("grade", "submissions", "success", { assignmentId, submissionId, score, maxScore }, "submissions", submissionId);
      notify();
    } catch {}
  }, []);

  const addCommentToPost = useCallback(async (postId: string, content: string) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, authorId: user.id }),
      });
      if (!res.ok) return;
      const comment = await res.json();
      const post = globalState.posts.find((item) => item.id === postId);
      if (post && post.authorId !== user.id) {
        notifyUsers([post.authorId], "comment", "Nuevo comentario", `${getUserDisplayName(user)} comento en una publicacion`, post.classId, postId);
      }
      globalState = {
        ...globalState,
        posts: globalState.posts.map((item) =>
          item.id === postId ? { ...item, comments: [...item.comments, comment] } : item
        ),
      };
      notify();
    } catch {}
  }, []);

  const addCommentToSubmission = useCallback(async (assignmentId: string, submissionId: string, content: string) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId: user.id, content, submissionId }),
      });
      if (!res.ok) return;
      const comment = await res.json();
      const submission = globalState.assignments
        .find((a) => a.id === assignmentId)
        ?.submissions.find((s) => s.id === submissionId);
      if (submission && submission.studentId !== user.id) {
        const assignment = globalState.assignments.find((a) => a.id === assignmentId);
        notifyUsers([submission.studentId], "comment", "Nuevo comentario", `${getUserDisplayName(user)} comento en tu entrega`, assignment?.classId, assignmentId);
      }
      globalState = {
        ...globalState,
        assignments: globalState.assignments.map((item) =>
          item.id === assignmentId
            ? { ...item, submissions: item.submissions.map((sub) => sub.id === submissionId ? { ...sub, comments: [...sub.comments, comment] } : sub) }
            : item
        ),
      };
      logAction("comment", "submissions", "success", { assignmentId, submissionId }, "submissions", submissionId);
      notify();
    } catch {}
  }, []);

  const submitAssignment = useCallback(async (assignmentId: string, content: string, attachments: Attachment[]) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const existing = globalState.assignments
        .find((a) => a.id === assignmentId)
        ?.submissions.find((s) => s.studentId === user.id);

      let submissionRes: Response;
      if (existing) {
        submissionRes = await fetchApi(`/api/submissions/${existing.id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, attachments }),
        });
      } else {
        submissionRes = await fetchApi("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId, studentId: user.id, content, attachments }),
        });
      }
      if (!submissionRes.ok) return;

      if (existing) {
        const version = await submissionRes.json();
        const assignment = globalState.assignments.find((a) => a.id === assignmentId);
        if (!assignment) return;
        const subIndex = assignment.submissions.findIndex((s) => s.studentId === user.id);
        if (subIndex < 0) return;
        const updatedSub = {
          ...assignment.submissions[subIndex],
          version: version.versionNumber,
          content: version.content,
          attachments: version.attachments || [],
          submittedAt: version.submittedAt,
          correctionsRequest: null,
        };
        const newSubmissions = [...assignment.submissions];
        newSubmissions[subIndex] = updatedSub;
        const cls = globalState.classes.find((c) => c.id === assignment.classId);
        const ta = cls ? globalState.teachingAssignments.find((a) => a.id === cls.teachingAssignmentId) : undefined;
        if (ta?.teacherId) {
          notifyUsers([ta.teacherId], "resubmission", "Nueva version recibida", `${getUserDisplayName(user)} re-entrego "${assignment.title}"`, assignment.classId, assignmentId);
        }
        globalState = {
          ...globalState,
          assignments: globalState.assignments.map((a) => a.id === assignmentId ? { ...a, submissions: newSubmissions } : a),
        };
      } else {
        const raw = await submissionRes.json();
        const newSub = mapApiSubmissionToOldFormat(raw);
        const cls = globalState.classes.find((c) => c.id === (globalState.assignments.find((a) => a.id === assignmentId)?.classId));
        const ta = cls ? globalState.teachingAssignments.find((a) => a.id === cls.teachingAssignmentId) : undefined;
        if (ta?.teacherId) {
          notifyUsers([ta.teacherId], "submission", "Nueva entrega", `${getUserDisplayName(user)} entrego "${globalState.assignments.find((a) => a.id === assignmentId)?.title}"`, cls?.id, assignmentId);
        }
        globalState = {
          ...globalState,
          assignments: globalState.assignments.map((a) => a.id === assignmentId ? { ...a, submissions: [...a.submissions, newSub] } : a),
        };
      }
      logAction(existing ? "resubmit" : "submit", "assignments", "success", { assignmentId }, "submissions", existing?.id);
      notify();
    } catch {}
  }, []);

  const requestCorrections = useCallback(async (assignmentId: string, submissionId: string, feedback: string) => {
    const user = globalState.user;
    if (!user) return;
    try {
      const res = await fetchApi(`/api/submissions/${submissionId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: user.id, observations: feedback }),
      });
      if (!res.ok) return;
      const requestedAt = nowIso();
      const assignment = globalState.assignments.find((item) => item.id === assignmentId);
      const submission = assignment?.submissions.find((item) => item.id === submissionId);
      if (!assignment || !submission) return;
      notifyUsers([submission.studentId], "corrections_requested", "Correcciones solicitadas", `${getUserDisplayName(user)} solicito correcciones para "${assignment.title}"`, assignment.classId, assignmentId);
      globalState = {
        ...globalState,
        assignments: globalState.assignments.map((item) =>
          item.id === assignmentId
            ? {
                ...item,
                submissions: item.submissions.map((sub) =>
                  sub.id === submissionId ? { ...sub, correctionsRequest: { feedback, requestedAt }, grade: null } : sub
                ),
              }
            : item
        ),
      };
      logAction("request_corrections", "submissions", "success", { assignmentId, submissionId }, "submissions", submissionId);
      notify();
    } catch {}
  }, []);

  const addTeachingAssignment = useCallback(async (data: {
    teacherId: string;
    cycleId: string;
    subjectId?: string | null;
    academicGroupId?: string | null;
  }): Promise<TeachingAssignment | null> => {
    try {
      const res = await fetchApi("/api/teaching-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const ta = await res.json();
      globalState = { ...globalState, teachingAssignments: [...globalState.teachingAssignments, ta] };
      notify();
      return ta;
    } catch {
      return null;
    }
  }, []);

  const updateTeachingAssignment = useCallback(async (taId: string, data: Partial<Pick<TeachingAssignment, "teacherId" | "cycleId" | "subjectId" | "academicGroupId" | "active">>) => {
    try {
      const res = await fetchApi(`/api/teaching-assignments/${taId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        teachingAssignments: globalState.teachingAssignments.map((ta) =>
          ta.id === taId ? updated : ta
        ),
      };
      notify();
    } catch {}
  }, []);

  const deleteTeachingAssignment = useCallback(async (taId: string): Promise<boolean> => {
    try {
      const res = await fetchApi(`/api/teaching-assignments/${taId}`, { method: "DELETE" });
      if (!res.ok) return false;
      globalState = {
        ...globalState,
        teachingAssignments: globalState.teachingAssignments.filter((ta) => ta.id !== taId),
      };
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateInstitutionSettings = useCallback(async (data: Partial<Omit<InstitutionSettings, "id" | "createdAt">>) => {
    try {
      const res = await fetchApi("/api/institution-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated = await res.json();
      globalState = {
        ...globalState,
        institutionSettings: updated,
      };
      notify();
    } catch {}
  }, []);

  const activeCampus = globalState.campuses.find((c) => c.id === getStoredCampusId()) || null;

  const setActiveCampus = useCallback(async (campusId: string) => {
    try {
      localStorage.setItem(CAMPUS_STORAGE_KEY, campusId);
    } catch {}
    await loadAll();
    notify();
  }, [loadAll]);

  const getUserCampusName = useCallback((userId: string): string => {
    const u = globalState.users.find((user) => user.id === userId);
    return u?.campus?.name || "";
  }, []);

  return {
    user: globalState.user,
    users: globalState.users,
    campuses: globalState.campuses,
    activeCampus,
    isLoading,
    isHydrated,
    semesters: globalState.semesters,
    cycles: globalState.cycles,
    subjects: globalState.subjects,
    academicGroups: globalState.academicGroups,
    teachingAssignments: globalState.teachingAssignments,
    enrollments: globalState.enrollments,
    classes: globalState.classes,
    posts: globalState.posts,
    assignments: globalState.assignments,
    grades: globalState.grades,
    notifications: globalState.notifications,
    fileAssets: globalState.fileAssets,
    institutionSettings: globalState.institutionSettings,
    auditLogs: globalState.auditLogs,
    login,
    logout,
    changePassword,
    setActiveCampus,
    getUserCampusName,
    getClassesForUser,
    getPostsForClass,
    getAssignmentsForClass,
    getAssignmentsForStudent,
    getUpcomingAssignments,
    getUpcomingPosts,
    getUserName,
    getClassById,
    getAcademicGroupForClass,
    getCycleForGroup,
    getStudentsInClass,
    getTeachers,
    getStudents,
    getTeacherForClass,
    getStudentSubmission,
    getStudentSubmissions,
    getGradesForStudentInClass,
    addPost,
    addClass,
    updateClass,
    deleteClass,
    addUser,
    updateUser,
    deleteUser,
    assignStudentToClass,
    removeStudentFromClass,
    assignTeacherToClass,
    addAssignment,
    deleteAssignment,
    gradeSubmission,
    requestCorrections,
    addCommentToPost,
    addCommentToSubmission,
    submitAssignment,
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    getActiveSemester,
    setActiveSemester,
    addSemester,
    updateSemester,
    deleteSemester,
    addCycle,
    updateCycle,
    deleteCycle,
    addSubject,
    updateSubject,
    deleteSubject,
    addAcademicGroup,
    addEnrollment,
    removeEnrollment,
    getEnrollmentsForSemester,
    getEnrolledStudentsInGroup,
    getAcademicGroupForStudent,
    getStudentEnrollments,
    addTeachingAssignment,
    updateTeachingAssignment,
    deleteTeachingAssignment,
    updateInstitutionSettings,
  };
}
