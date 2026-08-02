import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCampusScope } from "@/lib/campus-scope";

function getUrlInfo() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { defined: false, raw: null };
  try {
    const url = new URL(raw);
    return {
      defined: true,
      raw: raw.replace(/\/\/[^:]+:[^@]+@/, "//USER:PASS@"),
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams.entries()),
    };
  } catch {
    return { defined: true, raw: raw.replace(/\/\/[^:]+:[^@]+@/, "//USER:PASS@"), parseError: true };
  }
}

export async function GET(request: Request) {
  const auth = await requireCampusScope(request, ["admin"]);
  if (auth.error) return auth.error;

  const urlInfo = getUrlInfo();

  try {
    const dbConnection = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    const userCount = await prisma.user.count();
    const institutionSettingsCount = await prisma.institutionSettings.count();
    const teachingAssignmentsCount = await prisma.teachingAssignment.count();
    const rolesCount = await prisma.role.count();

    return NextResponse.json({
      urlInfo,
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
      urlInfo,
      dbConnection: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
