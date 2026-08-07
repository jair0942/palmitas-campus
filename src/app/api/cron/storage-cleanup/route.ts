import { NextRequest, NextResponse } from "next/server";
import { runStorageCleanup } from "@/lib/retention";

export const maxDuration = 60;

function authorize(req: NextRequest): "ok" | "missing-secret" | "denied" {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return "ok";
  return "denied";
}

async function handle(req: NextRequest) {
  const auth = authorize(req);
  if (auth === "missing-secret") {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado. El job no se puede ejecutar." },
      { status: 503 }
    );
  }
  if (auth === "denied") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  const summary = await runStorageCleanup({ limit });
  return NextResponse.json(summary);
}

export async function GET(req: NextRequest) {
  try {
    return await handle(req);
  } catch {
    return NextResponse.json({ error: "Storage cleanup failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch {
    return NextResponse.json({ error: "Storage cleanup failed" }, { status: 500 });
  }
}
