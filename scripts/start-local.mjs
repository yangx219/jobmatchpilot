import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const server = new URL(".next/standalone/server.js", root);
if (!existsSync(server)) {
  console.error("Build JobMatchPilot first: npm run build");
  process.exit(1);
}
const envFile = new URL(".env", root);
if (existsSync(envFile)) process.loadEnvFile(fileURLToPath(envFile));
process.env.OFFERFLOW_PROJECT_ROOT = fileURLToPath(root);
process.env.PORT ??= "3737";
process.env.HOSTNAME = process.env.OFFERFLOW_HOST ?? "127.0.0.1";
cpSync(new URL(".next/static", root), new URL(".next/standalone/.next/static", root), { recursive: true });
const publicDir = new URL("public", root);
if (existsSync(publicDir)) cpSync(publicDir, new URL(".next/standalone/public", root), { recursive: true });
await import(server.href);
