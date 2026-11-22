import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_VERIFIERS } from "@/lib/ai/provider-registry.server";
import { parseJsonBody } from "@/lib/api/request";
import { z } from "zod";

const VerifyCredentialSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  key: z.string().trim().min(1).max(4096),
}).strict();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await parseJsonBody(req, VerifyCredentialSchema);
  if (!body.success) {
    return NextResponse.json(
      { success: false, error: "Provider and key are required" },
      { status: 400 },
    );
  }
  const { provider, key } = body.data;

  const verifier = PROVIDER_VERIFIERS[provider];
  if (!verifier) {
    return NextResponse.json(
      { success: false, error: "Unknown provider" },
      { status: 400 },
    );
  }

  try {
    const result = await verifier(key);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    const unreachable =
      (error instanceof Error && error.name === "TimeoutError") ||
      /fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/.test(message);

    // The request never reached the provider, so the key is still unchecked.
    // Saying "verification failed" here reads as a rejected key instead.
    if (unreachable) {
      return NextResponse.json({
        success: false,
        reason: "unreachable",
        error: `Could not reach ${provider} — the key was not checked. Check the server's network and DNS access; note that Node's fetch ignores HTTP_PROXY / HTTPS_PROXY.`,
      });
    }

    return NextResponse.json({ success: false, error: message });
  }
}
