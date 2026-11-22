import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { AppVersionInfo } from "@/models/version.model";
import packageJson from "../../../../package.json";

// JobMatchPilot has its own release history. Never offer upstream JobSync builds
// as upgrades: applying one would replace this fork's code and configuration.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const info: AppVersionInfo = {
    current: packageJson.version,
    latest: null,
    updateAvailable: false,
    releaseUrl: null,
  };
  return NextResponse.json(info, { status: 200 });
}
