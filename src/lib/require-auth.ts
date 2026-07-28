import { NextResponse } from "next/server";
import { validateSession } from "./auth";

export async function requireAuth(request: Request, allowedRoles?: string[]) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/session_token=([^;]+)/);
  if (!match) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }), user: null };
  }

  const session = await validateSession(match[1]);
  if (!session) {
    const res = NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    res.headers.set(
      "Set-Cookie",
      "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    return { error: res, user: null };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Permiso denegado" }, { status: 403 }), user: null };
  }

  return { error: null, user: session.user };
}
