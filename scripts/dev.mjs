import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

process.chdir(projectRoot);

const args = process.argv.slice(2);
const hasOpen = args.some(arg => arg === "--open" || arg.startsWith("--open="));
const finalArgs = ["dev"];

if (!hasOpen)
  finalArgs.push("--open");

finalArgs.push(...args);

const legacyCacheDir = join(projectRoot, "node_modules", ".vite");
const isolatedCacheDir = join(projectRoot, "node_modules", ".vite-tuan-chat-web");

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

const bin = process.platform === "win32"
  ? join(projectRoot, "node_modules", ".bin", "react-router.cmd")
  : join(projectRoot, "node_modules", ".bin", "react-router");

const binExists = existsSync(bin);
const child = spawn(binExists ? bin : "react-router", finalArgs, {
  stdio: "inherit",
  // Windows 下直接 spawn .cmd 可能抛 EINVAL，这里统一走 shell。
  shell: process.platform === "win32" || !binExists,
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", code => process.exit(code ?? 1));
