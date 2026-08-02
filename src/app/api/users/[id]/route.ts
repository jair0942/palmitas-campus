import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCampusScope, campusWhere } from "@/lib/campus-scope";

const SALT_ROUNDS = 10;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.user.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existing.campusId === null && !auth.scope!.isGlobalAdmin) {
      return NextResponse.json(
        { error: "No tiene permisos para editar administradores globales" },
        { status: 403 }
      );
    }

    if (body.username) {
      const username = String(body.username).trim().toLowerCase();
      const duplicate = await prisma.user.findFirst({
        where: { username, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      body.username = username;
    }

    const updateData: Record<string, unknown> = {};
    if (body.username !== undefined) updateData.username = body.username;
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.documentType !== undefined) updateData.documentType = body.documentType;
    if (body.documentNumber !== undefined) updateData.documentNumber = body.documentNumber;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.blocked !== undefined) updateData.blocked = body.blocked;
    if (body.mustChangePassword !== undefined) updateData.mustChangePassword = body.mustChangePassword;

    if (body.role) {
      const role = await prisma.role.findUnique({ where: { name: body.role } });
      if (!role) {
        return NextResponse.json({ error: `Role '${body.role}' not found` }, { status: 400 });
      }
      updateData.roleId = role.id;
      if (body.role === "admin" && auth.scope!.isGlobalAdmin) {
        updateData.campusId = null;
      } else if (body.role === "admin") {
        updateData.campusId = auth.scope!.campusId;
      }
    }

    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        campus: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
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
      campusId: user.campusId,
      campus: user.campus
        ? { id: user.campus.id, name: user.campus.name, code: user.campus.code }
        : null,
      active: user.active,
      blocked: user.blocked,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error("PATCH /api/users/[id] error:", e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;

    const existing = await prisma.user.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existing.campusId === null && !auth.scope!.isGlobalAdmin) {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar administradores globales" },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/users/[id] error:", e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
