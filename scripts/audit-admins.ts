import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

async function main() {
  const roles = await p.role.findMany({ select: { id: true, name: true } });
  const rn = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const pal = await p.campus.findUnique({ where: { code: "PALMITAS" } });
  const adminRole = roles.find((r) => r.name === "admin")!.id;
  const admins = await p.user.findMany({ where: { roleId: adminRole }, select: { username: true, campus: { select: { code: true } } } });
  const palTeachersAll = await p.user.findMany({ where: { campusId: pal!.id, roleId: roles.find((r) => r.name === "teacher")!.id }, select: { username: true, firstName: true, lastName: true } });
  console.log(JSON.stringify({ admins, palTeachersAll }, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });