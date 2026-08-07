import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { assertClassActor } from "@/lib/class-access-guard";
import { getStudentEnrollmentGroupIds } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const where: Record<string, unknown> = {};
    if (auth.scope!.campusId) {
      where.class = { academicGroup: { campusId: auth.scope!.campusId } };
    }
    if (classId) {
      where.classId = classId;
    }

    if (auth.scope!.role === "student") {
      const groups = await getStudentEnrollmentGroupIds(auth.scope!.userId);
      if (groups.length === 0) return NextResponse.json([]);
      const classIds = await prisma.class.findMany({
        where: { academicGroupId: { in: groups } },
        select: { id: true },
      });
      where.classId = { in: classIds.map((c) => c.id) };
      where.publishAt = { lte: new Date() };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: { attachments: { include: { fileAsset: true } }, class: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assignments);
  } catch {
    return NextResponse.json({ error: "Failed to read assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.classId || !body.title) {
      return NextResponse.json({ error: "classId and title are required" }, { status: 400 });
    }

    // Autorización backend: teacher solo puede crear tareas en clases que enseña
    // (teacherId resuelto contra TeachingAssignment, nunca de la petición).
    const guard = await assertClassActor(auth.scope!, body.classId);
    if (guard.error) return guard.error;

    const points = Number(body.points);
    if (points < 0) {
      return NextResponse.json({ error: "Points cannot be negative" }, { status: 400 });
    }

    const publishAt = body.publishAt ? new Date(body.publishAt) : new Date();
    const dueDate = new Date(body.dueDate);

    if (dueDate < publishAt) {
      return NextResponse.json({ error: "Due date cannot be before publish date" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId: body.classId,
        title: body.title,
        description: body.description || "",
        points,
        dueDate,
        publishAt,
        attachments: body.attachments?.length
          ? { create: body.attachments.map((a: { name: string; size: string; type: string; url: string; fileAssetId?: string }) => ({ name: a.name, size: a.size, type: a.type, url: a.url, fileAssetId: a.fileAssetId || null })) }
          : undefined,
      },
      include: { attachments: { include: { fileAsset: true } } },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    console.error("Failed to create assignment:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
