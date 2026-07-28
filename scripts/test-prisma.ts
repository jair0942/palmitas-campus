import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  console.log("PrismaClient created successfully");
  await prisma.$connect();
  console.log("Connected to database");
  await prisma.$disconnect();
}
main();
