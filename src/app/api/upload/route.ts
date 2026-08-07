import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { StorageProvider } from "../../../generated/prisma/client";
import storage from "@/lib/storage";
import { getRetentionDays, computeExpiresAt } from "@/lib/retention";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import path from "path";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv",
  ".zip", ".rar", ".7z",
  ".mp4", ".mp3", ".wav",
  ".svg", ".ico",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/x-icon",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
  "video/mp4",
  "audio/mpeg", "audio/wav",
  "application/octet-stream",
]);

function sanitizeFilename(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.includes("..")) return false;
  if (name.startsWith(".")) return false;
  if (/[<>:"/\\|?*]/.test(name)) return false;
  return true;
}

function hasDoubleExtension(name: string): boolean {
  const match = name.match(/\.([^.]+)\.([^.]+)$/);
  return !!match;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function resolveEffectiveCampus(req: NextRequest, userId: string, role: string): Promise<{ campusId: string | null; error: NextResponse | null }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { campusId: true } });
  let campusId: string | null = user?.campusId ?? null;

  if (!campusId && role === "admin") {
    const header = req.headers.get("x-campus-id")?.trim();
    if (header) {
      const campus = await prisma.campus.findUnique({ where: { id: header } });
      if (campus) campusId = campus.id;
    }
  }

  if (!campusId) {
    return {
      campusId: null,
      error: NextResponse.json(
        { error: "Debe seleccionar una sede para subir el archivo" },
        { status: 400 }
      ),
    };
  }
  return { campusId, error: null };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const uploadedById = user.id;

    const { campusId, error: campusError } = await resolveEffectiveCampus(req, uploadedById, user.role);
    if (campusError) return campusError;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds maximum size of 50 MB" }, { status: 413 });
    }

    const originalName = file.name;
    if (!sanitizeFilename(originalName)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const ext = path.extname(originalName).toLowerCase();
    if (!ext) {
      return NextResponse.json({ error: "File has no extension" }, { status: 400 });
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File extension '${ext}' is not allowed` }, { status: 400 });
    }

    if (hasDoubleExtension(originalName)) {
      return NextResponse.json({ error: "Double extension detected" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: `File type '${file.type}' is not allowed` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Corrupted file" }, { status: 400 });
    }

    const checksum = createHash("sha256").update(buffer).digest("hex");
    const objectKey = `${campusId}/${uploadedById}/${uuidv4()}${ext}`;

    await storage.save(objectKey, buffer, file.type);

    const retentionDays = await getRetentionDays(campusId);
    const expiresAt = computeExpiresAt(new Date(), retentionDays);

    const asset = await prisma.fileAsset.create({
      data: {
        uploadedById,
        originalName,
        storedName: objectKey,
        url: "",
        mimeType: file.type,
        extension: ext.replace(".", ""),
        sizeBytes: file.size,
        checksum,
        storageProvider: StorageProvider.EXTERNAL,
        expiresAt,
      },
    });

    const downloadUrl = `/api/file-assets/${asset.id}/download`;
    await prisma.fileAsset.update({ where: { id: asset.id }, data: { url: downloadUrl } });

    return NextResponse.json(
      {
        ...asset,
        url: downloadUrl,
        name: asset.originalName,
        size: formatSize(asset.sizeBytes),
        type: asset.mimeType,
        fileAssetId: asset.id,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
