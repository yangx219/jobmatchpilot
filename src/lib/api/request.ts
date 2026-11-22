import type { ZodType } from "zod";

export type JsonBodyResult<T> =
  | { success: true; data: T }
  | { success: false; reason: "invalid_json" | "invalid_body" };

/** Parse an untrusted JSON request without turning malformed input into a 500. */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<JsonBodyResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { success: false, reason: "invalid_json" };
  }

  const parsed = schema.safeParse(body);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, reason: "invalid_body" };
}

export function readIdempotencyKey(request: Request): string | null {
  const value = request.headers.get("idempotency-key");
  return value && /^[A-Za-z0-9._:-]{8,128}$/.test(value) ? value : null;
}
