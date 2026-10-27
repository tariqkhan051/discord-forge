import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = join(process.cwd(), "reports");

export function ensureReportsDir(): string {
  mkdirSync(REPORTS_DIR, { recursive: true });
  return REPORTS_DIR;
}

export function writeReport(filename: string, content: string): string {
  const dir = ensureReportsDir();
  const path = join(dir, filename);
  writeFileSync(path, content, "utf8");
  return path;
}

export function writeJsonReport(filename: string, data: unknown): string {
  return writeReport(filename, `${JSON.stringify(data, null, 2)}\n`);
}
