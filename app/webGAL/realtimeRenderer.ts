import type { QueryClient } from "@tanstack/react-query";

/**
 * WebGAL 实时渲染器，负责将聊天消息写入场景并提供预览控制。
 */
import type { FigureAnimationSettings } from "@/types/voiceRenderTypes";
import type { WebgalDiceRenderPayload } from "@/types/webgalDice";

import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";
import { stripDiceResultTokens } from "@/components/common/dicer/diceTable";
import {
  ANNOTATION_IDS,
  getEffectDurationMs,
  getEffectFromAnnotations,
  getEffectSoundFileCandidates,
  getFigureAnimationFromAnnotations,
  getFigurePositionFromAnnotations,
  getSceneEffectFromAnnotations,
  hasAnnotation,
  hasClearBackgroundAnnotation,
  hasClearBgmAnnotation,
  hasClearImageAnnotation,
  hasMiniAvatarAnnotation,
  isImageMessageBackground,
  isImageMessageShown,
} from "@/types/messageAnnotations";
import { isFigurePosition, MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { buildWebgalChooseScriptLines, extractWebgalChoosePayload } from "@/types/webgalChoose";
import { extractWebgalDicePayload, isLikelyAnkoDiceContent, isLikelyTrpgDiceContent } from "@/types/webgalDice";
import { avatarOriginalUrl, avatarThumbUrl, avatarUrl as buildAvatarUrl, imageHighUrl, imageOriginalUrl } from "@/utils/mediaUrl";
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
import type { RealtimeAssetUploadContext } from "./realtimeRendererAssetUploads";
import type { RealtimeGameConfig, RealtimeTTSConfig } from "./realtimeRendererConfig";
import type {
  RoomFigureRenderState,
  RoomRenderStateSnapshot,
  RoomRenderStateStores,
} from "./realtimeRendererStateSnapshots";
import type { WorkflowGraph } from "./realtimeRendererWorkflow";

import { checkFileExist, getAsyncMsg, getFileExtensionFromUrl, readTextFile, uploadFile } from "./fileOperator";
import {
  collectMessageAssetWarmupPlan,
  DEFAULT_REALTIME_ASSET_CONCURRENCY,
  runWithConcurrencyLimit,
} from "./realtimeRenderAssetWarmup";
import {
  buildRoleAvatarCacheKey,
  deleteAvatarScopedCacheEntries,
  getAndUploadMiniAvatarAsset,
  getAndUploadSpriteAsset,
  uploadBackgroundAsset,
  uploadBgmAsset,
  uploadImageFigureAsset,
  uploadSoundEffectAsset,
  uploadSpriteAsset,
  uploadVideoAsset,
} from "./realtimeRendererAssetUploads";
import { DEFAULT_REALTIME_GAME_CONFIG } from "./realtimeRendererConfig";
import {
  buildMergedTrpgDiceMessage,
  canMergeTrpgDicePair,
  DEFAULT_DICE_SOUND_FILE,
  DEFAULT_DICE_SOUND_FOLDER,
  DICE_MERGE_WAIT_MS,
  getDiceContentFromMessage,
  isPotentialTrpgDiceMessage,
  TRPG_DICE_PIXI_EFFECT,
} from "./realtimeRendererDice";
import {
  buildClearFigureLines,
  buildFigureArgs,
  buildImageFigureTransformString,
  buildRoleFigureTransformString,
  buildSceneInitLines,
  DEFAULT_KEEP_OFFSET_PART,
  DEFAULT_RESTORE_TRANSFORM_PART,
  EFFECT_OFFSET_X,
  EFFECT_SCREEN_WIDTH,
  EFFECT_SCREEN_Y,
  IMAGE_MESSAGE_FIGURE_ID,

  resolveFigureSlot,
  resolveSlotOffsetById,
} from "./realtimeRendererFigureLayout";
import { getSafeExtensionFromUrl, hashString } from "./realtimeRendererFileNames";
import {
  parseGameConfig,
  sanitizeGameConfigValue,
  serializeGameConfig,
  upsertGameConfigEntry,
} from "./realtimeRendererGameConfig";
import { createSquarePngBlobFromUrl, uploadBlobToDirectory } from "./realtimeRendererImageAssets";
import {
  applyRoomRenderStateSnapshot,
  buildMessageStateKey,
  captureRoomRenderStateSnapshot,
  clearMessageRenderStateSnapshotsForRoom,
  getMessageRenderStateSnapshot,
  pruneRoomStateFromLine,
  recordMessageRenderStateSnapshot,
} from "./realtimeRendererStateSnapshots";
import { TextEnhanceSyntax } from "./realtimeRendererTextEnhance";
import {
  buildRealtimeTtsCacheKey,
  fetchVoiceFilesFromRoleMap,
  generateAndUploadVocal,
  resolveRealtimeTtsEmotionVector,
} from "./realtimeRendererTts";
import {
  parseWorkflowRoomMap,
  splitDiceContentToSteps,

} from "./realtimeRendererWorkflow";
import {
  buildStartSceneContent,
  buildWorkflowTransitionLineWithEnd,
  getWorkflowEndSceneName,
} from "./realtimeRendererWorkflowScenes";

export type { RealtimeGameConfig, RealtimeTTSConfig } from "./realtimeRendererConfig";

// 该标记文件用于判断 realtime_* 临时工程是否已经应用了当前模板/脚本升级。
// 不能使用点文件名；Terre 当前通过 Express serve-static 暴露 /games/...，
// dotfile 默认会返回 404，导致版本探测持续误判。
const REALTIME_GAME_ENGINE_MARKER_FILE = "tuanchat_engine_marker.txt";
const REALTIME_GAME_ENGINE_MARKER_VERSION = "realtime-trpg-dice-v2";
const REALTIME_RENDERER_INIT_ABORT_ERROR = "__tc_realtime_init_aborted__";
const DEFAULT_TYPING_SOUND_SE_FILE = "select07.mp3";
const BLACK_TEMPLATE_DIR = "WebGAL Black";
const BLACK_TEMPLATE_ID = "805c5f5a-8f52-461f-8931-613676d6a086";

function resolveRoleSpriteUrl(avatar: RoleAvatar | undefined): string {
  if (!avatar) {
    return "";
  }
    return imageHighUrl(avatar.spriteFileId)
    || imageOriginalUrl(avatar.spriteFileId)
    || buildAvatarUrl(avatar.avatarFileId)
    || avatarOriginalUrl(avatar.avatarFileId);
}

function resolveRoleMiniAvatarUrl(avatar: RoleAvatar | undefined): string {
  if (!avatar) {
    return "";
  }
  return avatarThumbUrl(avatar.avatarFileId)
    || buildAvatarUrl(avatar.avatarFileId)
    || avatarOriginalUrl(avatar.avatarFileId);
}

type RenderMessageOptions = {
  bypassDiceMerge?: boolean;
  skipBookkeeping?: boolean;
};

type PendingDiceMergeEntry = {
  message: ChatMessageResponse;
  roomId: number;
  syncToFile: boolean;
  timer: NodeJS.Timeout;
};

type RendererContext = {
  lineNumber: number;
  text: string;
};

type InitProgress = {
  phase: "idle" | "creating_game" | "uploading_sprites" | "uploading_backgrounds" | "creating_scenes" | "ready";
  current: number;
  total: number;
  message: string;
};

type SharedUploadCache = {
  uploadedSpritesMap: Map<string, string>;
  uploadedBackgroundsMap: Map<string, string>;
  uploadedImageFiguresMap: Map<string, string>;
  uploadedBgmsMap: Map<string, string>;
  uploadedVideosMap: Map<string, string>;
  uploadedMiniAvatarsMap: Map<string, string>;
  uploadedVocalsMap: Map<string, string>;
  uploadedSoundEffectsMap: Map<string, string>;
  annotationEffectSoundCache: Map<string, string>;
};

export class RealtimeRenderer {
  private static instance: RealtimeRenderer | null = null;
  private static sharedUploadCacheByGame = new Map<string, SharedUploadCache>();
  private disposed = false;
  private initEpoch = 0;
  private syncSocket: WebSocket | null = null;
  private isConnected = false;
  private spaceId: number;
  private spaceName: string = "";
  private gameName: string;
  private currentRoomId: number | null = null;
  private sceneContextMap = new Map<number, RendererContext>(); // roomId -> context
  private uploadedSpritesMap = new Map<string, string>(); // `${roleDir}_${avatarId}` -> `roleDir/fileName`
  private uploadedBackgroundsMap = new Map<string, string>(); // url -> fileName
  private uploadedImageFiguresMap = new Map<string, string>(); // url -> fileName
  private uploadedBgmsMap = new Map<string, string>(); // url -> fileName
  private uploadedVideosMap = new Map<string, string>(); // url -> fileName
  private uploadedMiniAvatarsMap = new Map<string, string>(); // `${roleDir}_${avatarId}` -> `roleDir/fileName`
  private uploadedSoundEffectsMap = new Map<string, string>();
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
  private renderedMiniAvatarVisibleMap = new Map<number, boolean>(); // roomId -> 最近一次下发的小头像是否可见
  private messageRenderStateSnapshotMap = new Map<string, RoomRenderStateSnapshot>(); // `${roomId}_${messageId}` -> 消息执行后的房间状态快照
  private annotationEffectSoundCache = new Map<string, string>(); // effectId -> 可用音效文件名
  private roomSyncBatchDepthMap = new Map<number, number>();
  private roomSyncPendingSet = new Set<number>();
  // 自动跳转已永久关闭，避免新增消息打断当前预览位置
  private readonly autoJumpEnabled = false;

  // 小头像相关
  private miniAvatarEnabled: boolean = false;

  // 自动填充立绘相关（没有设置立绘时是否自动填充左侧立绘）
  private autoFigureEnabled: boolean = true;
  // 游戏配置相关（写入 config.txt）
  private gameConfig: RealtimeGameConfig = DEFAULT_REALTIME_GAME_CONFIG;
  private workflowGraph: WorkflowGraph = { startRoomIds: [], links: {}, endNodeIds: [], endNodeIncomingRoomIds: {} };
  private readyWorkflowEndSceneIds = new Set<number>();

  // TTS 相关
  private ttsConfig: RealtimeTTSConfig = { enabled: false };
  private voiceFileMap = new Map<number, File>(); // roleId -> 参考音频文件
  private uploadedVocalsMap = new Map<string, string>(); // hash -> fileName (已上传的语音缓存)
  private ttsGeneratingMap = new Map<string, Promise<string | null>>(); // hash -> Promise (正在生成的语音，避免重复生成)

  private constructor(spaceId: number) {
    this.spaceId = spaceId;
    this.gameName = `realtime_${spaceId}`;
    const sharedUploadCache = RealtimeRenderer.getSharedUploadCache(this.gameName);
    this.uploadedSpritesMap = sharedUploadCache.uploadedSpritesMap;
    this.uploadedBackgroundsMap = sharedUploadCache.uploadedBackgroundsMap;
    this.uploadedImageFiguresMap = sharedUploadCache.uploadedImageFiguresMap;
    this.uploadedBgmsMap = sharedUploadCache.uploadedBgmsMap;
    this.uploadedVideosMap = sharedUploadCache.uploadedVideosMap;
    this.uploadedMiniAvatarsMap = sharedUploadCache.uploadedMiniAvatarsMap;
    this.uploadedSoundEffectsMap = sharedUploadCache.uploadedSoundEffectsMap;
    this.uploadedVocalsMap = sharedUploadCache.uploadedVocalsMap;
    this.annotationEffectSoundCache = sharedUploadCache.annotationEffectSoundCache;
  }

  private static getSharedUploadCache(gameName: string): SharedUploadCache {
    const existing = RealtimeRenderer.sharedUploadCacheByGame.get(gameName);
    if (existing) {
      return existing;
    }
    const created: SharedUploadCache = {
      uploadedSpritesMap: new Map<string, string>(),
      uploadedBackgroundsMap: new Map<string, string>(),
      uploadedImageFiguresMap: new Map<string, string>(),
      uploadedBgmsMap: new Map<string, string>(),
      uploadedVideosMap: new Map<string, string>(),
      uploadedMiniAvatarsMap: new Map<string, string>(),
      uploadedVocalsMap: new Map<string, string>(),
      uploadedSoundEffectsMap: new Map<string, string>(),
      annotationEffectSoundCache: new Map<string, string>(),
    };
    RealtimeRenderer.sharedUploadCacheByGame.set(gameName, created);
    return created;
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

  private getDesiredBaseTemplate(): "none" | "black" {
    return this.gameConfig.baseTemplate === "black" ? "black" : "none";
  }

  private isBlackTemplateConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") {
      return false;
    }
    const templateConfig = config as { id?: unknown; name?: unknown };
    const id = String(templateConfig.id ?? "").trim().toLowerCase();
    if (id && id === BLACK_TEMPLATE_ID.toLowerCase()) {
      return true;
    }
    const name = String(templateConfig.name ?? "").trim().toLowerCase();
    return name.includes("black");
  }

  private async getCurrentTemplatePreset(): Promise<"none" | "black" | null> {
    try {
      const rawTemplateConfig = await readTextFile(this.gameName, "template/template.json");
      const parsedTemplateConfig = JSON.parse(rawTemplateConfig) as unknown;
      return this.isBlackTemplateConfig(parsedTemplateConfig) ? "black" : "none";
    }
    catch {
      return null;
    }
  }

  private async createGameWithTemplate(templatePreset: "none" | "black"): Promise<void> {
    const createGamePayload: {
      gameDir: string;
      gameName: string;
      templateDir?: string;
    } = {
      gameDir: this.gameName,
      gameName: this.gameName,
    };
    if (templatePreset === "black") {
      createGamePayload.templateDir = BLACK_TEMPLATE_DIR;
    }

    const createResult = await getTerreApis().manageGameControllerCreateGame(createGamePayload);
    if (createResult?.status !== "success") {
      throw new Error(`[RealtimeRenderer] 创建游戏失败: ${this.gameName}`);
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
    const validEndNodeIds = new Set(this.workflowGraph.endNodeIds);
    this.readyWorkflowEndSceneIds.forEach((endNodeId) => {
      if (!validEndNodeIds.has(endNodeId)) {
        this.readyWorkflowEndSceneIds.delete(endNodeId);
      }
    });
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

  private clearUploadCaches(): void {
    this.uploadedSpritesMap.clear();
    this.uploadedBackgroundsMap.clear();
    this.uploadedImageFiguresMap.clear();
    this.uploadedBgmsMap.clear();
    this.uploadedVideosMap.clear();
    this.uploadedMiniAvatarsMap.clear();
    this.uploadedSoundEffectsMap.clear();
    this.uploadedVocalsMap.clear();
    this.annotationEffectSoundCache.clear();
  }

  private isRoomSyncDeferred(roomId: number): boolean {
    return (this.roomSyncBatchDepthMap.get(roomId) ?? 0) > 0;
  }

  private async runWithRoomSyncBatch<T>(
    roomId: number,
    syncToFile: boolean,
    action: () => Promise<T>,
  ): Promise<T> {
    if (!syncToFile) {
      return action();
    }

    this.roomSyncBatchDepthMap.set(roomId, (this.roomSyncBatchDepthMap.get(roomId) ?? 0) + 1);
    try {
      return await action();
    }
    finally {
      const nextDepth = (this.roomSyncBatchDepthMap.get(roomId) ?? 1) - 1;
      if (nextDepth > 0) {
        this.roomSyncBatchDepthMap.set(roomId, nextDepth);
      }
      else {
        this.roomSyncBatchDepthMap.delete(roomId);
        if (this.roomSyncPendingSet.has(roomId)) {
          this.roomSyncPendingSet.delete(roomId);
          await this.syncContextToFile(roomId);
        }
      }
    }
  }

  private getRoomRenderStateStores(): RoomRenderStateStores {
    return {
      currentSpriteStateMap: this.currentSpriteStateMap,
      lastFigureSlotIdMap: this.lastFigureSlotIdMap,
      messageLineMap: this.messageLineMap,
      messageRenderStateSnapshotMap: this.messageRenderStateSnapshotMap,
      renderedFigureStateMap: this.renderedFigureStateMap,
      renderedMiniAvatarVisibleMap: this.renderedMiniAvatarVisibleMap,
    };
  }

  private captureRoomRenderStateSnapshot(roomId: number): RoomRenderStateSnapshot {
    return captureRoomRenderStateSnapshot(this.getRoomRenderStateStores(), roomId);
  }

  private applyRoomRenderStateSnapshot(roomId: number, snapshot?: RoomRenderStateSnapshot): void {
    applyRoomRenderStateSnapshot(this.getRoomRenderStateStores(), roomId, snapshot);
  }

  private recordMessageRenderStateSnapshot(roomId: number, messageId: number): void {
    recordMessageRenderStateSnapshot(this.getRoomRenderStateStores(), roomId, messageId);
  }

  private getMessageRenderStateSnapshot(roomId: number, messageId: number): RoomRenderStateSnapshot | undefined {
    return getMessageRenderStateSnapshot(this.getRoomRenderStateStores(), roomId, messageId);
  }

  private clearMessageRenderStateSnapshotsForRoom(roomId: number): void {
    clearMessageRenderStateSnapshotsForRoom(this.getRoomRenderStateStores(), roomId);
  }

  private pruneRoomStateFromLine(roomId: number, startLine: number): void {
    pruneRoomStateFromLine(this.getRoomRenderStateStores(), roomId, startLine);
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
    const initEpoch = this.initEpoch + 1;
    this.initEpoch = initEpoch;
    const ensureInitActive = () => {
      if (this.disposed || initEpoch !== this.initEpoch) {
        throw new Error(REALTIME_RENDERER_INIT_ABORT_ERROR);
      }
    };

    try {
      ensureInitActive();
      this.annotationEffectSoundCache.clear();
      this.updateProgress({ phase: "creating_game", message: "正在创建游戏..." });
      const desiredBaseTemplate = this.getDesiredBaseTemplate();

      // 检查游戏是否存在
      let gameExists = await checkGameExist(this.gameName);
      ensureInitActive();
      console.warn(`[RealtimeRenderer] 游戏 ${this.gameName} 存在: ${gameExists}`);

      if (gameExists) {
        const currentTemplatePreset = await this.getCurrentTemplatePreset();
        ensureInitActive();

        if (desiredBaseTemplate === "black" && currentTemplatePreset !== "black") {
          await getTerreApis().manageTemplateControllerApplyTemplateToGame({
            gameDir: this.gameName,
            templateDir: BLACK_TEMPLATE_DIR,
          });
          ensureInitActive();
          console.warn(`[RealtimeRenderer] 已切换到底层模板: black`);
        }
        else if (desiredBaseTemplate === "none" && currentTemplatePreset === "black") {
          // 目标是 none 且当前为 black 时，需要重建 realtime 工程才能恢复默认模板。
          await getTerreApis().manageGameControllerDelete({ gameName: this.gameName });
          ensureInitActive();
          this.clearUploadCaches();
          gameExists = false;
          console.warn(`[RealtimeRenderer] 已按模板配置重建游戏: ${this.gameName}`);
        }
      }

      // realtime_* 为临时渲染工程。该标记用于识别是否已应用当前模板/脚本升级（例如 TRPG 骰子渲染升级）。
      if (gameExists) {
        const markerMatched = await this.hasExpectedEngineMarker();
        if (!markerMatched) {
          console.warn(`[RealtimeRenderer] 未命中当前 realtime 模板标记，保留现有游戏不自动重建: ${this.gameName}`);
        }
      }

      // 创建游戏实例（如果不存在）
      if (!gameExists) {
        console.warn(`[RealtimeRenderer] 正在创建游戏: ${this.gameName}`);
        this.clearUploadCaches();
        await this.createGameWithTemplate(desiredBaseTemplate);
        ensureInitActive();
        console.warn(`[RealtimeRenderer] 游戏创建成功`);
      }

      await this.syncGameConfigWithRoomContext();
      ensureInitActive();

      await this.writeEngineMarker();
      ensureInitActive();
      this.readyWorkflowEndSceneIds.clear();

      // 初始化场景
      await this.initScene();
      ensureInitActive();

      // 全量预加载立绘资源
      await this.preloadSprites(ensureInitActive);
      ensureInitActive();

      // 连接 WebSocket
      this.connectWebSocket();
      ensureInitActive();

      this.updateProgress({ phase: "ready", message: "初始化完成" });
      return true;
    }
    catch (error) {
      if (error instanceof Error && error.message === REALTIME_RENDERER_INIT_ABORT_ERROR) {
        console.warn("[RealtimeRenderer] 初始化已取消");
        return false;
      }
      console.error("[RealtimeRenderer] 初始化失败:", error);
      this.onStatusChange?.("error");
      return false;
    }
  }

  /**
   * 全量预加载所有角色的立绘资源
   */
  private async preloadSprites(ensureInitActive: () => void): Promise<void> {
    ensureInitActive();
    const preloadTasks: Array<{
      kind: "sprite" | "mini-avatar";
      roleId: number;
      avatarId: number;
      run: () => Promise<void>;
    }> = [];
    const seenSpriteTargets = new Set<string>();
    const seenMiniAvatarTargets = new Set<string>();

    for (const [roleId, role] of this.roleMap.entries()) {
      const avatarId = Number(role.avatarId ?? 0);
      if (avatarId <= 0) {
        continue;
      }
      const avatar = this.getCachedRoleAvatar(avatarId);
      if (!avatar) {
        continue;
      }
      const spriteUrl = resolveRoleSpriteUrl(avatar);
      const targetKey = buildRoleAvatarCacheKey(roleId, avatarId);
      if (spriteUrl && !seenSpriteTargets.has(targetKey) && !this.uploadedSpritesMap.has(targetKey)) {
        seenSpriteTargets.add(targetKey);
        preloadTasks.push({
          kind: "sprite",
          roleId,
          avatarId,
          run: async () => {
            await this.uploadSprite(avatarId, spriteUrl, roleId);
          },
        });
      }

      if (this.miniAvatarEnabled && resolveRoleMiniAvatarUrl(avatar) && !seenMiniAvatarTargets.has(targetKey) && !this.uploadedMiniAvatarsMap.has(targetKey)) {
        seenMiniAvatarTargets.add(targetKey);
        preloadTasks.push({
          kind: "mini-avatar",
          roleId,
          avatarId,
          run: async () => {
            await this.getAndUploadMiniAvatar(avatarId, roleId);
          },
        });
      }
    }

    if (preloadTasks.length === 0) {
      console.warn("[RealtimeRenderer] 没有角色资源需要预加载");
      return;
    }

    this.updateProgress({
      phase: "uploading_sprites",
      current: 0,
      total: preloadTasks.length,
      message: `正在预加载角色资源 (0/${preloadTasks.length})`,
    });

    let completedCount = 0;
    await runWithConcurrencyLimit(preloadTasks, DEFAULT_REALTIME_ASSET_CONCURRENCY, async (task) => {
      ensureInitActive();
      try {
        await task.run();
        ensureInitActive();
        console.warn(`[RealtimeRenderer] 预加载${task.kind === "sprite" ? "立绘" : "小头像"}: role=${task.roleId}, avatar=${task.avatarId}`);
      }
      catch (error) {
        if (error instanceof Error && error.message === REALTIME_RENDERER_INIT_ABORT_ERROR) {
          throw error;
        }
        console.error(`[RealtimeRenderer] 预加载${task.kind === "sprite" ? "立绘" : "小头像"}失败:`, error);
      }
      finally {
        completedCount += 1;
        ensureInitActive();
        this.updateProgress({
          phase: "uploading_sprites",
          current: completedCount,
          total: preloadTasks.length,
          message: `正在预加载角色资源 (${completedCount}/${preloadTasks.length})`,
        });
      }
    });
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

  private async ensureWorkflowEndScenes(): Promise<void> {
    for (const endNodeId of this.workflowGraph.endNodeIds) {
      if (this.readyWorkflowEndSceneIds.has(endNodeId)) {
        continue;
      }
      const sceneName = getWorkflowEndSceneName(endNodeId);
      try {
        await getTerreApis().manageGameControllerEditTextFile({
          path: `games/${this.gameName}/game/scene/${sceneName}.txt`,
          textFile: "end;",
        });
        this.readyWorkflowEndSceneIds.add(endNodeId);
      }
      catch (error) {
        console.warn(`[RealtimeRenderer] 创建结束场景失败: ${sceneName}`, error);
      }
    }
  }

  private async appendWorkflowTransitionIfNeeded(roomId: number): Promise<void> {
    await this.ensureWorkflowEndScenes();
    const transitionLine = buildWorkflowTransitionLineWithEnd({
      roomId,
      workflowGraph: this.workflowGraph,
      roomMap: this.roomMap,
      getSceneName: targetRoomId => this.getSceneName(targetRoomId),
    });
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
    upsertGameConfigEntry(configEntries, "Allow_Full_Settings", this.gameConfig.allowOpenFullSettings ? "true" : "false");
    upsertGameConfigEntry(configEntries, "Enable_Speaker_Focus", this.gameConfig.speakerFocusEnabled ? "true" : "false");
    upsertGameConfigEntry(configEntries, "Default_Language", this.gameConfig.defaultLanguage);
    upsertGameConfigEntry(configEntries, "Enable_Appreciation", this.gameConfig.enableAppreciation ? "true" : "false");
    upsertGameConfigEntry(configEntries, "TypingSoundEnabled", this.gameConfig.typingSoundEnabled ? "true" : "false");
    const typingSoundInterval = Math.max(0.1, Number(this.gameConfig.typingSoundInterval || 1.5));
    const typingSoundPunctuationPause = Math.max(0, Math.floor(Number(this.gameConfig.typingSoundPunctuationPause || 100)));
    upsertGameConfigEntry(configEntries, "TypingSoundInterval", String(typingSoundInterval));
    upsertGameConfigEntry(configEntries, "TypingSoundPunctuationPause", String(typingSoundPunctuationPause));

    const avatarUrl = avatarOriginalUrl(primaryRoom?.avatarFileId) || buildAvatarUrl(primaryRoom?.avatarFileId);
    const titleImageUrl = String(this.gameConfig.titleImageUrl ?? "").trim();
    const originalTitleImageUrl = String(this.gameConfig.originalTitleImageUrl ?? this.gameConfig.titleImageUrl ?? "").trim();
    const startupLogoUrl = String(this.gameConfig.startupLogoUrl ?? "").trim();
    const originalStartupLogoUrl = String(this.gameConfig.originalStartupLogoUrl ?? this.gameConfig.startupLogoUrl ?? "").trim();
    const typingSoundSeUrl = String(this.gameConfig.typingSoundSeUrl ?? "").trim();
    const roomId = Number(primaryRoom?.roomId ?? 0);

    if (titleImageUrl) {
      try {
        const titleSourceUrl = originalTitleImageUrl || titleImageUrl;
        const titleExt = getFileExtensionFromUrl(titleSourceUrl, "webp");
        const titleImageName = `custom_title_${hashString(titleSourceUrl)}.${titleExt}`;
        const uploadedTitleImage = await uploadFile(
          titleSourceUrl,
          `games/${this.gameName}/game/background/`,
          titleImageName,
        );
        upsertGameConfigEntry(configEntries, "Title_img", uploadedTitleImage);
      }
      catch (error) {
        console.warn("[RealtimeRenderer] 同步标题背景图 URL 为 Title_img 失败:", error);
      }
    }
    else if (this.gameConfig.coverFromRoomAvatarEnabled && avatarUrl) {
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

    if (startupLogoUrl) {
      try {
        const logoSourceUrl = originalStartupLogoUrl || startupLogoUrl;
        const logoExt = getFileExtensionFromUrl(logoSourceUrl, "webp");
        const logoName = `custom_logo_${hashString(logoSourceUrl)}.${logoExt}`;
        const uploadedLogo = await uploadFile(
          logoSourceUrl,
          `games/${this.gameName}/game/background/`,
          logoName,
        );
        upsertGameConfigEntry(configEntries, "Game_Logo", uploadedLogo);
      }
      catch (error) {
        console.warn("[RealtimeRenderer] 同步启动图 URL 为 Game_Logo 失败:", error);
      }
    }
    else if (this.gameConfig.startupLogoFromRoomAvatarEnabled && avatarUrl) {
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

    if (typingSoundSeUrl) {
      try {
        const seExt = getSafeExtensionFromUrl(typingSoundSeUrl, "webm");
        const seFileName = `typing_se_${hashString(typingSoundSeUrl)}.${seExt}`;
        const uploadedSeFile = await uploadFile(
          typingSoundSeUrl,
          `games/${this.gameName}/game/se/`,
          seFileName,
        );
        upsertGameConfigEntry(configEntries, "TypingSoundSe", uploadedSeFile);
      }
      catch (error) {
        console.warn("[RealtimeRenderer] 同步打字音效为 TypingSoundSe 失败:", error);
      }
    }
    else {
      upsertGameConfigEntry(configEntries, "TypingSoundSe", DEFAULT_TYPING_SOUND_SE_FILE);
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
      this.renderedMiniAvatarVisibleMap.delete(roomId);
      this.lastFigureSlotIdMap.delete(roomId);
      this.clearMessageRenderStateSnapshotsForRoom(roomId);
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
    const startContent = buildStartSceneContent({
      rooms,
      workflowGraph: this.workflowGraph,
      roomMap: this.roomMap,
      getSceneName: roomId => this.getSceneName(roomId),
    });

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
    if (this.disposed) {
      return;
    }
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
        if (this.disposed) {
          return;
        }
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
        if (this.disposed) {
          return;
        }
        console.warn("WebGAL 实时渲染 WebSocket 已断开");
        this.isConnected = false;
        this.onStatusChange?.("disconnected");

        // 自动重连
        this.scheduleReconnect();
      };

      this.syncSocket.onerror = (error) => {
        if (this.disposed) {
          return;
        }
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
    if (this.disposed) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      if (this.disposed) {
        return;
      }
      console.warn("尝试重连 WebGAL WebSocket...");
      this.connectWebSocket();
    }, 3000);
  }

  /**
   * 发送同步消息到指定房间的场景（自动跳转关闭时不发送）
   */
  private sendSyncMessage(roomId: number): void {
    if (this.disposed) {
      return;
    }
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
    if (this.disposed) {
      return;
    }
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
      if (this.isRoomSyncDeferred(roomId)) {
        this.roomSyncPendingSet.add(roomId);
      }
      else {
        await this.syncContextToFile(roomId);
      }
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
      if (this.isRoomSyncDeferred(roomId)) {
        this.roomSyncPendingSet.add(roomId);
      }
      else {
        await this.syncContextToFile(roomId);
      }
    }
  }

  private async syncContextToFile(roomId: number): Promise<void> {
    if (this.disposed) {
      return;
    }
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

  private getAssetUploadContext(): RealtimeAssetUploadContext {
    return {
      gameName: this.gameName,
      uploadedSpritesMap: this.uploadedSpritesMap,
      uploadedBackgroundsMap: this.uploadedBackgroundsMap,
      uploadedImageFiguresMap: this.uploadedImageFiguresMap,
      uploadedBgmsMap: this.uploadedBgmsMap,
      uploadedVideosMap: this.uploadedVideosMap,
      uploadedMiniAvatarsMap: this.uploadedMiniAvatarsMap,
      uploadedSoundEffectsMap: this.uploadedSoundEffectsMap,
    };
  }

  public invalidateAvatarCaches(avatarId: number): void {
    deleteAvatarScopedCacheEntries(this.uploadedSpritesMap, avatarId);
    deleteAvatarScopedCacheEntries(this.uploadedMiniAvatarsMap, avatarId);
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
    await fetchVoiceFilesFromRoleMap(this.roleMap, this.voiceFileMap);
  }

  /**
   * 上传立绘
   */
  private async uploadSprite(avatarId: number, spriteUrl: string, roleId: number): Promise<string | null> {
    return uploadSpriteAsset(this.getAssetUploadContext(), avatarId, spriteUrl, roleId);
  }

  /**
   * 上传背景
   */
  private async uploadBackground(url: string): Promise<string | null> {
    return uploadBackgroundAsset(this.getAssetUploadContext(), url);
  }

  /**
   * 上传图片消息（作为常驻展示图层）
   */
  private async uploadImageFigure(url: string, fileName?: string): Promise<string | null> {
    return uploadImageFigureAsset(this.getAssetUploadContext(), url, fileName);
  }

  /**
   * 上传视频资源
   */
  private async uploadVideo(url: string, fileName?: string): Promise<string | null> {
    return uploadVideoAsset(this.getAssetUploadContext(), url, fileName);
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
    return uploadBgmAsset(this.getAssetUploadContext(), url);
  }

  /**
   * 上传音效到 vocal 文件夹
   */
  private async uploadSoundEffect(url: string): Promise<string | null> {
    return uploadSoundEffectAsset(this.getAssetUploadContext(), url);
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
    return getAndUploadSpriteAsset(
      this.getAssetUploadContext(),
      avatarId,
      roleId,
      targetAvatarId => this.getCachedRoleAvatar(targetAvatarId),
    );
  }

  /**
   * 获取小头像文件名（如果未上传则上传）
   */
  private async getAndUploadMiniAvatar(avatarId: number, roleId: number): Promise<string | null> {
    return getAndUploadMiniAvatarAsset(
      this.getAssetUploadContext(),
      avatarId,
      roleId,
      targetAvatarId => this.getCachedRoleAvatar(targetAvatarId),
    );
  }

  public async preloadMessageAssets(messages: ChatMessageResponse[]): Promise<void> {
    if (this.disposed || messages.length === 0) {
      return;
    }

    const warmupPlan = collectMessageAssetWarmupPlan(messages, this.roleMap, {
      autoFigureEnabled: this.autoFigureEnabled,
      miniAvatarEnabled: this.miniAvatarEnabled,
    });

    const warmupTasks = [
      ...warmupPlan.spriteTargets.map(target => ({
        kind: "sprite" as const,
        target,
      })),
      ...warmupPlan.miniAvatarTargets.map(target => ({
        kind: "mini-avatar" as const,
        target,
      })),
    ];

    await runWithConcurrencyLimit(warmupTasks, DEFAULT_REALTIME_ASSET_CONCURRENCY, async ({ kind, target }) => {
      if (this.disposed) {
        return;
      }
      if (kind === "sprite") {
        await this.getAndUploadSprite(target.avatarId, target.roleId);
        return;
      }
      await this.getAndUploadMiniAvatar(target.avatarId, target.roleId);
    });
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
      .sort((left, right) => compareChatMessageResponsesByOrder(left.message, right.message));
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
      if (canMergeTrpgDicePair(pendingEntry.message, message)) {
        const mergedMessage = buildMergedTrpgDiceMessage(pendingEntry.message, message);
        await this.renderMessage(mergedMessage, roomId, syncToFile, { bypassDiceMerge: true });
        return true;
      }
      await this.renderMessage(pendingEntry.message, pendingEntry.roomId, pendingEntry.syncToFile, { bypassDiceMerge: true });
    }

    if (!isPotentialTrpgDiceMessage(msg)) {
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
    if (this.disposed) {
      return;
    }
    const msg = message.message;
    const targetRoomId = roomId ?? msg.roomId ?? this.currentRoomId;

    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return;
    }

    const renderImpl = async (): Promise<void> => {
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
        if (options?.skipBookkeeping) {
          return;
        }
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
        this.recordMessageRenderStateSnapshot(targetRoomId, msg.messageId);
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
      const shouldClearBgm = hasClearBgmAnnotation(msg.annotations);
      if (shouldClearBgm) {
        await this.appendLine(targetRoomId, "bgm:none -next;", syncToFile);
      }
      const shouldClearImageFigure = hasClearImageAnnotation(msg.annotations);
      if (shouldClearImageFigure) {
        await this.appendLine(targetRoomId, `changeFigure:none -id=${IMAGE_MESSAGE_FIGURE_ID} -next;`, syncToFile);
      }

      // 处理背景图片消息
      if (msg.messageType === 2) {
        const imageMessage = msg.extra?.imageMessage;
        if (imageMessage) {
          const imageSourceUrl = String(imageMessage.originalUrl ?? imageMessage.url ?? "").trim();
          const isBackground = isImageMessageBackground(msg.annotations, imageMessage);
          if (isBackground) {
            const bgFileName = await this.uploadBackground(imageSourceUrl);
            if (bgFileName) {
              await this.appendLine(targetRoomId, `changeBg:${bgFileName} -next;`, syncToFile);
              if (syncToFile)
                this.sendSyncMessage(targetRoomId);
            }
          }
          // 处理解锁CG
          const unlockCg = hasAnnotation(msg.annotations, ANNOTATION_IDS.CG);
          if (unlockCg) {
            const cgFileName = await this.uploadBackground(imageSourceUrl);
            if (cgFileName) {
              const cgName = imageMessage.fileName ? imageMessage.fileName.split(".")[0] : "CG";
              await this.appendLine(targetRoomId, `unlockCg:${cgFileName} -name=${cgName};`, syncToFile);
              if (syncToFile)
                this.sendSyncMessage(targetRoomId);
            }
          }
          // 普通图片：作为常驻展示图层（直到显式清除）
          if (!isBackground && !unlockCg && isImageMessageShown(msg.annotations)) {
          // 展示图固定上半屏居中，忽略 figure.pos.*，并按安全区自动上移/缩放，避免与底部对话框重叠。
            const imageSlot = resolveFigureSlot("center");
            const figureFileName = await this.uploadImageFigure(imageSourceUrl, imageMessage.fileName);
            if (figureFileName) {
              const transform = buildImageFigureTransformString(imageMessage, imageSlot.offsetX);
              const figureArgs = buildFigureArgs(IMAGE_MESSAGE_FIGURE_ID, transform);
              await this.appendLine(
                targetRoomId,
                `changeFigure:${figureFileName} ${figureArgs};`,
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

      // 处理特效消息 (Type 8)：纯 annotation 语义
      if ((msg.messageType as number) === MESSAGE_TYPE.EFFECT) {
        const sceneEffect = getSceneEffectFromAnnotations(msg.annotations);
        const shouldClearBackground = hasAnnotation(msg.annotations, ANNOTATION_IDS.BACKGROUND_CLEAR);
        const shouldClearFigure = hasAnnotation(msg.annotations, ANNOTATION_IDS.FIGURE_CLEAR);
        let wroteEffectCommand = false;

        if (shouldClearFigure) {
          for (const line of buildClearFigureLines({ includeImage: true })) {
            await this.appendLine(targetRoomId, line, syncToFile);
          }
          this.lastFigureSlotIdMap.delete(targetRoomId);
          this.renderedFigureStateMap.delete(targetRoomId);
          wroteEffectCommand = true;
        }

        if (shouldClearBackground) {
          await this.appendLine(targetRoomId, "changeBg:none -next;", syncToFile);
          wroteEffectCommand = true;
        }

        if (sceneEffect) {
          if (sceneEffect === "none") {
          // 清除场景特效：使用 pixiInit 初始化，消除所有已应用的效果
            await this.appendLine(targetRoomId, "pixiInit -next;", syncToFile);
          }
          else {
            const effectSound = await this.resolveAnnotationEffectSound(sceneEffect);
            if (effectSound) {
              await this.appendLine(targetRoomId, `playEffect:${effectSound.url} -next;`, syncToFile);
            }
            await this.appendLine(targetRoomId, `pixiPerform:${sceneEffect} -next;`, syncToFile);
          }
          wroteEffectCommand = true;
        }

        if (wroteEffectCommand && syncToFile) {
          this.sendSyncMessage(targetRoomId);
        }
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
        ? getDiceContentFromMessage(msg, dicePayload)
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
        for (const line of buildClearFigureLines({ includeImage: true })) {
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
        const figureSlot = resolveFigureSlot(figurePosition);
        this.lastFigureSlotIdMap.set(targetRoomId, figureSlot.id);
        const transform = buildRoleFigureTransformString(avatar, figureSlot.offsetX, 0);
        const renderedState = this.getRenderedFigureState(targetRoomId);
        const previous = renderedState.get(figureSlot.id);
        const shouldUpdateFigure
          = !previous
            || previous.fileName !== spriteFileName
            || previous.transform !== transform;
        if (shouldUpdateFigure) {
          const figureArgs = buildFigureArgs(figureSlot.id, transform);
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
      }
      else if (!isNarrator && !isIntroText) {
      // 普通对话但不显示立绘时，不再自动清除立绘，立绘需要手动清除
      }

      // 处理小头像：
      // 1. 房间级开关开启时，保持原有“普通对话自动显示”行为；
      // 2. 命中 figure.mini-avatar 标注时，即使房间级开关关闭也强制显示；
      // 3. 如果上一条消息显示过小头像，而本条不该显示，则主动下发 none，避免残留。
      const forceMiniAvatar = hasMiniAvatarAnnotation(msg.annotations);
      const allowMiniAvatar = !isIntroText && (
        diceShowMiniAvatar === true
        || (diceShowMiniAvatar !== false && (forceMiniAvatar || (!isNarrator && this.miniAvatarEnabled)))
      );
      const hadVisibleMiniAvatar = this.renderedMiniAvatarVisibleMap.get(targetRoomId) === true;

      if (allowMiniAvatar) {
        const miniAvatarFileName = effectiveAvatarId > 0 && roleId > 0
          ? await this.getAndUploadMiniAvatar(effectiveAvatarId, roleId)
          : null;

        if (miniAvatarFileName) {
          await this.appendLine(targetRoomId, `miniAvatar:${miniAvatarFileName};`, syncToFile);
          this.renderedMiniAvatarVisibleMap.set(targetRoomId, true);
        }
        else {
          await this.appendLine(targetRoomId, "miniAvatar:none;", syncToFile);
          this.renderedMiniAvatarVisibleMap.set(targetRoomId, false);
        }
      }
      else if (hadVisibleMiniAvatar || this.miniAvatarEnabled || forceMiniAvatar || diceShowMiniAvatar !== undefined) {
        await this.appendLine(targetRoomId, "miniAvatar:none;", syncToFile);
        this.renderedMiniAvatarVisibleMap.set(targetRoomId, false);
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
      const dialogFigureIdPart = shouldShowFigure && spriteFileName && figurePosition
        ? ` -figureId=${resolveFigureSlot(figurePosition).id}`
        : "";

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
            await this.appendLine(targetRoomId, `${roleName}: ${content}${dialogFigureIdPart}${notendPart}${concatPart}${nextPart};`, syncToFile);
          }
        };
        if (diceRenderMode === "trpg") {
          await this.appendLine(targetRoomId, `pixi:${TRPG_DICE_PIXI_EFFECT} -once -duration=950 -scale=1.08 -next;`, syncToFile);
        }

        if (diceRenderMode === "anko") {
          const finalProcessed = TextEnhanceSyntax.processContent(diceContent);
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
          vocalFileName = await generateAndUploadVocal({
            text: processedContent,
            roleId,
            avatarTitle: avatar?.avatarTitle,
            customEmotionVector,
            getTtsConfig: () => this.ttsConfig,
            voiceFileMap: this.voiceFileMap,
            uploadedVocalsMap: this.uploadedVocalsMap,
            ttsGeneratingMap: this.ttsGeneratingMap,
            gameName: this.gameName,
          });
        }

        // 添加对话行（包含语音和 -notend/-concat 参数）
        const vocalPart = vocalFileName ? ` -${vocalFileName}` : "";
        const notendPart = dialogNotend ? " -notend" : "";
        const concatPart = dialogConcat ? " -concat" : "";
        const nextPart = dialogNext ? " -next" : "";
        await this.appendLine(targetRoomId, `${roleName}: ${processedContent}${vocalPart}${dialogFigureIdPart}${notendPart}${concatPart}${nextPart};`, syncToFile);
      }

      finalizeMessageLineRange();

      // 自动跳转已关闭，保留写入但不主动跳转
      if (syncToFile) {
        this.sendSyncMessage(targetRoomId);
      }
    };

    await this.runWithRoomSyncBatch(targetRoomId, syncToFile, renderImpl);
  }

  /**
   * 批量渲染历史消息
   */
  public async renderHistory(messages: ChatMessageResponse[], roomId?: number): Promise<void> {
    if (this.disposed) {
      return;
    }
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId)
      return;
    this.clearPendingDiceMerge(targetRoomId);

    // 批量处理消息，不进行文件同步和 WebSocket 同步
    for (let index = 0; index < messages.length; index += 1) {
      if (this.disposed) {
        console.warn("[RealtimeRenderer] 渲染中止：实例已销毁");
        return;
      }
      const current = messages[index];
      const next = messages[index + 1];
      if (next && canMergeTrpgDicePair(current, next)) {
        const mergedMessage = buildMergedTrpgDiceMessage(current, next);
        await this.renderMessage(mergedMessage, targetRoomId, false, { bypassDiceMerge: true });
        if (this.disposed) {
          console.warn("[RealtimeRenderer] 渲染中止：实例已销毁");
          return;
        }
        index += 1;
        continue;
      }
      await this.renderMessage(current, targetRoomId, false, { bypassDiceMerge: true });
      if (this.disposed) {
        console.warn("[RealtimeRenderer] 渲染中止：实例已销毁");
        return;
      }
    }

    // 历史渲染完成后，按流程图补齐该房间的分支跳转
    if (this.disposed) {
      return;
    }
    await this.appendWorkflowTransitionIfNeeded(targetRoomId);

    // 最后统一同步文件（自动跳转关闭时不会主动跳转）
    if (this.disposed) {
      return;
    }
    await this.syncContextToFile(targetRoomId);
    if (this.disposed) {
      return;
    }
    this.sendSyncMessage(targetRoomId);
  }

  public async rerenderHistoryFromIndex(
    messages: ChatMessageResponse[],
    startIndex: number,
    roomId?: number,
  ): Promise<void> {
    if (this.disposed) {
      return;
    }

    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      return;
    }

    let effectiveStartIndex = startIndex;
    if (
      effectiveStartIndex > 0
      && canMergeTrpgDicePair(messages[effectiveStartIndex - 1], messages[effectiveStartIndex])
    ) {
      effectiveStartIndex -= 1;
    }

    if (effectiveStartIndex <= 0) {
      await this.resetScene(targetRoomId);
      await this.renderHistory(messages, targetRoomId);
      return;
    }

    const context = this.sceneContextMap.get(targetRoomId);
    const startMessage = messages[effectiveStartIndex];
    const previousMessage = messages[effectiveStartIndex - 1];
    const startMessageId = startMessage?.message.messageId;
    if (!context || !startMessageId) {
      await this.resetScene(targetRoomId);
      await this.renderHistory(messages, targetRoomId);
      return;
    }

    const startLineRange = this.messageLineMap.get(buildMessageStateKey(targetRoomId, startMessageId));
    if (!startLineRange) {
      await this.resetScene(targetRoomId);
      await this.renderHistory(messages, targetRoomId);
      return;
    }

    const previousSnapshot = previousMessage?.message.messageId
      ? this.getMessageRenderStateSnapshot(targetRoomId, previousMessage.message.messageId)
      : undefined;

    this.clearPendingDiceMerge(targetRoomId);

    const existingLines = context.text.split("\n");
    context.text = existingLines.slice(0, startLineRange.startLine - 1).join("\n");
    context.lineNumber = context.text ? context.text.split("\n").length : 0;

    this.pruneRoomStateFromLine(targetRoomId, startLineRange.startLine);
    this.applyRoomRenderStateSnapshot(targetRoomId, previousSnapshot);

    for (let index = effectiveStartIndex; index < messages.length; index += 1) {
      if (this.disposed) {
        return;
      }
      const current = messages[index];
      const next = messages[index + 1];
      if (next && canMergeTrpgDicePair(current, next)) {
        const mergedMessage = buildMergedTrpgDiceMessage(current, next);
        await this.renderMessage(mergedMessage, targetRoomId, false, { bypassDiceMerge: true });
        index += 1;
        continue;
      }
      await this.renderMessage(current, targetRoomId, false, { bypassDiceMerge: true });
    }

    if (this.disposed) {
      return;
    }
    await this.appendWorkflowTransitionIfNeeded(targetRoomId);
    if (this.disposed) {
      return;
    }
    await this.syncContextToFile(targetRoomId);
    if (this.disposed) {
      return;
    }
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

    for (const line of buildClearFigureLines({ includeImage: true })) {
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
      this.clearMessageRenderStateSnapshotsForRoom(roomId);
      await this.initRoomScene(roomId);
      this.currentSpriteStateMap.set(roomId, new Set());
      this.renderedFigureStateMap.set(roomId, new Map());
      this.renderedMiniAvatarVisibleMap.delete(roomId);
      this.roomSyncBatchDepthMap.delete(roomId);
      this.roomSyncPendingSet.delete(roomId);
      this.clearPendingDiceMerge(roomId);
      this.sendSyncMessage(roomId);
    }
    else {
      // 重置所有房间
      await this.initScene();
      this.currentSpriteStateMap.clear();
      this.renderedFigureStateMap.clear();
      this.renderedMiniAvatarVisibleMap.clear();
      this.roomSyncBatchDepthMap.clear();
      this.roomSyncPendingSet.clear();
      this.messageLineMap.clear();
      this.messageRenderStateSnapshotMap.clear();
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
      const emotionVector = resolveRealtimeTtsEmotionVector(avatar?.avatarTitle, customEmotionVector);

      // 处理文本内容用于生成 cacheKey（支持 WebGAL 文本拓展语法）
      const processedContent = TextEnhanceSyntax.processContent(msg.content);

      const refVocal = this.voiceFileMap.get(msg.roleId);
      if (refVocal) {
        const cacheKey = buildRealtimeTtsCacheKey(processedContent, refVocal.name, emotionVector);
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
    const savedStateSnapshot = this.captureRoomRenderStateSnapshot(targetRoomId);

    // 临时重置上下文，用于收集新渲染的内容
    context.lineNumber = 0;
    context.text = "";

    // 重新渲染该消息（不同步到文件）
    await this.renderMessage(message, targetRoomId, false, { bypassDiceMerge: true, skipBookkeeping: true });

    // 获取新渲染的内容
    const newContent = context.text;
    const newLines = newContent.split("\n").filter(line => line.trim());

    // 恢复上下文状态
    context.lineNumber = savedLineNumber;
    context.text = savedText;
    this.applyRoomRenderStateSnapshot(targetRoomId, savedStateSnapshot);

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
    this.disposed = true;
    // 让正在进行的 init/preload 立即失效，避免页面切换后继续写入旧实例状态。
    this.initEpoch += 1;
    this.annotationEffectSoundCache.clear();
    this.clearPendingDiceMerge();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.syncSocket) {
      this.syncSocket.onopen = null;
      this.syncSocket.onclose = null;
      this.syncSocket.onerror = null;
      this.syncSocket.close();
      this.syncSocket = null;
    }
    this.messageQueue = [];
    this.isConnected = false;
    this.renderedMiniAvatarVisibleMap.clear();
    this.roomSyncBatchDepthMap.clear();
    this.roomSyncPendingSet.clear();
    this.messageRenderStateSnapshotMap.clear();
    this.onStatusChange = undefined;
    this.onProgressChange = undefined;
  }
}
