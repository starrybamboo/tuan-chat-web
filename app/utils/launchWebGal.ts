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

const WEBGAL_TIMEOUT_HINT = "请检查是否开启 WebGAL";
const WEBGAL_DOWNLOAD_HINT = "如果没有下载 WebGAL，可以在反馈群中下载整合包";

function appendHintIfMissing(message: string, hint: string, hintPattern: RegExp): string {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return normalizedMessage;
  }
  if (hintPattern.test(normalizedMessage)) {
    return normalizedMessage;
  }
  return `${normalizedMessage}，${hint}`;
}

/**
 * 仅在超时类错误中追加启动提醒，避免普通报错被误导。
 */
export function appendWebgalTimeoutHint(message: string): string {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return normalizedMessage;
  }

  const lowerMessage = normalizedMessage.toLowerCase();
  const isTimeout = normalizedMessage.includes("超时")
    || lowerMessage.includes("timeout")
    || lowerMessage.includes("timed out")
    || lowerMessage.includes("etimedout");
  if (!isTimeout) {
    return normalizedMessage;
  }

  if (
    /检查是否开启\s*webgal/i.test(normalizedMessage)
    || /确认\s*webgal\s*已启动/i.test(normalizedMessage)
  ) {
    return normalizedMessage;
  }

  return appendHintIfMissing(
    normalizedMessage,
    WEBGAL_TIMEOUT_HINT,
    /检查是否开启\s*webgal|确认\s*webgal\s*已启动/i,
  );
}

export function appendWebgalDownloadHint(message: string): string {
  return appendHintIfMissing(
    message,
    WEBGAL_DOWNLOAD_HINT,
    /反馈群.*下载.*整合包/,
  );
}

/**
 * WebGAL 启动失败提示统一追加：
 * 1. 超时场景补充“检查是否开启 WebGAL”
 * 2. 所有启动失败补充“可在反馈群下载整合包”
 */
export function appendWebgalLaunchHints(message: string): string {
  return appendWebgalDownloadHint(appendWebgalTimeoutHint(message));
}

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
        error: appendWebgalLaunchHints("检测到 Electron，但 preload 未注入 electronAPI，无法启动 WebGAL_Terre"),
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
        error: appendWebgalLaunchHints("WebGAL 启动返回了无效结果"),
      };
    }
    return {
      ok: Boolean(result.ok),
      runtime: "electron",
      port: typeof result.port === "number" ? result.port : undefined,
      error: typeof result.error === "string" ? appendWebgalLaunchHints(result.error) : undefined,
      openedUrl: typeof result.openedUrl === "string" ? result.openedUrl : undefined,
    };
  }
  catch (error) {
    return {
      ok: false,
      runtime: "electron",
      error: appendWebgalLaunchHints(error instanceof Error ? error.message : String(error)),
    };
  }
}
