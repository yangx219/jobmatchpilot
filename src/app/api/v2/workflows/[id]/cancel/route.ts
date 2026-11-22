import { auth } from "@/auth";
import { cancelAgentWorkflow } from "@/lib/workflows/service";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid workflow id." } }, { status: 400 });
  const cancelled = await cancelAgentWorkflow(userId, parsed.data);
  if (!cancelled) return NextResponse.json({ error: { code: "NOT_CANCELLABLE", message: "Workflow is missing or already terminal." } }, { status: 409 });
  return NextResponse.json({ data: { id: parsed.data, status: "CANCELLED" } });
}
