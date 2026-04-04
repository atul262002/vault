import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneNextDir, "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  console.warn("Standalone output not found, skipping asset copy.");
  process.exit(0);
}

mkdirSync(standaloneNextDir, { recursive: true });

if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true, force: true });
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true, force: true });
}

console.log("Standalone static and public assets prepared.");
