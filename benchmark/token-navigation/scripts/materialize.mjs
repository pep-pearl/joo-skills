#!/usr/bin/env node
import path from "node:path";
import { ROOT, copyTree, parseArgs, resetDir } from "./lib.mjs";

const args = parseArgs();
const variant = String(args.variant ?? "baseline");
const out = path.resolve(String(args.out ?? path.join(ROOT, ".work", variant)));
if (!["baseline", "indexed"].includes(variant)) throw new Error(`Unknown variant: ${variant}`);
resetDir(out);
copyTree(path.join(ROOT, "fixture"), out);
if (variant === "indexed") copyTree(path.join(ROOT, "variants", "indexed"), out);
console.log(out);
