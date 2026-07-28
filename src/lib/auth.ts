import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(userId: string, ip?: string, userAgent?: string) {
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: { userId, token, ip, userAgent, expiresAt },
  });

  return session.token;
}

export async function validateSession(token: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (!session.active) return null;
  if (session.expiresAt < new Date()) return null;

  return {
    id: session.id,
    userId: session.userId,
    user: {
      id: session.user.id,
      username: session.user.username,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      email: session.user.email,
      avatar: session.user.avatar,
      role: session.user.role.name,
      permissions: session.user.role.permissions.map((rp) => rp.permission.name),
      active: session.user.active,
      blocked: session.user.blocked,
      mustChangePassword: session.user.mustChangePassword,
      documentType: session.user.documentType,
      documentNumber: session.user.documentNumber,
      phone: session.user.phone,
      lastLoginAt: session.user.lastLoginAt,
      createdAt: session.user.createdAt,
    },
  };
}

export async function invalidateSession(token: string) {
  await prisma.session.update({
    where: { token },
    data: { active: false },
  });
}

export async function loginUser(username: string, password: string, ip?: string, userAgent?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
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

  if (!user) return null;
  if (!user.active) return null;
  if (user.blocked) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const token = await createSession(user.id, ip, userAgent);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.name),
      active: user.active,
      blocked: user.blocked,
      mustChangePassword: user.mustChangePassword,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      phone: user.phone,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  };
}
