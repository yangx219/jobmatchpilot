import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 6;

function usage() {
  console.log("Usage: npm run account:reset-password -- user@example.com");
}

async function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("This command requires an interactive terminal.");
  }
  process.stderr.write(prompt);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";
  try {
    return await new Promise((resolve, reject) => {
      const onData = (chunk) => {
        for (const char of chunk) {
          if (char === "\u0003") {
            process.stdin.off("data", onData);
            reject(new Error("Cancelled."));
            return;
          }
          if (char === "\r" || char === "\n") {
            process.stdin.off("data", onData);
            process.stderr.write("\n");
            resolve(value);
            return;
          }
          if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
          else if (char >= " ") value += char;
        }
      };
      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

const email = process.argv[2]?.trim().toLowerCase();
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  usage();
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`No account found for ${email}.`);

  const password = await readHidden("New password: ");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const confirmation = await readHidden("Confirm password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");

  const hash = await bcrypt.hash(password, 10);
  await db.user.update({ where: { id: user.id }, data: { password: hash } });
  console.log(`Password updated for ${email}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Password reset failed.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
