import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  try {
    const settings = await prisma.institutionSettings.findFirst();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to read institution settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    const existing = await prisma.institutionSettings.findFirst();
    if (!existing) {
      return NextResponse.json({ error: "No institution settings found. Seed the database first." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.schoolName !== undefined) data.schoolName = body.schoolName;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
    if (body.shieldUrl !== undefined) data.shieldUrl = body.shieldUrl;
    if (body.faviconUrl !== undefined) data.faviconUrl = body.faviconUrl;
    if (body.motto !== undefined) data.motto = body.motto;
    if (body.primaryColor !== undefined) data.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) data.secondaryColor = body.secondaryColor;
    if (body.accentColor !== undefined) data.accentColor = body.accentColor;
    if (body.theme !== undefined) data.theme = body.theme;
    if (body.address !== undefined) data.address = body.address;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.institutionalEmail !== undefined) data.institutionalEmail = body.institutionalEmail;
    if (body.activeSemesterId !== undefined) data.activeSemesterId = body.activeSemesterId;

    const settings = await prisma.institutionSettings.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to update institution settings" }, { status: 500 });
  }
}
