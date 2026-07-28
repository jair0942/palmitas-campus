import "dotenv/config";
import mysql from "mysql2/promise";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const MYSQL_URL = "mysql://palmitas:Palmitas2026!@localhost:3306/palmitas_campus";

async function main() {
  console.log("Conectando a MySQL (origen)...");
  const mysqlConn = await mysql.createConnection(MYSQL_URL);
  console.log("Conectado a MySQL.\n");

  console.log("Conectando a PostgreSQL (destino)...");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  console.log("Conectado a PostgreSQL.\n");

  // ---------------------------------------------------------------
  // Helper: fetch all rows from MySQL
  // ---------------------------------------------------------------
  async function fetchAll(table: string): Promise<any[]> {
    const [rows] = await mysqlConn.execute(`SELECT * FROM \`${table}\``);
    return rows as any[];
  }

  // ---------------------------------------------------------------
  // 1. Roles
  // ---------------------------------------------------------------
  console.log("Migrando roles...");
  const roles = await fetchAll("roles");
  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: { name: r.name, description: r.description },
      create: { id: r.id, name: r.name, description: r.description },
    });
  }
  console.log(`  ${roles.length} roles migrados.`);

  // ---------------------------------------------------------------
  // 2. Permissions
  // ---------------------------------------------------------------
  console.log("Migrando permissions...");
  const permissions = await fetchAll("permissions");
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: { name: p.name, description: p.description },
      create: { id: p.id, name: p.name, description: p.description },
    });
  }
  console.log(`  ${permissions.length} permissions migrados.`);

  // ---------------------------------------------------------------
  // 3. RolePermissions
  // ---------------------------------------------------------------
  console.log("Migrando role_permissions...");
  const rolePerms = await fetchAll("role_permissions");
  for (const rp of rolePerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rp.roleId, permissionId: rp.permissionId } },
      update: {},
      create: { roleId: rp.roleId, permissionId: rp.permissionId },
    });
  }
  console.log(`  ${rolePerms.length} role_permissions migrados.`);

  // ---------------------------------------------------------------
  // 4. Users
  // ---------------------------------------------------------------
  console.log("Migrando users...");
  const users = await fetchAll("users");
  function toBool(v: unknown): boolean {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    return v === "1" || v === 1 || v === true;
  }
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        active: toBool(u.active),
        blocked: toBool(u.blocked),
        mustChangePassword: toBool(u.mustChangePassword),
      },
      create: {
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash,
        documentType: u.documentType,
        documentNumber: u.documentNumber,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        email: u.email,
        roleId: u.roleId,
        avatar: u.avatar,
        active: toBool(u.active),
        blocked: toBool(u.blocked),
        mustChangePassword: toBool(u.mustChangePassword),
        lastLoginAt: u.lastLoginAt,
      },
    });
  }
  console.log(`  ${users.length} users migrados.`);

  // ---------------------------------------------------------------
  // 5. Semesters
  // ---------------------------------------------------------------
  console.log("Migrando semesters...");
  const semesters = await fetchAll("semesters");
  for (const s of semesters) {
    await prisma.semester.upsert({
      where: { id: s.id },
      update: { name: s.name, active: toBool(s.active) },
      create: {
        id: s.id,
        code: s.code,
        name: s.name,
        active: toBool(s.active),
        startDate: s.startDate,
        endDate: s.endDate,
      },
    });
  }
  console.log(`  ${semesters.length} semesters migrados.`);

  // ---------------------------------------------------------------
  // 6. Cycles
  // ---------------------------------------------------------------
  console.log("Migrando cycles...");
  const cycles = await fetchAll("cycles");
  for (const c of cycles) {
    await prisma.cycle.upsert({
      where: { id: c.id },
      update: { name: c.name, description: c.description },
      create: {
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        order: c.order,
        usesSubjects: toBool(c.usesSubjects),
        active: toBool(c.active),
      },
    });
  }
  console.log(`  ${cycles.length} cycles migrados.`);

  // ---------------------------------------------------------------
  // 7. Subjects
  // ---------------------------------------------------------------
  console.log("Migrando subjects...");
  const subjects = await fetchAll("subjects");
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: { name: s.name, color: s.color, icon: s.icon },
      create: {
        id: s.id,
        name: s.name,
        code: s.code,
        color: s.color,
        icon: s.icon,
        active: toBool(s.active),
      },
    });
  }
  console.log(`  ${subjects.length} subjects migrados.`);

  // ---------------------------------------------------------------
  // 8. Academic Groups
  // ---------------------------------------------------------------
  console.log("Migrando academic_groups...");
  const academicGroups = await fetchAll("academic_groups");
  for (const g of academicGroups) {
    await prisma.academicGroup.upsert({
      where: { id: g.id },
      update: { nameInternal: g.nameInternal, nameForStudents: g.nameForStudents },
      create: {
        id: g.id,
        semesterId: g.semesterId,
        cycleId: g.cycleId,
        managerTeacherId: g.managerTeacherId,
        nameInternal: g.nameInternal,
        nameForStudents: g.nameForStudents,
        active: toBool(g.active),
      },
    });
  }
  console.log(`  ${academicGroups.length} academic_groups migrados.`);

  // ---------------------------------------------------------------
  // 9. Teaching Assignments
  // ---------------------------------------------------------------
  console.log("Migrando teaching_assignments...");
  const tas = await fetchAll("teaching_assignments");
  for (const ta of tas) {
    await prisma.teachingAssignment.upsert({
      where: { id: ta.id },
      update: { active: toBool(ta.active) },
      create: {
        id: ta.id,
        teacherId: ta.teacherId,
        cycleId: ta.cycleId,
        subjectId: ta.subjectId,
        academicGroupId: ta.academicGroupId,
        active: toBool(ta.active),
      },
    });
  }
  console.log(`  ${tas.length} teaching_assignments migrados.`);

  // ---------------------------------------------------------------
  // 10. Enrollments
  // ---------------------------------------------------------------
  console.log("Migrando enrollments...");
  const enrollments = await fetchAll("enrollments");
  for (const e of enrollments) {
    await prisma.enrollment.upsert({
      where: { id: e.id },
      update: { status: e.status },
      create: {
        id: e.id,
        studentId: e.studentId,
        semesterId: e.semesterId,
        academicGroupId: e.academicGroupId,
        status: e.status,
        withdrawnAt: e.withdrawnAt,
      },
    });
  }
  console.log(`  ${enrollments.length} enrollments migrados.`);

  // ---------------------------------------------------------------
  // 11. Classes
  // ---------------------------------------------------------------
  console.log("Migrando classes...");
  const classes = await fetchAll("classes");
  for (const c of classes) {
    await prisma.class.upsert({
      where: { id: c.id },
      update: { name: c.name, section: c.section, description: c.description },
      create: {
        id: c.id,
        teachingAssignmentId: c.teachingAssignmentId,
        academicGroupId: c.academicGroupId,
        subjectId: c.subjectId,
        name: c.name,
        section: c.section,
        description: c.description,
      },
    });
  }
  console.log(`  ${classes.length} classes migrados.`);

  // ---------------------------------------------------------------
  // 12. File Assets
  // ---------------------------------------------------------------
  console.log("Migrando file_assets...");
  const fileAssets = await fetchAll("file_assets");
  for (const fa of fileAssets) {
    await prisma.fileAsset.upsert({
      where: { id: fa.id },
      update: { originalName: fa.originalName },
      create: {
        id: fa.id,
        uploadedById: fa.uploadedById,
        originalName: fa.originalName,
        storedName: fa.storedName,
        url: fa.url,
        storageProvider: fa.storageProvider,
        checksum: fa.checksum,
        mimeType: fa.mimeType,
        extension: fa.extension,
        sizeBytes: fa.sizeBytes,
      },
    });
  }
  console.log(`  ${fileAssets.length} file_assets migrados.`);

  // ---------------------------------------------------------------
  // 13. Assignments
  // ---------------------------------------------------------------
  console.log("Migrando assignments...");
  const assignments = await fetchAll("assignments");
  for (const a of assignments) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      update: { title: a.title, description: a.description },
      create: {
        id: a.id,
        classId: a.classId,
        title: a.title,
        description: a.description,
        points: a.points,
        dueDate: a.dueDate,
        publishAt: a.publishAt,
      },
    });
  }
  console.log(`  ${assignments.length} assignments migrados.`);

  // ---------------------------------------------------------------
  // 14. Posts
  // ---------------------------------------------------------------
  console.log("Migrando posts...");
  const posts = await fetchAll("posts");
  for (const p of posts) {
    await prisma.post.upsert({
      where: { id: p.id },
      update: { content: p.content },
      create: {
        id: p.id,
        classId: p.classId,
        authorId: p.authorId,
        content: p.content,
      },
    });
  }
  console.log(`  ${posts.length} posts migrados.`);

  // ---------------------------------------------------------------
  // 15. Submissions
  // ---------------------------------------------------------------
  console.log("Migrando submissions...");
  const submissions = await fetchAll("submissions");
  for (const s of submissions) {
    await prisma.submission.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        assignmentId: s.assignmentId,
        studentId: s.studentId,
      },
    });
  }
  console.log(`  ${submissions.length} submissions migrados.`);

  // ---------------------------------------------------------------
  // 16. Submission Versions
  // ---------------------------------------------------------------
  console.log("Migrando submission_versions...");
  const versions = await fetchAll("submission_versions");
  for (const v of versions) {
    await prisma.submissionVersion.upsert({
      where: { id: v.id },
      update: { content: v.content },
      create: {
        id: v.id,
        submissionId: v.submissionId,
        versionNumber: v.versionNumber,
        content: v.content,
        status: v.status,
      },
    });
  }
  console.log(`  ${versions.length} submission_versions migrados.`);

  // ---------------------------------------------------------------
  // 17. Grades
  // ---------------------------------------------------------------
  console.log("Migrando grades...");
  const grades = await fetchAll("grades");
  for (const g of grades) {
    await prisma.grade.upsert({
      where: { id: g.id },
      update: { score: g.score, feedback: g.feedback },
      create: {
        id: g.id,
        submissionId: g.submissionId,
        score: g.score,
        feedback: g.feedback,
        gradedVersion: g.gradedVersion,
        gradedBy: g.gradedBy,
      },
    });
  }
  console.log(`  ${grades.length} grades migrados.`);

  // ---------------------------------------------------------------
  // 18. Correction Requests
  // ---------------------------------------------------------------
  console.log("Migrando correction_requests...");
  const corrections = await fetchAll("correction_requests");
  for (const c of corrections) {
    await prisma.correctionRequest.upsert({
      where: { id: c.id },
      update: { observations: c.observations },
      create: {
        id: c.id,
        submissionId: c.submissionId,
        versionId: c.versionId,
        teacherId: c.teacherId,
        observations: c.observations,
        status: c.status,
        closedAt: c.closedAt,
      },
    });
  }
  console.log(`  ${corrections.length} correction_requests migrados.`);

  // ---------------------------------------------------------------
  // 19. Comments
  // ---------------------------------------------------------------
  console.log("Migrando comments...");
  const comments = await fetchAll("comments");
  for (const c of comments) {
    await prisma.comment.upsert({
      where: { id: c.id },
      update: { content: c.content },
      create: {
        id: c.id,
        authorId: c.authorId,
        content: c.content,
        postId: c.postId,
        submissionId: c.submissionId,
      },
    });
  }
  console.log(`  ${comments.length} comments migrados.`);

  // ---------------------------------------------------------------
  // 20. Attachments
  // ---------------------------------------------------------------
  console.log("Migrando attachments...");
  const attachments = await fetchAll("attachments");
  for (const a of attachments) {
    await prisma.attachment.upsert({
      where: { id: a.id },
      update: { name: a.name },
      create: {
        id: a.id,
        name: a.name,
        size: String(a.size),
        type: a.type,
        url: a.url,
        fileAssetId: a.fileAssetId,
        postId: a.postId,
        assignmentId: a.assignmentId,
        versionId: a.versionId,
      },
    });
  }
  console.log(`  ${attachments.length} attachments migrados.`);

  // ---------------------------------------------------------------
  // 21. Notifications
  // ---------------------------------------------------------------
  console.log("Migrando notifications...");
  const notifications = await fetchAll("notifications");
  for (const n of notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: { title: n.title, message: n.message },
      create: {
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        classId: n.classId,
        relatedId: n.relatedId,
        relatedEntity: n.relatedEntity,
        isRead: toBool(n.isRead),
        readAt: n.readAt,
      },
    });
  }
  console.log(`  ${notifications.length} notifications migrados.`);

  // ---------------------------------------------------------------
  // 22. Audit Logs
  // ---------------------------------------------------------------
  console.log("Migrando audit_logs...");
  const auditLogs = await fetchAll("audit_logs");
  for (const a of auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: a.id },
      update: { action: a.action },
      create: {
        id: a.id,
        userId: a.userId,
        action: a.action,
        module: a.module,
        tableName: a.tableName,
        recordId: a.recordId,
        ip: a.ip,
        browser: a.browser,
        operatingSystem: a.operatingSystem,
        result: a.result,
        metadata: a.metadata,
      },
    });
  }
  console.log(`  ${auditLogs.length} audit_logs migrados.\n`);

  // ---------------------------------------------------------------
  // 23. Institution Settings
  // ---------------------------------------------------------------
  console.log("Migrando institution_settings...");
  const settings = await fetchAll("institution_settings");
  for (const s of settings) {
    await prisma.institutionSettings.upsert({
      where: { id: s.id },
      update: { schoolName: s.schoolName },
      create: {
        id: s.id,
        schoolName: s.schoolName,
        logoFileId: s.logoFileId,
        shieldFileId: s.shieldFileId,
        faviconFileId: s.faviconFileId,
        logoUrl: s.logoUrl,
        shieldUrl: s.shieldUrl,
        faviconUrl: s.faviconUrl,
        motto: s.motto,
        activeSemesterId: s.activeSemesterId,
        primaryColor: s.primaryColor,
        secondaryColor: s.secondaryColor,
        accentColor: s.accentColor,
        theme: s.theme,
        address: s.address,
        phone: s.phone,
        institutionalEmail: s.institutionalEmail,
        extraSettings: s.extraSettings,
      },
    });
  }
  console.log(`  ${settings.length} institution_settings migrados.\n`);

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  const counts = {
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
    rolePermissions: await prisma.rolePermission.count(),
    users: await prisma.user.count(),
    semesters: await prisma.semester.count(),
    cycles: await prisma.cycle.count(),
    subjects: await prisma.subject.count(),
    academicGroups: await prisma.academicGroup.count(),
    teachingAssignments: await prisma.teachingAssignment.count(),
    enrollments: await prisma.enrollment.count(),
    classes: await prisma.class.count(),
    fileAssets: await prisma.fileAsset.count(),
    assignments: await prisma.assignment.count(),
    posts: await prisma.post.count(),
    submissions: await prisma.submission.count(),
    submissionVersions: await prisma.submissionVersion.count(),
    grades: await prisma.grade.count(),
    correctionRequests: await prisma.correctionRequest.count(),
    comments: await prisma.comment.count(),
    attachments: await prisma.attachment.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    institutionSettings: await prisma.institutionSettings.count(),
  };

  console.log("\n========================================");
  console.log("  RESUMEN DE MIGRACIÓN");
  console.log("========================================\n");
  console.log(JSON.stringify(counts, null, 2));

  await mysqlConn.end();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Error en migración:", e);
  process.exit(1);
});
