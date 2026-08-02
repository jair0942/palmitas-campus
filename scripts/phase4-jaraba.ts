import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// ================================================================
// FASE 4 JARABA — CLEI III, IV y VI
// Fuente unica de estudiantes: scripts/data/jaraba-phase4-students.json
// SHA-256 verificado en runtime antes de cualquier insercion.
// Modo seguro: por defecto hace preflight + plan READ-ONLY.
// Ejecutar con --go SOLO con autorizacion explicita del operador.
// ================================================================

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;
const TEMP_PASSWORD = "Jaraba2026!";
const JARABA_CODE = "JARABA";
const CONTRACT_PATH = "scripts/data/jaraba-phase4-students.json";
const EXPECTED_SHA256 = "DF62404EF0E4D6B11A6497E1F648187B7FC0AF84E0D23613D4B21F68E1853E06";

const GO = process.argv.includes("--go");
const REPORT = process.argv.includes("--report");

type ContractStudent = {
  listNumber: number;
  cycle: number;
  fullNameSource: string;
  documentNumber: string;
  username: string | null;
  status: string;
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// ================================================================
// 1. Validacion del contract (SHA-256 + estructura)
// ================================================================

function verifyContract(): ContractStudent[] {
  const raw = readFileSync(CONTRACT_PATH, "utf8");
  const sha = createHash("sha256").update(raw).digest("hex").toUpperCase();
  console.log(`SHA-256 contract: ${sha}`);
  if (sha !== EXPECTED_SHA256) {
    throw new Error(`ABORT: SHA-256 del contract no coincide. Esperado ${EXPECTED_SHA256}, obtenido ${sha}.`);
  }

  const records = JSON.parse(raw) as ContractStudent[];
  const total = records.length;
  const c3 = records.filter((r) => r.cycle === 3).length;
  const c4 = records.filter((r) => r.cycle === 4).length;
  const c6 = records.filter((r) => r.cycle === 6).length;
  const review = records.filter((r) => r.status === "REVIEW").length;
  const emptyName = records.filter((r) => !r.fullNameSource.trim()).length;
  const emptyDoc = records.filter((r) => !r.documentNumber.trim()).length;

  console.log(`Contract: total=${total} C3=${c3} C4=${c4} C6=${c6} REVIEW=${review} emptyName=${emptyName} emptyDoc=${emptyDoc}`);

  if (total !== 35) throw new Error(`ABORT: total != 35 (${total})`);
  if (c3 !== 10) throw new Error(`ABORT: C3 != 10 (${c3})`);
  if (c4 !== 14) throw new Error(`ABORT: C4 != 14 (${c4})`);
  if (c6 !== 11) throw new Error(`ABORT: C6 != 11 (${c6})`);
  if (review > 0) throw new Error(`ABORT: ${review} registros en estatus REVIEW`);
  if (emptyName > 0 || emptyDoc > 0) throw new Error("ABORT: celdas vacias en el contract");

  return records;
}

// ================================================================
// 2. Usernames — convencion confirmada con los usuarios JARABA C2 reales
//    username = slug(primerToken Nombre) + '.' + slug(primerToken Apellidos)
//    Apellidos = los 2 ultimos tokens; Resto = nombres.
//    Override aislado: caso documental en que el orden no es mecanico (YONKIS).
// ================================================================

// La regla "ultimos 2 tokens" cubre la mayoria de los nombres, pero falla en:
//   - apellido compuesto con particula: "ANGULO DE ARMAS" (el apellido real es ANGULO)
//   - nombre con complemento religioso: "CISELIS DEL CARMEN NOVOA" (el apellido es NOVOA)
//   - orden no-mecanico del documento: "RODRIGUEZ NAVARRO YONKIS" (decisión del operador)
// Estos casos se resuelven por identidad (documentNumber), nunca editando fullNameSource.
const OVERRIDES: Record<string, { username: string; firstName: string; lastName: string }> = {
  "1004507931": { username: "yerlis.angulo", firstName: "Yerlis Paola", lastName: "Angulo de Armas" },
  "1082490095": { username: "ciselis.novoa", firstName: "Ciselis del Carmen", lastName: "Novoa" },
  "1002474108": { username: "yonkis.rodriguez", firstName: "Yonkis", lastName: "Rodriguez Navarro" },
  "1051654290": { username: "maria.narvaez", firstName: "Maria Bernarda", lastName: "Narvaez Sanchez" },
};

function buildStudents(records: ContractStudent[]) {
  const used = new Set<string>();
  return records.map((r) => {
    const ov = OVERRIDES[r.documentNumber];
    const tokens = r.fullNameSource.trim().split(/\s+/);
    let firstName: string;
    let lastName: string;
    let username: string;

    if (ov) {
      firstName = ov.firstName;
      lastName = ov.lastName;
      username = ov.username;
    } else {
      firstName = tokens.slice(0, -2).join(" ") || tokens[0] || "";
      lastName = tokens.slice(-2).join(" ");
      username = `${slugify(firstName.split(" ")[0])}.${slugify(lastName.split(" ")[0])}`;
    }

    if (used.has(username)) {
      let n = 2;
      while (used.has(`${username}${n}`)) n += 1;
      username = `${username}${n}`;
    }
    used.add(username);

    return {
      cycle: r.cycle,
      listNumber: r.listNumber,
      fullNameSource: r.fullNameSource,
      firstName,
      lastName,
      username,
      documentNumber: r.documentNumber.trim(),
    };
  });
}

// ============================================================
// 3. Matriz academica (fuente: "Carga academica segundo semestre Jaraba")
// ============================================================

const TEACHERS = [
  { firstName: "Dionerys", lastName: "Campo Mendez", username: "dionerys.campo" },
  { firstName: "Lidiber", lastName: "Portela", username: "lidiber.portela" },
  { firstName: "Reinaldo", lastName: "Campo Mendez", username: "reinaldo.campo" },
  { firstName: "Juan Jose", lastName: "Castaño Ortega", username: "juan.castano" },
  { firstName: "Ana", lastName: "Campo", username: "ana.campo" },
];

const SUBJECTS = [
  { code: "MAT", name: "Matemáticas", color: "#1E88E5", icon: "calculator" },
  { code: "LEN", name: "Lengua Castellana", color: "#8E24AA", icon: "book-open" },
  { code: "CSO", name: "Ciencias Sociales", color: "#FB8C00", icon: "globe" },
  { code: "CPE", name: "Ciencias Políticas y Económicas", color: "#D81B60", icon: "landmark" },
  { code: "ING", name: "Inglés", color: "#00ACC1", icon: "languages" },
  { code: "CNA", name: "Ciencias Naturales", color: "#43A047", icon: "leaf" },
  { code: "QUI", name: "Química", color: "#6D4C41", icon: "flask-conical" },
  { code: "PRO", name: "Proyecto", color: "#F4511E", icon: "clipboard-check" },
  // FIL y FIS: fallback neutro de la aplicacion (color/icono por defecto del schema)
  { code: "FIL", name: "Filosofía", color: "#0F6A3B", icon: "book-open" },
  { code: "FIS", name: "Física", color: "#0F6A3B", icon: "book-open" },
];

// 20 TeachingAssignments (profesor -> ciclo -> materia). UN registro por combinación (sin duplicar por horas).
const ASSIGNMENTS: Array<{ teacher: string; cycleCode: string; subjectCode: string }> = [
  { teacher: "dionerys.campo", cycleCode: "C4", subjectCode: "LEN" },
  { teacher: "dionerys.campo", cycleCode: "C6", subjectCode: "LEN" },
  { teacher: "dionerys.campo", cycleCode: "C6", subjectCode: "FIL" },
  { teacher: "dionerys.campo", cycleCode: "C6", subjectCode: "CPE" },
  { teacher: "lidiber.portela", cycleCode: "C3", subjectCode: "MAT" },
  { teacher: "lidiber.portela", cycleCode: "C4", subjectCode: "MAT" },
  { teacher: "lidiber.portela", cycleCode: "C6", subjectCode: "MAT" },
  { teacher: "reinaldo.campo", cycleCode: "C3", subjectCode: "CNA" },
  { teacher: "reinaldo.campo", cycleCode: "C4", subjectCode: "CNA" },
  { teacher: "reinaldo.campo", cycleCode: "C3", subjectCode: "LEN" },
  { teacher: "juan.castano", cycleCode: "C3", subjectCode: "CSO" },
  { teacher: "juan.castano", cycleCode: "C4", subjectCode: "CSO" },
  { teacher: "juan.castano", cycleCode: "C3", subjectCode: "PRO" },
  { teacher: "juan.castano", cycleCode: "C4", subjectCode: "PRO" },
  { teacher: "ana.campo", cycleCode: "C3", subjectCode: "ING" },
  { teacher: "ana.campo", cycleCode: "C4", subjectCode: "ING" },
  { teacher: "ana.campo", cycleCode: "C6", subjectCode: "ING" },
  { teacher: "ana.campo", cycleCode: "C6", subjectCode: "QUI" },
  { teacher: "ana.campo", cycleCode: "C6", subjectCode: "FIS" },
  { teacher: "ana.campo", cycleCode: "C6", subjectCode: "CSO" },
];

// Asignacion manager por ciclo (asesorías oficiales)
const MANAGERS: Record<string, string> = {
  C3: "reinaldo.campo",
  C4: "juan.castano",
  C6: "dionerys.campo",
};

async function main() {
  // ---------------- Lectura y validación del contract ----------------
  const records = verifyContract();
  const students = buildStudents(records);

  // =============== MODO REPORT: validaciones deterministicas + tabla 35 ===============
  if (REPORT) {
    const rows = students.map((s) =>
      [s.cycle, s.listNumber, s.fullNameSource, s.documentNumber, s.username] as const
    );
    rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    console.log("\n=== TABLA FINAL (35) ===");
    for (const [cycle, num, name, doc, user] of rows) {
      console.log(`C${cycle} | #${num} | ${name} | ${doc} | ${user}`);
    }

    const usernames = students.map((s) => s.username);
    const usernamesValidChars = usernames.every((u) => /^[a-z0-9.]+$/.test(u));
    const usernamesNoSpaces = usernames.every((u) => !/\s/.test(u));
    const usernamesNoExt = usernames.every(
      (u) => !/\.tsx?$/.test(u) && !/\.(js|json|pdf|txt)$/.test(u) && !/[A-Z_~#$^&*()\[\]{}\/\\]/.test(u)
    );
    const usernamesCount = usernames.length;
    const usernamesNonNull = usernames.every((u) => typeof u === "string" && u.length > 0);
    const usernamesUnique = new Set(usernames).size === usernames.length;

    const docs = students.map((s) => s.documentNumber);
    const docsUnique = new Set(docs).size === docs.length;

console.log("=== VALIDACIONES ===");
    console.log(`usernames exactos: ${usernamesCount}/35 -> ${usernamesCount === 35 ? "PASS" : "FAIL"}`);
    console.log(`ningun null/vacio: ${usernamesNonNull ? "PASS" : "FAIL"}`);
    console.log(`todos unicos: ${usernamesUnique ? "PASS" : "FAIL"}`);
    console.log(`solo a-z0-9 y punto: ${usernamesValidChars ? "PASS" : "FAIL"}`);
    console.log(`ningun espacio: ${usernamesNoSpaces ? "PASS" : "FAIL"}`);
    console.log(`sin .tsx/.ts/raros: ${usernamesNoExt ? "PASS" : "FAIL"}`);
    console.log(`documentNumber unicos: ${docsUnique ? "PASS" : "FAIL"}`);
    console.log("profesores:", TEACHERS.map((t) => `${t.firstName} ${t.lastName} | ${t.username}`).join(" ; "));

    const allNames = [...usernames, ...TEACHERS.map((t) => t.username)];
    const tecUniq = new Set(allNames).size === allNames.length;
    console.log(`usernames totales unicos (estudiantes+profesores): ${tecUniq ? "PASS" : "FAIL"}`);

    const shaOk = createHash("sha256")
      .update(readFileSync(CONTRACT_PATH, "utf8"))
      .digest("hex")
      .toUpperCase() === EXPECTED_SHA256;
    console.log(`SHA-256: ${shaOk ? "PASS" : "FAIL"}`);
    console.log(`Contract counts: ${records.length === 35 ? "PASS" : "FAIL"}`);
    console.log(`Usernames 35/35: ${usernames.length === 35 ? "PASS" : "FAIL"}`);
    console.log(`Document numbers unique: ${docsUnique ? "PASS" : "FAIL"}`);
    return;
  }

  console.log("\nUsernames derivados:");
  for (const s of students) {
    console.log(`  C${s.cycle} #${s.listNumber} | ${s.username} | ${s.firstName} / ${s.lastName} | doc=${s.documentNumber}`);
  }

  // =============== PREFLIGHT (READ-ONLY) ===============
  const campus = await prisma.campus.findUnique({ where: { code: JARABA_CODE } });
  if (!campus) throw new Error("ABORT: sede JARABA no encontrada");
  const palmitas = await prisma.campus.findUnique({ where: { code: "PALMITAS" } });
  if (!palmitas) throw new Error("ABORT: sede PALMITAS no encontrada");

  const roleTeacher = await prisma.role.findUnique({ where: { name: "teacher" } });
  const roleStudent = await prisma.role.findUnique({ where: { name: "student" } });
  if (!roleTeacher || !roleStudent) throw new Error("ABORT: roles no encontrados");

  const semester = await prisma.semester.findFirst({ where: { campusId: campus.id, code: "2026-2" } });
  if (!semester) throw new Error("ABORT: semestre 2026-2 JARABA no encontrado");

  const snapshot = {
    palUsers: await prisma.user.count({ where: { campusId: palmitas.id } }),
    palEnrollments: await prisma.enrollment.count({ where: { academicGroup: { campusId: palmitas.id } } }),
    palClasses: await prisma.class.count({ where: { academicGroup: { campusId: palmitas.id } } }),
    jarStudents: await prisma.user.count({ where: { campusId: campus.id, roleId: roleStudent.id } }),
    jarTeachers: await prisma.user.count({ where: { campusId: campus.id, roleId: roleTeacher.id } }),
    jarGroups: await prisma.academicGroup.count({ where: { campusId: campus.id } }),
    jarTAs: await prisma.teachingAssignment.count({ where: { campusId: campus.id } }),
    jarSubjects: await prisma.subject.count({ where: { campusId: campus.id } }),
    jarClasses: await prisma.class.count({ where: { academicGroup: { campusId: campus.id } } }),
    jarEnrollments: await prisma.enrollment.count({ where: { academicGroup: { campusId: campus.id } } }),
  };
  console.log("Preflight (estado actual):", JSON.stringify(snapshot, null, 2));

  if (snapshot.jarSubjects > 0) throw new Error("ABORT: JARABA ya tiene subjects (se esperaba 0)");
  if (snapshot.jarClasses > 0) throw new Error("ABORT: JARABA ya tiene classes (se esperaba 0)");

  // ---- usernames / documentos (conflictos globales) ----
  const allUsernames = [...students.map((s) => s.username), ...TEACHERS.map((t) => t.username)];
  const existingUsers = await prisma.user.findMany({ select: { username: true, documentNumber: true } });
  const existingUsernames = new Set(existingUsers.map((u) => u.username));
  const existingDocs = new Set(existingUsers.map((u) => u.documentNumber).filter(Boolean));

  const usernameCollisions = allUsernames.filter((u) => existingUsernames.has(u));
  const docCollisions = students.map((s) => s.documentNumber).filter((d) => existingDocs.has(d));

  if (usernameCollisions.length > 0) throw new Error(`ABORT: usernames ya existentes: ${usernameCollisions.join(", ")}`);
  if (docCollisions.length > 0) throw new Error(`ABORT: documentos ya existentes: ${docCollisions.join(", ")}`);

  // ---- duplicados internos ----
  const internalUsernameDup = allUsernames.filter((u, i, a) => a.indexOf(u) !== i);
  const internalDocDup = students.map((s) => s.documentNumber).filter((d, i, a) => a.indexOf(d) !== i);
  if (internalUsernameDup.length > 0) throw new Error(`ABORT: usernames duplicados internos: ${JSON.stringify(internalUsernameDup)}`);
  if (internalDocDup.length > 0) throw new Error(`ABORT: documentos previos duplicados internos: ${JSON.stringify(internalDocDup)}`);

  // ---- ciclos / subjects / grupos preexistentes en JARABA ----
  for (const code of ["C3", "C4", "C6"]) {
    const cyc = await prisma.cycle.findFirst({ where: { campusId: campus.id, code } });
    if (cyc) throw new Error(`ABORT: ciclo ${code} JARABA ya existe`);
  }
  for (const sub of SUBJECTS) {
    const existing = await prisma.subject.findFirst({ where: { campusId: campus.id, code: sub.code } });
    if (existing) throw new Error(`ABORT: subject ${sub.code} JARABA ya existe`);
  }

  console.log("Preflight OK: sin colisiones de username, documento, ciclos o subjects.");

  // ================================================================
  // PLAN / ESTRATEGIA TRANSACCIONAL
  // ================================================================
  console.log(`
  === PLAN FASE 4 ===
  estudiantes: ${students.length} (C3=${students.filter((s) => s.cycle === 3).length}, C4=${students.filter((s) => s.cycle === 4).length}, C6=${students.filter((s) => s.cycle === 6).length})
  profesores: ${TEACHERS.length}
  subjects: ${SUBJECTS.length}
  ciclos (nuevos): 3 (C3, C4, C6)
  grupos: 3
  teachingAssignments: ${ASSIGNMENTS.length}
  classes: ${ASSIGNMENTS.length}
  enrollments: ${students.length}
  semestre: ${semester.code} (${semester.id})
  Transaccion: una sola prisma.$transaction atomica + rollback automatico. Sin borrados generales por campusId.
  `);
  console.log(GO ? "MODO: --go (insercion real de Fase 4)" : "MODO: preflight READ-ONLY. NO se inserto nada. Ejecuta con --go para insertar.");

  if (!GO) return;

  // ================================================================
  // TRANSACCION REAL DE FASE 4 (--go)
  // Una sola $transaction atomica; si algo falla, rollback automatico.
  // ================================================================
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS);

  const countsBeforeTx = {
    users: await prisma.user.count(),
    cycles: await prisma.cycle.count(),
    subjects: await prisma.subject.count(),
    academicGroups: await prisma.academicGroup.count(),
    teachingAssignments: await prisma.teachingAssignment.count(),
    classes: await prisma.class.count(),
    enrollments: await prisma.enrollment.count(),
  };
  const settingsBeforeTx = await prisma.institutionSettings.findFirst();

  const CYCLE_DEFS: Array<{ code: string; name: string; order: number }> = [
    { code: "C3", name: "Ciclo 3", order: 3 },
    { code: "C4", name: "Ciclo 4", order: 4 },
    { code: "C6", name: "Ciclo 6", order: 6 },
  ];

  let groupIds: Record<string, string> = {};
  let teacherIds: Record<string, string> = {};
  let teacherSqlUsernames = TEACHERS.map((t) => t.username);

  await prisma.$transaction(
    async (tx) => {
    // 1. Ciclos C3/C4/C6 (usan materias)
    const cycleIds: Record<string, string> = {};
    for (const c of CYCLE_DEFS) {
      const created = await tx.cycle.create({
        data: { code: c.code, name: c.name, description: "Bachillerato", order: c.order, usesSubjects: true, campusId: campus.id },
      });
      cycleIds[c.code] = created.id;
    }

    // 2. Subjects (10)
    const subjectIds: Record<string, string> = {};
    for (const s of SUBJECTS) {
      const created = await tx.subject.create({
        data: { name: s.name, code: s.code, color: s.color, icon: s.icon, campusId: campus.id },
      });
      subjectIds[s.code] = created.id;
    }

    // 3. Profesores (5)
    for (const t of TEACHERS) {
      const created = await tx.user.create({
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
      teacherIds[t.username] = created.id;
    }

    // 4. Grupos academicos (3) con manager
    for (const c of CYCLE_DEFS) {
      const managerUsername = MANAGERS[c.code];
      const manager = TEACHERS.find((t) => t.username === managerUsername)!;
      const created = await tx.academicGroup.create({
        data: {
          semesterId: semester.id,
          cycleId: cycleIds[c.code],
          managerTeacherId: teacherIds[managerUsername],
          nameInternal: `${c.name} - ${manager.firstName} ${manager.lastName}`,
          nameForStudents: c.name,
          campusId: campus.id,
        },
      });
      groupIds[c.code] = created.id;
    }

    // 5. Estudiantes (35)
    const studentIdsByDoc: Record<string, string> = {};
    for (const s of students) {
      const created = await tx.user.create({
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
      studentIdsByDoc[s.documentNumber] = created.id;
    }

    // 6. TeachingAssignments (20) + 8. Classes (20)
    const taIdsByKey: Record<string, string> = {};
    for (const a of ASSIGNMENTS) {
      const key = `${a.teacher}|${a.cycleCode}|${a.subjectCode}`;
      const subject = SUBJECTS.find((su) => su.code === a.subjectCode)!;
      const cycle = CYCLE_DEFS.find((c) => c.code === a.cycleCode)!;
      const created = await tx.teachingAssignment.create({
        data: {
          teacherId: teacherIds[a.teacher],
          cycleId: cycleIds[a.cycleCode],
          subjectId: subjectIds[a.subjectCode],
          academicGroupId: null,
          campusId: campus.id,
          active: true,
        },
      });
      taIdsByKey[key] = created.id;
      await tx.class.create({
        data: {
          teachingAssignmentId: created.id,
          academicGroupId: groupIds[a.cycleCode],
          subjectId: subjectIds[a.subjectCode],
          name: `${subject.name} - ${cycle.name}`,
          section: "",
          description: "",
        },
      });
    }

    // 7. Enrollments (35) al grupo de su ciclo
    for (const s of students) {
      await tx.enrollment.create({
        data: {
          studentId: studentIdsByDoc[s.documentNumber],
          semesterId: semester.id,
          academicGroupId: groupIds[`C${s.cycle}`],
          status: "ACTIVE",
        },
      });
    }
    },
    { maxWait: 30000, timeout: 60000 }
  );

  // ================================================================
  // VERIFICACION POST-TRANSACCION (solo lectura)
  // ================================================================
  const countsAfterTx = {
    users: await prisma.user.count(),
    cycles: await prisma.cycle.count(),
    subjects1: await prisma.subject.count(),
    academicGroups: await prisma.academicGroup.count(),
    teachingAssignments: await prisma.teachingAssignment.count(),
    classes: await prisma.class.count(),
    enrollments: await prisma.enrollment.count(),
  };
  const delta = {
    users: countsAfterTx.users - countsBeforeTx.users,
    cycles: countsAfterTx.cycles - countsBeforeTx.cycles,
    subjects: countsAfterTx.subjects1 - countsBeforeTx.subjects,
    academicGroups: countsAfterTx.academicGroups - countsBeforeTx.academicGroups,
    teachingAssignments: countsAfterTx.teachingAssignments - countsBeforeTx.teachingAssignments,
    classes: countsAfterTx.classes - countsBeforeTx.classes,
    enrollments: countsAfterTx.enrollments - countsBeforeTx.enrollments,
  };

  async function groupStudentCount(groupId: string) {
    return prisma.enrollment.count({ where: { academicGroupId: groupId } });
  }

  const studentsByCycle = {
    C3: await groupStudentCount(groupIds.C3),
    C4: await groupStudentCount(groupIds.C4),
    C6: await groupStudentCount(groupIds.C6),
  };

  const newTeachers = await prisma.user.count({
    where: { campusId: campus.id, roleId: roleTeacher.id, username: { in: teacherSqlUsernames } },
  });
  const newCycles = await prisma.cycle.count({ where: { campusId: campus.id, code: { in: ["C3", "C4", "C6"] } } });
  const newSubjects = await prisma.subject.count({ where: { campusId: campus.id } });
  const newGroups = await prisma.academicGroup.count({
    where: { campusId: campus.id, id: { in: Object.values(groupIds) } },
  });
  const newTas = await prisma.teachingAssignment.count({ where: { campusId: campus.id, subjectId: { not: null } } });
  const newClasses = await prisma.class.count({ where: { academicGroup: { campusId: campus.id } } });
  const newEnrollments = await prisma.enrollment.count({
    where: { academicGroup: { campusId: campus.id } },
  });

  // 12. C2 JARABA intacto
  const c2Group = await prisma.academicGroup.findFirst({
    where: { campusId: campus.id, cycle: { code: "C2" } },
  });
  const c2Enrollments = c2Group ? await prisma.enrollment.count({ where: { academicGroupId: c2Group.id } }) : 0;
  const c2Classes = c2Group ? await prisma.class.count({ where: { academicGroupId: c2Group.id } }) : -1;

  // 13. PALMITAS intacto
  const palCounts = {
    users: await prisma.user.count({ where: { campusId: palmitas.id } }),
    enrollments: await prisma.enrollment.count({ where: { academicGroup: { campusId: palmitas.id } } }),
    classes: await prisma.class.count({ where: { academicGroup: { campusId: palmitas.id } } }),
  };

  // 14. activeSemesterId intacto
  const settingsAfterTx = await prisma.institutionSettings.findFirst();
  const activeSemesterIdUnchanged = settingsAfterTx?.activeSemesterId === settingsBeforeTx?.activeSemesterId;

  // 15. yira.jimenez campusId NULL
  const yira = await prisma.user.findUnique({ where: { username: "yira.jimenez" } });
  const yiraCampusNull = yira ? yira.campusId === null : false;

  const checks: Array<[string, boolean]> = [
    ["C3 = 10 estudiantes", studentsByCycle.C3 === 10],
    ["C4 = 14 estudiantes", studentsByCycle.C4 === 14],
    ["C6 = 11 estudiantes", studentsByCycle.C6 === 11],
    ["5 profesores nuevos", newTeachers === 5],
    ["3 ciclos nuevos", newCycles === 3],
    ["10 subjects JARABA", newSubjects === 10],
    ["3 grupos nuevos", newGroups === 3],
    ["20 TeachingAssignments", newTas === 20],
    ["20 clases JARABA", newClasses === 20],
    ["35 matrículas nuevas", newEnrollments === 35],
    ["C2 JARABA intacto (14 matrículas, 0 clases)", c2Enrollments === 14 && c2Classes === 0],
    ["PALMITAS usuarios intactos (57)", palCounts.users === snapshot.palUsers],
    ["PALMITAS matrículas intactas (51)", palCounts.enrollments === snapshot.palEnrollments],
    ["PALMITAS clases intactas (24)", palCounts.classes === snapshot.palClasses],
    ["activeSemesterId intacto", activeSemesterIdUnchanged],
    ["yira.jimenez campusId NULL", yiraCampusNull],
  ];

  let failed = 0;
  console.log("\n=== VERIFICACION FASE 4 (post-transaccion) ===");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "FALLO"} — ${label}`);
    if (!ok) failed++;
  }

  console.log("\n=== DELTA REAL BD ===");
  console.log(JSON.stringify(delta, null, 2));
  console.log("estudiantes por ciclo:", JSON.stringify(studentsByCycle));
  console.log("PALMITAS tras Fase 4 (debe ser igual a preflight):", JSON.stringify(palCounts));
  console.log("C2 JARABA: enrollments=", c2Enrollments, "classes=", c2Classes);

  console.log(`Contraseña temporal: ${TEMP_PASSWORD} (mustChangePassword=true)`);

  if (failed > 0) throw new Error(`Validacion post-transaccion fallida: ${failed} checks`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });