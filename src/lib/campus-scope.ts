import { NextResponse } from "next/server";
import { requireAuth } from "./require-auth";

export interface CampusScope {
  campusId: string | null;
  isGlobalAdmin: boolean;
  userId: string;
  role: string;
}

const ERROR_WRITE_CAMPUS = NextResponse.json(
  { error: "Debe seleccionar una sede para realizar esta operación" },
  { status: 400 }
);

export async function requireCampusScope(
  request: Request,
  allowedRoles?: string[]
) {
  const auth = await requireAuth(request, allowedRoles);
  if (auth.error) return { error: auth.error, scope: null, user: null };

  const user = auth.user as unknown as {
    id: string;
    role: string;
    campusId: string | null;
  };
  const isGlobalAdmin = user.role === "admin" && !user.campusId;

  let campusId: string | null = user.campusId ?? null;
  if (isGlobalAdmin) {
    const header = request.headers.get("x-campus-id");
    campusId = header && header.trim() ? header.trim() : null;
  }

  const scope: CampusScope = {
    campusId,
    isGlobalAdmin,
    userId: user.id,
    role: user.role,
  };
  return { error: null, scope, user: auth.user };
}

export function writeCampusError(scope: CampusScope | null) {
  if (!scope) return null;
  if (!scope.campusId) return ERROR_WRITE_CAMPUS;
  return null;
}

export function campusWhere(scope: CampusScope | null, field = "campusId") {
  if (!scope || !scope.campusId) return {};
  return { [field]: scope.campusId };
}

export function campusWhereRelated(scope: CampusScope | null) {
  if (!scope || !scope.campusId) return {};
  return { campusId: scope.campusId };
}
