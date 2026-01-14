/* eslint-disable no-console */
const { Buffer } = require("node:buffer");
const { spawn } = require("node:child_process"); // 用于创建子进程
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const detectPort = require("detect-port").default; // 用于检测端口占用

// 控制应用生命周期和创建原生浏览器窗口的模组
const { app, BrowserWindow, protocol, ipcMain, Menu } = require("electron");
const { unzipSync } = require("fflate");
// // --- 忽略证书错误以解决 SSL handshake failed 问题 ---
// app.commandLine.appendSwitch("ignore-certificate-errors");

// 用于管理 WebGAL 子进程和窗口 ---
let webgalProcess = null; // 存放 WebGAL 子进程的引用
let webgalWindow = null; // 存放 WebGAL 窗口的引用
const WebGAL_EXE_NAME = "WebGAL_Terre.exe";
const WebGAL_PORT = 3001;

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

function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 书写渲染进程中的配置
      contextIsolation: true, // 可以使用require方法
      enableRemoteModule: true, // 可以使用remote方法
      preload: path.join(__dirname, "preload.js"), // 指定 preload 脚本
    },
  });

  Menu.setApplicationMenu(null);

  const env = "pro2";
  // 配置热更新
  if (env === "pro") {
    const elePath = path.join(__dirname, "../node_modules/electron");
    require("electron-reload")("../", {
      electron: require(elePath),
    });
    // 热更新监听窗口
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  }
  else {
    // 生产环境中要加载文件，打包的版本
    // Menu.setApplicationMenu(null)
    // 使用自定义协议加载应用的根目录，而不是具体的 index.html 文件
    mainWindow.loadURL("app://./");
  }
}

function clampToMultipleOf64(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0)
    return fallback;
  return Math.max(64, Math.round(num / 64) * 64);
}

function base64DataUrl(mime, bytes) {
  const b64 = Buffer.from(bytes).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function mimeFromFilename(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".png"))
    return "image/png";
  if (lower.endsWith(".webp"))
    return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
    return "image/jpeg";
  return "application/octet-stream";
}

function firstImageFromZip(zipBytes) {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  if (!names.length)
    throw new Error("ZIP 解包失败：未找到任何文件");

  const preferred = names.find(n => /\.(?:png|webp|jpe?g)$/i.test(n)) || names[0];
  const mime = mimeFromFilename(preferred);
  return base64DataUrl(mime, files[preferred]);
}

function startsWithBytes(bytes, prefix) {
  if (!bytes || bytes.length < prefix.length)
    return false;
  return prefix.every((b, i) => bytes[i] === b);
}

function looksLikeZip(bytes) {
  if (!bytes || bytes.length < 4)
    return false;
  return (
    bytes[0] === 0x50
    && bytes[1] === 0x4B
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

function detectBinaryDataUrl(bytes) {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    return base64DataUrl("image/png", bytes);
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    return base64DataUrl("image/jpeg", bytes);
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return base64DataUrl("image/webp", bytes);
  }
  return "";
}

// 区分开发环境和生产（打包后）环境
function getWebGALPath() {
  // 在生产环境中，extraResources 被放在应用根目录的 resources 文件夹下
  if (app.isPackaged) {
    // process.resourcesPath 指向 .../app.asar 所在的目录
    return path.join(process.resourcesPath, "extraResources", WebGAL_EXE_NAME);
  }
  // 在开发环境中，直接指向项目根目录下的 extraResources 文件夹
  // __dirname 是 electron/main.cjs 所在的目录，所以需要回退一级
  return path.join(__dirname, "..", "extraResources", WebGAL_EXE_NAME);
}

// 启动 WebGAL 子进程的函数 ---
// 在 electron/main.cjs 文件中

function startWebGAL() {
  const webgalPath = getWebGALPath();

  if (webgalProcess) {
    console.log("WebGAL 进程已在运行中。");
    return;
  }

  console.log(`正在从以下路径启动 WebGAL: ${webgalPath}`);
  const webgalDir = path.dirname(webgalPath);

  // 使用 spawn 启动子进程。
  // cwd (current working directory) 设置为 .exe 所在目录，以确保它可以正确找到资源文件
  webgalProcess = spawn(webgalPath, [], {
    cwd: webgalDir,
  });

  // 捕获启动失败
  webgalProcess.on("error", (err) => {
    console.error("启动 WebGAL 子进程失败!", err);
  });

  // 监听子进程输出
  webgalProcess.stdout.on("data", (data) => {
    console.log(`[WebGAL stdout]: ${data}`);
  });
  webgalProcess.stderr.on("data", (data) => {
    console.error(`[WebGAL stderr]: ${data}`);
  });
  webgalProcess.on("close", (code) => {
    console.log(`WebGAL 进程已退出，退出码: ${code}`);
    webgalProcess = null;
  });
}

// 这段程序将会在 Electron 结束初始化和创建浏览器窗口的时候调用
app.whenReady().then(() => {
  // 实现自定义协议的具体逻辑
  protocol.registerFileProtocol("app", (request, callback) => {
    // 从请求 URL 中解析出需要加载的文件路径
    const url = request.url.substr("app://./".length);
    const filePath = path.join(__dirname, "../build/client", url);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        // 如果文件或目录不存在 (err 不为 null), 说明这是一个前端路由的虚拟路径
        // 此时, 我们就返回根目录的 index.html, 这完美复刻了 Nginx 的 try_files 逻辑
        const indexPath = path.join(__dirname, "../build/client", "index.html");
        callback({ path: indexPath });
        return;
      }

      // 如果请求的是一个目录 (例如初始加载 'app://./')
      if (stats.isDirectory()) {
        // 加载该目录下的 index.html
        const indexPath = path.join(filePath, "index.html");
        callback({ path: indexPath });
      }
      else {
        // 如果请求的是一个文件 (例如 an asset like main.js or style.css), 直接返回该文件
        callback({ path: filePath });
      }
    });
  });

  createWindow();

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
    const model = String(req?.model || "nai-diffusion-3");
    const seed = Number.isFinite(req?.seed) ? Number(req.seed) : Math.floor(Math.random() * 2 ** 32);
    const steps = Number.isFinite(req?.steps) ? Math.max(1, Math.floor(req.steps)) : 28;
    const scale = Number.isFinite(req?.scale) ? Number(req.scale) : 5;
    const sampler = String(req?.sampler || "k_euler_ancestral");
    const noiseSchedule = String(req?.noiseSchedule || "karras");
    const qualityToggle = Boolean(req?.qualityToggle);

    const width = clampToMultipleOf64(req?.width, 1024);
    const height = clampToMultipleOf64(req?.height, 1024);

    const isNAI3 = model === "nai-diffusion-3";
    const isNAI4 = model === "nai-diffusion-4-curated-preview" || model === "nai-diffusion-4-full";
    const resolvedSampler = sampler === "k_euler_a" ? "k_euler_ancestral" : sampler;

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
        parameters.use_coords = false;
        parameters.v4_prompt = {
          caption: {
            base_caption: prompt,
            char_captions: [],
          },
          use_coords: parameters.use_coords,
          use_order: true,
        };
        parameters.v4_negative_prompt = {
          caption: {
            base_caption: negativePrompt,
            char_captions: [],
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
    // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他
    // 打开的窗口，那么程序会重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });

  // 设置 IPC 监听器，用于从渲染进程接收启动命令 ---
  ipcMain.on("launch-webgal", async () => {
    const port = WebGAL_PORT;

    // 检查 WebGAL 窗口是否已经打开，如果已打开则聚焦它
    if (webgalWindow && !webgalWindow.isDestroyed()) {
      webgalWindow.focus();
      return;
    }

    const openWebGALWindowWithRetry = (retries = 5) => {
      if (retries <= 0) {
        console.error("无法连接到 WebGAL 服务器。请检查其是否正常运行或被其他程序占用。");
        // 在这里可以添加一个对话框提示用户连接失败
        // dialog.showErrorBox('连接失败', '无法连接到 WebGAL 服务器。');
        return;
      }

      webgalWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "WebGAL",
      });

      // 尝试加载 URL，如果失败，则进入 catch 块
      webgalWindow.loadURL(`http://localhost:${port}`).catch(() => {
        console.log(`连接失败，1秒后重试... (剩余 ${retries - 1} 次)`);
        if (webgalWindow && !webgalWindow.isDestroyed()) {
          webgalWindow.close();
        }
        webgalWindow = null;
        // 等待1秒后再次调用自己，并减少重试次数
        setTimeout(() => openWebGALWindowWithRetry(retries - 1), 1000);
      });

      webgalWindow.on("closed", () => {
        webgalWindow = null;
      });
    };

    try {
      // 使用 detectPort 检查 3001 端口是否被占用
      const occupiedPort = await detectPort(port);

      if (port === occupiedPort) {
        // 端口未被占用，说明 WebGAL 没有运行
        console.log(`端口 ${port} 未被占用，正在启动 WebGAL...`);
        startWebGAL();

        setTimeout(openWebGALWindowWithRetry, 3000);
      }
      else {
        // 端口已被占用，我们假设就是 WebGAL 在运行
        console.log(`端口 ${port} 已被占用，直接打开窗口。`);
        openWebGALWindowWithRetry();
      }
    }
    catch (err) {
      console.error("检查端口或启动 WebGAL 时出错:", err);
    }
  });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此，通常对程序和它们在
// 任务栏上的图标来说，应当保持活跃状态，直到用户使用 Cmd + Q 退出。
app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    app.quit();
});

// 在应用退出时，确保 WebGAL 子进程也被关闭 ---
app.on("will-quit", () => {
  if (webgalProcess) {
    console.log("正在关闭 WebGAL 进程...");
    webgalProcess.kill(); // 强制关闭子进程
  }
});
