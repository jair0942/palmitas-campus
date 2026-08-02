import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;
const TEMP_PASSWORD = "Jaraba2026!";
const JARABA_CODE = "JARABA";

// ================================================================
// CICLO 2 JARABA — profesores (tabla oficial "Carga academica segundo semestre Jaraba")
// CLEI II: Neila Canedo Saenz — AREAS: Todas (10 h) — Asesora del ciclo
// ================================================================

const TEACHERS: Array<{ firstName: string; lastName: string; username: string }> = [
  { firstName: "Neila", lastName: "Canedo Saenz", username: "neila.canedo" },
];

// ================================================================
// CICLO 2 JARABA — estudiantes (tabla oficial "Educacion para adultos Jaraba Julio")
// Nombre completo, numero de documento (oficial), username propuesto
// ================================================================

const STUDENTS: Array<{ firstName: string; lastName: string; documentNumber: string; username: string }> = [
  { firstName: "Yuranis", lastName: "Aragon Saenz", documentNumber: "36506908", username: "yuranis.aragon" },
  { firstName: "Yuleidis", lastName: "Ortiz Angulo", documentNumber: "1004507932", username: "yuleidis.ortiz" },
  { firstName: "Ledis", lastName: "Herrera Mendez", documentNumber: "33217128", username: "ledis.herrera" },
  { firstName: "Maria de las Nieves", lastName: "Pava Torres", documentNumber: "3322160", username: "maria.pava" },
  { firstName: "Maria Luisa", lastName: "Rodriguez Navarro", documentNumber: "33222173", username: "maria.rodriguez" },
  { firstName: "Magalis", lastName: "Herrera Mendez", documentNumber: "57090036", username: "magalis.herrera" },
  { firstName: "Ingris", lastName: "Martinez Meriño", documentNumber: "1085224864", username: "ingris.martinez" },
  { firstName: "Roquelina", lastName: "Mendoza Olivero", documentNumber: "57090180", username: "roquelina.mendoza" },
  { firstName: "Sharol Juliana", lastName: "Diaz Gutierrez", documentNumber: "1065984972", username: "sharol.diaz" },
  { firstName: "Jhoana", lastName: "Beleño Pava", documentNumber: "1085225147", username: "jhoana.beleno" },
  { firstName: "Dionisio", lastName: "Mendoza Herrera", documentNumber: "85110033", username: "dionisio.mendoza" },
  { firstName: "Mary Luz", lastName: "Aragon Beleño", documentNumber: "36733438", username: "mary.aragon" },
  { firstName: "Elis Jhoana", lastName: "Navarro Machado", documentNumber: "26905407", username: "elis.navarro" },
  { firstName: "Amelia del Carmen", lastName: "Navarro Echeverria", documentNumber: "1085230399", username: "amelia.navarro" },
];

async function main() {
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS);

  const campus = await prisma.campus.findUnique({ where: { code: JARABA_CODE } });
  if (!campus) throw new Error("Sede JARABA no encontrada");

  const roleStudent = await prisma.role.findUnique({ where: { name: "student" } });
  const roleTeacher = await prisma.role.findUnique({ where: { name: "teacher" } });
  if (!roleStudent || !roleTeacher) throw new Error("Roles no encontrados");

  const settingsBefore = await prisma.institutionSettings.findFirst();

  const palmitas = await prisma.campus.findUnique({ where: { code: "PALMITAS" } });
  const countsBefore = {
    users: await prisma.user.count(),
    semesters: await prisma.semester.count(),
    cycles: await prisma.cycle.count(),
    academicGroups: await prisma.academicGroup.count(),
    teachingAssignments: await prisma.teachingAssignment.count(),
    classes: await prisma.class.count(),
    enrollments: await prisma.enrollment.count(),
    palmitasUsers: palmitas ? await prisma.user.count({ where: { campusId: palmitas.id } }) : -1,
    palmitasEnrollments: palmitas ? await prisma.enrollment.count({ where: { academicGroup: { campusId: palmitas.id } } }) : -1,
  };

  // Preflight: JARABA debe estar vacia academicamente y sin colisiones de usernames
  const existingSemesters = await prisma.semester.count({ where: { campusId: campus.id } });
  if (existingSemesters > 0) {
    throw new Error("ABORTADO: JARABA ya tiene semestres. Revisar antes de ejecutar.");
  }
  const allUsernames = [...STUDENTS.map((s) => s.username), ...TEACHERS.map((t) => t.username)];
  const colliding = await prisma.user.findMany({
    where: { username: { in: allUsernames } },
    select: { username: true },
  });
  if (colliding.length > 0) {
    throw new Error(`ABORTADO: usernames ya existentes: ${colliding.map((c) => c.username).join(", ")}`);
  }

  // 1. Semester JARABA (activo propio; NO se toca institutionSettings.activeSemesterId)
  const semester = await prisma.semester.create({
    data: {
      code: "2026-2",
      name: "2026-2",
      active: true,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-12-31"),
      campusId: campus.id,
    },
  });

  // 2. Cycle C2 JARABA (replica PALMITAS: Primaria, usesSubjects=false)
  const cycle = await prisma.cycle.create({
    data: {
      code: "C2",
      name: "Ciclo 2",
      description: "Primaria",
      order: 2,
      usesSubjects: false,
      campusId: campus.id,
    },
  });

  // 3. Profesora JARABA (Neila Canedo Saenz)
  const teacherIds: Record<string, string> = {};
  for (const t of TEACHERS) {
    const teacher = await prisma.user.create({
      data: {
        username: t.username,
        passwordHash,
        firstName: t.firstName,
        lastName: t.lastName,
        roleId: roleTeacher.id,
        campusId: campus.id,
        active: true,
        blocked: false,
        mustChangePassword: true,
      },
    });
    teacherIds[t.username] = teacher.id;
  }

  // 4. AcademicGroup JARABA (manager: Neila, patron "Ciclo 2 - <nombre>" de PALMITAS)
  const group = await prisma.academicGroup.create({
    data: {
      semesterId: semester.id,
      cycleId: cycle.id,
      managerTeacherId: teacherIds["neila.canedo"],
      nameInternal: "Ciclo 2 - Neila Canedo Saenz",
      nameForStudents: "Ciclo 2",
      campusId: campus.id,
    },
  });

  // 5. TeachingAssignment: Neila -> C2, sin materia (patron PALMITAS: carmen.alvarado / graciela.soto)
  await prisma.teachingAssignment.create({
    data: {
      teacherId: teacherIds["neila.canedo"],
      cycleId: cycle.id,
      subjectId: null,
      academicGroupId: null,
      campusId: campus.id,
      active: true,
    },
  });

  // 6. Estudiantes JARABA (con numero de documento oficial; documentType vacio como PALMITAS)
  for (const s of STUDENTS) {
    await prisma.user.create({
      data: {
        username: s.username,
        passwordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        documentNumber: s.documentNumber,
        roleId: roleStudent.id,
        campusId: campus.id,
        active: true,
        blocked: false,
        mustChangePassword: true,
      },
    });
  }

  // 7. Matriculas (14)
  const createdStudents = await prisma.user.findMany({
    where: { campusId: campus.id, roleId: roleStudent.id },
    select: { id: true },
  });
  for (const student of createdStudents) {
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        semesterId: semester.id,
        academicGroupId: group.id,
        status: "ACTIVE",
      },
    });
  }

  // ================================================================
  // Validaciones
  // ================================================================
  const jarabaStudents = await prisma.user.count({
    where: { campusId: campus.id, roleId: roleStudent.id },
  });
  const jarabaTeacher = await prisma.user.findFirst({
    where: { campusId: campus.id, roleId: roleTeacher.id },
  });
  const jarabaEnrollments = await prisma.enrollment.count({
    where: { academicGroupId: group.id },
  });
  const jarabaSemester = await prisma.semester.findFirst({ where: { campusId: campus.id } });
  const jarabaCycle = await prisma.cycle.findFirst({ where: { campusId: campus.id } });
  const jarabaGroup = await prisma.academicGroup.findFirst({ where: { campusId: campus.id } });
  const jarabaTa = await prisma.teachingAssignment.findFirst({ where: { campusId: campus.id } });

  const checks: Array<[string, boolean]> = [
    ["14 estudiantes JARABA", jarabaStudents === STUDENTS.length],
    ["14 matriculas JARABA", jarabaEnrollments === STUDENTS.length],
    ["Profesor JARABA creado", jarabaTeacher?.username === "neila.canedo"],
    ["Semestre JARABA activo", !!jarabaSemester?.active],
    ["Ciclo C2 JARABA (order 2, sin materias)", !!jarabaCycle && jarabaCycle.code === "C2" && jarabaCycle.order === 2 && jarabaCycle.usesSubjects === false],
    ["Grupo JARABA manager Neila", !!jarabaGroup && jarabaGroup.managerTeacherId === jarabaTeacher?.id],
    ["TA Neila -> C2 sin materia", !!jarabaTa && jarabaTa.teacherId === jarabaTeacher?.id && jarabaTa.subjectId === null],
    ["Sin clases C2 (modelo PALMITAS)", (await prisma.class.count({ where: { academicGroup: { campusId: campus.id } } })) === 0],
    ["activeSemesterId intacto", (await prisma.institutionSettings.findFirst())?.activeSemesterId === settingsBefore?.activeSemesterId],
    ["PALMITAS usuarios intactos", (await prisma.user.count({ where: { campusId: palmitas!.id } })) === countsBefore.palmitasUsers],
    ["PALMITAS matriculas intactas", (await prisma.enrollment.count({ where: { academicGroup: { campusId: palmitas!.id } } })) === countsBefore.palmitasEnrollments],
  ];

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "FALLO"} — ${label}`);
    if (!ok) failed++;
  }

  const countsAfter = {
    users: await prisma.user.count(),
    semesters: await prisma.semester.count(),
    cycles: await prisma.cycle.count(),
    academicGroups: await prisma.academicGroup.count(),
    teachingAssignments: await prisma.teachingAssignment.count(),
    classes: await prisma.class.count(),
    enrollments: await prisma.enrollment.count(),
  };

  const delta = {
    users: countsAfter.users - countsBefore.users,
    semesters: countsAfter.semesters - countsBefore.semesters,
    cycles: countsAfter.cycles - countsBefore.cycles,
    academicGroups: countsAfter.academicGroups - countsBefore.academicGroups,
    teachingAssignments: countsAfter.teachingAssignments - countsBefore.teachingAssignments,
    classes: countsAfter.classes - countsBefore.classes,
    enrollments: countsAfter.enrollments - countsBefore.enrollments,
  };

  console.log("=== Fase 3 JARABA (Ciclo 2) ===");
  console.log("Registros creados (delta):", JSON.stringify(delta, null, 2));
  console.log("Checks fallidos:", failed);
  console.log(`Contraseña temporal: ${TEMP_PASSWORD} (mustChangePassword=true)`);

  if (failed > 0) throw new Error(`Validacion fallida: ${failed} checks`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error durante la fase 3:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
