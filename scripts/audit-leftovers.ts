import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const a = await db.assignment.count({ where: { title: { startsWith: "AUDIT-" } } });
  const p = await db.post.count({ where: { content: { startsWith: "AUDIT-" } } });
  const n = await db.notification.count({ where: { title: { startsWith: "AUDIT-" } } });
  const s = await db.submission.count({ where: { versions: { some: { content: { startsWith: "AUDIT-" } } } } });
  const g = await db.grade.count({ where: { feedback: { startsWith: "AUDIT-" } } });
  console.log(JSON.stringify({ assignments: a, posts: p, notifications: n, submissions: s, grades: g }));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });