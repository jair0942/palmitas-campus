import { prisma } from "./prisma";
import type { CampusScope } from "./campus-scope";
import { getStudentEnrollmentGroupIds } from "./student-scope";

export type FileAccessDecision =
  | { ok: true; asset: { id: string; storedName: string; storageProvider: string } }
  | { ok: false; status: number; error: string };

export async function canAccessFileAsset(
  scope: CampusScope,
  assetId: string
): Promise<FileAccessDecision> {
  const asset = await prisma.fileAsset.findFirst({
    where: { id: assetId },
    include: { uploader: { select: { id: true, campusId: true } } },
  });
  if (!asset) return { ok: false, status: 404, error: "File asset not found" };

  const effCampus = scope.campusId;
  if (scope.isGlobalAdmin && !effCampus) {
    return { ok: false, status: 400, error: "Debe seleccionar una sede para acceder al archivo" };
  }

  const keyCampus = asset.storedName.includes("/") ? asset.storedName.split("/")[0] : null;
  const assetCampus = asset.uploader?.campusId ?? keyCampus;
  if (effCampus && assetCampus && effCampus !== assetCampus) {
    return { ok: false, status: 404, error: "File asset not found" };
  }

  if (asset.uploadedById === scope.userId) {
    return { ok: true, asset };
  }

  if (scope.role === "admin") {
    return { ok: true, asset };
  }

  const attachments = await prisma.attachment.findMany({
    where: { fileAssetId: asset.id },
    include: {
      post: { select: { classId: true } },
      assignment: { select: { classId: true } },
      version: {
        select: {
          submission: {
            select: { studentId: true, assignment: { select: { classId: true } } },
          },
        },
      },
    },
  });

  if (attachments.length === 0) {
    return { ok: false, status: 404, error: "File asset not found" };
  }

  if (scope.role === "student") {
    const groups = await getStudentEnrollmentGroupIds(scope.userId);
    if (groups.length === 0) return { ok: false, status: 404, error: "File asset not found" };
    const myClasses = await prisma.class.findMany({
      where: { academicGroupId: { in: groups } },
      select: { id: true },
    });
    const myClassIds = new Set(myClasses.map((c) => c.id));
    for (const att of attachments) {
      if (att.post && myClassIds.has(att.post.classId)) return { ok: true, asset };
      if (att.assignment && myClassIds.has(att.assignment.classId)) return { ok: true, asset };
      if (att.version) {
        const sub = att.version.submission;
        if (sub && sub.studentId === scope.userId) return { ok: true, asset };
      }
    }
    return { ok: false, status: 404, error: "File asset not found" };
  }

  if (scope.role === "teacher") {
    const assignments = await prisma.teachingAssignment.findMany({
      where: { teacherId: scope.userId },
      select: { classes: { select: { id: true } } },
    });
    const myClassIds = new Set<string>();
    for (const ta of assignments) {
      for (const c of ta.classes) myClassIds.add(c.id);
    }
    for (const att of attachments) {
      const classId =
        att.post?.classId ??
        att.assignment?.classId ??
        att.version?.submission.assignment.classId;
      if (classId && myClassIds.has(classId)) return { ok: true, asset };
    }
    return { ok: false, status: 404, error: "File asset not found" };
  }

  return { ok: false, status: 403, error: "Acceso denegado" };
}
