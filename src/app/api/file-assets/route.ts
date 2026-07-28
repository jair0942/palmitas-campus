import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const assets = await prisma.fileAsset.findMany({
      include: { uploader: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch {
    return NextResponse.json({ error: "Failed to read file assets" }, { status: 500 });
  }
}
