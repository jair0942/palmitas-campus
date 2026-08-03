import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const BASE = "http://localhost:3100";
const CAMPUS_PAL = "cmsc6kril00009ovgd87sopwc";
const CAMPUS_JAR = "cmsc6ks0v00019ovge1qz251n";
// JARABA
const CLS_MAT_C3 = "cmsce5dqf001tssvg6nvpr3bi"; // prof: lidiber.portela
const CLS_MAT_C4 = "cmsce5dvv001vssvg3yptkh4l"; // prof: lidiber.portela
const CLS_ING_C3 = "cmsce5fe4002dssvg0kf1ngw2"; // prof: ana.campo
const CLS_CSO_C3 = "cmsce5erd0025ssvgel2pz20t"; // prof: juan.castano (ajena para lidar/ana)
// PALMITAS
const CLS_PAL = "cmss00cvcu00000vhgmx0qr5tr"; // PAL "Matemáticas"

type Res = { status: number; body: any };
const report: { module: string; name: string; status: "PASS" | "FAIL" | "WARN" | "INFO"; detail: string }[] = [];

function rec(module: string, name: string, status: "PASS" | "FAIL" | "WARN" | "INFO", detail: string) {
  report.push({ module, name, status, detail });
  console.log(`[${status}] ${module} :: ${name} — ${detail}`);
}

async function req(path: string, opts: { cookie?: string; method?: string; body?: any; campusId?: string | null } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = `session_token=${opts.cookie}`;
  if (opts.campusId) headers["x-campus-id"] = opts.campusId;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const r = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let j: any = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
}

async function login(u: string, pw: string): Promise<{ cookie: string; me: any }> {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: u, password: pw }),
    redirect: "manual",
  });
  let j: any = null; try { j = await r.json(); } catch {}
  const c = (r.headers.get("set-cookie") || "").match(/session_token=([^;]+)/);
  const cookie = c ? c[1] : "";
  if (!r.ok) throw new Error(`login failed ${u}`);
  const mr = await req("/api/auth/me", { cookie });
  return { cookie, me: mr.body?.user };
}

const PW_JAR = "Jaraba2026!";
const PW_PAL = "Palmitas2026!";
const T = `AUDIT51-${Date.now()}`;
const idsToDelete: string[] = [];
const postsToDelete: string[] = [];

async function main() {
  const S: Record<string, { cookie: string; me: any }> = {};
  for (const u of ["yira.jimenez", "neila.canedo", "lidiber.portela", "ana.campo", "jaireth.jimenez", "jorge.canedo", "maria.narvaez", "sandy.delgado", "mishell.paez"]) {
    S[u] = await login(u, u.includes("jaireth") || u === "mishell.paez" || u === "yira.jimenez" ? PW_PAL : PW_JAR);
  }

  // ================= MODULO 1: NOTIFICATIONS =================
  // 1.1 type válido → 201
  const n1 = await req("/api/notifications", { cookie: S["yira.jimenez"].cookie, method: "POST", campusId: null, body: { userId: S["jorge.canedo"].me.id, type: "NEW_POST", title: `${T}n1`, message: "audit" } });
  rec("NOTIFICATIONS", "type valido → 201", n1.status === 201 ? "PASS" : "FAIL", `status=${n1.status}`);
  if (n1.body?.id) await db.notification.delete({ where: { id: n1.body.id } }).catch(() => {});
  // 1.2 type inválido → 400, nunca 500
  const bad = await req("/api/notifications", { cookie: S["yira.jimenez"].cookie, method: "POST", campusId: null, body: { userId: S["jorge.canedo"].me.id, type: "notarealtype", title: `${T}n2`, message: "audit" } });
  rec("NOTIFICATIONS", "type invalido → 400", bad.status === 400 ? "PASS" : "FAIL", `status=${bad.status}`);
  // 1.3 sin sesión → 401
  const na = await req("/api/notifications", { method: "POST", campusId: null, body: { userId: S["jorge.canedo"].me.id, type: "NEW_POST", title: `${T}n3`, message: "audit" } });
  rec("NOTIFICATIONS", "sin sesion → 401", na.status === 401 ? "PASS" : "FAIL", `status=${na.status}`);
  // 1.4 usuario sede incorrecta → porblettS
  const crossNot = await req("/api/notifications", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { userId: S["mishell.paez"].me.id, type: "NEW_POST", title: `${T}n4`, message: "audit" } });
  rec("NOTIFICATIONS", "estudiante JAR notifica PAL → 403", crossNot.status === 403 ? "PASS" : "FAIL", `status=${crossNot.status}`);
  // 1.5 auto-notificación estudiante → 201
  const selfNot = await req("/api/notifications", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { userId: S["jorge.canedo"].me.id, type: "NEW_ASSIGNMENT", title: `${T}n5`, message: "audit" } });
  rec("NOTIFICATIONS", "auto-notificacion estudiante → 201", selfNot.status === 201 ? "PASS" : "FAIL", `status=${selfNot.status}`);
  if (selfNot.body?.id) await db.notification.delete({ where: { id: selfNot.body.id } }).catch(() => {});

  // ================= MODULO 2: ASSIGNMENTS =================
  // 2.1 teacher MAT crea en su clase → 201
  const aOwn = await req("/api/assignments", { cookie: S["lidiber.portela"].cookie, method: "POST", body: { classId: CLS_MAT_C3, title: `${T}-a1`, points: 100, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  const aId1 = aOwn.body?.id;
  rec("ASSIGNMENTS", "teacher crea en su clase → 201", aOwn.status === 201 ? "PASS" : "FAIL", `status=${aOwn.status}`);
  if (aId1) idsToDelete.push(aId1);
  // 2.2 teacher otra clase misma sede → 403
  const aOther = await req("/api/assignments", { cookie: S["ana.campo"].cookie, method: "POST", body: { classId: CLS_MAT_C3, title: `${T}-a2`, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  rec("ASSIGNMENTS", "ana (ING) crea en MAT C3 → 403", aOther.status === 403 ? "PASS" : "FAIL", `status=${aOther.status}`);
  // 2.3 teacher sede contraria → 404
  const crossA = await req("/api/assignments", { cookie: S["jaireth.jimenez"].cookie, method: "POST", body: { classId: CLS_MAT_C3, title: `${T}-a3`, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  rec("ASSIGNMENTS", "teacher PAL crea en JAR → 404", crossA.status === 404 ? "PASS" : "FAIL", `status=${crossA.status}`);
  // 2.4 teacher propia clase 2 (MAT C4) → 201
  const aOwn2 = await req("/api/assignments", { cookie: S["lidiber.portela"].cookie, method: "POST", body: { classId: CLS_MAT_C4, title: `${T}-a4`, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  const aId2 = aOwn2.body?.id;
  rec("ASSIGNMENTS", "teacher crea en su 2da clase (MAT C4) → 201", aOwn2.status === 201 ? "PASS" : "FAIL", `status=${aOwn2.status}`);
  if (aId2) idsToDelete.push(aId2);
  // 2.5 PATCH propia → 200
  const pOwn = await req(`/api/assignments/${aId2}`, { cookie: S["lidiber.portela"].cookie, method: "PATCH", body: { points: 50 } });
  rec("ASSIGNMENTS", "teacher edita su tarea → aceptada", pOwn.status === 200 ? "PASS" : "FAIL", `status=${pOwn.status}`);
  // 2.6 PATCH ajena → 403
  const pOther = await req(`/api/assignments/${aId2}`, { cookie: S["ana.campo"].cookie, method: "PATCH", body: { points: 1 } });
  rec("ASSIGNMENTS", "teacher edita tarea ajena → 403", pOther.status === 403 ? "PASS" : "FAIL", `status=${pOther.status}`);
  // 2.7 DELETE ajena → 403
  const dOther = await req(`/api/assignments/${aId2}`, { cookie: S["ana.campo"].cookie, method: "DELETE" });
  rec("ASSIGNMENTS", "teacher borra tarea ajena → 403", dOther.status === 403 ? "PASS" : "FAIL", `status=${dOther.status}`);
  // 2.8 student create assignment → 403 (rol)
  const studCreate = await req("/api/assignments", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { classId: CLS_MAT_C3, title: `${T}-a9`, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  rec("ASSIGNMENTS", "estudiante crea tarea → 403", studCreate.status === 403 ? "PASS" : "FAIL", `status=${studCreate.status}`);
  // 2.9 sin sesión → 401
  const noAuthAssign = await req("/api/assignments", { method: "POST", body: { classId: CLS_MAT_C3, title: `${T}-a10`, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  rec("ASSIGNMENTS", "sin sesion → 401", noAuthAssign.status === 401 ? "PASS" : "FAIL", `status=${noAuthAssign.status}`);
  // 2.10 admin global (sede explícita) crea→201
  const adm = await req("/api/assignments", { cookie: S["yira.jimenez"].cookie, method: "POST", campusId: CAMPUS_JAR, body: { classId: CLS_MAT_C3, title: `${T}-a11`, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  const aIdAdm = adm.body?.id;
  rec("ASSIGNMENTS", "admin global con sede crea → 201", adm.status === 201 ? "PASS" : "FAIL", `status=${adm.status}`);
  if (aIdAdm) idsToDelete.push(aIdAdm);

  // ================= MODULO 3: POSTS =================
  // 3.1 estudiante publica en su grupo → 201
  const p1 = await req("/api/posts", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { classId: CLS_MAT_C3, content: `${T}-p1` } });
  const p1id = p1.body?.id;
  rec("POSTS", "estudiante en su grupo → 201", p1.status === 201 ? "PASS" : "FAIL", `status=${p1.status}`);
  if (p1id) postsToDelete.push(p1id);
  // 3.2 spoof de autor: jorge envía authorId de maria → se fuerza self
  const spo = await req("/api/posts", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { classId: CLS_MAT_C3, content: `${T}-spo`, authorId: S["maria.narvaez"].me.id } });
  rec("POSTS", "spoof authorId → fuerza self", spo.status === 201 && spo.body?.authorId === S["jorge.canedo"].me.id ? "PASS" : "FAIL", `status=${spo.status} author=${spo.body?.authorId}`);
  if (spo.body?.id) postsToDelete.push(spo.body.id);
  // 3.3 estudiante en otro grupo (C4) → 403
  const pO = await req("/api/posts", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { classId: CLS_MAT_C4, content: `${T}-po` } });
  rec("POSTS", "estudiante en otro grupo → 403", pO.status === 403 ? "PASS" : "FAIL", `status=${pO.status}`);
  // 3.4 teacher publica en su clase → 201
  const tOwn = await req("/api/posts", { cookie: S["lidiber.portela"].cookie, method: "POST", body: { classId: CLS_MAT_C3, content: `${T}-t1` } });
  rec("POSTS", "teacher en su clase → 201", tOwn.status === 201 ? "PASS" : "FAIL", `status=${tOwn.status}`);
  if (tOwn.body?.id) postsToDelete.push(tOwn.body.id);
  // 3.5 teacher misma sede clase ajena → 403
  const tOther = await req("/api/posts", { cookie: S["ana.campo"].cookie, method: "POST", body: { classId: CLS_CSO_C3, content: `${T}-t2` } });
  rec("POSTS", "teacher clase ajena misma sede → 403", tOther.status === 403 ? "PASS" : "FAIL", `status=${tOther.status}`);
  // 3.6 teacher PAL en clase JAR → 404
  const tCross = await req("/api/posts", { cookie: S["jaireth.jimenez"].cookie, method: "POST", body: { classId: CLS_MAT_C3, content: `${T}-t3` } });
  rec("POSTS", "teacher sede contraria → 404", tCross.status === 404 ? "PASS" : "FAIL", `status=${tCross.status}`);
  // 3.7 estudiante PAL en clase JAR → 404
  const sCross = await req("/api/posts", { cookie: S["mishell.paez"].cookie, method: "POST", body: { classId: CLS_MAT_C3, content: `${T}-p5` } });
  rec("POSTS", "estudiante PAL en clase JAR → 404", sCross.status === 404 ? "PASS" : "FAIL", `status=${sCross.status}`);
  // 3.8 sin sesión → 401
  const noPost = await req("/api/posts", { method: "POST", body: { classId: CLS_MAT_C3, content: `${T}-np` } });
  rec("POSTS", "sin sesion → 401", noPost.status === 401 ? "PASS" : "FAIL", `status=${noPost.status}`);
  // 3.9 admin global (sede) → 201
  const aPost = await req("/api/posts", { cookie: S["yira.jimenez"].cookie, method: "POST", campusId: CAMPUS_JAR, body: { classId: CLS_MAT_C3, content: `${T}-ap` } });
  rec("POSTS", "admin global con sede → 201", aPost.status === 201 ? "PASS" : "FAIL", `status=${aPost.status}`);
  if (aPost.body?.id) postsToDelete.push(aPost.body.id);
  // 3.10 PATCH ajeno → 403 ; PATCH propio → ok
  const pa = await req(`/api/posts/${tOwn.body?.id}`, { cookie: S["jorge.canedo"].cookie, method: "PATCH", body: { content: `${T}-x` } });
  rec("POSTS", "estudiante edita post de teacher → 403", pa.status === 403 ? "PASS" : "FAIL", `status=${pa.status}`);
  const pOwn2 = await req(`/api/posts/${tOwn.body?.id}`, { cookie: S["lidiber.portela"].cookie, method: "PATCH", body: { content: `${T}-y` } });
  rec("POSTS", "teacher edita su post → 200", pOwn2.status === 200 ? "PASS" : "FAIL", `status=${pOwn2.status}`);
  // 3.11 DELETE ajeno → 403; DELETE propio → 200
  const del2 = await req(`/api/posts/${tOwn.body?.id}`, { cookie: S["jorge.canedo"].cookie, method: "DELETE" });
  rec("POSTS", "estudiante borra post de teacher → 403", del2.status === 403 ? "PASS" : "FAIL", `status=${del2.status}`);
  const delOwn = await req(`/api/posts/${p1id}`, { cookie: S["jorge.canedo"].cookie, method: "DELETE" });
  rec("POSTS", "jorge borra SU post → actual", delOwn.status === 200 ? "PASS" : "WARN", `status=${delOwn.status} (estudiantes no pueden borrar según diseño actual)`);

  // ================= MODULO 4: E2E assignment (regresión) =================
  if (aId1) {
    const sub = await req("/api/submissions", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { assignmentId: aId1, studentId: S["jorge.canedo"].me.id, content: `${T}-sub` } });
    const subId = sub.body?.id;
    rec("E2E", "estudiante entrega tarea → 201", sub.status === 201 ? "PASS" : "FAIL", `status=${sub.status}`);
    if (subId) {
      const grade = await req(`/api/submissions/${subId}/grade`, { cookie: S["lidiber.portela"].cookie, method: "POST", body: { gradedBy: S["lidiber.portela"].me.id, score: 90, feedback: `${T}-fb` } });
      rec("E2E", "calificacion → 201", grade.status === 201 ? "PASS" : "FAIL", `status=${grade.status}`);
      await db.submission.delete({ where: { id: subId } }).catch(() => {});
    }
    // borrar assignment con submissions ya limpiado
  }

  // ================= MODULO 5: REGRESION GENERAL + NEILA C2 =================
  const enrN = await req("/api/enrollments", { cookie: S["neila.canedo"].cookie });
  rec("REG", "neila C2 matrículas aún OK", enrN.status === 200 && (enrN.body as any[]).length === 14 ? "PASS" : "FAIL", `status=${enrN.status} len=${(enrN.body as any[])?.length}`);
  for (const [su, exp] of ([["jorge.canedo", CAMPUS_JAR], ["maria.narvaez", CAMPUS_JAR], ["sandy.delgado", CAMPUS_JAR], ["mishell.paez", CAMPUS_PAL]] as [string, string][])) {
    const cls = await req("/api/classes", { cookie: S[su].cookie });
    const list = (cls.body as any[]) ?? [];
    const ok = cls.status === 200 && list.every((c: any) => c.academicGroup?.campusId === exp) && new Set(list.map((c: any) => c.academicGroup?.campusId)).size === 1;
    rec("REG", `${su} solo su sede`, ok && list.length > 0 ? "PASS" : "FAIL", `clases=${list.length}`);
  }
  const f1 = await req(`/api/classes/${CLS_PAL}`, { cookie: S["jorge.canedo"].cookie });
  rec("REG", "JAR lee clase PAL por ID → 404", f1.status === 404 ? "PASS" : "FAIL", `status=${f1.status}`);
  const f2 = await req(`/api/classes/${CLS_MAT_C3}`, { cookie: S["mishell.paez"].cookie });
  rec("REG", "PAL lee clase JAR por ID → 404", f2.status === 404 ? "PASS" : "FAIL", `status=${f2.status}`);

  // ================= LIMPIEZA =================
  for (const id of idsToDelete) await db.assignment.delete({ where: { id } }).catch(() => {});
  for (const id of postsToDelete) await db.post.delete({ where: { id } }).catch(() => {});

  // ================= RESUMEN =================
  const fails = report.filter((r) => r.status === "FAIL");
  console.log("\n===== RESUMEN FASE 5.1 (HARDENING) =====");
  console.log(`Total: ${report.length} | PASS: ${report.filter((r) => r.status === "PASS").length} | FAIL: ${fails.length} | WARN: ${report.filter((r) => r.status === "WARN").length}`);
  if (fails.length) { console.log("\n-- FALLAS --"); fails.forEach((f) => console.log(`  [${f.module}] ${f.name}: ${f.detail}`)); }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });