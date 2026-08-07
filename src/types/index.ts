export type Role = "admin" | "teacher" | "student";

export interface Campus {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  passwordHash?: string;
  documentType?: string;
  documentNumber?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string | null;
  role: Role;
  avatar: string;
  campusId?: string | null;
  campus?: Pick<Campus, "id" | "name" | "code"> | null;
  active: boolean;
  blocked: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  code: string;
  name: string;
  active: boolean;
  startDate: string;
  endDate: string;
  campusId?: string | null;
  createdAt: string;
}

export interface Cycle {
  id: string;
  code: string;
  name: string;
  description: string;
  order: number;
  usesSubjects: boolean;
  active: boolean;
  campusId?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  icon: string;
  active: boolean;
  campusId?: string | null;
}

export interface AcademicGroup {
  id: string;
  semesterId: string;
  cycleId: string;
  managerTeacherId?: string | null;
  nameInternal: string;
  nameForStudents: string;
  active: boolean;
  campusId?: string | null;
  createdAt: string;
}

export interface TeachingAssignment {
  id: string;
  teacherId: string;
  cycleId: string;
  subjectId?: string | null;
  academicGroupId?: string | null;
  active: boolean;
  campusId?: string | null;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  semesterId: string;
  academicGroupId: string;
  enrolledAt: string;
  status?: "active" | "withdrawn";
  withdrawnAt?: string;
}

export interface Class {
  id: string;
  teachingAssignmentId: string;
  academicGroupId: string;
  subjectId?: string | null;
  name: string;
  section: string;
  description: string;
  createdAt: string;
}

export interface Attachment {
  name: string;
  size: string;
  type: string;
  url: string;
  fileAssetId?: string;
  createdAt?: string;
  fileAsset?: {
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
    expiresAt: string | null;
    protectedFromCleanup: boolean;
  } | null;
}

export interface FileAsset {
  id: string;
  uploadedById: string;
  originalName: string;
  storedName: string;
  url: string;
  storageProvider: "local" | "s3" | "r2" | "external";
  checksum?: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  expiresAt?: string | null;
  protectedFromCleanup?: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  classId: string;
  authorId: string;
  content: string;
  attachments: Attachment[];
  createdAt: string;
  comments: Comment[];
}

export interface Grade {
  score: number;
  feedback: string;
  gradedAt: string;
}

export interface CorrectionsRequest {
  feedback: string;
  requestedAt: string;
}

export interface Submission {
  id: string;
  studentId: string;
  version: number;
  content: string;
  attachments: Attachment[];
  submittedAt: string;
  grade: Grade | null;
  comments: Comment[];
  correctionsRequest: CorrectionsRequest | null;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  points: number;
  dueDate: string;
  publishAt: string;
  createdAt: string;
  attachments: Attachment[];
  submissions: Submission[];
}

export interface AssignmentGrade {
  assignmentId: string;
  score: number | null;
  maxScore: number;
}

export interface StudentGrade {
  id: string;
  classId: string;
  studentId: string;
  assignments: AssignmentGrade[];
  average: number | null;
}

export type NotificationType =
  | "new_assignment"
  | "new_post"
  | "comment"
  | "grade"
  | "submission"
  | "new_user"
  | "new_class"
  | "corrections_requested"
  | "resubmission";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  classId?: string;
  relatedId?: string;
  relatedEntity?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface InstitutionSettings {
  id: string;
  schoolName: string;
  logoFileId?: string | null;
  shieldFileId?: string | null;
  faviconFileId?: string | null;
  logoUrl?: string;
  shieldUrl?: string;
  faviconUrl?: string;
  motto?: string;
  activeSemesterId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  theme?: "light" | "dark" | "system";
  address?: string;
  phone?: string;
  institutionalEmail?: string;
  extraSettings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  module: string;
  tableName?: string;
  recordId?: string;
  ip?: string;
  browser?: string;
  operatingSystem?: string;
  result: "success" | "failure";
  metadata?: Record<string, unknown>;
  createdAt: string;
}
