import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";

function createSSEErrorResponse(message: string): NextResponse {
  const body = new TextEncoder().encode(
    `data: ${JSON.stringify({ logs: [], isRunning: false, error: message })}\n\n`,
  );
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
    },
  });
}

function parseMetadata(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function getSnapshot(automationId: string) {
  const run = await db.automationRun.findFirst({
    where: { automationId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    include: { events: { orderBy: { sequence: "asc" }, take: 500 } },
  });
  if (!run) return { logs: [], isRunning: false };
  return {
    logs: run.events.map((event) => ({
      timestamp: event.createdAt,
      level: event.level,
      message: event.message,
      metadata: parseMetadata(event.metadata),
    })),
    isRunning: run.status === "running" || run.status === "cancelling",
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? undefined,
    runId: run.id,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session || !userId) return createSSEErrorResponse("Not Authenticated");

  const { id: automationId } = await params;
  const automation = await db.automation.findFirst({
    where: { id: automationId, userId },
    select: { id: true },
  });
  if (!automation) return createSSEErrorResponse("Automation not found");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let polling = false;
      let lastPayload = "";
      let interval: NodeJS.Timeout | undefined;
      let timeout: NodeJS.Timeout | undefined;
      const send = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const payload = JSON.stringify(await getSnapshot(automationId));
          if (!closed && payload !== lastPayload) {
            lastPayload = payload;
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          // Keep the stream alive through a transient database outage.
        } finally {
          polling = false;
        }
      };
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        controller.close();
      };

      controller.enqueue(encoder.encode("retry: 86400000\n\n"));
      await send();
      interval = setInterval(() => void send(), 1_000);
      timeout = setTimeout(cleanup, 10 * 60 * 1_000);
      req.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
