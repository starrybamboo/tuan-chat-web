import type { GameInfoDto } from "@/webGAL/apis";

import { transcodeAudioBlobToOpusOrThrow } from "@/utils/audioTranscodeUtils";
import { getTerreApis } from "@/webGAL/index";
import { getTerreBaseUrl } from "@/webGAL/terreConfig";

/**
 * WebGAL 调试命令枚举
 * 用于通过 WebSocket 与 WebGAL 引擎通信
 */
export enum DebugCommand {
  // 跳转到指定场景的指定行
  JUMP,
  // 同步自客户端
  SYNCFC,
  // 同步自编辑器
  SYNCFE,
  // 执行指令
  EXE_COMMAND,
  // 重新拉取模板样式文件
  REFETCH_TEMPLATE_FILES,
  // 执行临时场景（单条命令）
  TEMP_SCENE,
  // 设置组件可见性
  SET_COMPONENT_VISIBILITY,
  // 字体优化
  SET_FONT_OPTIMIZATION,
}

export type IFile = {
  extName: string;
  isDir: boolean;
  name: string;
  path: string;
  pathFromBase?: string;
};

export type IDebugMessage = {
  event: string;
  data: {
    command: DebugCommand;
    sceneMsg: {
      sentence: number;
      scene: string;
    };
    message: string;
    stageSyncMsg: any;
  };
};

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "aac",
  "m4a",
  "mp4",
  "ogg",
  "oga",
  "opus",
  "webm",
  "flac",
  "caf",
]);

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex >= fileName.length - 1)
    return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function replaceFileExtension(fileName: string, nextExt: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex > 0)
    return `${fileName.slice(0, dotIndex)}.${nextExt}`;
  return `${fileName}.${nextExt}`;
}

function isLikelyAudioFileName(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return Boolean(ext && AUDIO_EXTENSIONS.has(ext));
}

/**
 * 从 URL 中提取文件扩展名
 * 支持处理带查询参数的 URL，以及没有扩展名的情况
 * @param url 文件 URL
 * @param defaultExt 默认扩展名（当无法提取时使用）
 * @returns 文件扩展名（不包含点号）
 */
export function getFileExtensionFromUrl(url: string, defaultExt: string = "webp"): string {
  try {
    // 移除查询参数和 hash
    const urlWithoutParams = url.split("?")[0].split("#")[0];
    // 获取路径部分的最后一段
    const lastSegment = urlWithoutParams.substring(urlWithoutParams.lastIndexOf("/") + 1);
    // 检查是否包含扩展名
    const dotIndex = lastSegment.lastIndexOf(".");
    if (dotIndex > 0 && dotIndex < lastSegment.length - 1) {
      const ext = lastSegment.substring(dotIndex + 1).toLowerCase();
      // 验证是否是有效的图片扩展名
      const validImageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif"];
      if (validImageExtensions.includes(ext)) {
        return ext;
      }
    }
    return defaultExt;
  }
  catch {
    return defaultExt;
  }
}

/**
 * 上传文件的通用函数
 * @param url 文件的url
 * @param path webgal的文件目录
 * @param fileName
 */
export async function uploadFile(url: string, path: string, fileName?: string | undefined): Promise<string> {
  // 如果未定义fileName，那就使用url中的fileName
  const newFileName = fileName || url.substring(url.lastIndexOf("/") + 1);

  // 对音频统一转码压缩为 Opus（不兼容 Safari）；失败则阻止上传
  const shouldTranscodeAudioByName = isLikelyAudioFileName(newFileName);
  let targetFileName = shouldTranscodeAudioByName ? replaceFileExtension(newFileName, "opus") : newFileName;

  let safeFileName = targetFileName.replace(/\P{ASCII}/gu, char =>
    encodeURIComponent(char).replace(/%/g, ""));

  if (await checkFileExist(path, safeFileName))
    return safeFileName;

  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  const data = await response.blob();

  const isAudioByResponse = typeof data.type === "string" && data.type.startsWith("audio/");
  const shouldTranscodeAudio = shouldTranscodeAudioByName || isAudioByResponse;

  if (shouldTranscodeAudio && !shouldTranscodeAudioByName) {
    targetFileName = replaceFileExtension(newFileName, "opus");
    safeFileName = targetFileName.replace(/\P{ASCII}/gu, char =>
      encodeURIComponent(char).replace(/%/g, ""));

    if (await checkFileExist(path, safeFileName))
      return safeFileName;
  }

  const file = shouldTranscodeAudio
    ? await transcodeAudioBlobToOpusOrThrow(data, safeFileName)
    : new File([data], safeFileName, { type: data.type || "application/octet-stream" });

  const formData = new FormData();
  formData.append("files", file);
  formData.append("targetDirectory", path);

  await getTerreApis().assetsControllerUpload(formData);
  return safeFileName;
};

export async function readTextFile(game: string, path: string): Promise<string> {
  const url = `${getTerreBaseUrl()}/games/${game}/game/${path}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to read file: ${response.statusText}`);
  return await response.text();
}

export async function checkGameExist(game: string): Promise<boolean> {
  const gameList: GameInfoDto[] = await getTerreApis().manageGameControllerGetGameList();
  if (!gameList)
    return false;
  return gameList.some(item => item.name === game);
}

async function fetchFolder(folderPath: string) {
  const res = await getTerreApis().assetsControllerReadAssets(folderPath);
  const data = res as unknown as object;
  if ("dirInfo" in data && data.dirInfo) {
    const dirInfo = (data.dirInfo as IFile[]).map(item => ({ ...item, path: `${folderPath}/${item.name}` }));
    const dirs = dirInfo.filter(item => item.isDir);
    const files = dirInfo.filter(item => !item.isDir).filter(e => e.name !== ".gitkeep");
    return [...dirs, ...files];
  }
  else {
    return [];
  }
}

export async function checkFileExist(currentPathString: string, fileName: string): Promise<boolean> {
  const files = await fetchFolder(currentPathString);
  return files.some(item => item.name === fileName);
}

/**
 * 生成 WebGAL JUMP 同步消息
 * @param sceneName 场景文件名（含 .txt 后缀）
 * @param lineNumber 跳转到的行号
 * @param forceReload 是否强制重新加载场景（用于文件内容变更后刷新）
 */
export function getAsyncMsg(sceneName: string, lineNumber: number, forceReload: boolean = false): IDebugMessage {
  return {
    event: "message",
    data: {
      command: DebugCommand.JUMP,
      sceneMsg: {
        scene: sceneName,
        sentence: lineNumber,
      },
      stageSyncMsg: {},
      // 使用 'exp' 模式可以触发更快的同步，'Sync' 是普通同步
      // 强制重新加载时使用 'Sync' 确保场景完全刷新
      message: forceReload ? "Sync" : "exp",
    },
  };
}

/**
 * 生成 WebGAL 临时场景执行命令
 * 可以用来执行单条 WebGAL 命令而不改变当前场景状态
 * @param command WebGAL 命令字符串
 */
