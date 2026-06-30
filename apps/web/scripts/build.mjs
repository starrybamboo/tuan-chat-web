import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function normalizePassthroughArgs(args) {
  const result = [...args];
  while (result[0] === "--") {
    result.shift();
  }
  return result;
}

const passthroughArgs = normalizePassthroughArgs(process.argv.slice(2));
const hasExplicitMode = passthroughArgs.some((arg, index) => {
  return arg === "--mode" || arg.startsWith("--mode=") || passthroughArgs[index - 1] === "--mode";
});
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(webRoot, "..", "..");

function resolveCloudflarePagesMode() {
  if (process.env.CF_PAGES !== "1") {
    return "";
  }

  return process.env.CF_PAGES_BRANCH === "dev" ? "test" : "production";
}

const autoMode = hasExplicitMode ? "" : resolveCloudflarePagesMode();
const args = ["vite", "build", ...passthroughArgs];
const useWindowsShell = process.platform === "win32";

if (autoMode) {
  args.push("--mode", autoMode);
  console.log(`[build] Cloudflare Pages branch ${process.env.CF_PAGES_BRANCH ?? "(unknown)"} -> mode ${autoMode}`);
}

const child = spawn("corepack", ["pnpm", "exec", ...args], {
  env: process.env,
  shell: useWindowsShell,
  windowsHide: useWindowsShell,
  stdio: "inherit",
  cwd: webRoot,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (code === 0) {
    const distDir = resolve(workspaceRoot, "dist");
    const buildDir = resolve(workspaceRoot, "build");
    const buildClientDir = resolve(buildDir, "client");

    if (existsSync(distDir)) {
      rmSync(buildClientDir, { recursive: true, force: true });
      mkdirSync(buildDir, { recursive: true });
      cpSync(distDir, buildClientDir, { recursive: true, force: true });
      console.log(`[build] synced ${distDir} -> ${buildClientDir}`);
    }
  }

  process.exit(code ?? 1);
});
