import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const semesters = await prisma.semester.findMany({ orderBy: { startDate: "desc" } });
    return NextResponse.json(semesters);
  } catch {
    return NextResponse.json({ error: "Failed to read semesters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.code || !body.name || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "code, name, startDate, and endDate are required" }, { status: 400 });
    }

    const existing = await prisma.semester.findFirst({ where: { code: body.code } });
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
      },
    });

    return NextResponse.json(semester, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create semester" }, { status: 500 });
  }
}
