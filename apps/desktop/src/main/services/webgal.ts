import type { WebGALLaunchRequest, WebGALLaunchResult } from "@tuanchat/electron-ipc";

import { BrowserWindow, type App, type IpcMain } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";

import { ELECTRON_IPC_CHANNELS } from "../../common/ipc";

const WEBGAL_EXE_CANDIDATES = ["WebGAL_Terre.exe", "WebGAL_Teree.exe"];
const WEBGAL_PACKAGED_RUNTIME_DIR = "webgal-terre";
const WEBGAL_PORT = 3001;
const WEBGAL_HEALTHCHECK_PATH = "/api/test";
const WEBGAL_BOOT_TIMEOUT_MS = 20_000;
const WEBGAL_HEALTHCHECK_INTERVAL_MS = 200;
const WEBGAL_HEALTHCHECK_REQUEST_TIMEOUT_MS = 800;
const WEBGAL_DEFAULT_ALLOWED_ORIGINS = [
  "https://tuan.chat",
  "https://www.tuan.chat",
  "https://test.tuan.chat",
  "https://www.test.tuan.chat",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5177",
  "http://127.0.0.1:5177",
  "app://.",
  "app://",
];

let webgalProcess: ChildProcess | null = null;
let webgalWindow: BrowserWindow | null = null;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeOrigin(origin: string) {
  const normalized = origin.trim().replace(/\/+$/, "");
  return normalized.toLowerCase();
}

function buildWebgalAllowedOriginsEnv() {
  const allowedOrigins = new Set<string>();

  const fromEnv = String(process.env.WEBGAL_ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => normalizeOrigin(origin))
    .filter(Boolean);
  for (const origin of fromEnv) {
    allowedOrigins.add(origin);
  }

  for (const origin of WEBGAL_DEFAULT_ALLOWED_ORIGINS) {
    const normalized = normalizeOrigin(origin);
    if (normalized) {
      allowedOrigins.add(normalized);
    }
  }

  return Array.from(allowedOrigins).join(",");
}

function getWebGALHealthcheckUrl(port: number) {
  return `http://localhost:${port}${WEBGAL_HEALTHCHECK_PATH}`;
}

function normalizeGameDir(gameDir: unknown) {
  if (typeof gameDir !== "string")
    return "";

  const normalized = gameDir.trim();
  if (!normalized)
    return "";

  if (normalized.includes("/") || normalized.includes("\\"))
    return "";

  return normalized;
}

function getWebGALLaunchUrl(port: number, options: WebGALLaunchRequest = {}) {
  const baseUrl = new URL(`http://localhost:${port}`);
  const gameDir = normalizeGameDir(options.gameDir);
  if (gameDir) {
    baseUrl.hash = `/game/${encodeURIComponent(gameDir)}`;
  }
  return baseUrl.toString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message;
  return String(error);
}

function isPortAvailable(port: number, host = "127.0.0.1") {
  return new Promise<boolean>((resolve) => {
    const server = createServer();

    const finalize = (result: boolean) => {
      try {
        server.close();
      }
      catch {
        // ignore
      }
      resolve(result);
    };

    server.once("error", () => {
      finalize(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    try {
      server.listen(port, host);
    }
    catch {
      finalize(false);
    }
  });
}

async function isWebGALHealthy(port: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBGAL_HEALTHCHECK_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(getWebGALHealthcheckUrl(port), {
      method: "GET",
      signal: controller.signal,
    });
    return res.ok;
  }
  catch {
    return false;
  }
  finally {
    clearTimeout(timer);
  }
}

async function waitForWebGALHealthy(
  port: number,
  { timeoutMs = WEBGAL_BOOT_TIMEOUT_MS, intervalMs = WEBGAL_HEALTHCHECK_INTERVAL_MS } = {},
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isWebGALHealthy(port))
      return true;
    await delay(intervalMs);
  }
  return false;
}

function resolveWebGALReleaseDirFromEnv(app: App) {
  const rawDir = String(process.env.WEBGAL_TERRE_RELEASE_DIR || "").trim();
  if (!rawDir)
    return "";

  return path.isAbsolute(rawDir) ? rawDir : path.resolve(app.getAppPath(), rawDir);
}

function getLocalWebGALReleaseDir(app: App) {
  return path.resolve(app.getAppPath(), "..", "..", "..", "WebGAL_Terre", "release");
}

function getWebGALBaseDir(app: App) {
  const envReleaseDir = resolveWebGALReleaseDirFromEnv(app);
  if (envReleaseDir)
    return envReleaseDir;

  if (app.isPackaged) {
    return path.join(process.resourcesPath, WEBGAL_PACKAGED_RUNTIME_DIR);
  }

  return getLocalWebGALReleaseDir(app);
}

function getWebGALPath(app: App) {
  const baseDir = getWebGALBaseDir(app);
  for (const exeName of WEBGAL_EXE_CANDIDATES) {
    const candidatePath = path.join(baseDir, exeName);
    if (existsSync(candidatePath))
      return candidatePath;
  }

  return path.join(baseDir, WEBGAL_EXE_CANDIDATES[0]);
}

function startWebGAL(app: App) {
  const webgalPath = getWebGALPath(app);
  if (!existsSync(webgalPath)) {
    const message = `未找到 WebGAL 可执行文件：${webgalPath}`;
    console.error(message);
    return { ok: false, error: message };
  }

  if (webgalProcess) {
    console.log("WebGAL 进程已在运行中。");
    return { ok: true, alreadyRunning: true };
  }

  console.log(`正在从以下路径启动 WebGAL: ${webgalPath}`);
  const webgalDir = path.dirname(webgalPath);

  try {
    const child = spawn(webgalPath, [], {
      cwd: webgalDir,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        WEBGAL_ALLOWED_ORIGINS: buildWebgalAllowedOriginsEnv(),
      },
    });
    webgalProcess = child;
  }
  catch (error) {
    const message = `启动 WebGAL 子进程失败: ${getErrorMessage(error)}`;
    console.error(message);
    return { ok: false, error: message };
  }

  const currentProcess = webgalProcess;

  currentProcess.on("error", (err) => {
    console.error("启动 WebGAL 子进程失败!", err);
  });

  currentProcess.stdout?.on("data", (data) => {
    console.log(`[WebGAL stdout]: ${data}`);
  });
  currentProcess.stderr?.on("data", (data) => {
    console.error(`[WebGAL stderr]: ${data}`);
  });
  currentProcess.on("close", (code) => {
    console.log(`WebGAL 进程已退出，退出码: ${code}`);
    if (webgalProcess === currentProcess) {
      webgalProcess = null;
    }
  });

  return { ok: true, started: true };
}

async function openWebGALWindow(port: number, options: WebGALLaunchRequest = {}) {
  const launchUrl = getWebGALLaunchUrl(port, options);

  if (webgalWindow && !webgalWindow.isDestroyed()) {
    try {
      const currentUrl = webgalWindow.webContents.getURL();
      if (currentUrl !== launchUrl) {
        await webgalWindow.loadURL(launchUrl);
      }
    }
    catch (error) {
      const message = `切换 WebGAL 窗口地址失败: ${getErrorMessage(error)}`;
      console.error(message);
      return { ok: false, error: message };
    }

    webgalWindow.focus();
    return { ok: true, focused: true, openedUrl: launchUrl };
  }

  webgalWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "WebGAL",
  });

  try {
    await webgalWindow.loadURL(launchUrl);
  }
  catch (error) {
    const message = `打开 WebGAL 窗口失败: ${getErrorMessage(error)}`;
    console.error(message);
    if (webgalWindow && !webgalWindow.isDestroyed())
      webgalWindow.close();
    webgalWindow = null;
    return { ok: false, error: message };
  }

  webgalWindow.on("closed", () => {
    webgalWindow = null;
  });

  return { ok: true, openedUrl: launchUrl };
}

async function launchWebGALAndOpen(app: App, options: WebGALLaunchRequest = {}): Promise<WebGALLaunchResult> {
  const port = WEBGAL_PORT;

  try {
    let healthy = await isWebGALHealthy(port);
    if (!healthy) {
      const availablePort = await isPortAvailable(port);
      if (!availablePort) {
        const message = `端口 ${port} 已被占用，且未检测到 WebGAL 服务。请释放端口后重试。`;
        console.error(`[webgal] ${message}`);
        return { ok: false, port, error: message };
      }

      const startResult = startWebGAL(app);
      if (!startResult.ok) {
        return { ok: false, port, error: startResult.error || "启动 WebGAL 进程失败" };
      }

      healthy = await waitForWebGALHealthy(port);
      if (!healthy) {
        const message = `WebGAL 启动超时（${Math.round(WEBGAL_BOOT_TIMEOUT_MS / 1000)} 秒）`;
        console.error(`[webgal] ${message}`);
        return { ok: false, port, error: message };
      }
    }

    const openResult = await openWebGALWindow(port, options);
    if (!openResult.ok) {
      return { ok: false, port, error: openResult.error || "打开 WebGAL 窗口失败" };
    }

    return { ok: true, port, openedUrl: openResult.openedUrl };
  }
  catch (error) {
    const message = `启动 WebGAL 失败: ${getErrorMessage(error)}`;
    console.error(`[webgal] ${message}`);
    return { ok: false, port, error: message };
  }
}

export function stopWebGAL() {
  if (webgalProcess) {
    console.log("正在关闭 WebGAL 进程...");
    webgalProcess.kill();
    webgalProcess = null;
  }
}

export function registerWebGalIpc({ ipcMain, app }: { ipcMain: IpcMain; app: App }) {
  const handleLaunchWebGAL = async (_event: unknown, options?: WebGALLaunchRequest) => launchWebGALAndOpen(app, options);

  ipcMain.on(ELECTRON_IPC_CHANNELS.launchWebGAL, (_event, options?: WebGALLaunchRequest) => {
    void handleLaunchWebGAL(_event, options);
  });
  ipcMain.handle(ELECTRON_IPC_CHANNELS.launchWebGAL, handleLaunchWebGAL);
}
