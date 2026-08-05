import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export async function POST(request: NextRequest) {
  try {
    // El userId se obtiene EXCLUSIVAMENTE de la sesión autenticada.
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "currentPassword, newPassword y confirmPassword son obligatorios" },
        { status: 400 }
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La nueva contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Las contraseñas nuevas no coinciden" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser diferente de la actual" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta" },
        { status: 401 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
