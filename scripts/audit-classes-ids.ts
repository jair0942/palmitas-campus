import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const jar = await db.campus.findUnique({ where: { code: "JARABA" } });
  const classes = await db.class.findMany({
    where: { academicGroup: { campusId: jar!.id } },
    select: { id: true, name: true, teachingAssignment: { select: { teacher: { select: { username: true } } } }, academicGroup: { select: { cycle: { select: { code: true } }, id: true } } },
    orderBy: { academicGroup: { cycle: { code: "asc" } } },
  });
  console.log(JSON.stringify(classes.map((c) => ({ id: c.id, name: c.name, cycle: c.academicGroup?.cycle?.code, teacher: c.teachingAssignment?.teacher?.username ?? null })), null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });