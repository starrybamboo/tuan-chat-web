/* eslint-disable node/no-process-env */
import { app, BrowserWindow, ipcMain, Menu, protocol } from "electron";
import electronUpdater from "electron-updater";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { base64DataUrl, detectBinaryDataUrl, firstImageFromZip, looksLikeZip } from "./utils/binaryDataUrl.js";
import { buildCandidatePorts, resolveDevServerUrl } from "./utils/devServerUrl.js";
import { clampToMultipleOf64 } from "./utils/numberUtils.js";
import { registerWebGalIpc, stopWebGAL } from "./utils/webgal.js";
// @ganyudedog electron-updater 使用 autoUpdater 来管理更新
// @entropy622构建electron

const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// // --- 忽略证书错误以解决 SSL handshake failed 问题 ---
// app.commandLine.appendSwitch("ignore-certificate-errors");

let mainWindow = null; // 主窗口需要全局引用，避免被 GC 导致闪退/白屏

let resolvedDevServerUrl = "";

// 避免开发态出现“两个窗口/两个实例”抢占 cache/userData 导致的异常（例如 cache_util_win.cc Access Denied）。
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized())
        mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// 开发态使用独立 userData，避免与生产/其它实例共享缓存目录。
if (!app.isPackaged) {
  try {
    app.setPath("userData", path.join(app.getPath("userData"), "dev"));
  }
  catch {
    // ignore
  }
}

// 在 app ready 之前注册自定义协议
// 这使得我们能像处理 http 请求一样处理应用内的文件请求
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      secure: true, // 将协议注册为安全协议
      standard: true, // 遵循 URL 规范
      supportFetchAPI: true, // 支持 Fetch API
    },
  },
]);

async function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    sandbox: false, // 关闭沙盒模式
    webPreferences: {
      // 书写渲染进程中的配置
      contextIsolation: true, // 注意：这会隔离上下文，不等于“可以使用 require”
      enableRemoteModule: true,
      preload: path.join(__dirname, "preload.js"), // 指定 preload 脚本
    },
  });

  Menu.setApplicationMenu(null);

  const isDev = !app.isPackaged;
  const preferredDevServerUrl = String(
    process.env.ELECTRON_START_URL
    || process.env.VITE_DEV_SERVER_URL
    || "",
  ).trim();

  // Cache last successful dev server URL to avoid scanning every time.
  const devServerCachePath = path.join(app.getPath("userData"), "devserver.json");
  let cachedDevServerUrl = "";
  try {
    const raw = fs.readFileSync(devServerCachePath, "utf8");
    const json = JSON.parse(raw);
    if (json && typeof json.url === "string")
      cachedDevServerUrl = String(json.url).trim();
  }
  catch {
    // ignore
  }

  const defaultPortRaw = Number(process.env.PORT || process.env.VITE_PORT || 5177);
  const defaultPort = Number.isFinite(defaultPortRaw) && defaultPortRaw > 0 ? defaultPortRaw : 5177;

  if (isDev) {
    // 开发环境：必须加载 dev server（否则 app://./ 会指向 build/client，而 dev 并不存在该目录）
    try {
      // electron-reload 仅用于开发态；依赖不存在时直接跳过。
      const require = createRequire(import.meta.url);
      const elePath = path.join(__dirname, "../node_modules/electron");
      require("electron-reload")("../", {
        electron: require(elePath),
      });
    }
    catch {
      // ignore
    }

    mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
      console.error("[mainWindow] did-fail-load", { errorCode, errorDescription, validatedURL });
    });
    mainWindow.webContents.on("render-process-gone", (_e, details) => {
      console.error("[mainWindow] render-process-gone", details);
    });

    const candidatePorts = buildCandidatePorts({
      preferredPorts: [process.env.PORT, process.env.VITE_PORT].filter(Boolean),
      defaultPort,
      scanRange: 25,
    });

    resolvedDevServerUrl = await resolveDevServerUrl({
      preferredUrl: preferredDevServerUrl || cachedDevServerUrl || (defaultPort ? `http://localhost:${defaultPort}` : ""),
      host: "localhost",
      ports: candidatePorts,
      timeoutMs: 500,
      concurrency: 10,
    });

    if (!resolvedDevServerUrl) {
      const msg = `未能连接到前端 dev server。\n\n你可以：\n1) 先运行 pnpm dev\n2) 或设置环境变量 VITE_DEV_SERVER_URL / ELECTRON_START_URL\n\n尝试过的端口范围：${candidatePorts[0]}-${candidatePorts[candidatePorts.length - 1]}`;
      console.error("[electron] dev server not reachable", { preferredDevServerUrl, defaultPort, candidatePorts });
      await mainWindow.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(msg)}`);
      return;
    }

    await mainWindow.loadURL(resolvedDevServerUrl);

    try {
      fs.writeFileSync(devServerCachePath, JSON.stringify({ url: resolvedDevServerUrl, ts: Date.now() }, null, 2), "utf8");
    }
    catch {
      // ignore
    }
    // DevTools 默认是 detach（单独开一个窗口）；这里改为 dock，避免看起来像“两个 BrowserWindow”。
    // mainWindow.webContents.openDevTools({ mode: "bottom" });
  }
  else {
    // 生产环境：使用自定义协议加载 build/client 目录（模拟 Nginx try_files）
    const indexPath = path.join(__dirname, "../build/client", "index.html");
    try {
      if (!fs.existsSync(indexPath)) {
        const msg = `未找到前端构建产物：\n${indexPath}\n\n这通常表示打包前没有先执行前端构建。\n\n请在项目根目录执行：\n- pnpm build\n然后再执行：\n- pnpm electron:build:win:zip（或 nsis）`;
        console.error("[electron] missing build artifacts", { indexPath });
        await mainWindow.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(msg)}`);
        return;
      }
    }
    catch (err) {
      console.error("[electron] failed to validate build artifacts", err);
    }

    await mainWindow.loadURL("app://./");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

autoUpdater.on("update-available", info => console.warn("发现新版本:", info.version));

autoUpdater.on("downloadProgress", p => console.warn(`下载进度: ${Math.round(p.percent)}%`));
autoUpdater.on("update-downloaded", () => autoUpdater.quitAndInstall());

autoUpdater.on("error", (err) => {
  console.error("[autoUpdater] error", err);
});

// 这段程序将会在 Electron 结束初始化和创建浏览器窗口的时候调用
app.whenReady().then(async () => {
  // 检测自动更新：只在打包环境启用（避免开发态缺少 update config 导致报错/卡顿）。
  // 如需在开发态验证更新流程，可设置 FORCE_AUTO_UPDATE=1。
  const shouldCheckUpdates = app.isPackaged || process.env.FORCE_AUTO_UPDATE === "1";
  if (shouldCheckUpdates) {
    // 默认为 true，这里显式设置，避免被外部修改导致不自动下载。
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("[autoUpdater] checkForUpdatesAndNotify failed", err);
    });
  }
  ipcMain.handle("electron:get-dev-server-url", () => resolvedDevServerUrl);
  ipcMain.handle("electron:get-dev-port", () => {
    try {
      if (!resolvedDevServerUrl)
        return "";
      return new URL(resolvedDevServerUrl).port || "";
    }
    catch {
      return "";
    }
  });

  // 实现自定义协议的具体逻辑
  protocol.registerFileProtocol("app", (request, callback) => {
    // 从请求 URL 中解析出需要加载的文件路径
    const url = request.url.substr("app://./".length);
    const filePath = path.join(__dirname, "../build/client", url);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        // 如果文件或目录不存在，说明这是一个前端路由的虚拟路径
        // 此时返回根目录的 index.html，复刻 Nginx try_files 逻辑
        const indexPath = path.join(__dirname, "../build/client", "index.html");
        callback({ path: indexPath });
        return;
      }

      // 如果请求的是一个目录 (例如初始加载 'app://./')
      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, "index.html");
        callback({ path: indexPath });
      }
      else {
        callback({ path: filePath });
      }
    });
  });

  await createWindow();

  ipcMain.handle("novelai:get-clientsettings", async (_event, req) => {
    const token = String(req?.token || "").trim();
    if (!token) {
      throw new Error("缺少 NovelAI token（Bearer）");
    }

    const endpoint = String(req?.endpoint || "https://api.novelai.net").replace(/\/+$/, "");
    const url = `${endpoint}/user/clientsettings`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${token}`,
        "accept": "application/json",
        "referer": "https://novelai.net/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`请求失败: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
    }

    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      return await res.json();
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    }
    catch {
      return text;
    }
  });

  ipcMain.handle("novelai:generate-image", async (_event, req) => {
    const token = String(req?.token || "").trim();
    if (!token) {
      throw new Error("缺少 NovelAI token（Bearer）");
    }

    const endpoint = String(req?.endpoint || "https://image.novelai.net").replace(/\/+$/, "");
    const mode = String(req?.mode || "txt2img");
    const prompt = String(req?.prompt || "").trim();
    if (!prompt) {
      throw new Error("缺少 prompt");
    }

    const negativePrompt = String(req?.negativePrompt || "");
    const model = String(req?.model || "nai-diffusion-4-5-curated");
    const seed = Number.isFinite(req?.seed) ? Number(req.seed) : Math.floor(Math.random() * 2 ** 32);
    const steps = Number.isFinite(req?.steps) ? Math.max(1, Math.floor(req.steps)) : 28;
    const scale = Number.isFinite(req?.scale) ? Number(req.scale) : 5;
    const sampler = String(req?.sampler || "k_euler_ancestral");
    const noiseSchedule = String(req?.noiseSchedule || "karras");
    const qualityToggle = Boolean(req?.qualityToggle);

    const width = clampToMultipleOf64(req?.width, 1024);
    const height = clampToMultipleOf64(req?.height, 1024);

    const isNAI3 = model === "nai-diffusion-3";
    const isNAI4 = typeof model === "string" && (
      model === "nai-diffusion-4-curated-preview"
      || model === "nai-diffusion-4-full"
      || model === "nai-diffusion-4-full-inpainting"
      || model === "nai-diffusion-4-curated-inpainting"
      || model === "nai-diffusion-4-5-curated"
      || model === "nai-diffusion-4-5-curated-inpainting"
      || model === "nai-diffusion-4-5-full"
      || model === "nai-diffusion-4-5-full-inpainting"
    );
    const resolvedSampler = sampler === "k_euler_a" ? "k_euler_ancestral" : sampler;

    const clamp01 = (input, fallback = 0.5) => {
      const value = Number(input);
      if (!Number.isFinite(value)) {
        return fallback;
      }
      return Math.max(0, Math.min(1, value));
    };

    const v4Chars = Array.isArray(req?.v4Chars) ? req.v4Chars : [];
    const v4UseCoords = Boolean(req?.v4UseCoords);
    const v4UseOrder = req?.v4UseOrder == null ? true : Boolean(req.v4UseOrder);

    const parameters = {
      seed,
      width,
      height,
      n_samples: 1,
      steps,
      scale,
      sampler: resolvedSampler,
      negative_prompt: negativePrompt,
      // align with novelai-bot defaults
      ucPreset: 2,
      qualityToggle,
    };

    if (mode === "img2img") {
      const imageBase64 = String(req?.sourceImageBase64 || "").trim();
      if (!imageBase64) {
        throw new Error("img2img 缺少源图片（sourceImageBase64）");
      }
      const strength = Number.isFinite(req?.strength) ? Number(req.strength) : 0.7;
      const noise = Number.isFinite(req?.noise) ? Number(req.noise) : 0.2;
      parameters.image = imageBase64;
      parameters.strength = strength;
      parameters.noise = noise;
    }

    if (isNAI3 || isNAI4) {
      parameters.params_version = 3;
      parameters.legacy = false;
      parameters.legacy_v3_extend = false;
      parameters.noise_schedule = noiseSchedule;

      if (isNAI4) {
        const cfgRescale = Number.isFinite(req?.cfgRescale) ? Number(req.cfgRescale) : 0;
        const charCenters = [];
        const charCaptionsPositive = v4Chars.map((item) => {
          const center = {
            x: clamp01(item?.centerX, 0.5),
            y: clamp01(item?.centerY, 0.5),
          };
          charCenters.push(center);
          return {
            char_caption: String(item?.prompt || ""),
            centers: [center],
          };
        });
        const charCaptionsNegative = v4Chars.map((item, idx) => {
          const center = charCenters[idx] || { x: 0.5, y: 0.5 };
          return {
            char_caption: String(item?.negativePrompt || ""),
            centers: [center],
          };
        });

        parameters.add_original_image = true;
        parameters.cfg_rescale = cfgRescale;
        parameters.characterPrompts = [];
        parameters.controlnet_strength = 1;
        parameters.deliberate_euler_ancestral_bug = false;
        parameters.prefer_brownian = true;
        parameters.reference_image_multiple = [];
        parameters.reference_information_extracted_multiple = [];
        parameters.reference_strength_multiple = [];
        parameters.skip_cfg_above_sigma = null;
        parameters.use_coords = v4UseCoords;
        parameters.v4_prompt = {
          caption: {
            base_caption: prompt,
            char_captions: charCaptionsPositive,
          },
          use_coords: parameters.use_coords,
          use_order: v4UseOrder,
        };
        parameters.v4_negative_prompt = {
          caption: {
            base_caption: negativePrompt,
            char_captions: charCaptionsNegative,
          },
        };
      }
      else if (isNAI3) {
        const smea = Boolean(req?.smea);
        const smeaDyn = Boolean(req?.smeaDyn);
        parameters.sm_dyn = smeaDyn;
        parameters.sm = smea || smeaDyn;

        if (
          (resolvedSampler === "k_euler_ancestral" || resolvedSampler === "k_dpmpp_2s_ancestral")
          && noiseSchedule === "karras"
        ) {
          parameters.noise_schedule = "native";
        }
        if (resolvedSampler === "ddim_v3") {
          parameters.sm = false;
          parameters.sm_dyn = false;
          delete parameters.noise_schedule;
        }
        if (Number.isFinite(parameters.scale) && parameters.scale > 10) {
          parameters.scale = parameters.scale / 2;
        }
      }
    }

    const payload = {
      model,
      input: prompt,
      action: "generate",
      parameters,
    };

    const url = `${endpoint}/ai/generate-image`;
    const fetchImpl = globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new TypeError("当前 Electron/Node 环境缺少 fetch 实现，无法请求 NovelAI");
    }

    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "referer": "https://novelai.net/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`NovelAI 请求失败：${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 300)}` : ""}`);
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const disposition = (res.headers.get("content-disposition") || "").toLowerCase();
    const buffer = new Uint8Array(await res.arrayBuffer());

    const isZip = contentType.includes("zip") || disposition.includes(".zip") || looksLikeZip(buffer);

    let dataUrl = detectBinaryDataUrl(buffer);
    if (isZip) {
      dataUrl = firstImageFromZip(buffer);
    }
    else if (contentType.startsWith("image/")) {
      dataUrl = base64DataUrl(contentType.split(";")[0] || "image/png", buffer);
    }
    else if (!dataUrl) {
      try {
        const text = new TextDecoder().decode(buffer);
        const maybeDataUrl = /data:\s*(data:\S+;base64,[A-Za-z0-9+/=]+)/.exec(text)?.[1];
        if (maybeDataUrl) {
          dataUrl = maybeDataUrl;
        }
        else {
          const maybeBase64 = /data:\s*([A-Za-z0-9+/=]+)\s*$/m.exec(text)?.[1];
          if (maybeBase64) {
            dataUrl = `data:image/png;base64,${maybeBase64}`;
          }
        }
      }
      catch {
        // ignore
      }
    }

    if (!dataUrl) {
      throw new Error(`NovelAI 返回了未知格式：content-type=${contentType || "unknown"}`);
    }

    return {
      dataUrl,
      seed,
      width,
      height,
      model,
    };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
      void createWindow();
  });

  registerWebGalIpc({ ipcMain, app });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    app.quit();
});

app.on("will-quit", () => {
  stopWebGAL();
});
