import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(subjects);
  } catch {
    return NextResponse.json({ error: "Failed to read subjects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    const existing = await prisma.subject.findUnique({ where: { code: body.code } });
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
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
