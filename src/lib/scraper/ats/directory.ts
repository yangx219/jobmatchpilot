import greenhouse from "../greenhouse/companies.json";
import lever from "../lever/companies.json";
import ashby from "../ashby/companies.json";
import { APP_CONSTANTS } from "@/lib/constants";
type Board = { name: string; token: string; host?: "default" | "eu" };
const directories: Record<string, Board[]> = { greenhouse, lever: lever as Board[], ashby };
export function directoryBatch(board: string, at = new Date(), preferred: Board[] = []) {
  const rows = directories[board] ?? [];
  const pinned = preferred.filter((row, index) => preferred.findIndex((other) => other.token === row.token) === index).slice(0, 3);
  const remaining = rows.filter((row) => !pinned.some((item) => item.token === row.token));
  const batchSize = APP_CONSTANTS.ATS_MAX_COMPANIES - pinned.length;
  const batches = Math.max(1, Math.ceil(remaining.length / batchSize));
  const index = Math.floor(at.getTime() / 3_600_000) % batches;
  return { companies: [...pinned, ...remaining.slice(index * batchSize, (index + 1) * batchSize)], total: rows.length, batch: index + 1, batches };
}
