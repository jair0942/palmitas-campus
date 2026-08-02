import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const asset = await prisma.fileAsset.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId ? { uploader: { campusId: auth.scope!.campusId } } : {}),
      },
      include: { uploader: true },
    });
    if (!asset) return NextResponse.json({ error: "File asset not found" }, { status: 404 });
    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Failed to read file asset" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.fileAsset.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId ? { uploader: { campusId: auth.scope!.campusId } } : {}),
      },
    });
    if (!existing) return NextResponse.json({ error: "File asset not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.originalName !== undefined) data.originalName = body.originalName;
    if (body.url !== undefined) data.url = body.url;

    const asset = await prisma.fileAsset.update({
      where: { id },
      data,
      include: { uploader: true },
    });

    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Failed to update file asset" }, { status: 500 });
  }
}
