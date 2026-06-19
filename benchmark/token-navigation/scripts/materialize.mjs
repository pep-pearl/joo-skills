#!/usr/bin/env node
import path from "node:path";
import { ROOT, copyTree, parseArgs, resetDir } from "./lib.mjs";
import { assessRepositoryPath } from "../../../scripts/lib/joo-indexing-assessment.mjs";

const args = parseArgs();
const variant = String(args.variant ?? "baseline");
const indexingMode = String(args["indexing-mode"] ?? "force").toLowerCase();
const out = path.resolve(String(args.out ?? path.join(ROOT, ".work", variant)));
if (!["baseline", "indexed"].includes(variant)) throw new Error(`Unknown variant: ${variant}`);
if (!["force", "auto", "off"].includes(indexingMode)) throw new Error(`Unknown indexing mode: ${indexingMode}`);

const assessment = assessRepositoryPath({ target: path.join(ROOT, "fixture") });
const applyOverlay = variant === "indexed" && (
  indexingMode === "force" || (indexingMode === "auto" && assessment.recommendedLevel > 0)
);

resetDir(out);
copyTree(path.join(ROOT, "fixture"), out);
if (applyOverlay) copyTree(path.join(ROOT, "variants", "indexed"), out);
console.log(out);
console.log(`indexing-mode=${indexingMode}`);
console.log(`recommended-auto-level=${assessment.recommendedLevel}`);
console.log(`overlay-applied=${applyOverlay}`);
