import { auth } from "@/auth";
import { getAgentWorkflow } from "@/lib/workflows/service";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid workflow id." } }, { status: 400 });
  const workflow = await getAgentWorkflow(userId, parsed.data);
  if (!workflow) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Workflow not found." } }, { status: 404 });
  return NextResponse.json({ data: workflow });
}
