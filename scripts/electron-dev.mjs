import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import detectPort from "detect-port";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

process.chdir(projectRoot);

function removeDirIfExists(dirPath) {
  if (!existsSync(dirPath))
    return;
  rmSync(dirPath, { recursive: true, force: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElectronPing(baseUrl, { totalTimeoutMs = 15_000, perRequestTimeoutMs = 500 } = {}) {
  const deadline = Date.now() + totalTimeoutMs;

  while (Date.now() < deadline) {
    const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const url = `${baseUrl.replace(/\/+$/, "")}/__electron_ping?nonce=${encodeURIComponent(nonce)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), perRequestTimeoutMs);

      const res = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.ok === true && json.app === "tuan-chat-web" && json.nonce === nonce)
          return true;
      }
    }
    catch {
      // ignore and retry
    }

    await delay(150);
  }

  return false;
}

function resolveBin(name) {
  const bin = process.platform === "win32"
    ? join(projectRoot, "node_modules", ".bin", `${name}.cmd`)
    : join(projectRoot, "node_modules", ".bin", name);

  if (existsSync(bin))
    return bin;

  return name;
}

function hasArg(args, key) {
  return args.some(arg => arg === key || arg.startsWith(`${key}=`));
}

function readArgValue(args, key) {
  const idx = args.findIndex(arg => arg === key);
  if (idx >= 0)
    return args[idx + 1];
  const withEq = args.find(arg => arg.startsWith(`${key}=`));
  if (withEq)
    return withEq.slice(`${key}=`.length);
  return "";
}

const args = process.argv.slice(2);

// 保持与 `scripts/dev.mjs` 一致：避免遗留 optimize deps 导致加载到旧 React。
const legacyCacheDir = join(projectRoot, "node_modules", ".vite");
const isolatedCacheDir = join(projectRoot, "node_modules", ".vite-tuan-chat-web");
removeDirIfExists(legacyCacheDir);
if (args.includes("--force"))
  removeDirIfExists(isolatedCacheDir);

const hasPortArg = hasArg(args, "--port");
const requestedPortRaw = hasPortArg ? readArgValue(args, "--port") : "";
const requestedPort = Number(requestedPortRaw);
const basePortRaw = Number(process.env.PORT || process.env.VITE_PORT || 5177);
const basePort = Number.isFinite(basePortRaw) && basePortRaw > 0 ? basePortRaw : 5177;

const port = hasPortArg && Number.isFinite(requestedPort) && requestedPort > 0
  ? requestedPort
  : await detectPort(basePort);

const devServerUrl = `http://localhost:${port}`;

const reactRouterBin = resolveBin("react-router");
const electronBin = resolveBin("electron");

const devArgs = ["dev"];

// 不要默认 --open（Electron 会自己打开窗口）；如果用户传了则尊重。
// 强制端口：让 Electron 直接使用这个 URL，基本不需要扫描。
if (!hasPortArg) {
  devArgs.push("--port", String(port));
}

// 透传其它参数（除了我们已经处理过的 --port 值，避免重复）
const passThroughArgs = hasPortArg
  ? args
  : args;

devArgs.push(...passThroughArgs);

const devEnv = {
  ...process.env,
  // 让主进程/其它工具也能读取到当前端口。
  PORT: String(port),
  VITE_PORT: String(port),
};

console.log(`[electron:dev] starting dev server at ${devServerUrl}`);

const devChild = spawn(reactRouterBin, devArgs, {
  stdio: "inherit",
  shell: process.platform === "win32" || reactRouterBin === "react-router",
  cwd: projectRoot,
  env: devEnv,
});

let electronChild = null;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown)
    return;
  shuttingDown = true;

  try {
    if (electronChild && !electronChild.killed)
      electronChild.kill("SIGTERM");
  }
  catch {
    // ignore
  }

  try {
    if (devChild && !devChild.killed)
      devChild.kill("SIGTERM");
  }
  catch {
    // ignore
  }

  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

devChild.on("exit", (code) => {
  if (!shuttingDown) {
    console.error("[electron:dev] dev server exited", { code });
    shutdown(code ?? 1);
  }
});

// 等待我们自己的 /__electron_ping ready，再启动 Electron。
const ready = await waitForElectronPing(devServerUrl);
if (!ready) {
  console.error(`[electron:dev] dev server not reachable via /__electron_ping at ${devServerUrl}`);
  shutdown(1);
}

console.log("[electron:dev] dev server ready, launching Electron...");

const electronEnv = {
  ...process.env,
  VITE_DEV_SERVER_URL: devServerUrl,
  ELECTRON_START_URL: devServerUrl,
  PORT: String(port),
  VITE_PORT: String(port),
};

electronChild = spawn(electronBin, ["."], {
  stdio: "inherit",
  shell: process.platform === "win32" || electronBin === "electron",
  cwd: projectRoot,
  env: electronEnv,
});

electronChild.on("exit", (code) => {
  if (!shuttingDown)
    shutdown(code ?? 0);
});
