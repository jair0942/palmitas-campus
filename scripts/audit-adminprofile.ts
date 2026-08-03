import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

async function main() {
  const roles = await p.role.findMany({ select: { id: true, name: true } });
  const rn = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const hits = await p.user.findMany({
    where: { OR: [{ username: { contains: "admin" } }, { username: "palmitas.html" }, { username: "jaraba.html" }] },
    select: { username: true, role: { select: { name: true } }, campus: { select: { code: true } }, mustChangePassword: true },
  });
  console.log(JSON.stringify({ roles, hits }, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });