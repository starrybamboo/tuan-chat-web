import type { QueryClient } from "@tanstack/react-query";

/**
 * WebGAL 实时渲染器，负责将聊天消息写入场景并提供预览控制。
 */
import type { InferRequest } from "@/tts/engines/index/apiClient";
import type { FigureAnimationSettings, FigurePositionKey } from "@/types/voiceRenderTypes";
import type { WebgalDiceRenderPayload } from "@/types/webgalDice";

import { formatAnkoDiceMessage, stripDiceResultTokens } from "@/components/common/dicer/diceTable";
import { createTTSApi, ttsApi } from "@/tts/engines/index/apiClient";
import {
  ANNOTATION_IDS,
  getEffectDurationMs,
  getEffectFromAnnotations,
  getEffectSoundFileCandidates,
  getFigureAnimationFromAnnotations,
  getFigurePositionFromAnnotations,
  hasAnnotation,
  hasClearBackgroundAnnotation,
  hasClearImageAnnotation,
  isImageMessageBackground,
  isImageMessageShown,
} from "@/types/messageAnnotations";
import {
  FIGURE_POSITION_IDS,
  FIGURE_POSITION_ORDER,

  isFigurePosition,
  MESSAGE_TYPE,
} from "@/types/voiceRenderTypes";
import { buildWebgalChooseScriptLines, extractWebgalChoosePayload } from "@/types/webgalChoose";
import { extractWebgalDicePayload, isLikelyAnkoDiceContent, isLikelyTrpgDiceContent, stripDiceHighlightTokens } from "@/types/webgalDice";
import { buildWebgalSetVarLine, extractWebgalVarPayload } from "@/types/webgalVar";
import { checkGameExist, getTerreApis } from "@/webGAL/index";
import { getTerreBaseUrl, getTerreWsUrl } from "@/webGAL/terreConfig";

/**
 * WebGAL 实时渲染管理器
 * 用于将聊天室消息实时投递到 WebGAL 进行渲染预览
 *
 * 工作流程：
 * 1. 以 Space 为单位创建游戏（realtime_{spaceId}）
 * 2. 以 Room 为单位创建场景（{房间名}_{roomId}.txt）
 * 3. 初始化时导入历史消息到对应场景
 * 4. 增量更新：新消息来时只更新对应房间的场景内容
 */
import type { ChatMessageResponse, RoleAvatar, Room, UserRole } from "../../api";

import { checkFileExist, getAsyncMsg, getFileExtensionFromUrl, readTextFile, uploadFile } from "./fileOperator";

/**
 * WebGAL 文本拓展语法处理工具
 *
 * 支持的语法：
 * 1. ע﷨: [ҪעĴ](ע) -  [Ц]()
 * 2. 文本增强语法: [文本](style=color:#66327C\; ruby=注音)
 *
 * 参数说明：
 * - style: 文本颜色等样式（仅作用于文本层）
 * - style-alltext: 作用于所有层（文本、描边、占位）的样式，如斜体、字体大小
 * - ruby: 注音文本
 */
const TextEnhanceSyntax = {
  /**
   * 匹配文本拓展语法的正则表达式
   * 匹配 [文本](参数) 格式
   */
  PATTERN: /\[([^\]]+)\]\(([^)]+)\)/g,

  /**
   * 检测是否为文本增强语法（而非简单注音）
   * 如果包含 style= 则为文本增强语法
   */
  isEnhancedSyntax(params: string): boolean {
    return params.includes("style=");
  },

  /**
   * 处理消息内容，正确转义 WebGAL 特殊字符
   *
   * 处理规则：
   * 1. 对于文本拓展语法 [文本](参数) 内的分号，保持 \; 转义形式
   * 2. 对于普通文本中的分号，替换为中文分号 ；
   * 3. 换行符替换为空格
   * 4. 普通文本中的冒号替换为中文冒号 ：
   *
   * @param content 原始消息内容
   * @returns 处理后的内容
   */
  processContent(content: string): string {
    // 先找出所有的文本拓展语法块，暂时替换为占位符
    const syntaxBlocks: string[] = [];
    let processed = content.replace(this.PATTERN, (match, _text, _params) => {
      const index = syntaxBlocks.length;
      syntaxBlocks.push(match);
      return `\x00SYNTAX_BLOCK_${index}\x00`;
    });

    // 处理普通文本部分
    processed = processed
      .replace(/\r?\n+/g, "|")
      .replace(/;/g, "；")
      .replace(/:/g, "：");

    // 恢复文本拓展语法块
    syntaxBlocks.forEach((block, index) => {
      processed = processed.replace(`\x00SYNTAX_BLOCK_${index}\x00`, block);
    });

    return processed;
  },

  /**
   * 构建文本增强语法字符串
   */
  build(text: string, options: {
    style?: string;
    styleAllText?: string;
    ruby?: string;
  }): string {
    const params: string[] = [];

    // style-alltext 必须在 style 之前（WebGAL 的要求）
    if (options.styleAllText) {
      // 转义分号
      params.push(`style-alltext=${options.styleAllText.replace(/;/g, "\\;")}`);
    }

    if (options.style) {
      // 转义分号
      params.push(`style=${options.style.replace(/;/g, "\\;")}`);
    }

    if (options.ruby) {
      params.push(`ruby=${options.ruby}`);
    }

    if (params.length === 0) {
      // 如果没有参数，返回简单注音格式
      return `[${text}]()`;
    }

    return `[${text}](${params.join(" ")})`;
  },

  /**
   * 构建简单注音语法
   *
   * @param text 要注音的文本
   * @param ruby 注音
   * @returns WebGAL 注音语法字符串
   */
  buildRuby(text: string, ruby: string): string {
    return `[${text}](${ruby})`;
  },

  /**
   * 构建彩色文本
   *
   * @param text 文本
   * @param color 颜色（如 #FF0000 或 red）
   * @returns WebGAL 文本增强语法字符串
   */
  buildColoredText(text: string, color: string): string {
    return this.build(text, { style: `color:${color}` });
  },

  /**
   * 构建斜体文本
   *
   * @param text 文本
   * @returns WebGAL 文本增强语法字符串
   */
  buildItalicText(text: string): string {
    return this.build(text, {
      styleAllText: "font-style:italic",
      style: "color:inherit", // 需要 style= 来触发文本增强语法
    });
  },

  /**
   * 构建带样式的文本
   */
  buildStyledText(text: string, options: {
    color?: string;
    italic?: boolean;
    fontSize?: string;
    ruby?: string;
  }): string {
    const styleAllTextParts: string[] = [];
    const styleParts: string[] = [];

    if (options.italic) {
      styleAllTextParts.push("font-style:italic");
    }

    if (options.fontSize) {
      styleAllTextParts.push(`font-size:${options.fontSize}`);
    }

    if (options.color) {
      styleParts.push(`color:${options.color}`);
    }

    return this.build(text, {
      styleAllText: styleAllTextParts.length > 0 ? styleAllTextParts.join(";") : undefined,
      style: styleParts.length > 0 ? styleParts.join(";") : "color:inherit",
      ruby: options.ruby,
    });
  },
};

/**
 * TTS 配置选项
 */
export type RealtimeTTSConfig = {
  /** 是否启用 TTS */
  enabled: boolean;
  /** TTS 引擎：目前仅支持 IndexTTS */
  engine?: "index";
  /** TTS API 地址（如 http://localhost:9000） */
  apiUrl?: string;
  /** 情感模式: 0=同音色参考,1=情感参考音频,2=情感向量,3=情感描述文本 */
  emotionMode?: number;
  /** 情感权重 */
  emotionWeight?: number;
  /** 温度 */
  temperature?: number;
  /** top_p */
  topP?: number;
  /** 单段最大 token 数 */
  maxTokensPerSegment?: number;
};

export type RealtimeGameConfig = {
  /** 是否将群聊头像同步为标题背景图（Title_img） */
  coverFromRoomAvatarEnabled: boolean;
  /** 是否将群聊头像同步为启动图（Game_Logo） */
  startupLogoFromRoomAvatarEnabled: boolean;
  /** 是否将群聊头像同步为游戏图标（icons/*） */
  gameIconFromRoomAvatarEnabled: boolean;
  /** 是否将空间名称+spaceId 同步为游戏名（Game_name） */
  gameNameFromRoomNameEnabled: boolean;
  /** 游戏简介（Description） */
  description: string;
  /** 游戏包名（Package_name） */
  packageName: string;
  /** 是否开启紧急回避（Show_panic） */
  showPanicEnabled: boolean;
  /** 默认语言（Default_Language） */
  defaultLanguage: "" | "zh_CN" | "zh_TW" | "en" | "ja" | "fr" | "de";
  /** 是否开启鉴赏模式（Enable_Appreciation） */
  enableAppreciation: boolean;
  /** 是否开启打字音（TypingSoundEnabled） */
  typingSoundEnabled: boolean;
};

const DEFAULT_REALTIME_GAME_CONFIG: RealtimeGameConfig = {
  coverFromRoomAvatarEnabled: true,
  startupLogoFromRoomAvatarEnabled: true,
  gameIconFromRoomAvatarEnabled: false,
  gameNameFromRoomNameEnabled: true,
  description: "",
  packageName: "",
  showPanicEnabled: false,
  defaultLanguage: "",
  enableAppreciation: true,
  typingSoundEnabled: true,
};

const IMAGE_MESSAGE_FIGURE_ID = "image_message";
const DEFAULT_DICE_SOUND_FILE = "nettimato-rolling-dice-1.wav";
const DEFAULT_DICE_SOUND_FOLDER = "se";
const DICE_MERGE_WAIT_MS = 260;
const TRPG_DICE_PIXI_EFFECT = "effect.trpgDiceBurst";
const DICE_COMMAND_PATTERN = /^\.|(?:^|\s)\d*\s*d\s*(?:100|%)(?:\s|$)/i;
const REALTIME_GAME_ENGINE_MARKER_FILE = ".tuanchat_engine_marker.txt";
const REALTIME_GAME_ENGINE_MARKER_VERSION = "realtime-trpg-dice-v2";
const WORKFLOW_START_KEY = "start";
const WORKFLOW_END_NODE_LIST_KEY = "endNodes";
const WORKFLOW_END_NODE_LINK_KEY_PREFIX = "endNode:";

type RenderMessageOptions = {
  bypassDiceMerge?: boolean;
};

type PendingDiceMergeEntry = {
  message: ChatMessageResponse;
  roomId: number;
  syncToFile: boolean;
  timer: NodeJS.Timeout;
};

type WorkflowLink = {
  targetId: number;
  condition?: string;
};

type WorkflowGraph = {
  startRoomIds: number[];
  links: Record<number, WorkflowLink[]>;
};

function hasFileExtension(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 && dotIndex < fileName.length - 1;
}

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

type GameConfigEntry = {
  key: string;
  value: string;
};

function sanitizeGameConfigValue(value: string): string {
  return String(value ?? "").replace(/[\r\n;]/g, " ").trim();
}

function parseGameConfig(rawConfig: string): GameConfigEntry[] {
  return String(rawConfig ?? "")
    .replace(/\r/g, "")
    .split(";")
    .map(commandText => commandText.trim())
    .filter(commandText => commandText.length > 0)
    .map((commandText) => {
      const index = commandText.indexOf(":");
      if (index <= 0) {
        return null;
      }
      const key = commandText.slice(0, index).trim();
      const value = commandText.slice(index + 1).trim();
      if (!key) {
        return null;
      }
      return {
        key,
        value,
      } satisfies GameConfigEntry;
    })
    .filter((entry): entry is GameConfigEntry => Boolean(entry));
}

function serializeGameConfig(entries: GameConfigEntry[]): string {
  return entries
    .map(({ key, value }) => `${key}:${sanitizeGameConfigValue(value)};`)
    .join("\n");
}

function upsertGameConfigEntry(entries: GameConfigEntry[], key: string, value: string): void {
  const sanitizedKey = String(key ?? "").trim();
  if (!sanitizedKey) {
    return;
  }
  const sanitizedValue = sanitizeGameConfigValue(value);
  const index = entries.findIndex(entry => entry.key === sanitizedKey);
  if (index >= 0) {
    entries[index] = {
      key: sanitizedKey,
      value: sanitizedValue,
    };
    return;
  }
  entries.push({
    key: sanitizedKey,
    value: sanitizedValue,
  });
}

function normalizeWorkflowRoomIds(ids: number[]): number[] {
  return Array.from(new Set(
    ids.filter(id => Number.isFinite(id) && id > 0),
  )).sort((a, b) => a - b);
}

function parseWorkflowLink(raw: unknown): WorkflowLink | null {
  if (raw == null) {
    return null;
  }
  const value = typeof raw === "number" ? String(raw) : String(raw ?? "").trim();
  if (!value) {
    return null;
  }

  let splitIndex = 0;
  while (splitIndex < value.length) {
    const charCode = value.charCodeAt(splitIndex);
    if (charCode < 48 || charCode > 57) {
      break;
    }
    splitIndex += 1;
  }
  if (splitIndex === 0) {
    return null;
  }
  const targetId = Number(value.slice(0, splitIndex));
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return null;
  }
  const condition = value.slice(splitIndex).trim() || undefined;
  return {
    targetId,
    condition,
  };
}

function parseWorkflowRoomMap(roomMap?: Record<string, Array<string>>): WorkflowGraph {
  const result: WorkflowGraph = {
    startRoomIds: [],
    links: {},
  };
  if (!roomMap) {
    return result;
  }

  Object.entries(roomMap).forEach(([key, value]) => {
    if (key === WORKFLOW_START_KEY) {
      result.startRoomIds = normalizeWorkflowRoomIds(
        (Array.isArray(value) ? value : [])
          .map((entry) => {
            if (typeof entry === "number") {
              return entry;
            }
            return Number(String(entry ?? "").trim());
          })
          .filter(id => Number.isFinite(id) && id > 0),
      );
      return;
    }
    if (key === WORKFLOW_END_NODE_LIST_KEY || key.startsWith(WORKFLOW_END_NODE_LINK_KEY_PREFIX)) {
      return;
    }

    const sourceRoomId = Number(key);
    if (!Number.isFinite(sourceRoomId) || sourceRoomId <= 0) {
      return;
    }

    const dedupeMap = new Map<string, WorkflowLink>();
    const rawTargets = Array.isArray(value) ? value : [];
    rawTargets.forEach((entry) => {
      const link = parseWorkflowLink(entry);
      if (!link) {
        return;
      }
      const dedupeKey = `${link.targetId}|${link.condition ?? ""}`;
      if (!dedupeMap.has(dedupeKey)) {
        dedupeMap.set(dedupeKey, link);
      }
    });
    const parsedLinks = Array.from(dedupeMap.values()).sort((a, b) => {
      if (a.targetId !== b.targetId) {
        return a.targetId - b.targetId;
      }
      return (a.condition ?? "").localeCompare(b.condition ?? "");
    });
    if (parsedLinks.length > 0) {
      result.links[sourceRoomId] = parsedLinks;
    }
  });

  return result;
}

function sanitizeChooseOptionLabel(rawLabel: string): string {
  return String(rawLabel ?? "")
    .replace(/[\r\n|:;]/g, " ")
    .trim();
}

function splitDiceContentToSteps(content: string): string[] {
  const normalized = String(content ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized
    .split("\n")
    .flatMap(line => line.split(/(?<!\\)\|/))
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function buildImageFileName(url: string, fileName: string | undefined, prefix: string): string {
  const extension = getFileExtensionFromUrl(url, "webp");
  const trimmed = fileName?.trim();
  if (trimmed) {
    return hasFileExtension(trimmed) ? trimmed : `${trimmed}.${extension}`;
  }
  return `${prefix}_${hashString(url)}.${extension}`;
}

async function loadImageElementFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("图片解码失败"));
      image.src = objectUrl;
    });
  }
  finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function createSquarePngBlobFromUrl(url: string, size: number): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载头像失败: ${response.status} ${response.statusText}`);
  }
  const sourceBlob = await response.blob();
  const image = await loadImageElementFromBlob(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("创建图标画布失败");
  }

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const scale = Math.max(size / image.width, size / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (size - drawWidth) / 2;
  const offsetY = (size - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const iconBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("生成 PNG 图标失败"));
        return;
      }
      resolve(result);
    }, "image/png");
  });

  return iconBlob;
}

async function uploadBlobToDirectory(blob: Blob, directory: string, fileName: string): Promise<string> {
  const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
  const formData = new FormData();
  formData.append("files", file);
  formData.append("targetDirectory", directory);
  await getTerreApis().assetsControllerUpload(formData);
  return fileName;
}

type FigureSlot = {
  id: string;
  basePosition: "left" | "center" | "right";
  offsetX: number;
  offsetY: number;
};

type ImageFigureMessageShape = {
  width?: number;
  height?: number;
};

// 以 2560 参考宽度经验值换算，保证 5 个槽位有明确区分
const FIGURE_SLOT_OFFSET_X = 420;
const EFFECT_OFFSET_X = -200;
const EFFECT_SCREEN_WIDTH = 2560;
const EFFECT_SCREEN_Y = 1440 * 0.25;
const IMAGE_FIGURE_BASE_SCALE = 0.62;
const IMAGE_FIGURE_LANDSCAPE_SCALE = 0.44;
const IMAGE_FIGURE_SQUARE_SCALE = 0.52;
const IMAGE_FIGURE_ULTRA_PORTRAIT_SCALE = 0.76;
const IMAGE_FIGURE_BASE_OFFSET_Y = 180;
const IMAGE_FIGURE_LANDSCAPE_OFFSET_Y = 260;
const IMAGE_FIGURE_SQUARE_OFFSET_Y = 220;

const FIGURE_SLOT_MAP: Record<FigurePositionKey, FigureSlot> = {
  "left": {
    id: String(FIGURE_POSITION_IDS.left),
    basePosition: "left",
    offsetX: -FIGURE_SLOT_OFFSET_X * 2,
    offsetY: 0,
  },
  "left-center": {
    id: String(FIGURE_POSITION_IDS["left-center"]),
    basePosition: "left",
    offsetX: -FIGURE_SLOT_OFFSET_X,
    offsetY: 0,
  },
  "center": {
    id: String(FIGURE_POSITION_IDS.center),
    basePosition: "center",
    offsetX: 0,
    offsetY: 0,
  },
  "right-center": {
    id: String(FIGURE_POSITION_IDS["right-center"]),
    basePosition: "right",
    offsetX: FIGURE_SLOT_OFFSET_X,
    offsetY: 0,
  },
  "right": {
    id: String(FIGURE_POSITION_IDS.right),
    basePosition: "right",
    offsetX: FIGURE_SLOT_OFFSET_X * 2,
    offsetY: 0,
  },
};

function resolveFigureSlot(position: FigurePositionKey): FigureSlot {
  return FIGURE_SLOT_MAP[position];
}

function resolveSlotOffsetById(id: string): number | null {
  for (const slot of Object.values(FIGURE_SLOT_MAP)) {
    if (slot.id === id)
      return slot.offsetX;
  }
  return null;
}

function resolveImageFigureLayout(imageMessage?: ImageFigureMessageShape | null): { scale: number; offsetY: number } {
  const width = Number(imageMessage?.width ?? 0);
  const height = Number(imageMessage?.height ?? 0);
  if (width <= 0 || height <= 0) {
    return { scale: IMAGE_FIGURE_BASE_SCALE, offsetY: IMAGE_FIGURE_BASE_OFFSET_Y };
  }
  const ratio = width / height;
  if (ratio >= 1.3) {
    return { scale: IMAGE_FIGURE_LANDSCAPE_SCALE, offsetY: IMAGE_FIGURE_LANDSCAPE_OFFSET_Y };
  }
  if (ratio >= 0.9) {
    return { scale: IMAGE_FIGURE_SQUARE_SCALE, offsetY: IMAGE_FIGURE_SQUARE_OFFSET_Y };
  }
  if (ratio <= 0.6) {
    return { scale: IMAGE_FIGURE_ULTRA_PORTRAIT_SCALE, offsetY: IMAGE_FIGURE_BASE_OFFSET_Y };
  }
  return { scale: IMAGE_FIGURE_BASE_SCALE, offsetY: IMAGE_FIGURE_BASE_OFFSET_Y };
}

function resolveImageFigureEnterAnimation(slot: FigureSlot): string {
  if (slot.basePosition === "left")
    return "position/ba-enter-from-left";
  if (slot.basePosition === "right")
    return "position/ba-enter-from-right";
  return "position/enter";
}

const DEFAULT_KEEP_OFFSET_PART = " -keepOffset";
const DEFAULT_RESTORE_TRANSFORM_PART = " -restoreTransform";

function buildFigureArgs(id: string, slot: FigureSlot, transform: string): string {
  const parts: string[] = [];
  const trimmedId = id.trim();
  if (trimmedId) {
    parts.push(`-id=${trimmedId}`);
  }
  else if (slot.basePosition === "left") {
    parts.push("-left");
  }
  else if (slot.basePosition === "right") {
    parts.push("-right");
  }
  if (transform) {
    parts.push(transform);
  }
  return parts.join(" ");
}

type ClearFigureOptions = {
  includeLegacy?: boolean;
  includeImage?: boolean;
};

function buildClearFigureLines(options: ClearFigureOptions = {}): string[] {
  const { includeLegacy = false, includeImage = false } = options;
  const lines = FIGURE_POSITION_ORDER.map((position) => {
    const slot = resolveFigureSlot(position);
    return `changeFigure:none -id=${slot.id} -next;`;
  });
  if (includeLegacy) {
    lines.push("changeFigure:none -left -next;", "changeFigure:none -center -next;", "changeFigure:none -right -next;");
  }
  if (includeImage) {
    lines.push(`changeFigure:none -id=${IMAGE_MESSAGE_FIGURE_ID} -next;`);
  }
  return lines;
}

function buildSceneInitLines(): string[] {
  return ["changeBg:none -next;", ...buildClearFigureLines({ includeLegacy: true, includeImage: true })];
}

type RendererContext = {
  lineNumber: number;
  text: string;
};

type RoomFigureRenderState = {
  fileName: string;
  transform: string;
};

type InitProgress = {
  phase: "idle" | "creating_game" | "uploading_sprites" | "uploading_backgrounds" | "creating_scenes" | "ready";
  current: number;
  total: number;
  message: string;
};

export class RealtimeRenderer {
  private static instance: RealtimeRenderer | null = null;
  private syncSocket: WebSocket | null = null;
  private isConnected = false;
  private spaceId: number;
  private spaceName: string = "";
  private gameName: string;
  private currentRoomId: number | null = null;
  private sceneContextMap = new Map<number, RendererContext>(); // roomId -> context
  private uploadedSpritesMap = new Map<number, string>(); // avatarId -> fileName
  private uploadedBackgroundsMap = new Map<string, string>(); // url -> fileName
  private uploadedImageFiguresMap = new Map<string, string>(); // url -> fileName
  private uploadedBgmsMap = new Map<string, string>(); // url -> fileName
  private uploadedVideosMap = new Map<string, string>(); // url -> fileName
  private uploadedMiniAvatarsMap = new Map<number, string>(); // avatarId -> fileName
  private roleMap = new Map<number, UserRole>();
  private queryClient: QueryClient | null = null;
  private roomMap = new Map<number, Room>(); // roomId -> Room
  private onStatusChange?: (status: "connected" | "disconnected" | "error") => void;
  private onProgressChange?: (progress: InitProgress) => void;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private currentSpriteStateMap = new Map<number, Set<string>>(); // roomId -> 当前场景显示的立绘
  private messageLineMap = new Map<string, { startLine: number; endLine: number }>(); // `${roomId}_${messageId}` -> { startLine, endLine } (消息在场景中的行号范围)
  private pendingDiceMergeMap = new Map<string, PendingDiceMergeEntry>(); // `${roomId}_${messageId}` -> 延迟渲染的骰子消息
  private lastFigureSlotIdMap = new Map<number, string>(); // roomId -> 最近一次显示的立绘槽位 id
  private renderedFigureStateMap = new Map<number, Map<string, RoomFigureRenderState>>(); // roomId -> slotId -> 最近一次下发的立绘状态
  private annotationEffectSoundCache = new Map<string, string>(); // effectId -> 可用音效文件名
  // 自动跳转已永久关闭，避免新增消息打断当前预览位置
  private readonly autoJumpEnabled = false;

  // 小头像相关
  private miniAvatarEnabled: boolean = false;

  // 自动填充立绘相关（没有设置立绘时是否自动填充左侧立绘）
  private autoFigureEnabled: boolean = true;
  // 游戏配置相关（写入 config.txt）
  private gameConfig: RealtimeGameConfig = DEFAULT_REALTIME_GAME_CONFIG;
  private workflowGraph: WorkflowGraph = { startRoomIds: [], links: {} };

  // TTS 相关
  private ttsConfig: RealtimeTTSConfig = { enabled: false };
  private voiceFileMap = new Map<number, File>(); // roleId -> 参考音频文件
  private uploadedVocalsMap = new Map<string, string>(); // hash -> fileName (已上传的语音缓存)
  private ttsGeneratingMap = new Map<string, Promise<string | null>>(); // hash -> Promise (正在生成的语音，避免重复生成)

  private constructor(spaceId: number) {
    this.spaceId = spaceId;
    this.gameName = `realtime_${spaceId}`;
  }

  private getEngineMarkerPath(): string {
    return `games/${this.gameName}/game/${REALTIME_GAME_ENGINE_MARKER_FILE}`;
  }

  private async hasExpectedEngineMarker(): Promise<boolean> {
    try {
      const exists = await checkFileExist(`games/${this.gameName}/game`, REALTIME_GAME_ENGINE_MARKER_FILE);
      if (!exists) {
        return false;
      }
      const marker = await readTextFile(this.gameName, REALTIME_GAME_ENGINE_MARKER_FILE);
      return marker.trim() === REALTIME_GAME_ENGINE_MARKER_VERSION;
    }
    catch {
      return false;
    }
  }

  private async writeEngineMarker(): Promise<void> {
    try {
      await getTerreApis().manageGameControllerEditTextFile({
        path: this.getEngineMarkerPath(),
        textFile: `${REALTIME_GAME_ENGINE_MARKER_VERSION}\n`,
      });
    }
    catch (error) {
      console.warn("[RealtimeRenderer] 写入引擎标记失败:", error);
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(spaceId: number): RealtimeRenderer {
    if (!RealtimeRenderer.instance || RealtimeRenderer.instance.spaceId !== spaceId) {
      RealtimeRenderer.instance?.dispose();
      RealtimeRenderer.instance = new RealtimeRenderer(spaceId);
    }
    return RealtimeRenderer.instance;
  }

  /**
   * 销毁实例
   */
  public static destroyInstance(): void {
    RealtimeRenderer.instance?.dispose();
    RealtimeRenderer.instance = null;
  }

  /**
   * 设置状态变化回调
   */
  public setStatusCallback(callback: (status: "connected" | "disconnected" | "error") => void): void {
    this.onStatusChange = callback;
  }

  /**
   * 设置小头像是否启用
   */
  public setMiniAvatarEnabled(enabled: boolean): void {
    this.miniAvatarEnabled = enabled;
  }

  /**
   * 设置自动填充立绘是否启用
   * @param enabled 是否启用自动填充立绘（没有设置立绘时自动填充左侧立绘）
   */
  public setAutoFigureEnabled(enabled: boolean): void {
    this.autoFigureEnabled = enabled;
  }

  /**
   * 设置当前空间名称（用于生成 Game_name）
   */
  public setSpaceName(name?: string): void {
    this.spaceName = String(name ?? "").trim();
  }

  /**
   * 设置空间流程图数据（space.roomMap）
   */
  public setWorkflowRoomMap(roomMap?: Record<string, Array<string>>): void {
    this.workflowGraph = parseWorkflowRoomMap(roomMap);
  }

  /**
   * 设置 WebGAL 游戏配置（将写入 config.txt）
   */
  public setGameConfig(config: Partial<RealtimeGameConfig>): void {
    this.gameConfig = {
      ...this.gameConfig,
      ...config,
    };
  }

  /**
   * 设置进度变化回调
   */
  public setProgressCallback(callback: (progress: InitProgress) => void): void {
    this.onProgressChange = callback;
  }

  private updateProgress(progress: Partial<InitProgress>): void {
    this.onProgressChange?.({
      phase: "idle",
      current: 0,
      total: 0,
      message: "",
      ...progress,
    });
  }

  /**
   * 获取房间的场景名（不含 .txt 后缀）
   */
  private getSceneName(roomId: number): string {
    const room = this.roomMap.get(roomId);
    const roomName = room?.name?.replace(/\n/g, "").replace(/[/\\:*?"<>|]/g, "_") || `room`;
    return `${roomName}_${roomId}`;
  }

  /**
   * 初始化渲染器（仅创建游戏和场景）
   */
  public async init(): Promise<boolean> {
    try {
      this.annotationEffectSoundCache.clear();
      this.updateProgress({ phase: "creating_game", message: "正在创建游戏..." });

      // 检查游戏是否存在
      const gameExists = await checkGameExist(this.gameName);
      console.warn(`[RealtimeRenderer] 游戏 ${this.gameName} 存在: ${gameExists}`);

      // realtime_* 为临时渲染工程。若缺少当前引擎标记，重建以应用最新模板（例如 TRPG 骰子渲染升级）。
      if (gameExists) {
        const markerMatched = await this.hasExpectedEngineMarker();
        if (!markerMatched) {
          console.warn(`[RealtimeRenderer] 检测到旧模板标记，保留现有游戏不自动重建: ${this.gameName}`);
        }
      }

      // 创建游戏实例（如果不存在）
      if (!gameExists) {
        console.warn(`[RealtimeRenderer] 正在创建游戏: ${this.gameName}`);
        await getTerreApis().manageGameControllerCreateGame({
          gameDir: this.gameName,
          gameName: this.gameName,
        });
        console.warn(`[RealtimeRenderer] 游戏创建成功`);
      }

      await this.syncGameConfigWithRoomContext();

      await this.writeEngineMarker();

      // 初始化场景
      await this.initScene();

      // 全量预加载立绘资源
      await this.preloadSprites();

      // 连接 WebSocket
      this.connectWebSocket();

      this.updateProgress({ phase: "ready", message: "初始化完成" });
      return true;
    }
    catch (error) {
      console.error("[RealtimeRenderer] 初始化失败:", error);
      this.onStatusChange?.("error");
      return false;
    }
  }

  /**
   * 全量预加载所有角色的立绘资源
   */
  private async preloadSprites(): Promise<void> {
    const avatars: RoleAvatar[] = [];
    const seenAvatarIds = new Set<number>();
    for (const role of this.roleMap.values()) {
      const avatarId = Number(role.avatarId ?? 0);
      if (avatarId > 0 && !seenAvatarIds.has(avatarId)) {
        const avatar = this.getCachedRoleAvatar(avatarId);
        if (avatar) {
          avatars.push(avatar);
          seenAvatarIds.add(avatarId);
        }
      }
    }
    if (avatars.length === 0) {
      console.warn("[RealtimeRenderer] 没有头像需要预加载");
      return;
    }

    this.updateProgress({
      phase: "uploading_sprites",
      current: 0,
      total: avatars.length,
      message: `正在预加载立绘 (0/${avatars.length})`,
    });

    for (let i = 0; i < avatars.length; i++) {
      const avatar = avatars[i];
      if (!avatar.avatarId)
        continue;

      const spriteUrl = avatar.spriteUrl || avatar.avatarUrl;
      if (spriteUrl) {
        try {
          // 查找对应的角色ID
          let roleId = 0;
          for (const [rid, role] of this.roleMap) {
            if (role.avatarId === avatar.avatarId) {
              roleId = rid;
              break;
            }
          }

          await this.uploadSprite(avatar.avatarId, spriteUrl, roleId);
          console.warn(`[RealtimeRenderer] 预加载立绘 ${i + 1}/${avatars.length}: ${avatar.avatarId}`);
        }
        catch (error) {
          console.error(`[RealtimeRenderer] 预加载立绘失败:`, error);
        }
      }

      this.updateProgress({
        phase: "uploading_sprites",
        current: i + 1,
        total: avatars.length,
        message: `正在预加载立绘 (${i + 1}/${avatars.length})`,
      });
    }
  }

  /**
   * 设置房间信息并创建对应的场景
   */
  public setRooms(rooms: Room[]): void {
    this.roomMap.clear();
    rooms.forEach((room) => {
      const roomId = Number(room.roomId ?? 0);
      if (Number.isFinite(roomId) && roomId > 0) {
        this.roomMap.set(roomId, room);
      }
    });
  }

  private getValidWorkflowStartRoomIds(): number[] {
    return normalizeWorkflowRoomIds(
      this.workflowGraph.startRoomIds.filter(roomId => this.roomMap.has(roomId)),
    );
  }

  private buildRoomChoiceFallback(rooms: Room[]): string {
    const branchOptions = rooms
      .filter(room => room.roomId)
      .map(room => `${room.name?.replace(/\n/g, "") || "房间"}:${this.getSceneName(room.roomId!)}.txt`)
      .join("|");
    return branchOptions
      ? `choose:${branchOptions};`
      : "changeBg:none;";
  }

  private buildStartSceneContent(rooms: Room[]): string {
    const startRoomIds = this.getValidWorkflowStartRoomIds();
    if (startRoomIds.length === 1) {
      return `changeScene:${this.getSceneName(startRoomIds[0])}.txt;`;
    }
    if (startRoomIds.length > 1) {
      const options = startRoomIds
        .map((roomId) => {
          const room = this.roomMap.get(roomId);
          const label = sanitizeChooseOptionLabel(room?.name?.trim() || `房间${roomId}`);
          if (!label) {
            return null;
          }
          return `${label}:${this.getSceneName(roomId)}.txt`;
        })
        .filter((option): option is string => Boolean(option));
      if (options.length > 0) {
        return `choose:${options.join("|")};`;
      }
    }
    return this.buildRoomChoiceFallback(rooms);
  }

  private buildWorkflowTransitionLine(roomId: number): string | null {
    const links = this.workflowGraph.links[roomId] ?? [];
    if (links.length === 0) {
      return null;
    }

    const options = links
      .map((link) => {
        if (!this.roomMap.has(link.targetId)) {
          return null;
        }
        const targetScene = `${this.getSceneName(link.targetId)}.txt`;
        const fallbackLabel = this.roomMap.get(link.targetId)?.name?.trim() || `房间${link.targetId}`;
        const rawLabel = link.condition?.trim() || fallbackLabel;
        const label = sanitizeChooseOptionLabel(rawLabel);
        if (!label) {
          return null;
        }
        return `${label}:${targetScene}`;
      })
      .filter((option): option is string => Boolean(option));

    if (options.length === 0) {
      return null;
    }

    return `choose:${options.join("|")};`;
  }

  private async appendWorkflowTransitionIfNeeded(roomId: number): Promise<void> {
    const transitionLine = this.buildWorkflowTransitionLine(roomId);
    if (!transitionLine) {
      return;
    }
    const context = this.sceneContextMap.get(roomId);
    const currentText = context?.text?.replace(/\r/g, "") ?? "";
    const currentLines = currentText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (currentLines.includes(transitionLine)) {
      return;
    }
    await this.appendLine(roomId, transitionLine, false, true);
  }

  private pickPrimaryRoomForConfig(): Room | undefined {
    if (this.currentRoomId) {
      const currentRoom = this.roomMap.get(this.currentRoomId);
      if (currentRoom) {
        return currentRoom;
      }
    }
    let latestRoom: Room | undefined;
    for (const room of this.roomMap.values()) {
      if (room) {
        latestRoom = room;
      }
    }
    return latestRoom;
  }

  private async syncAvatarToGameIcons(avatarUrl: string): Promise<void> {
    const normalizedUrl = String(avatarUrl ?? "").trim();
    if (!normalizedUrl) {
      return;
    }

    const icon192 = await createSquarePngBlobFromUrl(normalizedUrl, 192);
    const icon512 = await createSquarePngBlobFromUrl(normalizedUrl, 512);
    const icon180 = await createSquarePngBlobFromUrl(normalizedUrl, 180);

    const rootIconsDir = `games/${this.gameName}/icons/`;
    const exportWebIconsDir = `games/${this.gameName}/icons/web/`;

    // 同步运行时图标（icons/*.png）以及 Terre 导出用图标（icons/web/*.png）。
    await Promise.all([
      uploadBlobToDirectory(icon180, rootIconsDir, "apple-touch-icon.png"),
      uploadBlobToDirectory(icon192, rootIconsDir, "icon-192.png"),
      uploadBlobToDirectory(icon192, rootIconsDir, "icon-192-maskable.png"),
      uploadBlobToDirectory(icon512, rootIconsDir, "icon-512.png"),
      uploadBlobToDirectory(icon512, rootIconsDir, "icon-512-maskable.png"),
      uploadBlobToDirectory(icon180, exportWebIconsDir, "apple-touch-icon.png"),
      uploadBlobToDirectory(icon192, exportWebIconsDir, "icon-192.png"),
      uploadBlobToDirectory(icon192, exportWebIconsDir, "icon-192-maskable.png"),
      uploadBlobToDirectory(icon512, exportWebIconsDir, "icon-512.png"),
      uploadBlobToDirectory(icon512, exportWebIconsDir, "icon-512-maskable.png"),
    ]);
  }

  private async syncGameConfigWithRoomContext(): Promise<void> {
    let rawConfig = "";
    try {
      rawConfig = await getTerreApis().manageGameControllerGetGameConfig(this.gameName);
    }
    catch (error) {
      console.warn("[RealtimeRenderer] 读取 config.txt 失败，跳过配置同步:", error);
      return;
    }

    const configEntries = parseGameConfig(rawConfig);
    const primaryRoom = this.pickPrimaryRoomForConfig();

    if (this.gameConfig.gameNameFromRoomNameEnabled) {
      const normalizedSpaceName = sanitizeGameConfigValue(this.spaceName);
      const namePrefix = normalizedSpaceName || "space";
      const gameName = `${namePrefix}_${this.spaceId}`;
      upsertGameConfigEntry(configEntries, "Game_name", gameName);
    }

    upsertGameConfigEntry(configEntries, "Description", this.gameConfig.description);
    upsertGameConfigEntry(configEntries, "Package_name", this.gameConfig.packageName);
    upsertGameConfigEntry(configEntries, "Show_panic", this.gameConfig.showPanicEnabled ? "true" : "false");
    upsertGameConfigEntry(configEntries, "Default_Language", this.gameConfig.defaultLanguage);
    upsertGameConfigEntry(configEntries, "Enable_Appreciation", this.gameConfig.enableAppreciation ? "true" : "false");
    upsertGameConfigEntry(configEntries, "TypingSoundEnabled", this.gameConfig.typingSoundEnabled ? "true" : "false");

    const avatarUrl = String(primaryRoom?.avatar ?? "").trim();
    const roomId = Number(primaryRoom?.roomId ?? 0);

    if (this.gameConfig.coverFromRoomAvatarEnabled && avatarUrl) {
      try {
        const avatarExt = getFileExtensionFromUrl(avatarUrl, "webp");
        const titleImageName = `room_title_${roomId > 0 ? roomId : "default"}_${hashString(avatarUrl)}.${avatarExt}`;
        const uploadedTitleImage = await uploadFile(
          avatarUrl,
          `games/${this.gameName}/game/background/`,
          titleImageName,
        );
        upsertGameConfigEntry(configEntries, "Title_img", uploadedTitleImage);
      }
      catch (error) {
        console.warn("[RealtimeRenderer] 同步群聊头像为 Title_img 失败:", error);
      }
    }

    if (this.gameConfig.startupLogoFromRoomAvatarEnabled && avatarUrl) {
      try {
        const avatarExt = getFileExtensionFromUrl(avatarUrl, "webp");
        const logoName = `room_logo_${roomId > 0 ? roomId : "default"}_${hashString(avatarUrl)}.${avatarExt}`;
        const uploadedLogo = await uploadFile(
          avatarUrl,
          `games/${this.gameName}/game/background/`,
          logoName,
        );
        upsertGameConfigEntry(configEntries, "Game_Logo", uploadedLogo);
      }
      catch (error) {
        console.warn("[RealtimeRenderer] 同步群聊头像为 Game_Logo 失败:", error);
      }
    }

    if (this.gameConfig.gameIconFromRoomAvatarEnabled && avatarUrl) {
      try {
        await this.syncAvatarToGameIcons(avatarUrl);
      }
      catch (error) {
        console.warn("[RealtimeRenderer] 同步群聊头像为游戏图标失败:", error);
      }
    }

    const nextConfig = serializeGameConfig(configEntries);
    const normalizedRawConfig = serializeGameConfig(parseGameConfig(rawConfig));
    if (!nextConfig || nextConfig === normalizedRawConfig) {
      return;
    }

    try {
      await getTerreApis().manageGameControllerSetGameConfig({
        gameName: this.gameName,
        newConfig: nextConfig,
      });
      console.warn("[RealtimeRenderer] config.txt 已同步聊天室设置");
    }
    catch (error) {
      console.warn("[RealtimeRenderer] 写入 config.txt 失败:", error);
    }
  }

  /**
   * 初始化指定房间的场景文件
   */
  public async initRoomScene(roomId: number): Promise<void> {
    const sceneName = this.getSceneName(roomId);
    const path = `games/${this.gameName}/game/scene/${sceneName}.txt`;
    const initLines = buildSceneInitLines();
    const initialContent = initLines.join("\n");

    try {
      await getTerreApis().manageGameControllerEditTextFile({ path, textFile: initialContent });
      this.sceneContextMap.set(roomId, { lineNumber: initLines.length, text: initialContent });
      this.currentSpriteStateMap.set(roomId, new Set());
      this.renderedFigureStateMap.set(roomId, new Map());
      console.warn(`[RealtimeRenderer] 房间场景初始化成功: ${sceneName}`);
    }
    catch (error) {
      console.error(`[RealtimeRenderer] 房间场景初始化失败: ${sceneName}`, error);
      throw error;
    }
  }

  /**
   * 初始化所有房间的场景并生成入口 start.txt
   */
  private async initScene(): Promise<void> {
    const rooms = Array.from(this.roomMap.values());

    if (rooms.length === 0) {
      // 如果没有房间，创建一个默认场景
      console.warn(`[RealtimeRenderer] 没有房间信息，创建默认场景`);
      const path = `games/${this.gameName}/game/scene/start.txt`;
      const initLines = buildSceneInitLines();
      await getTerreApis().manageGameControllerEditTextFile({
        path,
        textFile: initLines.join("\n"),
      });
      return;
    }

    this.updateProgress({
      phase: "creating_scenes",
      current: 0,
      total: rooms.length,
      message: `正在创建房间场景 (0/${rooms.length})`,
    });

    // 为每个房间创建场景
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (room.roomId) {
        await this.initRoomScene(room.roomId);
      }
      this.updateProgress({
        phase: "creating_scenes",
        current: i + 1,
        total: rooms.length,
        message: `正在创建房间场景 (${i + 1}/${rooms.length})`,
      });
    }

    // 生成 start.txt 入口场景（优先使用流程图开始节点）
    const startContent = this.buildStartSceneContent(rooms);

    await getTerreApis().manageGameControllerEditTextFile({
      path: `games/${this.gameName}/game/scene/start.txt`,
      textFile: startContent,
    });

    console.warn(`[RealtimeRenderer] 入口场景创建成功，包含 ${rooms.length} 个房间选项`);
  }

  /**
   * 切换当前活动的房间
   */
  public async switchRoom(roomId: number): Promise<void> {
    if (!this.sceneContextMap.has(roomId)) {
      // 如果该房间场景不存在，创建它
      await this.initRoomScene(roomId);
    }
    this.currentRoomId = roomId;
    // 发送场景切换同步
    this.sendSyncMessage(roomId);
  }

  /**
   * 连接 WebSocket
   */
  private connectWebSocket(): void {
    if (this.syncSocket?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getTerreWsUrl();
    if (!wsUrl) {
      console.error("WebGAL WebSocket 地址未配置");
      this.onStatusChange?.("error");
      return;
    }

    try {
      this.syncSocket = new WebSocket(wsUrl);

      this.syncSocket.onopen = () => {
        console.warn("WebGAL 实时渲染 WebSocket 已连接");
        this.isConnected = true;
        this.onStatusChange?.("connected");

        // 发送队列中的消息
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg)
            this.syncSocket?.send(msg);
        }
      };

      this.syncSocket.onclose = () => {
        console.warn("WebGAL 实时渲染 WebSocket 已断开");
        this.isConnected = false;
        this.onStatusChange?.("disconnected");

        // 自动重连
        this.scheduleReconnect();
      };

      this.syncSocket.onerror = (error) => {
        console.error("WebGAL WebSocket 错误:", error);
        this.onStatusChange?.("error");
      };
    }
    catch (error) {
      console.error("WebSocket 连接失败:", error);
      this.onStatusChange?.("error");
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      console.warn("尝试重连 WebGAL WebSocket...");
      this.connectWebSocket();
    }, 3000);
  }

  /**
   * 发送同步消息到指定房间的场景（自动跳转关闭时不发送）
   */
  private sendSyncMessage(roomId: number): void {
    if (!this.autoJumpEnabled) {
      return;
    }
    const sceneName = this.getSceneName(roomId);
    const context = this.sceneContextMap.get(roomId);
    if (!context) {
      console.warn(`[RealtimeRenderer] 房间 ${roomId} 的场景上下文不存在`);
      return;
    }

    const msg = getAsyncMsg(`${sceneName}.txt`, context.lineNumber);
    const msgStr = JSON.stringify(msg);

    if (this.isConnected && this.syncSocket?.readyState === WebSocket.OPEN) {
      this.syncSocket.send(msgStr);
    }
    else {
      this.messageQueue.push(msgStr);
    }
  }

  /**
   * 添加一行到指定房间的场景
   */
  private async appendLine(
    roomId: number,
    line: string,
    syncToFile: boolean = true,
    allowEmpty: boolean = false,
  ): Promise<void> {
    if (!allowEmpty && !line.trim())
      return;

    let context = this.sceneContextMap.get(roomId);
    if (!context) {
      // 如果场景不存在，先创建
      await this.initRoomScene(roomId);
      context = this.sceneContextMap.get(roomId)!;
    }

    context.text = context.text
      ? `${context.text}\n${line}`
      : line;
    context.lineNumber += 1;

    if (syncToFile) {
      await this.syncContextToFile(roomId);
    }
  }

  /**
   * 替换指定房间场景中的指定行
   * @param roomId 房间ID
   * @param startLine 起始行号（1-based）
   * @param endLine 结束行号（1-based，包含）
   * @param newLines 新的内容行数组
   * @param syncToFile 是否同步到文件
   */
  private async replaceLinesInContext(
    roomId: number,
    startLine: number,
    endLine: number,
    newLines: string[],
    syncToFile: boolean = true,
  ): Promise<void> {
    const context = this.sceneContextMap.get(roomId);
    if (!context) {
      console.warn(`[RealtimeRenderer] 房间 ${roomId} 的场景上下文不存在`);
      return;
    }

    // 将场景文本分割为行
    const lines = context.text.split("\n");

    // 替换指定范围的行（注意：lineNumber 是 1-based，数组索引是 0-based）
    const before = lines.slice(0, startLine - 1);
    const after = lines.slice(endLine);

    // 合并新内容
    const newContent = [...before, ...newLines, ...after];
    context.text = newContent.join("\n");

    // 更新行号（总行数变化）
    const oldLineCount = endLine - startLine + 1;
    const newLineCount = newLines.length;
    const lineDiff = newLineCount - oldLineCount;
    context.lineNumber += lineDiff;

    // 更新所有在被替换区域之后的消息的行号
    if (lineDiff !== 0) {
      this.messageLineMap.forEach((range, key) => {
        if (key.startsWith(`${roomId}_`) && range.startLine > endLine) {
          range.startLine += lineDiff;
          range.endLine += lineDiff;
        }
      });
    }

    if (syncToFile) {
      await this.syncContextToFile(roomId);
    }
  }

  private async syncContextToFile(roomId: number): Promise<void> {
    const context = this.sceneContextMap.get(roomId);
    if (!context)
      return;

    const sceneName = this.getSceneName(roomId);
    const path = `games/${this.gameName}/game/scene/${sceneName}.txt`;
    await getTerreApis().manageGameControllerEditTextFile({
      path,
      textFile: context.text,
    });
  }

  /**
   * 设置角色信息缓存
   */
  public setRoleCache(roles: UserRole[]): void {
    roles.forEach(role => this.roleMap.set(role.roleId, role));

    // 如果 TTS 已启用，尝试获取新角色的参考音频
    if (this.ttsConfig.enabled) {
      this.fetchVoiceFilesFromRoles();
    }
  }

  /**
   * 设置头像信息缓存
   */
  public setQueryClient(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  public invalidateAvatarCaches(avatarId: number): void {
    this.uploadedSpritesMap.delete(avatarId);
    this.uploadedMiniAvatarsMap.delete(avatarId);
  }

  private getCachedRoleAvatar(avatarId: number): RoleAvatar | undefined {
    if (!this.queryClient || !avatarId) {
      return undefined;
    }

    const cached = this.queryClient.getQueryData<any>(["getRoleAvatar", avatarId]);
    const candidate = cached?.data ?? cached?.data?.data ?? cached;
    if (candidate && typeof candidate === "object" && "avatarId" in candidate) {
      return candidate as RoleAvatar;
    }

    return undefined;
  }

  private getAllCachedRoleAvatars(): RoleAvatar[] {
    if (!this.queryClient) {
      return [];
    }

    const queries = this.queryClient.getQueryCache().findAll({ queryKey: ["getRoleAvatar"] });
    const avatars: RoleAvatar[] = [];

    for (const query of queries) {
      const data: any = query.state.data;
      const candidate = data?.data ?? data?.data?.data ?? data;
      if (candidate && typeof candidate === "object" && candidate.avatarId) {
        avatars.push(candidate as RoleAvatar);
      }
    }

    const deduped = new Map<number, RoleAvatar>();
    for (const avatar of avatars) {
      if (avatar.avatarId) {
        deduped.set(avatar.avatarId, avatar);
      }
    }
    return Array.from(deduped.values());
  }

  /**
   * 设置 TTS 配置
   */
  public setTTSConfig(config: RealtimeTTSConfig): void {
    const wasEnabled = this.ttsConfig.enabled;
    this.ttsConfig = config;
    console.warn(`[RealtimeRenderer] TTS 配置已更新: enabled=${config.enabled}`);

    // 如果从禁用变为启用，且没有参考音频，尝试获取
    if (!wasEnabled && config.enabled && this.voiceFileMap.size === 0) {
      console.warn(`[RealtimeRenderer] TTS 已启用，正在获取参考音频...`);
      this.fetchVoiceFilesFromRoles();
    }
  }

  /**
   * 设置角色的参考音频文件
   */
  public setVoiceFile(roleId: number, voiceFile: File): void {
    this.voiceFileMap.set(roleId, voiceFile);
  }

  /**
   * 批量设置角色参考音频
   */
  public setVoiceFiles(voiceFiles: Map<number, File>): void {
    voiceFiles.forEach((file, roleId) => {
      this.voiceFileMap.set(roleId, file);
    });
  }

  /**
   * 从角色的 voiceUrl 获取参考音频文件
   */
  public async fetchVoiceFilesFromRoles(): Promise<void> {
    for (const [roleId, role] of this.roleMap) {
      if (role.voiceUrl && !this.voiceFileMap.has(roleId)) {
        try {
          const response = await fetch(role.voiceUrl);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File(
              [blob],
              role.voiceUrl.split("/").pop() ?? `${roleId}_ref_vocal.wav`,
              { type: blob.type || "audio/wav" },
            );
            this.voiceFileMap.set(roleId, file);
            console.warn(`[RealtimeRenderer] 获取角色 ${roleId} 的参考音频成功`);
          }
        }
        catch (error) {
          console.warn(`[RealtimeRenderer] 获取角色 ${roleId} 的参考音频失败:`, error);
        }
      }
    }
  }

  /**
   * 简单的字符串哈希函数（用于 TTS 缓存）
   */
  private simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash * 33) ^ char;
    }
    return (hash >>> 0).toString(16).padStart(8, "0")
      + ((hash * 0x811C9DC5) >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * 将 avatarTitle 转换为情感向量
   */
  private convertAvatarTitleToEmotionVector(avatarTitle: Record<string, string>): number[] {
    const emotionOrder = ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"];
    const MAX_SUM = 0.5;

    let emotionVector = emotionOrder.map((emotion) => {
      const value = avatarTitle[emotion];
      const numValue = value ? Number.parseFloat(value) * 0.5 : 0.0;
      return Math.max(0.0, Math.min(1.4, numValue));
    });

    const currentSum = emotionVector.reduce((sum, val) => sum + val, 0);
    if (currentSum > MAX_SUM) {
      const scaleFactor = MAX_SUM / currentSum;
      emotionVector = emotionVector.map(val => val * scaleFactor);
    }

    return emotionVector.map(val => Math.round(val * 10000) / 10000);
  }

  /**
   * 将 File 转换为 base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 生成语音并上传到 WebGAL
   * @param text 要生成语音的文本
   * @param roleId 角色 ID（用于获取参考音频）
   * @param avatarTitle 头像标题（用于情感向量）
   * @param customEmotionVector 自定义情感向量（优先于 avatarTitle）
   * @returns 上传后的文件名，如果失败则返回 null
   */
  private async generateAndUploadVocal(
    text: string,
    roleId: number,
    avatarTitle?: Record<string, string>,
    customEmotionVector?: number[],
  ): Promise<string | null> {
    if (!this.ttsConfig.enabled) {
      return null;
    }

    // 获取参考音频
    const refVocal = this.voiceFileMap.get(roleId);
    if (!refVocal) {
      console.warn(`[RealtimeRenderer] 角色 ${roleId} 没有参考音频，跳过 TTS`);
      return null;
    }

    // 生成缓存 key（优先使用自定义情感向量）
    const emotionVector = customEmotionVector && customEmotionVector.length > 0
      ? customEmotionVector
      : (avatarTitle ? this.convertAvatarTitleToEmotionVector(avatarTitle) : []);
    const cacheKey = this.simpleHash(`tts_${text}_${refVocal.name}_${JSON.stringify(emotionVector)}`);
    const fileName = `${cacheKey}.webm`;

    // 检查内存缓存
    if (this.uploadedVocalsMap.has(cacheKey)) {
      return this.uploadedVocalsMap.get(cacheKey) || null;
    }

    // 检查是否正在生成（避免重复生成）
    if (this.ttsGeneratingMap.has(cacheKey)) {
      return this.ttsGeneratingMap.get(cacheKey) || null;
    }

    // 检查文件是否已存在于服务器
    try {
      const exists = await checkFileExist(`games/${this.gameName}/game/vocal/`, fileName);
      if (exists) {
        this.uploadedVocalsMap.set(cacheKey, fileName);
        return fileName;
      }
    }
    catch {
      // 忽略检查错误，继续生成
    }

    // 创建生成 Promise
    const generatePromise = (async (): Promise<string | null> => {
      try {
        const refAudioBase64 = await this.fileToBase64(refVocal);

        const ttsRequest: InferRequest = {
          text,
          prompt_audio_base64: refAudioBase64,
          emo_mode: this.ttsConfig.emotionMode ?? 2,
          emo_weight: this.ttsConfig.emotionWeight ?? 0.8,
          emo_vector: emotionVector.length > 0 ? emotionVector : undefined,
          emo_random: false,
          temperature: this.ttsConfig.temperature ?? 0.8,
          top_p: this.ttsConfig.topP ?? 0.8,
          max_text_tokens_per_segment: this.ttsConfig.maxTokensPerSegment ?? 120,
          return_audio_base64: true,
        };

        console.warn(`[RealtimeRenderer] 正在生成语音: "${text.substring(0, 20)}..."`);
        // 使用自定义 API URL 或默认的全局 ttsApi
        const api = this.ttsConfig.apiUrl ? createTTSApi(this.ttsConfig.apiUrl) : ttsApi;
        const response = await api.infer(ttsRequest);

        if (response.code === 0 && response.data?.audio_base64) {
          // 将 base64 转换为 Blob 并上传
          const byteCharacters = atob(response.data.audio_base64);
          const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) => byteCharacters.charCodeAt(i));
          const byteArray = new Uint8Array(byteNumbers);
          const audioBlob = new Blob([byteArray], { type: "audio/wav" });
          const audioUrl = URL.createObjectURL(audioBlob);

          try {
            const uploadedFileName = await uploadFile(
              audioUrl,
              `games/${this.gameName}/game/vocal/`,
              fileName,
            );
            URL.revokeObjectURL(audioUrl);

            this.uploadedVocalsMap.set(cacheKey, uploadedFileName);
            console.warn(`[RealtimeRenderer] 语音生成并上传成功: ${uploadedFileName}`);
            return uploadedFileName;
          }
          catch (uploadError) {
            console.error("[RealtimeRenderer] 语音上传失败:", uploadError);
            URL.revokeObjectURL(audioUrl);
            return null;
          }
        }
        else {
          console.error("[RealtimeRenderer] TTS 生成失败:", response.msg);
          return null;
        }
      }
      catch (error) {
        console.error("[RealtimeRenderer] TTS 生成过程中发生错误:", error);
        return null;
      }
      finally {
        this.ttsGeneratingMap.delete(cacheKey);
      }
    })();

    this.ttsGeneratingMap.set(cacheKey, generatePromise);
    return generatePromise;
  }

  /**
   * 根据 RoleAvatar 生成 transform 字符串（支持偏移量）
   */
  private buildFigureTransformString(
    avatar: RoleAvatar | undefined,
    offsetX = 0,
    offsetY = 0,
  ): string {
    if (!avatar && offsetX === 0 && offsetY === 0) {
      return "";
    }

    const rotationRad = avatar?.spriteRotation
      ? (avatar.spriteRotation * Math.PI / 180)
      : 0;

    const transform = {
      position: {
        x: (avatar?.spriteXPosition ?? 0) + offsetX,
        y: (avatar?.spriteYPosition ?? 0) + offsetY,
      },
      scale: {
        x: avatar?.spriteScale ?? 1,
        y: avatar?.spriteScale ?? 1,
      },
      alpha: avatar?.spriteTransparency ?? 1,
      rotation: rotationRad,
    };
    return `-transform=${JSON.stringify(transform)}`;
  }

  /**
   * 构建展示图层 transform（独立于角色立绘，避免图片按原尺寸铺满画面）。
   */
  private buildImageFigureTransformString(
    imageMessage: ImageFigureMessageShape | undefined,
    offsetX = 0,
  ): string {
    const layout = resolveImageFigureLayout(imageMessage);
    const transform = {
      position: {
        x: offsetX,
        y: layout.offsetY,
      },
      scale: {
        x: layout.scale,
        y: layout.scale,
      },
      alpha: 1,
      rotation: 0,
    };
    return `-transform=${JSON.stringify(transform)}`;
  }

  /**
   * 上传立绘
   */
  private async uploadSprite(avatarId: number, spriteUrl: string, roleId: number): Promise<string | null> {
    if (this.uploadedSpritesMap.has(avatarId)) {
      return this.uploadedSpritesMap.get(avatarId) || null;
    }

    try {
      const path = `games/${this.gameName}/game/figure/`;
      const fileExtension = getFileExtensionFromUrl(spriteUrl, "webp");
      const spriteName = `role_${roleId}_sprites_${avatarId}`;
      const fileName = await uploadFile(spriteUrl, path, `${spriteName}.${fileExtension}`);
      this.uploadedSpritesMap.set(avatarId, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传立绘失败:", error);
      return null;
    }
  }

  /**
   * 上传背景
   */
  private async uploadBackground(url: string): Promise<string | null> {
    if (this.uploadedBackgroundsMap.has(url)) {
      return this.uploadedBackgroundsMap.get(url) || null;
    }

    try {
      const path = `games/${this.gameName}/game/background/`;
      const targetName = buildImageFileName(url, undefined, "bg");
      const fileName = await uploadFile(url, path, targetName);
      this.uploadedBackgroundsMap.set(url, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传背景失败:", error);
      return null;
    }
  }

  /**
   * 上传图片消息（作为常驻展示图层）
   */
  private async uploadImageFigure(url: string, fileName?: string): Promise<string | null> {
    if (this.uploadedImageFiguresMap.has(url)) {
      return this.uploadedImageFiguresMap.get(url) || null;
    }

    try {
      const path = `games/${this.gameName}/game/figure/`;
      const targetName = buildImageFileName(url, fileName, "img");
      const uploadedName = await uploadFile(url, path, targetName);
      this.uploadedImageFiguresMap.set(url, uploadedName);
      return uploadedName;
    }
    catch (error) {
      console.error("上传图片立绘失败:", error);
      return null;
    }
  }

  /**
   * 上传视频资源
   */
  private async uploadVideo(url: string, fileName?: string): Promise<string | null> {
    if (this.uploadedVideosMap.has(url)) {
      return this.uploadedVideosMap.get(url) || null;
    }

    try {
      const path = `games/${this.gameName}/game/video/`;
      const trimmedName = fileName?.trim();
      const targetName = trimmedName
        ? (hasFileExtension(trimmedName) ? trimmedName : `${trimmedName}.webm`)
        : `video_${hashString(url)}.webm`;
      const uploadedName = await uploadFile(url, path, targetName);
      this.uploadedVideosMap.set(url, uploadedName);
      return uploadedName;
    }
    catch (error) {
      console.error("上传视频失败:", error);
      return null;
    }
  }

  private getRenderedFigureState(roomId: number): Map<string, RoomFigureRenderState> {
    const current = this.renderedFigureStateMap.get(roomId);
    if (current) {
      return current;
    }
    const next = new Map<string, RoomFigureRenderState>();
    this.renderedFigureStateMap.set(roomId, next);
    return next;
  }

  /**
   * 上传背景音乐
   */
  private async uploadBgm(url: string): Promise<string | null> {
    if (this.uploadedBgmsMap.has(url)) {
      return this.uploadedBgmsMap.get(url) || null;
    }

    try {
      const path = `games/${this.gameName}/game/bgm/`;
      const fileName = await uploadFile(url, path);
      this.uploadedBgmsMap.set(url, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传背景音乐失败:", error);
      return null;
    }
  }

  /**
   * 上传音效到 vocal 文件夹
   */
  private uploadedSoundEffectsMap = new Map<string, string>();
  private async uploadSoundEffect(url: string): Promise<string | null> {
    if (this.uploadedSoundEffectsMap.has(url)) {
      return this.uploadedSoundEffectsMap.get(url) || null;
    }

    try {
      // WebGAL 的 playEffect 使用 vocal 文件夹
      const path = `games/${this.gameName}/game/vocal/`;
      const fileName = await uploadFile(url, path);
      this.uploadedSoundEffectsMap.set(url, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传音效失败:", error);
      return null;
    }
  }

  private resolveDiceSound(payload: WebgalDiceRenderPayload | null, useDefault: boolean): { url: string; volume?: number } | null {
    const sound = payload?.sound;
    if (sound?.enabled === false) {
      return null;
    }

    const volume = typeof sound?.volume === "number" && Number.isFinite(sound.volume)
      ? sound.volume
      : undefined;
    const directUrl = typeof sound?.url === "string" ? sound.url.trim() : "";
    if (directUrl) {
      return { url: directUrl, volume };
    }
    if (!useDefault) {
      return null;
    }

    const fileName = typeof sound?.fileName === "string" && sound.fileName.trim()
      ? sound.fileName.trim()
      : DEFAULT_DICE_SOUND_FILE;
    const folder = typeof sound?.folder === "string" && sound.folder.trim()
      ? sound.folder.trim().replace(/^\/+|\/+$/g, "")
      : DEFAULT_DICE_SOUND_FOLDER;
    const base = getTerreBaseUrl().replace(/\/$/, "");
    return { url: `${base}/games/${this.gameName}/game/${folder}/${fileName}`, volume };
  }

  private async resolveAnnotationEffectSound(effectId: string | undefined): Promise<{ url: string } | null> {
    if (!effectId) {
      return null;
    }
    if (this.annotationEffectSoundCache.has(effectId)) {
      const cached = this.annotationEffectSoundCache.get(effectId);
      if (!cached)
        return null;
      const base = getTerreBaseUrl().replace(/\/$/, "");
      return {
        url: `${base}/games/${this.gameName}/game/se/effects/${cached}`,
      };
    }
    const soundCandidates = getEffectSoundFileCandidates(effectId);
    if (!soundCandidates || soundCandidates.length === 0) {
      return null;
    }
    const soundDir = `games/${this.gameName}/game/se/effects`;
    for (const soundFileName of soundCandidates) {
      try {
        const exists = await checkFileExist(soundDir, soundFileName);
        if (!exists) {
          continue;
        }
        this.annotationEffectSoundCache.set(effectId, soundFileName);
        const base = getTerreBaseUrl().replace(/\/$/, "");
        return {
          url: `${base}/games/${this.gameName}/game/se/effects/${soundFileName}`,
        };
      }
      catch {
        continue;
      }
    }
    return null;
  }

  /**
   * 获取立绘文件名（如果未上传则上传）
   */
  private async getAndUploadSprite(avatarId: number, roleId: number): Promise<string | null> {
    // 已上传的直接返回
    if (this.uploadedSpritesMap.has(avatarId)) {
      return this.uploadedSpritesMap.get(avatarId) || null;
    }

    // 获取头像信息
    const avatar = this.getCachedRoleAvatar(avatarId);
    if (!avatar) {
      console.warn(`[RealtimeRenderer] 头像信息未找到: avatarId=${avatarId}`);
      return null;
    }

    const spriteUrl = avatar.spriteUrl || avatar.avatarUrl;
    if (!spriteUrl) {
      console.warn(`[RealtimeRenderer] 头像没有 spriteUrl 或 avatarUrl: avatarId=${avatarId}`);
      return null;
    }

    return this.uploadSprite(avatarId, spriteUrl, roleId);
  }

  /**
   * 获取小头像文件名（如果未上传则上传）
   */
  private async getAndUploadMiniAvatar(avatarId: number, roleId: number): Promise<string | null> {
    // 已上传的直接返回
    if (this.uploadedMiniAvatarsMap.has(avatarId)) {
      return this.uploadedMiniAvatarsMap.get(avatarId) || null;
    }

    // 获取头像信息
    const avatar = this.getCachedRoleAvatar(avatarId);
    if (!avatar) {
      return null;
    }

    const avatarUrl = avatar.avatarUrl;
    if (!avatarUrl) {
      return null;
    }

    try {
      const path = `games/${this.gameName}/game/figure/`;
      const fileExtension = getFileExtensionFromUrl(avatarUrl, "webp");
      const miniAvatarName = `role_${roleId}_mini_${avatarId}`;
      const fileName = await uploadFile(avatarUrl, path, `${miniAvatarName}.${fileExtension}`);
      this.uploadedMiniAvatarsMap.set(avatarId, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传小头像失败:", error);
      return null;
    }
  }

  private getDiceMergeKey(roomId: number, messageId: number): string {
    return `${roomId}_${messageId}`;
  }

  private clearPendingDiceMerge(roomId?: number): void {
    for (const [key, entry] of Array.from(this.pendingDiceMergeMap.entries())) {
      if (roomId !== undefined && entry.roomId !== roomId) {
        continue;
      }
      clearTimeout(entry.timer);
      this.pendingDiceMergeMap.delete(key);
    }
  }

  private async flushPendingDiceMergeForRoom(roomId: number): Promise<void> {
    const entries = Array.from(this.pendingDiceMergeMap.values())
      .filter(entry => entry.roomId === roomId)
      .sort((left, right) => {
        const leftPosition = Number(left.message.message.position ?? 0);
        const rightPosition = Number(right.message.message.position ?? 0);
        if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition) && leftPosition !== rightPosition) {
          return leftPosition - rightPosition;
        }
        return Number(left.message.message.messageId ?? 0) - Number(right.message.message.messageId ?? 0);
      });
    if (entries.length === 0) {
      return;
    }
    for (const entry of entries) {
      const messageId = entry.message.message.messageId;
      if (!messageId) {
        continue;
      }
      const key = this.getDiceMergeKey(roomId, messageId);
      const currentEntry = this.pendingDiceMergeMap.get(key);
      if (!currentEntry) {
        continue;
      }
      clearTimeout(currentEntry.timer);
      this.pendingDiceMergeMap.delete(key);
      await this.renderMessage(currentEntry.message, currentEntry.roomId, currentEntry.syncToFile, { bypassDiceMerge: true });
    }
  }

  private getDiceContentFromMessage(msg: ChatMessageResponse["message"], payload?: WebgalDiceRenderPayload | null): string {
    return payload?.content ?? msg.extra?.diceResult?.result ?? (msg.extra as any)?.result ?? msg.content ?? "";
  }

  private isPotentialTrpgDiceMessage(msg: ChatMessageResponse["message"]): boolean {
    if ((msg.messageType as number) !== MESSAGE_TYPE.DICE) {
      return false;
    }
    const payload = extractWebgalDicePayload(msg.webgal);
    if (payload?.mode === "trpg") {
      return true;
    }
    const content = this.getDiceContentFromMessage(msg, payload);
    const normalized = String(content ?? "").trim();
    if (!normalized) {
      return false;
    }
    return isLikelyTrpgDiceContent(normalized) || DICE_COMMAND_PATTERN.test(normalized);
  }

  private canMergeTrpgDicePair(command: ChatMessageResponse, reply: ChatMessageResponse): boolean {
    const commandMessage = command.message;
    const replyMessage = reply.message;
    if ((commandMessage.messageType as number) !== MESSAGE_TYPE.DICE || (replyMessage.messageType as number) !== MESSAGE_TYPE.DICE) {
      return false;
    }
    if (!commandMessage.messageId || replyMessage.replyMessageId !== commandMessage.messageId) {
      return false;
    }
    return this.isPotentialTrpgDiceMessage(commandMessage) || this.isPotentialTrpgDiceMessage(replyMessage);
  }

  private buildMergedTrpgDiceMessage(command: ChatMessageResponse, reply: ChatMessageResponse): ChatMessageResponse {
    const commandMessage = command.message;
    const replyMessage = reply.message;
    const commandPayload = extractWebgalDicePayload(commandMessage.webgal);
    const replyPayload = extractWebgalDicePayload(replyMessage.webgal);
    const commandContent = this.getDiceContentFromMessage(commandMessage, commandPayload).trim();
    const replyContent = this.getDiceContentFromMessage(replyMessage, replyPayload).trim();
    const mergedLines: string[] = [];
    if (commandContent) {
      mergedLines.push(`[玩家掷骰](style=color:#9AB9FF) ${commandContent}`);
    }
    if (replyContent) {
      mergedLines.push(`[骰子结果](style=color:#FFC88C) ${replyContent}`);
    }
    const mergedContent = mergedLines.join("\n").trim() || replyContent || commandContent;
    const replyWebgal = (replyMessage.webgal && typeof replyMessage.webgal === "object")
      ? (replyMessage.webgal as Record<string, any>)
      : {};
    const rawDiceRender = (replyWebgal.diceRender && typeof replyWebgal.diceRender === "object")
      ? (replyWebgal.diceRender as Record<string, any>)
      : {};
    const mergedExtra = {
      ...(replyMessage.extra ?? {}),
      diceResult: {
        result: mergedContent,
      },
    };

    return {
      ...reply,
      message: {
        ...replyMessage,
        content: mergedContent,
        webgal: {
          ...replyWebgal,
          diceRender: {
            ...rawDiceRender,
            mode: "trpg",
            content: mergedContent,
            twoStep: false,
          },
        },
        extra: mergedExtra,
      },
    };
  }

  private async tryRenderMergedTrpgDiceMessage(
    message: ChatMessageResponse,
    roomId: number,
    syncToFile: boolean,
  ): Promise<boolean> {
    const msg = message.message;
    if ((msg.messageType as number) !== MESSAGE_TYPE.DICE || !syncToFile || !msg.messageId) {
      return false;
    }

    if (msg.replyMessageId) {
      const pendingKey = this.getDiceMergeKey(roomId, msg.replyMessageId);
      const pendingEntry = this.pendingDiceMergeMap.get(pendingKey);
      if (!pendingEntry) {
        return false;
      }
      clearTimeout(pendingEntry.timer);
      this.pendingDiceMergeMap.delete(pendingKey);
      if (this.canMergeTrpgDicePair(pendingEntry.message, message)) {
        const mergedMessage = this.buildMergedTrpgDiceMessage(pendingEntry.message, message);
        await this.renderMessage(mergedMessage, roomId, syncToFile, { bypassDiceMerge: true });
        return true;
      }
      await this.renderMessage(pendingEntry.message, pendingEntry.roomId, pendingEntry.syncToFile, { bypassDiceMerge: true });
    }

    if (!this.isPotentialTrpgDiceMessage(msg)) {
      return false;
    }
    const key = this.getDiceMergeKey(roomId, msg.messageId);
    if (this.pendingDiceMergeMap.has(key)) {
      return true;
    }
    const timer = setTimeout(() => {
      const nextEntry = this.pendingDiceMergeMap.get(key);
      if (!nextEntry) {
        return;
      }
      this.pendingDiceMergeMap.delete(key);
      void this.renderMessage(nextEntry.message, nextEntry.roomId, nextEntry.syncToFile, { bypassDiceMerge: true });
    }, DICE_MERGE_WAIT_MS);
    this.pendingDiceMergeMap.set(key, { message, roomId, syncToFile, timer });
    return true;
  }

  /**
   * 渲染一条消息到指定房间
   */
  public async renderMessage(
    message: ChatMessageResponse,
    roomId?: number,
    syncToFile: boolean = true,
    options?: RenderMessageOptions,
  ): Promise<void> {
    const msg = message.message;
    const targetRoomId = roomId ?? msg.roomId ?? this.currentRoomId;

    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return;
    }

    if (!options?.bypassDiceMerge) {
      if ((msg.messageType as number) !== MESSAGE_TYPE.DICE) {
        await this.flushPendingDiceMergeForRoom(targetRoomId);
      }
      const merged = await this.tryRenderMergedTrpgDiceMessage(message, targetRoomId, syncToFile);
      if (merged) {
        return;
      }
    }

    // 确保该房间的场景已初始化
    if (!this.sceneContextMap.has(targetRoomId)) {
      await this.initRoomScene(targetRoomId);
    }

    const initialLineNumber = this.sceneContextMap.get(targetRoomId)?.lineNumber ?? 0;
    const finalizeMessageLineRange = () => {
      if (!msg.messageId) {
        return;
      }
      const context = this.sceneContextMap.get(targetRoomId);
      if (!context) {
        return;
      }
      const endLine = context.lineNumber;
      if (endLine <= initialLineNumber) {
        return;
      }
      const key = `${targetRoomId}_${msg.messageId}`;
      const existingRange = this.messageLineMap.get(key);
      const startLine = existingRange?.startLine ?? (initialLineNumber + 1);
      this.messageLineMap.set(key, { startLine, endLine });
    };

    // 获取该房间的立绘状态
    let spriteState = this.currentSpriteStateMap.get(targetRoomId);
    if (!spriteState) {
      spriteState = new Set();
      this.currentSpriteStateMap.set(targetRoomId, spriteState);
    }

    // 跳过已撤回消息
    if (msg.status === 1)
      return;

    const shouldClearBackground = hasClearBackgroundAnnotation(msg.annotations);
    const isBackgroundImageMessage = msg.messageType === MESSAGE_TYPE.IMG
      && isImageMessageBackground(msg.annotations, msg.extra?.imageMessage);
    if (shouldClearBackground && !isBackgroundImageMessage) {
      await this.appendLine(targetRoomId, "changeBg:none -next;", syncToFile);
    }
    const shouldClearImageFigure = hasClearImageAnnotation(msg.annotations);
    if (shouldClearImageFigure) {
      await this.appendLine(targetRoomId, `changeFigure:none -id=${IMAGE_MESSAGE_FIGURE_ID} -next;`, syncToFile);
    }

    // 处理背景图片消息
    if (msg.messageType === 2) {
      const imageMessage = msg.extra?.imageMessage;
      if (imageMessage) {
        const isBackground = isImageMessageBackground(msg.annotations, imageMessage);
        if (isBackground) {
          const bgFileName = await this.uploadBackground(imageMessage.url);
          if (bgFileName) {
            await this.appendLine(targetRoomId, `changeBg:${bgFileName} -next;`, syncToFile);
            if (syncToFile)
              this.sendSyncMessage(targetRoomId);
          }
        }
        // 处理解锁CG
        const unlockCg = hasAnnotation(msg.annotations, ANNOTATION_IDS.CG);
        if (unlockCg) {
          const cgFileName = await this.uploadBackground(imageMessage.url);
          if (cgFileName) {
            const cgName = imageMessage.fileName ? imageMessage.fileName.split(".")[0] : "CG";
            await this.appendLine(targetRoomId, `unlockCg:${cgFileName} -name=${cgName};`, syncToFile);
            if (syncToFile)
              this.sendSyncMessage(targetRoomId);
          }
        }
        // 普通图片：作为常驻展示图层（直到显式清除）
        if (!isBackground && !unlockCg && isImageMessageShown(msg.annotations)) {
          // 展示图固定中间位，忽略 figure.pos.*（更贴近 AVG 中置演出）
          const imageSlot = resolveFigureSlot("center");
          const figureFileName = await this.uploadImageFigure(imageMessage.url, imageMessage.fileName);
          if (figureFileName) {
            const transform = this.buildImageFigureTransformString(imageMessage, imageSlot.offsetX);
            const figureArgs = buildFigureArgs(IMAGE_MESSAGE_FIGURE_ID, imageSlot, transform);
            await this.appendLine(
              targetRoomId,
              `changeFigure:${figureFileName} ${figureArgs} -next;`,
              syncToFile,
            );
            const imageEnterAnimation = resolveImageFigureEnterAnimation(imageSlot);
            await this.appendLine(
              targetRoomId,
              `setAnimation:${imageEnterAnimation} -target=${IMAGE_MESSAGE_FIGURE_ID}${DEFAULT_KEEP_OFFSET_PART}${DEFAULT_RESTORE_TRANSFORM_PART} -next;`,
              syncToFile,
            );
            if (syncToFile)
              this.sendSyncMessage(targetRoomId);
          }
        }
      }
      finalizeMessageLineRange();
      return;
    }

    // 处理视频消息（Type 14）
    if ((msg.messageType as number) === MESSAGE_TYPE.VIDEO) {
      const messageExtra = msg.extra as ({
        videoMessage?: { url?: string; fileName?: string };
        url?: string;
        fileName?: string;
      } | undefined);
      const videoMsg = messageExtra?.videoMessage
        ?? (messageExtra?.url ? messageExtra : undefined);
      const url = videoMsg?.url;
      if (!url) {
        finalizeMessageLineRange();
        return;
      }

      const videoFileName = await this.uploadVideo(url, videoMsg?.fileName);
      if (videoFileName) {
        // 映射 message annotation：禁止跳过 => WebGAL -skipOff
        const skipOff = hasAnnotation(msg.annotations, ANNOTATION_IDS.VIDEO_SKIP_OFF);
        const skipOffPart = skipOff ? " -skipOff" : "";
        await this.appendLine(targetRoomId, `playVideo:${videoFileName}${skipOffPart};`, syncToFile);
        if (syncToFile)
          this.sendSyncMessage(targetRoomId);
      }

      finalizeMessageLineRange();
      return;
    }

    // 处理音频消息（BGM 或 音效）
    let soundMsg = msg.extra?.soundMessage;
    if (!soundMsg && msg.messageType === 7 && (msg.extra as any)?.url) {
      soundMsg = msg.extra as any;
    }

    if (soundMsg) {
      const url = soundMsg.url;
      if (!url) {
        finalizeMessageLineRange();
        return;
      }

      // 判断是 BGM 还是音效
      const isMarkedBgm = msg.content.includes("[播放BGM]") || soundMsg.purpose === "bgm";
      const isMarkedSE = msg.content.includes("[播放音效]") || soundMsg.purpose === "se";

      if (isMarkedBgm) {
        // 处理 BGM
        const bgmFileName = await this.uploadBgm(url);
        if (bgmFileName) {
          let command = `bgm:${bgmFileName}`;
          const vol = (soundMsg as any).volume;
          if (vol !== undefined) {
            command += ` -volume=${vol}`;
          }
          command += " -next;";
          await this.appendLine(targetRoomId, command, syncToFile);
          if (syncToFile)
            this.sendSyncMessage(targetRoomId);
        }
      }
      else if (isMarkedSE) {
        // 处理音效（playEffect）
        const seFileName = await this.uploadSoundEffect(url);
        if (seFileName) {
          let command = `playEffect:${seFileName}`;
          const vol = (soundMsg as any).volume;
          if (vol !== undefined) {
            command += ` -volume=${vol}`;
          }
          // 支持循环音效（通过 loopId）
          const loopId = (soundMsg as any).loopId;
          if (loopId) {
            command += ` -id=${loopId}`;
          }
          command += " -next;";
          await this.appendLine(targetRoomId, command, syncToFile);
          if (syncToFile)
            this.sendSyncMessage(targetRoomId);
        }
      }
      // 如果既不是 BGM 也不是音效，则跳过（默认不处理普通语音消息）
      finalizeMessageLineRange();
      return;
    }

    // 处理特效消息 (Type 8)
    if (msg.messageType === 8) {
      const effectMessage = msg.extra?.effectMessage;
      if (effectMessage && effectMessage.effectName) {
        let command: string;
        if (effectMessage.effectName === "none") {
          // 清除特效：使用 pixiInit 初始化，消除所有已应用的效果
          command = "pixiInit -next;";
        }
        else if (effectMessage.effectName === "clearBackground") {
          // 清除背景
          command = "changeBg:none -next;";
        }
        else if (effectMessage.effectName === "clearFigure") {
          // 清除立绘：清除所有位置的立绘
          for (const line of buildClearFigureLines({ includeLegacy: true, includeImage: true })) {
            await this.appendLine(targetRoomId, line, syncToFile);
          }
          finalizeMessageLineRange();
          if (syncToFile)
            this.sendSyncMessage(targetRoomId);
          return;
        }
        else {
          const effectName = effectMessage.effectName.trim();
          const effectSound = await this.resolveAnnotationEffectSound(effectName);
          if (effectSound) {
            await this.appendLine(targetRoomId, `playEffect:${effectSound.url} -next;`, syncToFile);
          }
          // 应用特效：pixiPerform:rain -next;
          command = `pixiPerform:${effectName} -next;`;
        }
        await this.appendLine(targetRoomId, command, syncToFile);
        if (syncToFile)
          this.sendSyncMessage(targetRoomId);
      }
      finalizeMessageLineRange();
      return;
    }

    // WebGAL 变量变更消息：转换为 setVar 并写入场景脚本（强制 -global 语义）
    if ((msg.messageType as number) === 11) {
      const payload = extractWebgalVarPayload(msg.extra);
      if (!payload) {
        finalizeMessageLineRange();
        return;
      }
      await this.appendLine(targetRoomId, buildWebgalSetVarLine(payload), syncToFile);
      if (syncToFile)
        this.sendSyncMessage(targetRoomId);
      finalizeMessageLineRange();
      return;
    }

    // WebGAL 指令消息：直接写入场景脚本
    // 约定：msg.content 是一行完整的 WebGAL 脚本（可包含分号结尾）
    if ((msg.messageType as number) === 10) {
      const commandLine = msg.content?.trim() ?? "";
      await this.appendLine(targetRoomId, commandLine, syncToFile, true);
      if (syncToFile)
        this.sendSyncMessage(targetRoomId);
      finalizeMessageLineRange();
      return;
    }

    // WebGAL 选择消息：转换为 choose 指令
    if ((msg.messageType as number) === MESSAGE_TYPE.WEBGAL_CHOOSE) {
      const payload = extractWebgalChoosePayload(msg.extra);
      if (!payload) {
        finalizeMessageLineRange();
        return;
      }
      const lines = buildWebgalChooseScriptLines(payload, msg.messageId ?? Date.now());
      for (const line of lines) {
        await this.appendLine(targetRoomId, line, syncToFile, true);
      }
      if (syncToFile)
        this.sendSyncMessage(targetRoomId);
      finalizeMessageLineRange();
      return;
    }

    const isDiceMessage = (msg.messageType as number) === MESSAGE_TYPE.DICE;
    const dicePayload = isDiceMessage ? extractWebgalDicePayload(msg.webgal) : null;
    const diceContent = isDiceMessage
      ? this.getDiceContentFromMessage(msg, dicePayload)
      : "";
    const hasDiceScriptLines = Boolean(isDiceMessage && dicePayload?.lines && dicePayload.lines.length > 0);
    const autoDiceMode = isDiceMessage
      ? (isLikelyAnkoDiceContent(diceContent)
          ? "anko"
          : (isLikelyTrpgDiceContent(diceContent) ? "trpg" : "narration"))
      : "narration";
    const diceModeFromPayloadRaw = isDiceMessage ? dicePayload?.mode : undefined;
    const shouldForceTrpgMode = isDiceMessage
      && autoDiceMode === "trpg"
      && diceModeFromPayloadRaw !== "anko"
      && diceModeFromPayloadRaw !== "script";
    const diceModeFromPayload = shouldForceTrpgMode ? "trpg" : diceModeFromPayloadRaw;
    const diceRenderMode = isDiceMessage
      ? (diceModeFromPayload === "script" && !hasDiceScriptLines
          ? autoDiceMode
          : (diceModeFromPayload ?? (hasDiceScriptLines ? "script" : autoDiceMode)))
      : null;

    if (isDiceMessage && diceRenderMode === "script" && hasDiceScriptLines) {
      const diceSound = this.resolveDiceSound(dicePayload, Boolean(dicePayload?.sound));
      if (diceSound) {
        const volumePart = typeof diceSound.volume === "number" ? ` -volume=${diceSound.volume}` : "";
        await this.appendLine(targetRoomId, `playEffect:${diceSound.url}${volumePart} -next;`, syncToFile);
      }
      for (const line of dicePayload?.lines ?? []) {
        await this.appendLine(targetRoomId, line, syncToFile, true);
      }
      finalizeMessageLineRange();
      if (syncToFile)
        this.sendSyncMessage(targetRoomId);
      return;
    }

    // 只处理文本消息（messageType === 1）、黑屏文字（messageType === 9）和骰子消息（messageType === 6）
    if (msg.messageType !== 1 && msg.messageType !== 9 && !isDiceMessage) {
      finalizeMessageLineRange();
      return;
    }

    // 判断消息类型：黑屏文字（messageType === 9）
    const isIntroText = (msg.messageType as number) === 9;
    const roleId = msg.roleId ?? 0;

    // 判断是否为旁白：roleId <= 0
    const isNarrator = roleId <= 0 || (isDiceMessage && diceRenderMode !== "dialog");

    // 获取角色信息
    const role = roleId > 0 ? this.roleMap.get(roleId) : undefined;
    // avatarId 优先使用消息上的 avatarId；若缺失则回退到角色本身的 avatarId（即“角色头像”）
    const shouldClearFigure = hasAnnotation(msg.annotations, ANNOTATION_IDS.FIGURE_CLEAR);

    // 清除立绘需要在当前消息脚本的最前面，确保在本条对话之前生效
    if (shouldClearFigure) {
      for (const line of buildClearFigureLines({ includeLegacy: true, includeImage: true })) {
        await this.appendLine(targetRoomId, line, syncToFile);
      }
      this.lastFigureSlotIdMap.delete(targetRoomId);
      this.renderedFigureStateMap.delete(targetRoomId);
    }

    const annotationEffect = getEffectFromAnnotations(msg.annotations);

    const messageAvatarId = msg.avatarId ?? 0;
    const roleAvatarId = Number(role?.avatarId ?? 0);
    const effectiveAvatarId = messageAvatarId > 0
      ? messageAvatarId
      : (roleAvatarId > 0 ? roleAvatarId : 0);
    // 优先使用自定义角色名
    const customRoleName = msg.customRoleName as string | undefined;
    const roleName = customRoleName || role?.roleName || `角色${msg.roleId ?? 0}`;

    // 获取头像信息
    const avatar = effectiveAvatarId > 0 ? this.getCachedRoleAvatar(effectiveAvatarId) : undefined;

    // 获取立绘文件名
    const spriteFileName = (effectiveAvatarId > 0 && roleId > 0)
      ? await this.getAndUploadSprite(effectiveAvatarId, roleId)
      : null;

    // 获取 annotations 中的立绘位置
    const voiceRenderSettings = msg.webgal?.voiceRenderSettings as {
      emotionVector?: number[];
      figureAnimation?: FigureAnimationSettings;
    } | undefined;

    const diceShowFigure = isDiceMessage
      ? (dicePayload?.showFigure ?? (roleId > 0))
      : undefined;
    const diceShowMiniAvatar = isDiceMessage
      ? (dicePayload?.showMiniAvatar ?? (roleId > 0))
      : undefined;

    // 立绘位置：只有当消息明确设置了有效的 figurePosition 时才显示立绘
    // autoFigureEnabled 为 true 时，没有设置立绘位置的消息会默认显示在左边
    // autoFigureEnabled 为 false（默认）时，没有设置立绘位置的消息不显示立绘
    const rawFigurePosition = getFigurePositionFromAnnotations(msg.annotations);
    // 只有 left/center/right 才是有效的立绘位置
    const isValidPosition = isFigurePosition(rawFigurePosition);
    const figurePosition = diceShowFigure === false
      ? undefined
      : (isValidPosition
          ? rawFigurePosition
          : (shouldClearFigure ? undefined : (this.autoFigureEnabled ? "left" : undefined)));

    const annotationFigureAnimation = getFigureAnimationFromAnnotations(msg.annotations);
    const figureAnimation = voiceRenderSettings?.figureAnimation
      ? { ...(annotationFigureAnimation ?? {}), ...voiceRenderSettings.figureAnimation }
      : annotationFigureAnimation;

    // 黑屏文字默认保持；如需不保持，添加“不暂停”标注（dialog.notend）
    const introHold = !hasAnnotation(msg.annotations, ANNOTATION_IDS.DIALOG_NOTEND);

    // 旁白和黑屏文字不需要显示立绘（骰子消息允许通过 showFigure 覆盖）
    // 如果 figurePosition 为 undefined，也不显示立绘
    const allowFigure = !isIntroText && (diceShowFigure === true || (!isNarrator && diceShowFigure !== false));
    const shouldShowFigure = allowFigure && !!figurePosition;

    if (shouldShowFigure && spriteFileName && figurePosition) {
      // 不再自动清除立绘，立绘需要手动清除
      // // 如果不是回复消息，则清除之前的立绘（单人发言模式）
      // // 如果是回复消息，则保留之前的立绘（多人对话模式）
      // if (!msg.replyMessageId) {
      //   // WebGAL 中不同位置的立绘是独立的，需要分别清除
      //   await this.appendLine(targetRoomId, "changeFigure:none -left -next;", syncToFile);
      //   await this.appendLine(targetRoomId, "changeFigure:none -center -next;", syncToFile);
      //   await this.appendLine(targetRoomId, "changeFigure:none -right -next;", syncToFile);
      // }
      const figureSlot = resolveFigureSlot(figurePosition);
      this.lastFigureSlotIdMap.set(targetRoomId, figureSlot.id);
      const transform = this.buildFigureTransformString(avatar, figureSlot.offsetX, 0);
      const renderedState = this.getRenderedFigureState(targetRoomId);
      const previous = renderedState.get(figureSlot.id);
      const shouldUpdateFigure
        = !previous
          || previous.fileName !== spriteFileName
          || previous.transform !== transform;
      if (shouldUpdateFigure) {
        const figureArgs = buildFigureArgs(figureSlot.id, figureSlot, transform);
        await this.appendLine(targetRoomId, `changeFigure:${spriteFileName} ${figureArgs} -next;`, syncToFile);
        renderedState.set(figureSlot.id, { fileName: spriteFileName, transform });
      }

      // 处理立绘动画（在立绘显示后）
      if (figureAnimation) {
        const animTarget = figureSlot.id; // 根据立绘位置自动推断目标

        // 进出场动画改为一次性播放（setAnimation）
        if (figureAnimation.enterAnimation || figureAnimation.exitAnimation) {
          const animationName = figureAnimation.enterAnimation ?? figureAnimation.exitAnimation;
          if (animationName) {
            await this.appendLine(
              targetRoomId,
              `setAnimation:${animationName} -target=${animTarget}${DEFAULT_KEEP_OFFSET_PART}${DEFAULT_RESTORE_TRANSFORM_PART} -next;`,
              syncToFile,
            );
          }
        }

        // 执行一次性动画（setAnimation）
        if (figureAnimation.animation) {
          await this.appendLine(
            targetRoomId,
            `setAnimation:${figureAnimation.animation} -target=${animTarget}${DEFAULT_KEEP_OFFSET_PART}${DEFAULT_RESTORE_TRANSFORM_PART} -next;`,
            syncToFile,
          );
        }
      }
    }
    if (annotationEffect) {
      const effectDuration = getEffectDurationMs(annotationEffect);
      const durationPart = effectDuration ? ` -duration=${effectDuration}` : "";
      const targetSlotId = figurePosition
        ? resolveFigureSlot(figurePosition).id
        : this.lastFigureSlotIdMap.get(targetRoomId);
      const targetPart = targetSlotId ? ` -target=${targetSlotId}` : "";
      const slotOffsetX = targetSlotId ? resolveSlotOffsetById(targetSlotId) : null;
      const screenX = slotOffsetX !== null ? EFFECT_SCREEN_WIDTH / 2 + slotOffsetX : null;
      const offsetPart = targetSlotId
        ? ` -offsetX=${EFFECT_OFFSET_X} -screenY=${EFFECT_SCREEN_Y}${screenX !== null ? ` -screenX=${screenX}` : ""}`
        : "";
      const annotationEffectSound = await this.resolveAnnotationEffectSound(annotationEffect);
      if (annotationEffectSound) {
        await this.appendLine(targetRoomId, `playEffect:${annotationEffectSound.url} -next;`, syncToFile);
      }
      await this.appendLine(
        targetRoomId,
        `pixiPerform:${annotationEffect}${targetPart}${offsetPart} -once${durationPart} -next;`,
        syncToFile,
      );
    }
    else if (isIntroText) {
      // 黑屏文字不再自动清除立绘，立绘需要手动清除
      // // 黑屏文字需要清除立绘
      // await this.appendLine(targetRoomId, "changeFigure:none -left -next;", syncToFile);
      // await this.appendLine(targetRoomId, "changeFigure:none -center -next;", syncToFile);
      // await this.appendLine(targetRoomId, "changeFigure:none -right -next;", syncToFile);
    }
    else if (!isNarrator && !isIntroText) {
      // 普通对话但不显示立绘时，不再自动清除立绘，立绘需要手动清除
      // // 普通对话但不显示立绘（figurePosition 为 undefined 或 spriteFileName 为空），清除之前的立绘
      // await this.appendLine(targetRoomId, "changeFigure:none -left -next;", syncToFile);
      // await this.appendLine(targetRoomId, "changeFigure:none -center -next;", syncToFile);
      // await this.appendLine(targetRoomId, "changeFigure:none -right -next;", syncToFile);
    }

    // 处理小头像（骰子消息可通过 showMiniAvatar 覆盖）
    const allowMiniAvatar = !isIntroText && (diceShowMiniAvatar === true || (!isNarrator && diceShowMiniAvatar !== false));
    if (allowMiniAvatar) {
      const miniAvatarFileName = this.miniAvatarEnabled
        ? (effectiveAvatarId > 0 && roleId > 0 ? await this.getAndUploadMiniAvatar(effectiveAvatarId, roleId) : null)
        : null;

      if (miniAvatarFileName) {
        await this.appendLine(targetRoomId, `miniAvatar:${miniAvatarFileName};`, syncToFile);
      }
      else if (this.miniAvatarEnabled) {
        // 如果启用了小头像但没有找到头像文件，则显示 none
        await this.appendLine(targetRoomId, "miniAvatar:none;", syncToFile);
      }
    }
    else if (this.miniAvatarEnabled) {
      // 旁白和黑屏文字清除小头像（仅在启用小头像功能时）
      await this.appendLine(targetRoomId, "miniAvatar:none;", syncToFile);
    }

    // 处理文本内容（支持 WebGAL 文本拓展语法）
    const renderContent = isDiceMessage ? diceContent : msg.content;
    const processedContent = TextEnhanceSyntax.processContent(renderContent);

    // 获取 voiceRenderSettings 中的情感向量
    const customEmotionVector = voiceRenderSettings?.emotionVector;

    // 获取对话参数：-notend 和 -concat（来自 annotations）
    const dialogNotend = hasAnnotation(msg.annotations, ANNOTATION_IDS.DIALOG_NOTEND);
    const dialogConcat = hasAnnotation(msg.annotations, ANNOTATION_IDS.DIALOG_CONCAT);
    const dialogNext = hasAnnotation(msg.annotations, ANNOTATION_IDS.DIALOG_NEXT);

    // 根据消息类型生成不同的指令
    if (isIntroText) {
      // 黑屏文字（intro）：intro:文字|换行文字|换行文字;
      // 使用 | 作为换行分隔符，将空格转换为换行
      const introContent = processedContent.replace(/ +/g, "|");
      const holdPart = introHold ? " -hold" : "";
      await this.appendLine(targetRoomId, `intro:${introContent}${holdPart};`, syncToFile);
    }
    else if (isDiceMessage) {
      const diceSound = this.resolveDiceSound(dicePayload, true);
      const useDialogDice = diceRenderMode === "dialog";
      const modePart = diceRenderMode ? ` -mode=${diceRenderMode}` : "";
      const appendDiceOverlayLine = async (content: string) => {
        if (!content.trim()) {
          return;
        }
        await this.appendLine(targetRoomId, `dice:${content}${modePart};`, syncToFile, true);
      };
      const appendDiceDialogLine = async (content: string, notend: boolean = false, concat: boolean = false) => {
        const notendPart = !isNarrator && notend ? " -notend" : "";
        const concatPart = !isNarrator && concat ? " -concat" : "";
        const nextPart = dialogNext ? " -next" : "";
        if (isNarrator) {
          await this.appendLine(targetRoomId, `:${content}${nextPart};`, syncToFile);
        }
        else {
          await this.appendLine(targetRoomId, `${roleName}: ${content}${notendPart}${concatPart}${nextPart};`, syncToFile);
        }
      };
      if (diceRenderMode === "trpg") {
        await this.appendLine(targetRoomId, `pixi:${TRPG_DICE_PIXI_EFFECT} -once -duration=950 -scale=1.08 -next;`, syncToFile);
      }

      if (diceRenderMode === "anko") {
        const diceSize = dicePayload?.diceSize ?? 100;
        const formatted = formatAnkoDiceMessage(diceContent, diceSize) ?? diceContent;
        const preview = stripDiceResultTokens(stripDiceHighlightTokens(formatted));
        const previewProcessed = TextEnhanceSyntax.processContent(preview);
        const finalProcessed = TextEnhanceSyntax.processContent(formatted);
        if (previewProcessed.trim() && previewProcessed !== finalProcessed) {
          if (useDialogDice) {
            await appendDiceDialogLine(previewProcessed);
          }
          else {
            await appendDiceOverlayLine(previewProcessed);
          }
        }
        if (diceSound) {
          const volumePart = typeof diceSound.volume === "number" ? ` -volume=${diceSound.volume}` : "";
          await this.appendLine(targetRoomId, `playEffect:${diceSound.url}${volumePart} -next;`, syncToFile);
        }
        if (useDialogDice) {
          await appendDiceDialogLine(finalProcessed, dialogNotend, dialogConcat);
        }
        else {
          await appendDiceOverlayLine(finalProcessed);
        }
      }
      else {
        const stepLines = splitDiceContentToSteps(diceContent);
        const shouldTwoStep = stepLines.length > 1 && dicePayload?.twoStep !== false;
        if (shouldTwoStep) {
          const previewRaw = stripDiceResultTokens(diceContent);
          const previewProcessed = TextEnhanceSyntax.processContent(previewRaw);
          const finalProcessed = TextEnhanceSyntax.processContent(diceContent);
          if (previewProcessed.trim() && previewProcessed !== finalProcessed) {
            if (useDialogDice) {
              await appendDiceDialogLine(previewProcessed);
            }
            else {
              await appendDiceOverlayLine(previewProcessed);
            }
            if (diceSound) {
              const volumePart = typeof diceSound.volume === "number" ? ` -volume=${diceSound.volume}` : "";
              await this.appendLine(targetRoomId, `playEffect:${diceSound.url}${volumePart} -next;`, syncToFile);
            }
          }
          else if (diceSound) {
            const volumePart = typeof diceSound.volume === "number" ? ` -volume=${diceSound.volume}` : "";
            await this.appendLine(targetRoomId, `playEffect:${diceSound.url}${volumePart} -next;`, syncToFile);
          }
          if (useDialogDice) {
            await appendDiceDialogLine(finalProcessed, dialogNotend, dialogConcat);
          }
          else {
            await appendDiceOverlayLine(finalProcessed);
          }
          finalizeMessageLineRange();
          if (syncToFile) {
            this.sendSyncMessage(targetRoomId);
          }
          return;
        }
        if (diceSound) {
          const volumePart = typeof diceSound.volume === "number" ? ` -volume=${diceSound.volume}` : "";
          await this.appendLine(targetRoomId, `playEffect:${diceSound.url}${volumePart} -next;`, syncToFile);
        }
        if (useDialogDice) {
          await appendDiceDialogLine(processedContent, dialogNotend, dialogConcat);
        }
        else {
          await appendDiceOverlayLine(processedContent);
        }
      }
    }
    else if (isNarrator) {
      // 旁白：冒号前留空，如 :这是一句旁白;
      // 旁白不显示立绘和小头像
      const nextPart = dialogNext ? " -next" : "";
      await this.appendLine(targetRoomId, `:${processedContent}${nextPart};`, syncToFile);
    }
    else {
      // 普通对话：角色名: 对话内容;
      // 生成语音（如果启用了 TTS）
      let vocalFileName: string | null = null;
      if (this.ttsConfig.enabled
        && renderContent.trim().length > 0
        && roleId !== 0 // 跳过系统角色
        && roleId !== 2 // 跳过骰娘
        && !isDiceMessage
        && !renderContent.startsWith(".") // 跳过指令
        && !renderContent.startsWith("。")) {
        vocalFileName = await this.generateAndUploadVocal(
          processedContent,
          roleId,
          avatar?.avatarTitle,
          customEmotionVector,
        );
      }

      // 添加对话行（包含语音和 -notend/-concat 参数）
      const vocalPart = vocalFileName ? ` -${vocalFileName}` : "";
      const notendPart = dialogNotend ? " -notend" : "";
      const concatPart = dialogConcat ? " -concat" : "";
      const nextPart = dialogNext ? " -next" : "";
      await this.appendLine(targetRoomId, `${roleName}: ${processedContent}${vocalPart}${notendPart}${concatPart}${nextPart};`, syncToFile);
    }

    finalizeMessageLineRange();

    // 自动跳转已关闭，保留写入但不主动跳转
    if (syncToFile) {
      this.sendSyncMessage(targetRoomId);
    }
  }

  /**
   * 批量渲染历史消息
   */
  public async renderHistory(messages: ChatMessageResponse[], roomId?: number): Promise<void> {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId)
      return;
    this.clearPendingDiceMerge(targetRoomId);

    // 批量处理消息，不进行文件同步和 WebSocket 同步
    for (let index = 0; index < messages.length; index += 1) {
      const current = messages[index];
      const next = messages[index + 1];
      if (next && this.canMergeTrpgDicePair(current, next)) {
        const mergedMessage = this.buildMergedTrpgDiceMessage(current, next);
        await this.renderMessage(mergedMessage, targetRoomId, false, { bypassDiceMerge: true });
        index += 1;
        continue;
      }
      await this.renderMessage(current, targetRoomId, false, { bypassDiceMerge: true });
    }

    // 历史渲染完成后，按流程图补齐该房间的分支跳转
    await this.appendWorkflowTransitionIfNeeded(targetRoomId);

    // 最后统一同步文件（自动跳转关闭时不会主动跳转）
    await this.syncContextToFile(targetRoomId);
    this.sendSyncMessage(targetRoomId);
  }

  /**
   * 清除指定房间的背景
   */
  public async clearBackground(roomId?: number): Promise<void> {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return;
    }

    // 确保该房间的场景已初始化
    if (!this.sceneContextMap.has(targetRoomId)) {
      await this.initRoomScene(targetRoomId);
    }

    await this.appendLine(targetRoomId, "changeBg:none -next;", true);
    this.sendSyncMessage(targetRoomId);
  }

  /**
   * 清除指定房间的所有立绘
   */
  public async clearFigure(roomId?: number): Promise<void> {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return;
    }

    // 确保该房间的场景已初始化
    if (!this.sceneContextMap.has(targetRoomId)) {
      await this.initRoomScene(targetRoomId);
    }

    for (const line of buildClearFigureLines({ includeLegacy: true, includeImage: true })) {
      await this.appendLine(targetRoomId, line, true);
    }
    this.renderedFigureStateMap.delete(targetRoomId);
    this.lastFigureSlotIdMap.delete(targetRoomId);
    this.sendSyncMessage(targetRoomId);
  }

  /**
   * 清空指定房间的场景并重新初始化
   */
  public async resetScene(roomId?: number): Promise<void> {
    if (roomId) {
      // 重置房间场景时，必须清理该房间的消息行号映射，否则后续跳转/更新会基于旧行号导致顺序错乱
      for (const key of Array.from(this.messageLineMap.keys())) {
        if (key.startsWith(`${roomId}_`)) {
          this.messageLineMap.delete(key);
        }
      }
      await this.initRoomScene(roomId);
      this.currentSpriteStateMap.set(roomId, new Set());
      this.renderedFigureStateMap.set(roomId, new Map());
      this.clearPendingDiceMerge(roomId);
      this.sendSyncMessage(roomId);
    }
    else {
      // 重置所有房间
      await this.initScene();
      this.currentSpriteStateMap.clear();
      this.renderedFigureStateMap.clear();
      this.messageLineMap.clear();
      this.clearPendingDiceMerge();
    }
  }

  /**
   * 获取指定房间的预览 URL
   */
  public getPreviewUrl(roomId?: number): string {
    const terreUrl = getTerreBaseUrl();
    if (roomId) {
      const sceneName = this.getSceneName(roomId);
      return `${terreUrl}/games/${this.gameName}/index.html?scene=${sceneName}.txt`;
    }
    return `${terreUrl}/games/${this.gameName}/index.html`;
  }

  /**
   * 获取连接状态
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * 获取游戏名称
   */
  public getGameName(): string {
    return this.gameName;
  }

  /**
   * 更新消息的渲染设置并重新渲染，然后跳转到该消息
   * @param message 要更新的消息（应该已经包含最新的 voiceRenderSettings）
   * @param roomId 房间 ID（可选，默认使用当前房间）
   * @param regenerateTTS 是否重新生成 TTS（当情感向量变化时设为 true）
   * @returns 是否操作成功
   */
  public async updateAndRerenderMessage(
    message: ChatMessageResponse,
    roomId?: number,
    regenerateTTS: boolean = false,
  ): Promise<boolean> {
    const msg = message.message;
    const targetRoomId = roomId ?? msg.roomId ?? this.currentRoomId;

    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return false;
    }

    // 如果需要重新生成 TTS，清除对应的缓存
    if (regenerateTTS && msg.content && msg.roleId && (msg.messageType as number) !== MESSAGE_TYPE.DICE) {
      const voiceRenderSettings = msg.webgal?.voiceRenderSettings as {
        emotionVector?: number[];
      } | undefined;
      const customEmotionVector = voiceRenderSettings?.emotionVector;
      const roleId = msg.roleId ?? 0;
      const role = roleId > 0 ? this.roleMap.get(roleId) : undefined;
      const messageAvatarId = msg.avatarId ?? 0;
      const roleAvatarId = Number(role?.avatarId ?? 0);
      const effectiveAvatarId = messageAvatarId > 0
        ? messageAvatarId
        : (roleAvatarId > 0 ? roleAvatarId : 0);
      const avatar = effectiveAvatarId > 0 ? this.getCachedRoleAvatar(effectiveAvatarId) : undefined;
      const emotionVector = customEmotionVector && customEmotionVector.length > 0
        ? customEmotionVector
        : (avatar?.avatarTitle ? this.convertAvatarTitleToEmotionVector(avatar.avatarTitle) : []);

      // 处理文本内容用于生成 cacheKey（支持 WebGAL 文本拓展语法）
      const processedContent = TextEnhanceSyntax.processContent(msg.content);

      const refVocal = this.voiceFileMap.get(msg.roleId);
      if (refVocal) {
        const cacheKey = this.simpleHash(`tts_${processedContent}_${refVocal.name}_${JSON.stringify(emotionVector)}`);
        this.uploadedVocalsMap.delete(cacheKey);
      }
    }

    // 获取该消息对应的行号范围
    const key = `${targetRoomId}_${msg.messageId}`;
    const lineRange = this.messageLineMap.get(key);

    if (!lineRange) {
      console.warn(`[RealtimeRenderer] 消息 ${msg.messageId} 未找到对应的行号，将使用 append 方式`);
      await this.renderMessage(message, targetRoomId, true, { bypassDiceMerge: true });
      return true;
    }

    // 获取场景上下文
    const context = this.sceneContextMap.get(targetRoomId);
    if (!context) {
      console.warn(`[RealtimeRenderer] 房间 ${targetRoomId} 的场景上下文不存在`);
      return false;
    }

    // 保存当前的行号和文本状态
    const savedLineNumber = context.lineNumber;
    const savedText = context.text;

    // 临时重置上下文，用于收集新渲染的内容
    context.lineNumber = 0;
    context.text = "";

    // 重新渲染该消息（不同步到文件）
    await this.renderMessage(message, targetRoomId, false, { bypassDiceMerge: true });

    // 获取新渲染的内容
    const newContent = context.text;
    const newLines = newContent.split("\n").filter(line => line.trim());

    // 恢复上下文状态
    context.lineNumber = savedLineNumber;
    context.text = savedText;

    // 使用替换方法更新指定行
    await this.replaceLinesInContext(
      targetRoomId,
      lineRange.startLine,
      lineRange.endLine,
      newLines,
      true,
    );

    // 更新消息的行号范围
    const newEndLine = lineRange.startLine + newLines.length - 1;
    this.messageLineMap.set(key, {
      startLine: lineRange.startLine,
      endLine: newEndLine,
    });

    // 跳转到该消息
    return this.jumpToMessage(msg.messageId, targetRoomId);
  }

  /**
   * 跳转到指定消息
   * @param messageId 消息 ID
   * @param roomId 房间 ID（可选，默认使用当前房间）
   * @returns 是否跳转成功
   */
  public jumpToMessage(messageId: number, roomId?: number): boolean {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return false;
    }

    const key = `${targetRoomId}_${messageId}`;
    const lineRange = this.messageLineMap.get(key);

    if (!lineRange) {
      console.warn(`[RealtimeRenderer] 消息 ${messageId} 未找到对应的行号`);
      return false;
    }

    const sceneName = this.getSceneName(targetRoomId);
    // 跳转到消息的起始行
    const msg = getAsyncMsg(`${sceneName}.txt`, lineRange.startLine);
    const msgStr = JSON.stringify(msg);

    if (this.isConnected && this.syncSocket?.readyState === WebSocket.OPEN) {
      this.syncSocket.send(msgStr);
      return true;
    }
    else {
      console.warn("[RealtimeRenderer] WebSocket 未连接，无法跳转");
      return false;
    }
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    this.annotationEffectSoundCache.clear();
    this.clearPendingDiceMerge();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.syncSocket) {
      this.syncSocket.close();
      this.syncSocket = null;
    }
    this.isConnected = false;
    this.onStatusChange = undefined;
  }
}
