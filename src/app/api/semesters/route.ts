import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere, writeCampusError } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const semesters = await prisma.semester.findMany({
      where: campusWhere(auth.scope),
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(semesters);
  } catch {
    return NextResponse.json({ error: "Failed to read semesters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const writeError = writeCampusError(auth.scope);
    if (writeError) return writeError;

    const body = await request.json();
    if (!body.code || !body.name || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "code, name, startDate, and endDate are required" }, { status: 400 });
    }

    const existing = await prisma.semester.findFirst({
      where: { code: body.code, ...campusWhere(auth.scope) },
    });
    if (existing) {
      return NextResponse.json({ error: "Semester code already exists" }, { status: 409 });
    }

    const semester = await prisma.semester.create({
      data: {
        code: body.code,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        active: false,
        campusId: auth.scope!.campusId,
      },
    });

    return NextResponse.json(semester, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create semester" }, { status: 500 });
  }
}
