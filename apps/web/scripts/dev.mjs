import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(projectRoot, "..", "..");

process.chdir(projectRoot);

const args = process.argv.slice(2);
const hasOpen = args.some(arg => arg === "--open" || arg.startsWith("--open="));
const finalArgs = [];

if (!hasOpen)
  finalArgs.push("--open");

finalArgs.push(...args);

const legacyCacheDir = join(workspaceRoot, "node_modules", ".vite");
const isolatedCacheDir = join(workspaceRoot, "node_modules", ".vite-tuan-chat-web");
const useWindowsShell = process.platform === "win32";

function removeDirIfExists(dirPath) {
  if (!existsSync(dirPath))
    return;
  rmSync(dirPath, { recursive: true, force: true });
}

// 切换 cacheDir 后，遗留的 `node_modules/.vite` 可能导致浏览器加载到旧的 optimize deps，
// 从而出现 “Invalid hook call / useEffect dispatcher 为 null” 等问题（React 被加载两份）。
removeDirIfExists(legacyCacheDir);

// 当用户显式传入 --force 时，同时清理隔离 cacheDir，确保彻底重建 optimize deps。
if (args.includes("--force"))
  removeDirIfExists(isolatedCacheDir);

const child = spawn("pnpm", ["exec", "vite", ...finalArgs], {
  stdio: "inherit",
  shell: useWindowsShell,
  windowsHide: useWindowsShell,
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", code => process.exit(code ?? 1));
