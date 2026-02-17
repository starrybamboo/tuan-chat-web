export type LaunchWebGalOptions = {
  gameDir?: string;
};

export type LaunchWebGalResult = {
  ok: boolean;
  port?: number;
  error?: string;
  openedUrl?: string;
  runtime: "electron" | "web";
};

function isElectronUserAgent() {
  if (typeof navigator === "undefined")
    return false;
  return /\bElectron\//i.test(navigator.userAgent);
}

export default async function launchWebGal(options: LaunchWebGalOptions = {}): Promise<LaunchWebGalResult> {
  // 调用 preload 脚本中暴露的函数；Web 环境不报错，直接跳过。
  if (typeof window === "undefined" || !window.electronAPI || typeof window.electronAPI.launchWebGAL !== "function") {
    if (isElectronUserAgent()) {
      return {
        ok: false,
        runtime: "electron",
        error: "检测到 Electron，但 preload 未注入 electronAPI，无法启动 WebGAL_Terre",
      };
    }

    return {
      ok: false,
      runtime: "web",
      error: "当前不在 Electron 环境",
    };
  }

  try {
    const result = await window.electronAPI.launchWebGAL({
      gameDir: options.gameDir,
    });
    if (!result || typeof result !== "object") {
      return {
        ok: false,
        runtime: "electron",
        error: "WebGAL 启动返回了无效结果",
      };
    }
    return {
      ok: Boolean(result.ok),
      runtime: "electron",
      port: typeof result.port === "number" ? result.port : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      openedUrl: typeof result.openedUrl === "string" ? result.openedUrl : undefined,
    };
  }
  catch (error) {
    return {
      ok: false,
      runtime: "electron",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
