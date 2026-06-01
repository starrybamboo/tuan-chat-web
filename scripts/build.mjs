import { spawn } from "node:child_process";

const passthroughArgs = process.argv.slice(2);
const hasExplicitMode = passthroughArgs.some((arg, index) => {
  return arg === "--mode" || arg.startsWith("--mode=") || passthroughArgs[index - 1] === "--mode";
});

function resolveCloudflarePagesMode() {
  if (process.env.CF_PAGES !== "1") {
    return "";
  }

  return process.env.CF_PAGES_BRANCH === "dev" ? "test" : "production";
}

const autoMode = hasExplicitMode ? "" : resolveCloudflarePagesMode();
const args = ["vite", "build", ...passthroughArgs];

if (autoMode) {
  args.push("--mode", autoMode);
  console.log(`[build] Cloudflare Pages branch ${process.env.CF_PAGES_BRANCH ?? "(unknown)"} -> mode ${autoMode}`);
}

const child = spawn("pnpm", ["exec", ...args], {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

