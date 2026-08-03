import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const neila = await db.user.findUnique({ where: { username: "neila.canedo" } });
  const enr = await db.enrollment.findMany({
    where: {
      academicGroup: {
        OR: [
          { managerTeacherId: neila!.id },
          { classes: { some: { teachingAssignment: { teacherId: neila!.id } } } },
          { teachingAssignments: { some: { teacherId: neila!.id } } },
        ],
      },
    },
    select: { student: { select: { username: true } }, academicGroup: { select: { id: true, cycle: { select: { code: true } } } } },
  });
  const groups = [...new Set(enr.map((e) => `${e.academicGroup.cycle?.code}|${e.academicGroup.id}`))];
  const also = await db.teachingAssignment.findMany({ where: { teacherId: neila!.id }, select: { id: true, academicGroup: { select: { id: true, cycle: { select: { code: true } } } } } });
  const classesAlso = await db.class.count({ where: { teachingAssignment: { teacherId: neila!.id } } });
  console.log(JSON.stringify({ enrCount: enr.length, groups, tAs: also, classesAlso }, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });