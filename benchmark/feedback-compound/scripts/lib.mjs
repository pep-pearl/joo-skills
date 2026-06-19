import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseArgs(argv = process.argv.slice(2)) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [key, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) result[key] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) result[key] = argv[++index];
    else result[key] = true;
  }
  return result;
}

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
export function resetDir(dir) { fs.rmSync(dir, { recursive: true, force: true }); ensureDir(dir); }
export function copyTree(source, target) { ensureDir(target); fs.cpSync(source, target, { recursive: true, force: true }); }
export function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
export function writeJson(file, value) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }

export function median(values) {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function percentChange(baseline, skilled) {
  if (!Number.isFinite(baseline) || baseline === 0 || !Number.isFinite(skilled)) return null;
  return ((baseline - skilled) / baseline) * 100;
}
