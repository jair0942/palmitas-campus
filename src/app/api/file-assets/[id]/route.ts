import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import storage from "@/lib/storage";
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
    if (body.protectedFromCleanup !== undefined) {
      if (auth.scope!.role !== "admin") {
        return NextResponse.json(
          { error: "Solo un administrador puede conservar un archivo" },
          { status: 403 }
        );
      }
      data.protectedFromCleanup = Boolean(body.protectedFromCleanup);
    }

    const asset = await prisma.fileAsset.update({
      where: { id },
      data,
      include: { uploader: true },
    });

    if (data.protectedFromCleanup !== undefined) {
      await prisma.auditLog.create({
        data: {
          userId: auth.scope!.userId,
          action: data.protectedFromCleanup ? "PROTECT_FILE_ASSET" : "UNPROTECT_FILE_ASSET",
          module: "storage",
          tableName: "file_assets",
          recordId: id,
          result: "success",
          metadata: { campusId: asset.uploader?.campusId ?? null },
        },
      });
    }

    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Failed to update file asset" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;

    if (auth.scope!.isGlobalAdmin && !auth.scope!.campusId) {
      return NextResponse.json(
        { error: "Debe seleccionar una sede para eliminar el archivo" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const asset = await prisma.fileAsset.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId ? { uploader: { campusId: auth.scope!.campusId } } : {}),
      },
    });
    if (!asset) return NextResponse.json({ error: "File asset not found" }, { status: 404 });

    const refs = await prisma.attachment.count({ where: { fileAssetId: id } });
    if (refs > 0) {
      return NextResponse.json(
        { error: "File asset is referenced by attachments and cannot be deleted" },
        { status: 409 }
      );
    }

    await storage.delete(asset.storedName);
    await prisma.fileAsset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete file asset" }, { status: 500 });
  }
}
