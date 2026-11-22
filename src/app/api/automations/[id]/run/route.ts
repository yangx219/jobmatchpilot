import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";
import { getUserAiSettings } from "@/lib/scraper";
import { PROVIDER_VERIFIERS } from "@/lib/ai/provider-registry.server";
import { getOllamaBaseUrl } from "@/actions/apiKey.actions";
import { AiProvider } from "@/models/ai.model";
import { isRetiredBoard, type JobBoard } from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { parseAtsConfig } from "@/lib/scraper/automation-run/config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const { id: automationId } = await params;

  try {
    const automation = await db.automation.findFirst({
      where: {
        id: automationId,
        userId,
      },
      include: {
        resume: true,
      },
    });

    if (!automation) {
      return NextResponse.json({ message: "Automation not found" }, { status: 404 });
    }

    if (isRetiredBoard(automation.jobBoard)) {
      return NextResponse.json(
        {
          message: `The ${automation.jobBoard} job board has been removed. Delete this automation and create a new one.`,
        },
        { status: 400 }
      );
    }

    if (!automation.resume) {
      return NextResponse.json(
        { message: "Resume is missing. Please edit the automation and select a resume." },
        { status: 400 }
      );
    }

    // Single-flight per automation. The logger/cancel state is keyed by
    // automationId, so two overlapping runs of the same automation would clobber
    // each other's logs, complete prematurely, and cross-cancel.
    const activeRun = await db.automationRun.findFirst({
      where: { automationId, status: { in: ["running", "cancelling"] } },
      select: { id: true },
    });

    if (activeRun) {
      return NextResponse.json(
        { success: false, message: "A run is already in progress for this automation." },
        { status: 409 }
      );
    }

    const aiSettings = await getUserAiSettings(userId);
    if (parseAtsConfig(automation.sourceConfig, automation.jobBoard as JobBoard)?.analyzeWithAi && aiSettings.provider === AiProvider.OLLAMA) {
      const baseUrl = await getOllamaBaseUrl(userId);
      const ollamaCheck = await PROVIDER_VERIFIERS.ollama(baseUrl);
      if (!ollamaCheck.success) {
        return NextResponse.json(
          {
            success: false,
            message:
              ollamaCheck.error ||
              "Ollama is not available. Please make sure Ollama is running.",
          },
          { status: 503 }
        );
      }
    }

    const rawKey = req.headers.get("idempotency-key");
    const idempotencyKey = rawKey && /^[A-Za-z0-9._:-]{8,128}$/.test(rawKey)
      ? rawKey
      : null;
    if (idempotencyKey) {
      const duplicate = await db.automationRunRequest.findFirst({
        where: { userId, idempotencyKey },
      });
      if (duplicate) {
        return NextResponse.json({
          success: true,
          started: true,
          queued: duplicate.status === "queued" || duplicate.status === "processing",
          requestId: duplicate.id,
        });
      }
    }

    // Rate-limited in PostgreSQL so the limit is shared by every web replica
    // and survives a deploy. Failed preflight checks above do not consume it.
    const windowStart = new Date(Date.now() - APP_CONSTANTS.AUTOMATION_RATE_LIMIT_WINDOW_MS);
    const recentCount = await db.automationRunRequest.count({
      where: { userId, createdAt: { gte: windowStart } },
    });
    // Rate-limited last, right before the request is queued, so failed
    // preflight checks above (missing resume, already running, Ollama down)
    // don't burn the user's hourly manual-run quota.
    if (recentCount >= APP_CONSTANTS.AUTOMATION_MAX_MANUAL_RUNS_PER_HOUR) {
      return NextResponse.json(
        { message: `Rate limit exceeded. Maximum ${APP_CONSTANTS.AUTOMATION_MAX_MANUAL_RUNS_PER_HOUR} manual runs per hour.` },
        { status: 429 }
      );
    }

    const existing = await db.automationRunRequest.findFirst({
      where: { automationId, userId, status: { in: ["queued", "processing"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return NextResponse.json({ success: true, started: true, queued: true, requestId: existing.id });
    }

    const request = await db.automationRunRequest.create({
      data: { automationId, userId, idempotencyKey },
    });

    return NextResponse.json(
      { success: true, started: true, queued: true, requestId: request.id },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Could not queue the automation run." },
      { status: 500 },
    );
  }
}
