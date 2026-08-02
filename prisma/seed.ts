import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const SALT_ROUNDS = 10;
  const tempPassword = "Palmitas2026!";
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  // ================================================================
  // 1. ROLES
  // ================================================================

  const rolesData = [
    { name: "admin", description: "Administrador del sistema con acceso completo" },
    { name: "teacher", description: "Docente con acceso a funciones de enseñanza" },
    { name: "student", description: "Estudiante con acceso a funciones de aprendizaje" },
  ];

  const createdRoles: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    createdRoles[r.name] = role.id;
  }

  // ================================================================
  // 2. PERMISSIONS
  // ================================================================

  const permissionsData = [
    { name: "users:read", description: "Ver listado de usuarios" },
    { name: "users:create", description: "Crear usuarios" },
    { name: "users:update", description: "Editar usuarios" },
    { name: "users:delete", description: "Eliminar usuarios" },
    { name: "classes:read", description: "Ver clases" },
    { name: "classes:create", description: "Crear clases" },
    { name: "classes:update", description: "Editar clases" },
    { name: "classes:delete", description: "Eliminar clases" },
    { name: "posts:create", description: "Crear publicaciones" },
    { name: "posts:delete", description: "Eliminar publicaciones" },
    { name: "assignments:create", description: "Crear tareas" },
    { name: "assignments:grade", description: "Calificar tareas" },
    { name: "assignments:delete", description: "Eliminar tareas" },
    { name: "enrollments:manage", description: "Gestionar matrículas" },
    { name: "settings:read", description: "Ver configuración" },
    { name: "settings:update", description: "Actualizar configuración" },
    { name: "audit:read", description: "Ver registros de auditoría" },
    { name: "semesters:manage", description: "Gestionar semestres" },
    { name: "cycles:manage", description: "Gestionar ciclos" },
    { name: "subjects:manage", description: "Gestionar materias" },
    { name: "teaching:assign", description: "Asignar docentes" },
    { name: "calendar:manage", description: "Gestionar calendario escolar" },
  ];

  const createdPermissions: Record<string, string> = {};
  for (const p of permissionsData) {
    const permission = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: { name: p.name, description: p.description },
    });
    createdPermissions[p.name] = permission.id;
  }

  // ================================================================
  // 3. ROLE PERMISSIONS
  // ================================================================

  const rolePermissionsMap: Record<string, string[]> = {
    admin: Object.values(createdPermissions),
    teacher: [
      createdPermissions["classes:read"],
      createdPermissions["classes:create"],
      createdPermissions["classes:update"],
      createdPermissions["posts:create"],
      createdPermissions["posts:delete"],
      createdPermissions["assignments:create"],
      createdPermissions["assignments:grade"],
      createdPermissions["assignments:delete"],
      createdPermissions["enrollments:manage"],
    ],
    student: [
      createdPermissions["classes:read"],
    ],
  };

  for (const [roleName, permissionIds] of Object.entries(rolePermissionsMap)) {
    const roleId = createdRoles[roleName];
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // ================================================================
  // 4. USERS
  // ================================================================

  const usersData = [
    {
      username: "yira.jimenez",
      firstName: "Yira Rosa",
      lastName: "Jiménez Cantillo",
      roleName: "admin" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
    {
      username: "jaireth.jimenez",
      firstName: "Jaireth de Jesus",
      lastName: "Jiménez Jimenez",
      roleName: "teacher" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
    {
      username: "beder.martinez",
      firstName: "Beder",
      lastName: "Martinez",
      roleName: "teacher" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
    {
      username: "enith.lopez",
      firstName: "Enith",
      lastName: "Lopez",
      roleName: "teacher" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
    {
      username: "leticia.navarro",
      firstName: "Leticia",
      lastName: "Navarro",
      roleName: "teacher" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
    {
      username: "carmen.alvarado",
      firstName: "Carmen",
      lastName: "Alvarado",
      roleName: "teacher" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
    {
      username: "graciela.soto",
      firstName: "Graciela",
      lastName: "Soto",
      roleName: "teacher" as const,
      active: true,
      blocked: false,
      mustChangePassword: true,
    },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of usersData) {
    const roleId = createdRoles[u.roleName];
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        roleId,
        active: u.active,
        blocked: u.blocked,
        mustChangePassword: u.mustChangePassword,
      },
      create: {
        username: u.username,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId,
        active: u.active,
        blocked: u.blocked,
        mustChangePassword: u.mustChangePassword,
      },
    });
    createdUsers[u.username] = user.id;
  }

  // ================================================================
  // SEMESTER
  // ================================================================

  const semester = await prisma.semester.upsert({
    where: { code: "2026-2" },
    update: {
      name: "2026-2",
      active: true,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-12-31"),
    },
    create: {
      code: "2026-2",
      name: "2026-2",
      active: true,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-12-31"),
    },
  });

  // ================================================================
  // CYCLES
  // ================================================================

  const cyclesData = [
    { code: "C2", name: "Ciclo 2", description: "Primaria", order: 2, usesSubjects: false },
    { code: "C3", name: "Ciclo 3", description: "Equivalente a 6 y 7", order: 3, usesSubjects: true },
    { code: "C4", name: "Ciclo 4", description: "Equivalente a 8 y 9", order: 4, usesSubjects: true },
    { code: "C5", name: "Ciclo 5", description: "Equivalente a 10 y 11", order: 5, usesSubjects: true },
    { code: "C6", name: "Ciclo 6", description: "Graduación", order: 6, usesSubjects: true },
  ];

  const createdCycles: Record<string, string> = {};
  for (const c of cyclesData) {
    const cycle = await prisma.cycle.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
    createdCycles[c.code] = cycle.id;
  }

  // ================================================================
  // SUBJECTS
  // ================================================================

  const subjectsData = [
    { code: "MAT", name: "Matemáticas", color: "#1E88E5", icon: "calculator" },
    { code: "LEN", name: "Lengua Castellana", color: "#8E24AA", icon: "book-open" },
    { code: "CSO", name: "Ciencias Sociales", color: "#FB8C00", icon: "globe" },
    { code: "CPE", name: "Ciencias Políticas y Económicas", color: "#D81B60", icon: "landmark" },
    { code: "ING", name: "Inglés", color: "#00ACC1", icon: "languages" },
    { code: "CNA", name: "Ciencias Naturales", color: "#43A047", icon: "leaf" },
    { code: "QUI", name: "Química", color: "#6D4C41", icon: "flask-conical" },
    { code: "PRO", name: "Proyecto", color: "#F4511E", icon: "clipboard-check" },
  ];

  const createdSubjects: Record<string, string> = {};
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: { ...s, active: true },
      create: { ...s, active: true },
    });
    createdSubjects[s.code] = subject.id;
  }

  // ================================================================
  // ACADEMIC GROUPS
  // ================================================================

  async function upsertAcademicGroup(data: {
    semesterId: string;
    cycleId: string;
    managerTeacherId?: string | null;
    nameInternal: string;
    nameForStudents: string;
  }) {
    const existing = await prisma.academicGroup.findFirst({
      where: {
        semesterId: data.semesterId,
        cycleId: data.cycleId,
        managerTeacherId: data.managerTeacherId ?? null,
        nameInternal: data.nameInternal,
      },
    });
    if (existing) {
      return prisma.academicGroup.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.academicGroup.create({ data });
  }

  const academicGroupsData = [
    {
      semesterId: semester.id,
      cycleId: createdCycles["C2"],
      managerTeacherId: createdUsers["carmen.alvarado"],
      nameInternal: "Ciclo 2 - Carmen Alvarado",
      nameForStudents: "Ciclo 2",
    },
    {
      semesterId: semester.id,
      cycleId: createdCycles["C2"],
      managerTeacherId: createdUsers["graciela.soto"],
      nameInternal: "Ciclo 2 - Graciela Soto",
      nameForStudents: "Ciclo 2",
    },
    {
      semesterId: semester.id,
      cycleId: createdCycles["C3"],
      managerTeacherId: null,
      nameInternal: "Ciclo 3",
      nameForStudents: "Ciclo 3",
    },
    {
      semesterId: semester.id,
      cycleId: createdCycles["C4"],
      managerTeacherId: null,
      nameInternal: "Ciclo 4",
      nameForStudents: "Ciclo 4",
    },
    {
      semesterId: semester.id,
      cycleId: createdCycles["C5"],
      managerTeacherId: null,
      nameInternal: "Ciclo 5",
      nameForStudents: "Ciclo 5",
    },
    {
      semesterId: semester.id,
      cycleId: createdCycles["C6"],
      managerTeacherId: null,
      nameInternal: "Ciclo 6",
      nameForStudents: "Ciclo 6",
    },
  ];

  const createdGroupIds: string[] = [];
  for (const g of academicGroupsData) {
    const group = await upsertAcademicGroup(g);
    createdGroupIds.push(group.id);
  }

  // ================================================================
  // TEACHING ASSIGNMENTS
  // ================================================================

  async function upsertTeachingAssignment(data: {
    teacherId: string;
    cycleId: string;
    subjectId?: string | null;
    academicGroupId?: string | null;
  }) {
    const where: Record<string, unknown> = {
      teacherId: data.teacherId,
      cycleId: data.cycleId,
    };
    if (data.subjectId) where.subjectId = data.subjectId;
    else where.subjectId = null;
    if (data.academicGroupId) where.academicGroupId = data.academicGroupId;
    else where.academicGroupId = null;

    const existing = await prisma.teachingAssignment.findFirst({ where: where as any });
    if (existing) {
      return prisma.teachingAssignment.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return prisma.teachingAssignment.create({
      data: {
        teacherId: data.teacherId,
        cycleId: data.cycleId,
        subjectId: data.subjectId ?? null,
        academicGroupId: data.academicGroupId ?? null,
        active: true,
      },
    });
  }

  const jairethId = createdUsers["jaireth.jimenez"];
  const bederId = createdUsers["beder.martinez"];
  const enithId = createdUsers["enith.lopez"];
  const leticiaId = createdUsers["leticia.navarro"];
  const carmenId = createdUsers["carmen.alvarado"];
  const gracielaId = createdUsers["graciela.soto"];

  // Jaireth: Sociales (C3-6), Politicas (C5-6), Ingles (C3-6)
  for (const cycleCode of ["C3", "C4", "C5", "C6"]) {
    await upsertTeachingAssignment({ teacherId: jairethId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["CSO"] });
    await upsertTeachingAssignment({ teacherId: jairethId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["ING"] });
  }
  for (const cycleCode of ["C5", "C6"]) {
    await upsertTeachingAssignment({ teacherId: jairethId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["CPE"] });
  }

  // Beder: Matematicas (C3-6)
  for (const cycleCode of ["C3", "C4", "C5", "C6"]) {
    await upsertTeachingAssignment({ teacherId: bederId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["MAT"] });
  }

  // Enith: Lengua (C3-6), Proyecto (C4)
  for (const cycleCode of ["C3", "C4", "C5", "C6"]) {
    await upsertTeachingAssignment({ teacherId: enithId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["LEN"] });
  }
  await upsertTeachingAssignment({ teacherId: enithId, cycleId: createdCycles["C4"], subjectId: createdSubjects["PRO"] });

  // Leticia: Naturales (C3-4), Quimica (C5-6), Proyecto (C3)
  for (const cycleCode of ["C3", "C4"]) {
    await upsertTeachingAssignment({ teacherId: leticiaId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["CNA"] });
  }
  for (const cycleCode of ["C5", "C6"]) {
    await upsertTeachingAssignment({ teacherId: leticiaId, cycleId: createdCycles[cycleCode], subjectId: createdSubjects["QUI"] });
  }
  await upsertTeachingAssignment({ teacherId: leticiaId, cycleId: createdCycles["C3"], subjectId: createdSubjects["PRO"] });

  // Carmen: Ciclo 2 (no subject)
  await upsertTeachingAssignment({ teacherId: carmenId, cycleId: createdCycles["C2"] });

  // Graciela: Ciclo 2 (no subject)
  await upsertTeachingAssignment({ teacherId: gracielaId, cycleId: createdCycles["C2"] });

  // ================================================================
  // INSTITUTION SETTINGS
  // ================================================================

  const existingSettings = await prisma.institutionSettings.findFirst();
  if (existingSettings) {
    await prisma.institutionSettings.update({
      where: { id: existingSettings.id },
      data: {
        schoolName: "Institución Educativa Antonio Brugués Carmona",
        logoUrl: "/images/logo.jpg",
        shieldUrl: "/images/logo.jpg",
        faviconUrl: "/images/logo.jpg",
        motto: "Campus Virtual",
        activeSemesterId: semester.id,
        primaryColor: "#0F6A3B",
        secondaryColor: "#F2C230",
        accentColor: "#D62828",
        theme: "LIGHT",
      },
    });
  } else {
    await prisma.institutionSettings.create({
      data: {
        schoolName: "Institución Educativa Antonio Brugués Carmona",
        logoUrl: "/images/logo.jpg",
        shieldUrl: "/images/logo.jpg",
        faviconUrl: "/images/logo.jpg",
        motto: "Campus Virtual",
        activeSemesterId: semester.id,
        primaryColor: "#0F6A3B",
        secondaryColor: "#F2C230",
        accentColor: "#D62828",
        theme: "LIGHT",
      },
    });
  }

  // ================================================================
  // AUDIT LOG
  // ================================================================

  await prisma.auditLog.create({
    data: {
      userId: createdUsers["yira.jimenez"],
      action: "seed",
      module: "system",
      tableName: "all",
      result: "success",
      metadata: { description: "Seed inicial de la base de datos Palmitas Campus" },
    },
  });

  // ================================================================
  // SUMMARY
  // ================================================================

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
    institutionSettings: await prisma.institutionSettings.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log("=== Seed completado ===");
  console.log(JSON.stringify(counts, null, 2));
  console.log(`Contraseña temporal para todos los usuarios: ${tempPassword}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error durante el seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
