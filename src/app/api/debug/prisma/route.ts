import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dbConnection = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    const userCount = await prisma.user.count();
    const institutionSettingsCount = await prisma.institutionSettings.count();
    const teachingAssignmentsCount = await prisma.teachingAssignment.count();
    const rolesCount = await prisma.role.count();

    return NextResponse.json({
      dbConnection,
      userCount,
      institutionSettingsCount,
      teachingAssignmentsCount,
      rolesCount,
      prismaVersion: "7.8.0",
      adapter: "PrismaPg",
      healthy: true,
    });
  } catch (err) {
    return NextResponse.json({
      dbConnection: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
