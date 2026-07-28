import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await validateSession(token);

    if (!session) {
      const response = NextResponse.json({ user: null });
      response.cookies.set("session_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    return NextResponse.json({ user: session.user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
