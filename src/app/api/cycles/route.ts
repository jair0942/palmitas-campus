import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const cycles = await prisma.cycle.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(cycles);
  } catch {
    return NextResponse.json({ error: "Failed to read cycles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.code || !body.name || body.order == null) {
      return NextResponse.json({ error: "code, name, and order are required" }, { status: 400 });
    }

    const existingCode = await prisma.cycle.findUnique({ where: { code: body.code } });
    if (existingCode) {
      return NextResponse.json({ error: "Cycle code already exists" }, { status: 409 });
    }

    const existingOrder = await prisma.cycle.findUnique({ where: { order: body.order } });
    if (existingOrder) {
      return NextResponse.json({ error: "Cycle order already exists" }, { status: 409 });
    }

    const usesSubjects = body.usesSubjects ?? body.order !== 2;

    const cycle = await prisma.cycle.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description || "",
        order: body.order,
        usesSubjects,
        active: body.active ?? true,
      },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 });
  }
}
