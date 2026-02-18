import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import detectPort from "detect-port";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const require = createRequire(import.meta.url);

process.chdir(projectRoot);

function removeDirIfExists(dirPath) {
  if (!existsSync(dirPath))
    return;
  rmSync(dirPath, { recursive: true, force: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElectronPing(baseUrl, { totalTimeoutMs = 30_000, perRequestTimeoutMs = 500 } = {}) {
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

function parseWmicProcessList(rawOutput) {
  const text = String(rawOutput || "");
  const blocks = text.split(/\r?\n\r?\n+/);
  const entries = [];

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    let processId = 0;
    let commandLine = "";

    for (const line of lines) {
      if (line.startsWith("ProcessId=")) {
        processId = Number(line.slice("ProcessId=".length).trim());
      }
      else if (line.startsWith("CommandLine=")) {
        commandLine = line.slice("CommandLine=".length);
      }
    }

    if (Number.isFinite(processId) && processId > 0) {
      entries.push({ processId, commandLine });
    }
  }

  return entries;
}

function listWindowsProcessesByName(imageName) {
  if (process.platform !== "win32")
    return [];

  try {
    const result = spawnSync(
      "wmic",
      ["process", "where", `name='${imageName}'`, "get", "ProcessId,CommandLine", "/format:list"],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    );

    if (result.status !== 0)
      return [];

    return parseWmicProcessList(result.stdout);
  }
  catch {
    return [];
  }
}

function resolveElectronExecutable() {
  try {
    const electronPath = require("electron");
    if (typeof electronPath === "string" && electronPath.trim())
      return electronPath;
  }
  catch {
    // ignore and fallback to bin path
  }
  return resolveBin("electron");
}

function killChildProcessTree(child) {
  if (!child || !child.pid)
    return;
  if (child.exitCode != null || child.signalCode != null)
    return;

  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      return;
    }
    child.kill("SIGTERM");
  }
  catch {
    // ignore
  }
}

function cleanupStaleProjectElectronProcesses() {
  if (process.platform !== "win32")
    return;

  const projectRootLower = projectRoot.replace(/\//g, "\\").toLowerCase();
  const candidates = [
    ...listWindowsProcessesByName("electron.exe"),
    ...listWindowsProcessesByName("node.exe"),
  ].filter((entry) => {
    const cmd = String(entry.commandLine || "").toLowerCase();
    if (!cmd || !cmd.includes(projectRootLower))
      return false;

    return cmd.includes("\\node_modules\\electron\\dist\\electron.exe")
      || cmd.includes("\\node_modules\\.bin\\\\..\\electron\\cli.js");
  });

  const pidSet = new Set(candidates.map(entry => entry.processId).filter(pid => pid !== process.pid));
  if (pidSet.size === 0)
    return;

  for (const pid of pidSet) {
    try {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
    catch {
      // ignore
    }
  }

  console.warn(`[electron:dev] cleaned stale Electron processes: ${Array.from(pidSet).join(", ")}`);
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

cleanupStaleProjectElectronProcesses();

const port = hasPortArg && Number.isFinite(requestedPort) && requestedPort > 0
  ? requestedPort
  : await detectPort(basePort);

const devServerUrl = `http://localhost:${port}`;

const reactRouterEntry = join(projectRoot, "node_modules", "@react-router", "dev", "bin.js");
const reactRouterBin = resolveBin("react-router");
const electronExecutable = resolveElectronExecutable();

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

const devChild = existsSync(reactRouterEntry)
  ? spawn(process.execPath, [reactRouterEntry, ...devArgs], {
      stdio: "inherit",
      shell: false,
      cwd: projectRoot,
      env: devEnv,
    })
  : spawn(reactRouterBin, devArgs, {
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

  killChildProcessTree(electronChild);
  killChildProcessTree(devChild);

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
// 某些环境会意外携带 ELECTRON_RUN_AS_NODE=1，导致 Electron 以 Node 模式启动并崩溃。
delete electronEnv.ELECTRON_RUN_AS_NODE;

const useShellForElectron = process.platform === "win32" && (
  electronExecutable === "electron"
  || electronExecutable.toLowerCase().endsWith(".cmd")
);

electronChild = spawn(electronExecutable, ["."], {
  stdio: "inherit",
  shell: useShellForElectron,
  cwd: projectRoot,
  env: electronEnv,
});

electronChild.on("exit", (code) => {
  if (!shuttingDown)
    shutdown(code ?? 0);
});
