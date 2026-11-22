import { auth } from "@/auth";
import { approveResumeTailorWorkflow } from "@/lib/workflows/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const Input = z.object({ selectedIndexes: z.array(z.number().int().min(0).max(7)).min(1).max(8) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Select at least one valid suggestion." } }, { status: 400 });
  try {
    const resume = await approveResumeTailorWorkflow(userId, (await context.params).id, parsed.data.selectedIndexes);
    if (!resume) return NextResponse.json({ error: { code: "NOT_APPROVABLE", message: "Workflow is not awaiting approval." } }, { status: 409 });
    return NextResponse.json({ data: resume });
  } catch (error) {
    return NextResponse.json({ error: { code: "APPROVAL_FAILED", message: error instanceof Error ? error.message : "Could not create tailored resume." } }, { status: 422 });
  }
}
