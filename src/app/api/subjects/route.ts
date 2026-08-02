import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere, writeCampusError } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const subjects = await prisma.subject.findMany({
      where: campusWhere(auth.scope),
      orderBy: { name: "asc" },
    });
    return NextResponse.json(subjects);
  } catch {
    return NextResponse.json({ error: "Failed to read subjects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const writeError = writeCampusError(auth.scope);
    if (writeError) return writeError;
    const body = await request.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    const existing = await prisma.subject.findFirst({
      where: { code: body.code, ...campusWhere(auth.scope) },
    });
    if (existing) {
      return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
    }

    const subject = await prisma.subject.create({
      data: {
        name: body.name,
        code: body.code,
        color: body.color || "#0F6A3B",
        icon: body.icon || "book-open",
        active: body.active ?? true,
        campusId: auth.scope!.campusId,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
