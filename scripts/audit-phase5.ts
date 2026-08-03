import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const BASE = "http://localhost:3100";
const CAMPUS_PAL = "cmsc6kril00009ovgd87sopwc";
const CAMPUS_JAR = "cmsc6ks0v00019ovge1qz251n";
const CLS_MAT_C3 = "cmsce5dqf001tssvg6nvpr3bi";
const CLS_PAL = "cm53cvcu0000hvgmx0qr5tr";

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

async function login(u: string, pw: string): Promise<{ ok: boolean; cookie: string; me: any }> {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: u, password: pw }),
    redirect: "manual",
  });
  let j: any = null;
  try { j = await r.json(); } catch {}
  const m = (r.headers.get("set-cookie") || "").match(/session_token=([^;]+)/);
  const cookie = m ? m[1] : "";
  let me: any = null;
  if (!r.ok) return { ok: false, cookie, me };
  const mr = await req("/api/auth/me", { cookie });
  me = mr.body?.user ?? null;
  return { ok: true, cookie, me };
}

const PW_JAR = "Jaraba2026!";
const PW_PAL = "Palmitas2026!";
const T = `AUDIT-${Date.now()}`;

async function main() {
  const idsToDelete: string[] = [];

  // ============ MODULO A: LOGIN / SESION ============
  const profiles = [
    { u: "yira.jimenez", pw: PW_PAL, role: "admin", campus: null },
    { u: "neila.canedo", pw: PW_JAR, role: "teacher", campus: "JARABA" },
    { u: "lidiber.portela", pw: PW_JAR, role: "teacher", campus: "JARABA" },
    { u: "ana.campo", pw: PW_JAR, role: "teacher", campus: "JARABA" },
    { u: "jaireth.jimenez", pw: PW_PAL, role: "teacher", campus: "PALMITAS" },
    { u: "jorge.canedo", pw: PW_JAR, role: "student", campus: "JARABA" },
    { u: "maria.narvaez", pw: PW_JAR, role: "student", campus: "JARABA" },
    { u: "sandy.delgado", pw: PW_JAR, role: "student", campus: "JARABA" },
    { u: "mishell.paez", pw: PW_PAL, role: "student", campus: "PALMITAS" },
  ];
  const S: Record<string, { cookie: string; me: any }> = {};
  for (const p of profiles) {
    const lg = await login(p.u, p.pw);
    if (!lg.ok) { rec("MODULO A", `login ${p.u}`, "FAIL", "login no ok"); continue; }
    const me = lg.me;
    if (!me) { rec("MODULO A", `login ${p.u}`, "FAIL", "me null"); continue; }
    const roleName = me.role?.name ?? me.role;
    const campusCode = me.campusId ? me.campus?.code : null;
    const ok = roleName === p.role && campusCode === p.campus;
    S[p.u] = { cookie: lg.cookie, me };
    rec("MODULO A", `login ${p.u}`, ok ? "PASS" : "FAIL", `rol=${roleName} campus=${campusCode} mustChange=${me.mustChangePassword} esperado=${p.role}/${p.campus}`);
  }

  // ============ MODULO B: ESTUDIANTE aislamiento sede ============
  const studentChecks: [string, string][] = [
    ["jorge.canedo", CAMPUS_JAR],
    ["maria.narvaez", CAMPUS_JAR],
    ["sandy.delgado", CAMPUS_JAR],
    ["mishell.paez", CAMPUS_PAL],
  ];
  for (const [su, expected] of studentChecks) {
    const st = S[su];
    if (!st) continue;
    const res = await req("/api/classes", { cookie: st.cookie });
    if (res.status !== 200) { rec("MODULO B", `${su} classes`, "FAIL", `HTTP ${res.status}`); continue; }
    const list = res.body as any[];
    const allOwn = list.every((c: any) => c.academicGroup?.campusId === expected);
    const uni = new Set(list.map((c: any) => c.academicGroup?.campusId));
    rec("MODULO B", `${su} solo ve clases de su sede`, allOwn && uni.size === 1 ? "PASS" : "FAIL", `clases=${list.length} sedes=${uni.size}`);
    if (expected === CAMPUS_JAR) {
      rec("MODULO B", `${su} alcance a nivel API`, "INFO", `API exponen ${list.length} clases de la sede; el frontend filtra por matricula`);
    }
  }

  // ============ MODULO C: PROFESOR ve matrículas de sus grupos ============
  const enrN = await req("/api/enrollments", { cookie: S["neila.canedo"].cookie });
  if (enrN.status === 200) {
    const enr = enrN.body as any[];
    const allC2 = enr.every((e: any) => e.academicGroup?.code === "C2");
    rec("MODULO C", "neila.canedo (manager C2)", enr.length === 14 && allC2 ? "PASS" : "WARN", `enroll=${enr.length} soloC2=${allC2}`);
  } else rec("MODULO C", "neila enrollments", "FAIL", `HTTP ${enrN.status}`);

  const enrL = await req("/api/enrollments", { cookie: S["lidiber.portela"].cookie });
  if (enrL.status === 200) {
    const enr = enrL.body as any[];
    rec("MODULO C", "lidiber.portela (MAT C3 C4 C6)", enr.length === 35 ? "PASS" : "INFO", `enroll=${enr.length}`);
  } else rec("MODULO C", "lidiber enrollments", "FAIL", `HTTP ${enrL.status}`);

  // ============ MODULO D: E2E TAREA (MAT C3 JARABA) ============
  const title = `${T}-tarea`;
  rec("MODULO D", `E2E prefijo ${T}`, "INFO", "");

  // (b) profe de ING intenta tarea en clase MAT → not blocked at API
  const wrong = await req("/api/assignments", { cookie: S["ana.campo"].cookie, method: "POST", body: { classId: CLS_MAT_C3, title, points: 100, dueDate: "2026-12-02T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  rec("MODULO D", "profe ING crea tarea en clase MAT", wrong.status === 201 ? "WARN" : "PASS", `status=${wrong.status} (API no restringe teacher→class, el frontend sí)`);
  if (wrong.body?.id) idsToDelete.push(wrong.body.id);

  // (c) profe MAT crea tarea correctamente
  const ok = await req("/api/assignments", { cookie: S["lidiber.portela"].cookie, method: "POST", body: { classId: CLS_MAT_C3, title, points: 100, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  const assignmentId = ok.body?.id;
  rec("MODULO D", "profesor MAT crea tarea", ok.status === 201 ? "PASS" : "FAIL", `status=${ok.status}`);
  if (assignmentId) idsToDelete.push(assignmentId);

  // (c) profe JAR intenta crear tarea en clase PAL → 404
  const cross = await req("/api/assignments", { cookie: S["lidiber.portela"].cookie, method: "POST", body: { classId: CLS_PAL, title, points: 10, dueDate: "2026-12-01T00:00:00.000Z", publishAt: "2026-08-01T00:00:00.000Z" } });
  rec("MODULO D", "profe JAR tarea en clase PAL → 404", cross.status === 404 ? "PASS" : "FAIL", `status=${cross.status}`);

  if (assignmentId) {
    const post = await req("/api/posts", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { classId: CLS_MAT_C3, content: `${T} post` } });
    const postId = post.body?.id;
    rec("MODULO D", "estudiante publica en su clase", post.status === 201 ? "PASS" : "FAIL", `status=${post.status}`);

    const meJorge = S["jorge.canedo"].me;
    const sub = await req("/api/submissions", { cookie: S["jorge.canedo"].cookie, method: "POST", body: { assignmentId, studentId: meJorge.id, content: `${T} entrega` } });
    const submissionId = sub.body?.id;
    rec("MODULO D", "estudiante entrega tarea", sub.status === 201 ? "PASS" : "FAIL", `status=${sub.status}`);

    if (submissionId) {
      const meLidiber = S["lidiber.portela"].me;
      const grade = await req(`/api/submissions/${submissionId}/grade`, { cookie: S["lidiber.portela"].cookie, method: "POST", body: { gradedBy: meLidiber.id, score: 95, feedback: `${T} fb` } });
      rec("MODULO D", "profesor califica entrega", grade.status === 201 ? "PASS" : "FAIL", `status=${grade.status}`);

      const view = await req(`/api/submissions/${submissionId}`, { cookie: S["jorge.canedo"].cookie });
      rec("MODULO D", "estudiante ve calificacion", view.body?.grade?.score === 95 ? "PASS" : "FAIL", `score=${view.body?.grade?.score}`);

      const mine = await req(`/api/submissions?assignmentId=${assignmentId}`, { cookie: S["jorge.canedo"].cookie });
      rec("MODULO D", "GET submissions solo propias", Array.isArray(mine.body) && mine.body.every((s: any) => s.studentId === meJorge.id) ? "PASS" : "FAIL", `len=${(mine.body as any[])?.length}`);

      const crossRead = await req(`/api/assignments/${assignmentId}`, { cookie: S["mishell.paez"].cookie });
      rec("MODULO D", "PAL no lee tarea JARABA por ID", crossRead.status === 404 ? "PASS" : "FAIL", `status=${crossRead.status}`);

      // limpieza subtarea
      await db.submission.delete({ where: { id: submissionId } }).catch(() => {});
    }
    if (postId) await db.post.delete({ where: { id: postId } }).catch(() => {});
  }

  // limpieza assignments (cascada)
  for (const id of idsToDelete) await db.assignment.delete({ where: { id } }).catch(() => {});

  // ============ MODULO E: NOTIFICACIONES ============
  const not = await req("/api/notifications", { cookie: S["yira.jimenez"].cookie, method: "POST", campusId: null, body: { userId: S["jorge.canedo"].me.id, type: "NEW_POST", title: `${T}-notif`, message: "audit temp" } });
  const notId = not.body?.id;
  rec("MODULO E", "admin global crea notif", not.status === 201 ? "PASS" : "FAIL", `status=${not.status}`);
  if (notId) {
    const seenJ = await req("/api/notifications", { cookie: S["jorge.canedo"].cookie });
    const seenP = await req("/api/notifications", { cookie: S["mishell.paez"].cookie });
    const asJ = (seenJ.body as any[]).some((n) => n.id === notId);
    const asP = (seenP.body as any[]).some((n) => n.id === notId);
    rec("MODULO E", "destinatario lee su notif", asJ ? "PASS" : "FAIL", `leida=${asJ}`);
    rec("MODULO E", "estudiante PAL no ve notif JARABA", !asP ? "PASS" : "FAIL", `fuga=${asP}`);
    await db.notification.delete({ where: { id: notId } }).catch(() => {});
  }

  // ============ MODULO F: SEGURIDAD POR ID ============
  const fc1 = await req(`/api/classes/${CLS_PAL}`, { cookie: S["jorge.canedo"].cookie });
  rec("MODULO F", "JAR lee clase PAL por ID → 404", fc1.status === 404 ? "PASS" : "FAIL", `status=${fc1.status}`);
  const fc2 = await req(`/api/classes/${CLS_MAT_C3}`, { cookie: S["mishell.paez"].cookie });
  rec("MODULO F", "PAL lee clase JARABA por ID → 404", fc2.status === 404 ? "PASS" : "FAIL", `status=${fc2.status}`);
  const na = await req(`/api/classes/${CLS_MAT_C3}`, {});
  rec("MODULO F", "sin sesion → no autorizado", na.status === 401 || na.status === 403 ? "PASS" : "FAIL", `status=${na.status}`);

  // ============ MODULO G: ADMIN GLOBAL x-campus-id ============
  const gl = await req("/api/classes", { cookie: S["yira.jimenez"].cookie, campusId: null });
  const gj = await req("/api/classes", { cookie: S["yira.jimenez"].cookie, campusId: CAMPUS_JAR });
  const gp = await req("/api/classes", { cookie: S["yira.jimenez"].cookie, campusId: CAMPUS_PAL });
  const nAll = (gl.body as any[])?.length;
  const nJ = (gj.body as any[])?.length;
  const nP = (gp.body as any[])?.length;
  rec("MODULO G", "admin sin sede ve todo", nAll === nJ + nP ? "PASS" : "WARN", `global=${nAll} jar=${nJ} pal=${nP}`);
  rec("MODULO G", "admin filtra por sede", nJ === 20 && nP > 0 ? "PASS" : "WARN", `jar=${nJ} pal=${nP}`);
  const wNS = await req("/api/classes", { cookie: S["yira.jimenez"].cookie, method: "POST", campusId: null, body: { name: `${T}-c`, academicGroupId: "x", teachingAssignmentId: "x" } });
  rec("MODULO G", "admin sin sede no escribe", wNS.status === 400 ? "PASS" : "FAIL", `status=${wNS.status}`);

  // ============ INFORME ============
  const fails = report.filter((r) => r.status === "FAIL");
  const warns = report.filter((r) => r.status === "WARN");
  console.log("\n========== RESUMEN AUDITORIA FASE 5 ==========");
  console.log(`Total: ${report.length} | PASS: ${report.filter((r) => r.status === "PASS").length} | FAIL: ${fails.length} | WARN: ${warns.length} | INFO: ${report.filter((r) => r.status === "INFO").length}`);
  if (fails.length) { console.log("\n-- FALLAS --"); for (const f of fails) console.log(`  [${f.module}] ${f.name}: ${f.detail}`); }
  if (warns.length) { console.log("\n-- AVISOS --"); for (const w of warns) console.log(`  [${w.module}] ${w.name}: ${w.detail}`); }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });