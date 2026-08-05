import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { canAccessFileAsset } from "@/lib/file-access";
import storage from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;

    const decision = await canAccessFileAsset(auth.scope!, id);
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }

    const asset = await prisma.fileAsset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "File asset not found" }, { status: 404 });

    const signedUrl = await storage.createSignedUrl(asset.storedName, 120);
    return NextResponse.redirect(signedUrl, 307);
  } catch {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
