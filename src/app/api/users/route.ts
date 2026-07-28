import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

const SALT_ROUNDS = 10;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const users = await prisma.user.findMany({
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = users.map((u) => ({
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      documentType: u.documentType,
      documentNumber: u.documentNumber,
      avatar: u.avatar,
      role: u.role.name,
      permissions: u.role.permissions.map((rp) => rp.permission.name),
      active: u.active,
      blocked: u.blocked,
      mustChangePassword: u.mustChangePassword,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(mapped);
  } catch (e) {
    console.error("GET /api/users error:", e);
    return NextResponse.json({ error: "Failed to read users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.username || !body.password || !body.role || !body.firstName) {
      return NextResponse.json(
        { error: "username, password, firstName, and role are required" },
        { status: 400 }
      );
    }

    const username = String(body.username).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const role = await prisma.role.findUnique({ where: { name: body.role } });
    if (!role) {
      return NextResponse.json({ error: `Role '${body.role}' not found` }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName || "",
        email: body.email || null,
        phone: body.phone || null,
        documentType: body.documentType || "",
        documentNumber: body.documentNumber || "",
        avatar: body.avatar || "",
        roleId: role.id,
        active: body.active ?? true,
        blocked: body.blocked ?? false,
        mustChangePassword: true,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        avatar: user.avatar,
        role: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.name),
        active: user.active,
        blocked: user.blocked,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/users error:", e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
