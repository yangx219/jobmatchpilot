import { auth } from "@/auth";
import db from "@/lib/db";
import { parseJsonBody, readIdempotencyKey } from "@/lib/api/request";
import {
  createAgentWorkflow,
  WorkflowQuotaExceededError,
  WorkflowResourceNotFoundError,
} from "@/lib/workflows/service";
import { CreateAgentWorkflowSchema } from "@/models/workflow.schema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });

  const body = await parseJsonBody(request, CreateAgentWorkflowSchema);
  if (!body.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid workflow request." } }, { status: 400 });

  try {
    const result = await createAgentWorkflow(userId, body.data, readIdempotencyKey(request));
    return NextResponse.json(
      { data: result.workflow },
      { status: result.created ? 202 : 200 },
    );
  } catch (error) {
    if (error instanceof WorkflowQuotaExceededError) {
      return NextResponse.json(
        {
          error: {
            code: "WORKFLOW_QUOTA_EXCEEDED",
            reason: error.code,
            message: error.code === "daily_limit"
              ? "Daily AI match limit reached."
              : "Too many AI workflows are already queued or running.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    if (error instanceof WorkflowResourceNotFoundError) {
      return NextResponse.json({ error: { code: "RESOURCE_NOT_FOUND", message: "Job or resume not found." } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not create workflow." } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });

  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  const workflows = await db.agentWorkflow.findMany({
    where: { userId },
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { steps: { orderBy: { position: "asc" } }, analysis: true, auditEvents: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  const hasMore = workflows.length > 20;
  const data = hasMore ? workflows.slice(0, 20) : workflows;
  return NextResponse.json({ data, nextCursor: hasMore ? data.at(-1)?.id : null });
}
