import { constants } from "node:fs";
import { access } from "node:fs/promises";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Check = { status: "up" | "down"; detail?: string };

async function databaseCheck(): Promise<Check> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "up" };
  } catch {
    return { status: "down", detail: "database_unavailable" };
  }
}

async function collectorCheck(): Promise<Check> {
  const executable = process.env.JOBSPY_PYTHON;
  if (!executable) {
    return { status: "down", detail: "collector_not_configured" };
  }
  try {
    await access(executable, constants.X_OK);
    return { status: "up" };
  } catch {
    return { status: "down", detail: "collector_not_executable" };
  }
}

export async function GET(request: NextRequest) {
  // Liveness has no dependencies: a transient database outage must not create
  // a restart loop. Readiness is the stricter check used by Docker/proxies.
  if (request.nextUrl.searchParams.get("ready") !== "1") {
    return NextResponse.json({ status: "up" });
  }

  const [database, collector] = await Promise.all([
    databaseCheck(),
    collectorCheck(),
  ]);
  const ready = database.status === "up" && collector.status === "up";

  return NextResponse.json(
    { status: ready ? "ready" : "not_ready", checks: { database, collector } },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
