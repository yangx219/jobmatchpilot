import { auth } from "@/auth";
import { approveCoverLetterWorkflow, WorkflowResourceNotFoundError } from "@/lib/workflows/service";
import { NextResponse } from "next/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, { status: 401 });
  try {
    const letter = await approveCoverLetterWorkflow(userId, (await context.params).id);
    if (!letter) return NextResponse.json({ error: { code: "NOT_APPROVABLE", message: "Workflow is not awaiting approval." } }, { status: 409 });
    return NextResponse.json({ data: letter });
  } catch (error) {
    if (error instanceof WorkflowResourceNotFoundError) return NextResponse.json({ error: { code: "RESOURCE_NOT_FOUND", message: "Profile not found." } }, { status: 404 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not approve draft." } }, { status: 500 });
  }
}
