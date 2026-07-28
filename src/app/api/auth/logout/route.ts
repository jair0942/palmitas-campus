import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value;

    if (token) {
      await invalidateSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
