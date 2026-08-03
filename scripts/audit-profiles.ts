import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

async function main() {
  const pal = await p.campus.findUnique({ where: { code: "PALMITAS" } });
  const jar = await p.campus.findUnique({ where: { code: "JARABA" } });
  if (!pal || !jar) throw new Error("campuses missing");

  const roles = await p.role.findMany({ select: { id: true, name: true } });
  const rn = Object.fromEntries(roles.map((r) => [r.id, r.name]));

  const palStudents = await p.user.findMany({ where: { campusId: pal.id, roleId: roles.find((r) => r.name === "student")!.id }, select: { username: true, firstName: true, lastName: true }, take: 6 });
  const palTeachers = await p.user.findMany({ where: { campusId: pal.id, roleId: roles.find((r) => r.name === "teacher")!.id }, select: { username: true }, take: 6 });
  const globalAdmins = await p.user.findMany({ where: { campusId: null }, select: { username: true } });

  const jarStudentEnr = await p.enrollment.findMany({
    where: { academicGroup: { campusId: jar.id } },
    select: { student: { select: { username: true } }, academicGroup: { select: { id: true, nameForStudents: true, cycle: { select: { code: true } } } } },
  });
  const byCycle: Record<string, string[]> = {};
  for (const e of jarStudentEnr) {
    const code = e.academicGroup.cycle.code;
    (byCycle[code] ||= []).push(e.student.username);
  }

  const groupsJar = await p.academicGroup.findMany({
    where: { campusId: jar.id },
    select: { id: true, nameForStudents: true, nameInternal: true, managerTeacherId: true, cycle: { select: { code: true } } },
  });
  const classesByGroup: Record<string, string[]> = {};
  for (const g of groupsJar) {
    const classes = await p.class.findMany({ where: { academicGroupId: g.id }, select: { id: true, name: true, section: true, subject: { select: { code: true, name: true } }, teachingAssignment: { select: { teacher: { select: { username: true } } } } } });
    classesByGroup[g.cycle.code] = classes.map((c) => ({ id: c.id, name: c.name, section: c.section, subject: c.subject?.code, teacher: c.teachingAssignment?.teacher?.username }));
  }

  const tAs = await p.teachingAssignment.findMany({
    where: { campusId: jar.id },
    select: { id: true, cycle: { select: { code: true } }, subject: { select: { code: true } }, teacher: { select: { username: true } }, academicGroupId: true },
  });

  const palClassesFirst = await p.class.findFirst({ where: { academicGroup: { campusId: pal.id } }, select: { id: true, name: true } });
  const palGroupsFirst = await p.academicGroup.findFirst({ where: { campusId: pal.id }, select: { id: true, nameForStudents: true } });

  const semesterJar = await p.semester.findFirst({ where: { campusId: jar.id } });
  const semesterPal = await p.semester.findFirst({ where: { campusId: pal.id } });

  console.log(JSON.stringify({
    palStudents,
    palTeachers,
    globalAdmins,
    jarStudentsByCycle: byCycle,
    groups: groupsJar.map((g) => ({ id: g.id, code: g.cycle.code, nameForStudents: g.nameForStudents, managerId: g.managerTeacherId })),
    classesByGroup,
    tAs: tAs.map((t) => ({ id: t.id, cycle: t.cycle.code, subject: t.subject?.code, teacher: t.teacher.username })),
    palSampleForSecurity: { class: palClassesFirst, group: palGroupsFirst },
    semesterJar,
    semesterPal,
  }, null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});