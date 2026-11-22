import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const password = randomBytes(24).toString("hex");
const content = `POSTGRES_PASSWORD=${password}
POSTGRES_USER=jobmatchpilot
POSTGRES_DB=jobmatchpilot
POSTGRES_VOLUME_NAME=jobmatchpilot_pgdata
DATABASE_URL=postgres://jobmatchpilot:${password}@localhost:55432/jobmatchpilot
AUTH_SECRET=${randomBytes(32).toString("hex")}
ENCRYPTION_KEY=${randomBytes(32).toString("hex")}
NEXTAUTH_URL=http://localhost:3737
AUTH_TRUST_HOST=true
TZ=Europe/Paris
MCP_ENABLED=false
`;
try {
  writeFileSync(fileURLToPath(new URL("../.env", import.meta.url)), content, { flag: "wx", mode: 0o600 });
  console.log("Created private .env for JobMatchPilot. Existing database data was not modified.");
} catch (error) {
  if (error.code === "EEXIST") console.log("Existing .env preserved; no secrets changed.");
  else throw error;
}
