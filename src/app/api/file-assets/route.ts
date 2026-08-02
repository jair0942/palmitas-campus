import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const assets = await prisma.fileAsset.findMany({
      where: auth.scope!.campusId ? { uploader: { campusId: auth.scope!.campusId } } : undefined,
      include: { uploader: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch {
    return NextResponse.json({ error: "Failed to read file assets" }, { status: 500 });
  }
}
