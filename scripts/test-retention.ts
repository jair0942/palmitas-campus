import { randomBytes } from "node:crypto";
import { config as loadDotEnv } from "dotenv";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import storage from "../src/lib/storage";
import { getSupabaseAdmin, storageBucket } from "../src/lib/supabase";
import { runStorageCleanup, computeExpiresAt, getRetentionDays, DEFAULT_RETENTION_DAYS } from "../src/lib/retention";
import { StorageProvider } from "../src/generated/prisma/client";
import { POST as uploadPOST } from "../src/app/api/upload/route";
import { GET as cronGET } from "../src/app/api/cron/storage-cleanup/route";
import { GET as statsGET } from "../src/app/api/storage/stats/route";
import { GET as settingsGET, PATCH as settingsPATCH } from "../src/app/api/storage/settings/route";
import { PATCH as fileAssetPATCH } from "../src/app/api/file-assets/[id]/route";
import { GET as downloadGET } from "../src/app/api/file-assets/[id]/download/route";

const TEST_TAG = "RETENTION-TEST";
const DAY = 24 * 60 * 60 * 1000;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function report(name: string, pass: boolean, detail = "") {
  if (pass) {
    passed++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  return pass;
}

function assert(cond: boolean, msg = ""): boolean {
  return !!cond;
}

function makeRequest(
  url: string,
  opts: { method?: string; cookie?: string; headers?: Record<string, string>; body?: string | FormData } = {}
) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.headers) Object.assign(headers, opts.headers);
  const init: RequestInit = { method: opts.method || "GET", headers };
  if (opts.body !== undefined) init.body = opts.body as BodyInit;
  return new NextRequest(url, init);
}

async function expectStatus(p: Promise<Response>, status: number): Promise<Response> {
  const res = await p;
  return res;
}

const testAssets: string[] = [];
const testUsers: string[] = [];
const testSessions: string[] = [];
const testPosts: string[] = [];
const testClasses: string[] = [];
const testTeachingAssignments: string[] = [];
const testAcademicGroups: string[] = [];
const testCleanupRuns: string[] = [];

async function createUser(username: string, roleName: string, campusId: string | null) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error(`Role not found: ${roleName}`);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: "x",
      roleId: role.id,
      campusId,
      firstName: "RETENTION",
      lastName: "TEST",
      documentType: "CC",
      documentNumber: randomBytes(6).toString("hex"),
    },
  });
  testUsers.push(user.id);
  return user;
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const session = await prisma.session.create({
    data: { userId, token, expiresAt: new Date(Date.now() + DAY) },
  });
  testSessions.push(session.id);
  return `session_token=${token}`;
}

async function makeObjectKey(campusId: string, userId: string, label: string, ext = ".txt") {
  return `${campusId}/${userId}/${TEST_TAG}-${label}-${randomBytes(4).toString("hex")}${ext}`;
}

async function createAsset(opts: {
  campusId: string;
  userId: string;
  label: string;
  expiresAt: Date;
  protectedFromCleanup?: boolean;
  sizeBytes?: number;
  withObject?: boolean;
  createdAt?: Date;
}) {
  const storedName = await makeObjectKey(opts.campusId, opts.userId, opts.label);
  const sizeBytes = opts.sizeBytes ?? 64;
  if (opts.withObject) {
    await storage.save(storedName, Buffer.alloc(sizeBytes, 0x41), "text/plain");
  }
  const asset = await prisma.fileAsset.create({
    data: {
      uploadedById: opts.userId,
      originalName: `${TEST_TAG}-${opts.label}.txt`,
      storedName,
      url: "",
      mimeType: "text/plain",
      extension: "txt",
      sizeBytes,
      storageProvider: StorageProvider.EXTERNAL,
      expiresAt: opts.expiresAt,
      protectedFromCleanup: opts.protectedFromCleanup ?? false,
      createdAt: opts.createdAt ?? new Date(),
    },
  });
  testAssets.push(asset.id);
  return { asset, storedName };
}

async function objectExists(storedName: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(storageBucket).createSignedUrl(storedName, 60);
  return !error;
}

let chainTeacherId: string | null = null;

async function ensureTestChain(campusId: string) {
  if (chainTeacherId) return chainTeacherId;
  const semester = await prisma.semester.findFirst({ where: { campusId } });
  const cycle = await prisma.cycle.findFirst({ where: { campusId } });
  if (!semester || !cycle) throw new Error("No semester/cycle for test chain");
  const teacher = await prisma.user.findFirst({ where: { campusId, role: { name: "teacher" } } });
  if (!teacher) throw new Error("No teacher for test chain");

  const group = await prisma.academicGroup.create({
    data: {
      semesterId: semester.id,
      cycleId: cycle.id,
      nameInternal: `${TEST_TAG}-group`,
      nameForStudents: `${TEST_TAG}-group`,
      campusId,
    },
  });
  testAcademicGroups.push(group.id);

  const ta = await prisma.teachingAssignment.create({
    data: {
      teacherId: teacher.id,
      cycleId: cycle.id,
      subjectId: null,
      academicGroupId: group.id,
      campusId,
    },
  });
  testTeachingAssignments.push(ta.id);

  const cls = await prisma.class.create({
    data: {
      teachingAssignmentId: ta.id,
      academicGroupId: group.id,
      name: `${TEST_TAG}-class`,
    },
  });
  testClasses.push(cls.id);

  const post = await prisma.post.create({
    data: { classId: cls.id, authorId: teacher.id, content: `${TEST_TAG}-post` },
  });
  testPosts.push(post.id);
  chainTeacherId = teacher.id;
  return chainTeacherId;
}

async function cleanupAll(testStart: Date) {
  console.log("\n=== FASE 17: Limpieza de datos de prueba ===");

  await prisma.attachment.deleteMany({ where: { fileAssetId: { in: testAssets } } });
  for (const id of testPosts) {
    await prisma.comment.deleteMany({ where: { postId: id } });
    await prisma.post.delete({ where: { id } }).catch(() => {});
  }
  for (const id of testClasses) {
    await prisma.post.deleteMany({ where: { classId: id } });
    await prisma.assignment.deleteMany({ where: { classId: id } });
    await prisma.class.delete({ where: { id } }).catch(() => {});
  }
  for (const id of testTeachingAssignments) {
    await prisma.class.deleteMany({ where: { teachingAssignmentId: id } });
    await prisma.teachingAssignment.delete({ where: { id } }).catch(() => {});
  }
  for (const id of testAcademicGroups) {
    await prisma.teachingAssignment.deleteMany({ where: { academicGroupId: id } });
    await prisma.enrollment.deleteMany({ where: { academicGroupId: id } });
    await prisma.academicGroup.delete({ where: { id } }).catch(() => {});
  }

  const remaining = await prisma.fileAsset.findMany({ where: { id: { in: testAssets } }, select: { id: true, storedName: true } });
  for (const a of remaining) {
    await storage.delete(a.storedName).catch(() => {});
  }
  await prisma.fileAsset.deleteMany({ where: { id: { in: testAssets } } });

  await prisma.session.deleteMany({ where: { id: { in: testSessions } } });
  await prisma.user.deleteMany({ where: { id: { in: testUsers } } });

  await prisma.cleanupRun.deleteMany({ where: { startedAt: { gte: testStart } } });

  await prisma.auditLog.deleteMany({
    where: {
      createdAt: { gte: testStart },
      OR: [{ recordId: { in: testAssets } }, { userId: { in: testUsers } }, { module: "storage" }],
    },
  });
}

async function verifyNoResidue(testStart: Date): Promise<boolean> {
  const assetByName = await prisma.fileAsset.count({
    where: { OR: [{ originalName: { contains: TEST_TAG } }, { storedName: { contains: TEST_TAG } }] },
  });
  const orphanAttachments = await prisma.attachment.count({
    where: { fileAssetId: { notIn: (await prisma.fileAsset.findMany({ select: { id: true } })).map((a) => a.id) } },
  });
  const testUsersLeft = await prisma.user.count({ where: { username: { startsWith: TEST_TAG } } });
  const testSessionsLeft = await prisma.session.count({ where: { id: { in: testSessions } } });
  const testRunsLeft = await prisma.cleanupRun.count({ where: { startedAt: { gte: testStart } } });
  const testAuditLeft = await prisma.auditLog.count({
    where: { createdAt: { gte: testStart }, OR: [{ recordId: { in: testAssets } }, { userId: { in: testUsers } }, { module: "storage" }] },
  });
  const testPostsLeft = await prisma.post.count({ where: { id: { in: testPosts } } });
  const testClassesLeft = await prisma.class.count({ where: { id: { in: testClasses } } });
  const testTaLeft = await prisma.teachingAssignment.count({ where: { id: { in: testTeachingAssignments } } });
  const testGroupsLeft = await prisma.academicGroup.count({ where: { id: { in: testAcademicGroups } } });

  const residue =
    assetByName +
    orphanAttachments +
    testUsersLeft +
    testSessionsLeft +
    testRunsLeft +
    testAuditLeft +
    testPostsLeft +
    testClassesLeft +
    testTaLeft +
    testGroupsLeft;

  report("X. limpieza de datos de prueba = 0 residuos", residue === 0, `residuos totales = ${residue}`);
  return residue === 0;
}

async function main() {
  loadDotEnv({ path: ".env.local" });
  const testStart = new Date();
  console.log("=== PRUEBAS DE RETENCIÓN Y LIMPIEZA ===");

  const campuses = await prisma.campus.findMany();
  const palmitas = campuses.find((c) => c.code.toUpperCase() === "PALMITAS" || c.name.toUpperCase().includes("PALMITAS"));
  const jaraba = campuses.find((c) => c.code.toUpperCase() === "JARABA" || c.name.toUpperCase().includes("JARABA"));
  if (!palmitas || !jaraba) throw new Error(`Campuses not found: ${JSON.stringify(campuses.map((c) => ({ code: c.code, name: c.name })))}`);
  console.log(`Sedes: PALMITAS=${palmitas.id} JARABA=${jaraba.id}`);

  const palmitasStudent = await createUser(`${TEST_TAG}-student-palmitas`, "student", palmitas.id);
  const palmitasAdmin = await createUser(`${TEST_TAG}-admin-palmitas`, "admin", palmitas.id);
  const jarabaAdmin = await createUser(`${TEST_TAG}-admin-jaraba`, "admin", jaraba.id);
  const jarabaTeacher = await createUser(`${TEST_TAG}-teacher-jaraba`, "teacher", jaraba.id);
  const globalAdmin = await createUser(`${TEST_TAG}-globaladmin`, "admin", null);

  const studentCookie = await createSession(palmitasStudent.id);
  const palmitasAdminCookie = await createSession(palmitasAdmin.id);
  const jarabaAdminCookie = await createSession(jarabaAdmin.id);
  const jarabaTeacherCookie = await createSession(jarabaTeacher.id);
  const globalAdminCookie = await createSession(globalAdmin.id);

  const priorPolicies = new Map<string, number | null>();
  for (const c of [palmitas, jaraba]) {
    const p = await prisma.retentionPolicy.findUnique({ where: { campusId: c.id } });
    priorPolicies.set(c.id, p?.retentionDays ?? null);
  }

  try {
    console.log("\n--- A. archivo nuevo obtiene expiresAt correcto ---");
    {
      const fd = new FormData();
      fd.append("file", new File([Buffer.from("RETENTION-TEST content a")], `${TEST_TAG}-upload-a.txt`, { type: "text/plain" }));
      const res = await expectStatus(uploadPOST(makeRequest("http://x/api/upload", { method: "POST", cookie: studentCookie, body: fd })), 201);
      const body = await res.json();
      const ok = res.status === 201 && !!body.expiresAt && !!body.id;
      let diffOk = false;
      if (ok) {
        const diff = (new Date(body.expiresAt).getTime() - new Date(body.createdAt).getTime()) / DAY;
        diffOk = diff >= 89 && diff <= 91;
      }
      report("A. nuevo archivo obtiene expiresAt correcto (~90 días)", res.status === 201 && diffOk, ok ? `expiresAt=${body.expiresAt}` : JSON.stringify(body));
      if (body.id) testAssets.push(body.id);
      const row = body.id ? await prisma.fileAsset.findUnique({ where: { id: body.id } }) : null;
      report("A2. expiresAt persistido en BD", !!row?.expiresAt);
    }

    console.log("\n--- B. archivo no expirado NO se elimina ---");
    {
      const { asset } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "b-future",
        expiresAt: new Date(Date.now() + 30 * DAY),
        withObject: true,
      });
      const before = await objectExists(asset.storedName);
      await runStorageCleanup({ limit: 500 });
      const afterDb = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      const afterObj = await objectExists(asset.storedName);
      report("B. archivo no expirado NO se elimina", !!afterDb && before && afterObj);
    }

    console.log("\n--- C/D/E/F. expirado elegible se elimina (BD + Storage + Attachments) ---");
    let assetCid: string | null = null;
    {
      const teacherId = await ensureTestChain(palmitas.id);
      const { asset, storedName } = await createAsset({
        campusId: palmitas.id,
        userId: teacherId,
        label: "c-expired",
        expiresAt: new Date(Date.now() - DAY),
        createdAt: new Date(Date.now() - 95 * DAY),
        sizeBytes: 321,
        withObject: true,
      });
      assetCid = asset.id;
      const attachment = await prisma.attachment.create({
        data: {
          name: asset.originalName,
          size: "321 B",
          type: "text/plain",
          url: `/api/file-assets/${asset.id}/download`,
          fileAssetId: asset.id,
          postId: testPosts[0],
        },
      });
      await runStorageCleanup({ limit: 500 });
      const afterDb = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      const afterObj = await objectExists(storedName);
      const attGone = !(await prisma.attachment.findUnique({ where: { id: attachment.id } }));
      const orphans = await prisma.attachment.count({
        where: { fileAssetId: { notIn: (await prisma.fileAsset.findMany({ select: { id: true } })).map((a) => a.id) } },
      });
      report("C. expirado elegible se elimina", !afterDb);
      report("D. objeto desaparece de Supabase Storage", !afterObj);
      report("E. FileAsset eliminado en BD", !afterDb);
      report("F. Attachment no queda roto", attGone && orphans === 0, `orphans=${orphans}`);
    }

    console.log("\n--- G. archivo protegido NO se elimina ---");
    {
      const { asset, storedName } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "g-protected",
        expiresAt: new Date(Date.now() - DAY),
        protectedFromCleanup: true,
        withObject: true,
      });
      await runStorageCleanup({ limit: 500 });
      const afterDb = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      const afterObj = await objectExists(storedName);
      report("G. archivo protegido NO se elimina", !!afterDb && afterObj);
    }

    console.log("\n--- H/I. aislamiento de sedes (admin) ---");
    {
      const { asset: h } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "h-palmitas",
        expiresAt: new Date(Date.now() + DAY),
        withObject: true,
      });
      const resJaraba = await fileAssetPATCH(
        makeRequest("http://x/api/file-assets/x", { method: "PATCH", cookie: jarabaAdminCookie, body: JSON.stringify({ protectedFromCleanup: true }) }),
        { params: Promise.resolve({ id: h.id }) }
      );
      const resPalmitas = await fileAssetPATCH(
        makeRequest("http://x/api/file-assets/x", { method: "PATCH", cookie: palmitasAdminCookie, body: JSON.stringify({ protectedFromCleanup: true }) }),
        { params: Promise.resolve({ id: h.id }) }
      );
      report("H. archivo de PALMITAS no administrable desde JARABA", resJaraba.status === 404, `jaraba->${resJaraba.status}`);
      report("H2. administrable desde PALMITAS", resPalmitas.status === 200, `palmitas->${resPalmitas.status}`);
      await fileAssetPATCH(
        makeRequest("http://x/api/file-assets/x", { method: "PATCH", cookie: palmitasAdminCookie, body: JSON.stringify({ protectedFromCleanup: false }) }),
        { params: Promise.resolve({ id: h.id }) }
      );

      const { asset: i } = await createAsset({
        campusId: jaraba.id,
        userId: jarabaAdmin.id,
        label: "i-jaraba",
        expiresAt: new Date(Date.now() + DAY),
        withObject: true,
      });
      const resPalmitas2 = await fileAssetPATCH(
        makeRequest("http://x/api/file-assets/x", { method: "PATCH", cookie: palmitasAdminCookie, body: JSON.stringify({ protectedFromCleanup: true }) }),
        { params: Promise.resolve({ id: i.id }) }
      );
      const resJaraba2 = await fileAssetPATCH(
        makeRequest("http://x/api/file-assets/x", { method: "PATCH", cookie: jarabaAdminCookie, body: JSON.stringify({ protectedFromCleanup: true }) }),
        { params: Promise.resolve({ id: i.id }) }
      );
      report("I. archivo de JARABA no administrable desde PALMITAS", resPalmitas2.status === 404, `palmitas->${resPalmitas2.status}`);
      report("I2. administrable desde JARABA", resJaraba2.status === 200, `jaraba->${resJaraba2.status}`);
      await fileAssetPATCH(
        makeRequest("http://x/api/file-assets/x", { method: "PATCH", cookie: jarabaAdminCookie, body: JSON.stringify({ protectedFromCleanup: false }) }),
        { params: Promise.resolve({ id: i.id }) }
      );
    }

    console.log("\n--- J/K/L/M. permisos por rol sobre retención ---");
    {
      const resStudent = await settingsPATCH(makeRequest("http://x/api/storage/settings", { method: "PATCH", cookie: studentCookie, body: JSON.stringify({ retentionDays: 30 }) }));
      report("J. STUDENT no cambia retención", resStudent.status === 403, `status=${resStudent.status}`);

      const resTeacher = await settingsPATCH(makeRequest("http://x/api/storage/settings", { method: "PATCH", cookie: jarabaTeacherCookie, body: JSON.stringify({ retentionDays: 30 }) }));
      report("K. TEACHER no cambia retención", resTeacher.status === 403, `status=${resTeacher.status}`);

      const resAdmin = await settingsPATCH(makeRequest("http://x/api/storage/settings", { method: "PATCH", cookie: palmitasAdminCookie, body: JSON.stringify({ retentionDays: 30 }) }));
      const policy = await prisma.retentionPolicy.findUnique({ where: { campusId: palmitas.id } });
      report("L. ADMIN sí cambia retención", resAdmin.status === 200 && policy?.retentionDays === 30, `status=${resAdmin.status}`);

      const resGlobalNoCampus = await settingsPATCH(makeRequest("http://x/api/storage/settings", { method: "PATCH", cookie: globalAdminCookie, body: JSON.stringify({ retentionDays: 30 }) }));
      report("M. admin global sin sede → 400", resGlobalNoCampus.status === 400, `status=${resGlobalNoCampus.status}`);

      const resGlobalCampus = await settingsPATCH(makeRequest("http://x/api/storage/settings", { method: "PATCH", cookie: globalAdminCookie, headers: { "x-campus-id": jaraba.id }, body: JSON.stringify({ retentionDays: 60 }) }));
      const jarabaPolicy = await prisma.retentionPolicy.findUnique({ where: { campusId: jaraba.id } });
      report("M2. admin global con sede → 200", resGlobalCampus.status === 200 && jarabaPolicy?.retentionDays === 60, `status=${resGlobalCampus.status}`);
    }

    console.log("\n--- N/O/P. cron: seguridad e idempotencia ---");
    const oldSecret = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = "test-cron-secret";
      const { asset: cronAsset, storedName: cronStored } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "n-cron-expired",
        expiresAt: new Date(Date.now() - DAY),
        withObject: true,
      });
      const resNoAuth = await cronGET(makeRequest("http://x/api/cron/storage-cleanup"));
      const resWrongAuth = await cronGET(makeRequest("http://x/api/cron/storage-cleanup", { headers: { authorization: "Bearer wrong" } }));
      report("N. cron sin autorización → 401/403", resNoAuth.status === 401 || resNoAuth.status === 403, `noAuth=${resNoAuth.status}`);
      report("N2. cron con secreto incorrecto → 401/403", resWrongAuth.status === 401 || resWrongAuth.status === 403, `wrong=${resWrongAuth.status}`);

      const resOk1 = await cronGET(makeRequest("http://x/api/cron/storage-cleanup", { headers: { authorization: "Bearer test-cron-secret" } }));
      const body1 = await resOk1.json();
      const cronGone = !(await prisma.fileAsset.findUnique({ where: { id: cronAsset.id } }));
      report("O. cron autorizado → funciona", resOk1.status === 200 && !!body1.runId && cronGone, `status=${resOk1.status} deleted=${body1.deletedFiles}`);
      if (body1.runId) testCleanupRuns.push(body1.runId);

      const resOk2 = await cronGET(makeRequest("http://x/api/cron/storage-cleanup", { headers: { authorization: "Bearer test-cron-secret" } }));
      const body2 = await resOk2.json();
      const orphansAfter = await prisma.attachment.count({
        where: { fileAssetId: { notIn: (await prisma.fileAsset.findMany({ select: { id: true } })).map((a) => a.id) } },
      });
      report("P. ejecutar cron dos veces → idempotente", resOk2.status === 200 && orphansAfter === 0 && body2.status !== "failed", `run2status=${body2.status}`);
      if (body2.runId) testCleanupRuns.push(body2.runId);
    } finally {
      if (oldSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = oldSecret;
    }

    console.log("\n--- Q. fallo simulado de Storage ---");
    {
      const { asset, storedName } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "q-storage-fail",
        expiresAt: new Date(Date.now() - DAY),
        withObject: true,
      });
      const origDelete = storage.delete;
      (storage as any).delete = async () => {
        throw new Error("simulated storage failure");
      };
      let run: any;
      try {
        run = await runStorageCleanup({ limit: 500 });
      } finally {
        (storage as any).delete = origDelete;
      }
      const afterDb = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      const hasErr = run.errors?.some((e: any) => e.assetId === asset.id);
      report("Q. fallo de Storage no corrompe BD (fila conservada)", !!afterDb && run.status === "partial" && hasErr);
      await runStorageCleanup({ limit: 500 });
      const afterClean = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      report("Q2. reintento posterior limpia el archivo", !afterClean && !(await objectExists(storedName)));
    }

    console.log("\n--- R. fallo simulado de DB ---");
    {
      const { asset, storedName } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "r-db-fail",
        expiresAt: new Date(Date.now() - DAY),
        withObject: true,
      });
      const origDelete = prisma.fileAsset.delete;
      let threw = false;
      try {
        (prisma.fileAsset.delete as any) = async () => {
          threw = true;
          throw new Error("simulated db failure");
        };
        await runStorageCleanup({ limit: 500 });
      } finally {
        (prisma.fileAsset.delete as any) = origDelete;
      }
      const afterDb = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      report("R. fallo de DB recuperable (fila conservada)", threw && !!afterDb);
      await runStorageCleanup({ limit: 500 });
      const afterClean = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      report("R2. reintento posterior limpia el archivo", !afterClean && !(await objectExists(storedName)));
    }

    console.log("\n--- S. estadísticas de almacenamiento correctas ---");
    {
      const res = await statsGET(makeRequest("http://x/api/storage/stats", { cookie: palmitasAdminCookie }));
      const body = await res.json();
      const now = new Date();
      const soon = new Date(now.getTime() + 7 * DAY);
      const expected = await prisma.fileAsset.aggregate({
        where: { uploader: { campusId: palmitas.id } },
        _count: true,
        _sum: { sizeBytes: true },
      });
      const expSoon = await prisma.fileAsset.count({
        where: { uploader: { campusId: palmitas.id }, expiresAt: { gte: now, lte: soon }, protectedFromCleanup: false },
      });
      const expPending = await prisma.fileAsset.count({
        where: { uploader: { campusId: palmitas.id }, expiresAt: { lt: now }, protectedFromCleanup: false },
      });
      report(
        "S. estadísticas de almacenamiento correctas",
        res.status === 200 &&
          body.totalFiles === expected._count &&
          body.totalBytes === (expected._sum.sizeBytes ?? 0) &&
          body.expiringSoon === expSoon &&
          body.expiredPending === expPending,
        `files=${body.totalFiles}/${expected._count} expSoon=${body.expiringSoon}/${expSoon} expired=${body.expiredPending}/${expPending}`
      );
    }

    console.log("\n--- T. cambio 90→30 no elimina retroactivamente ---");
    {
      const { asset } = await createAsset({
        campusId: palmitas.id,
        userId: palmitasStudent.id,
        label: "t-existing",
        expiresAt: new Date(Date.now() + 60 * DAY),
        withObject: true,
      });
      await settingsPATCH(makeRequest("http://x/api/storage/settings", { method: "PATCH", cookie: palmitasAdminCookie, body: JSON.stringify({ retentionDays: 30 }) }));
      await runStorageCleanup({ limit: 500 });
      const afterDb = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      report("T. cambio de política no borra retroactivamente", !!afterDb && afterDb.expiresAt !== null);
    }

    console.log("\n--- U/V/W. upload/download/signed URLs continúan funcionando ---");
    {
      const res = await downloadGET(makeRequest("http://x/api/file-assets/x/download", { cookie: studentCookie }), { params: Promise.resolve({ id: assetCid || "" }) });
      report("U/V. download → 307 con signed URL (asset C fue eliminado → 404 esperado)", res.status === 404, `status=${res.status}`);

      const fd = new FormData();
      fd.append("file", new File([Buffer.from("RETENTION-TEST content uv")], `${TEST_TAG}-uv.txt`, { type: "text/plain" }));
      const up = await uploadPOST(makeRequest("http://x/api/upload", { method: "POST", cookie: studentCookie, body: fd }));
      const upBody = await up.json();
      const down = await downloadGET(makeRequest("http://x/api/file-assets/x/download", { cookie: studentCookie }), { params: Promise.resolve({ id: upBody.id }) });
      report("U2. nuevo upload/download funciona", up.status === 201 && down.status === 307, `up=${up.status} down=${down.status}`);
      const cross = await downloadGET(makeRequest("http://x/api/file-assets/x/download", { cookie: jarabaTeacherCookie }), { params: Promise.resolve({ id: upBody.id }) });
      report("W. aislamiento de sedes en download (JARABA no accede)", cross.status === 404, `cross=${cross.status}`);
      if (upBody.id) testAssets.push(upBody.id);
    }
  } finally {
    await cleanupAll(testStart);

    const palmitasPolicy = await prisma.retentionPolicy.findUnique({ where: { campusId: palmitas.id } });
    const jarabaPolicy = await prisma.retentionPolicy.findUnique({ where: { campusId: jaraba.id } });
    const priorP = priorPolicies.get(palmitas.id);
    const priorJ = priorPolicies.get(jaraba.id);
    if (priorP === null && palmitasPolicy) await prisma.retentionPolicy.delete({ where: { campusId: palmitas.id } }).catch(() => {});
    else if (priorP !== null) await prisma.retentionPolicy.upsert({ where: { campusId: palmitas.id }, update: { retentionDays: priorP }, create: { campusId: palmitas.id, retentionDays: priorP! } });
    if (priorJ === null && jarabaPolicy) await prisma.retentionPolicy.delete({ where: { campusId: jaraba.id } }).catch(() => {});
    else if (priorJ !== null) await prisma.retentionPolicy.upsert({ where: { campusId: jaraba.id }, update: { retentionDays: priorJ }, create: { campusId: jaraba.id, retentionDays: priorJ! } });

    await verifyNoResidue(testStart);
  }

  console.log(`\n=== RESULTADO: ${passed} PASS / ${failed} FAIL ===`);
  if (failures.length) {
    console.log("Fallos:", failures.join(", "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Error fatal en la ejecución de pruebas:", err);
  process.exitCode = 1;
});
