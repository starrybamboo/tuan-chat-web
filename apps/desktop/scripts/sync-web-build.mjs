import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(projectRoot, "..", "..");
const distDir = resolve(workspaceRoot, "dist");
const buildDir = resolve(projectRoot, "build");
const buildClientDir = resolve(buildDir, "client");

if (!existsSync(distDir)) {
  console.error("[desktop:sync:web-build] dist not found. Run pnpm --filter @tuanchat/web run build first.");
  process.exit(1);
}

rmSync(buildClientDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });
cpSync(distDir, buildClientDir, { recursive: true, force: true });

console.log(`[desktop:sync:web-build] synced ${distDir} -> ${buildClientDir}`);
