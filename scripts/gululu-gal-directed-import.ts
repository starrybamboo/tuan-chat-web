import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { RoomMessageStreamPatchOperation } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchOperation";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process, { env } from "node:process";
import { fileURLToPath } from "node:url";

import type { GululuLiveImportPlan } from "./gululu-authoring-live-import";

import { ensureRoomInSidebarTree } from "./gululu-authoring-live-import";

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success?: boolean;
};

type SourceMessagePlan = {
  avatarKey?: string;
  kind: "dialog" | "narration" | "dice" | "bgm" | "role_card";
  request: ChatMessageRequest;
  roleKey?: string;
  source: {
    eventIndex: number;
    floor?: number;
    imagePath?: string;
    sourceTime?: string;
    speakerName?: string;
  };
};

type SourceLiveResult = {
  plan?: {
    avatars?: Array<{ fileName?: string; height?: number; imagePath?: string; key?: string; width?: number }>;
    messages?: SourceMessagePlan[];
    source?: Record<string, unknown>;
    stats?: Record<string, number>;
  };
  result?: {
    avatars?: Array<{ avatarId?: number; key?: string; mediaFileId?: number; roleId?: number }>;
    roles?: Array<{ key?: string; roleId?: number }>;
  };
};

type SourceLiveResultPlan = NonNullable<SourceLiveResult["plan"]>;
type MessageTypeDirective = "text" | "intro" | "dice" | number;
type StagePolicy = "preserve" | "solo-active";
type FigurePositionDirective = "left" | "left-center" | "center" | "right-center" | "right";
type ImageShowDirective = boolean | {
  avatarKey?: string;
  clearBefore?: boolean;
  fileName?: string;
  height?: number;
  width?: number;
};

export type GululuGalDirectionEntry = {
  annotations?: string[];
  avatarKey?: string | null;
  customRoleName?: string | null;
  eventIndex: number;
  imageShow?: ImageShowDirective;
  messageType?: MessageTypeDirective;
  note?: string;
  roleKey?: string | null;
  webgal?: Record<string, unknown>;
};

export type GululuGalDirectingPlan = {
  entries: GululuGalDirectionEntry[];
  schemaVersion: 1;
  source?: Record<string, unknown>;
};

export type GululuGalStageScene = {
  clearOnStart?: boolean;
  endEventIndex?: number;
  note?: string;
  rolePositions?: Record<string, FigurePositionDirective>;
  sceneId: string;
  startEventIndex: number;
};

export type GululuGalStagePlan = {
  scenes: GululuGalStageScene[];
  schemaVersion: 1;
  source?: Record<string, unknown>;
};

export type GululuGalCompiledMessage = {
  eventIndex: number;
  request: ChatMessageRequest;
  source: SourceMessagePlan["source"];
};

export type GululuGalDirectedImportPlan = {
  messages: GululuGalCompiledMessage[];
  reused: {
    avatars: Array<{ avatarId: number; key: string; roleId?: number }>;
    roles: Array<{ key: string; roleId: number }>;
  };
  source: SourceLiveResultPlan["source"];
  stats: {
    diceMessages: number;
    messages: number;
    messagesWithAnnotations: number;
    messagesWithWebgal: number;
    reusedAvatars: number;
    reusedRoles: number;
  };
  target: {
    roomId?: number;
    roomName?: string;
    spaceId: number;
  };
  warnings: string[];
};

export type GululuGalDirectedApplyResult = {
  createdRoom?: {
    name?: string;
    roomId: number;
    spaceId?: number;
  };
  messages: Array<{ messageId?: number; sourceEventIndex: number; syncId?: number }>;
  roomRoles: {
    addedRoleIds: number[];
    reusedRoleIds: number[];
  };
  sidebarTree?: {
    action: "added" | "already-present" | "skipped";
    reason?: string;
    roomId: number;
    spaceId?: number;
    version?: number;
  };
};

export type GululuGalDirectedImportArgs = {
  apply?: boolean;
  authToken?: string;
  baseUrl?: string;
  directingPlan?: string;
  liveResult?: string;
  out?: string;
  patchChunkSize?: number;
  roomName?: string;
  stagePlan?: string;
  stagePolicy?: StagePolicy;
  targetRoomId?: number;
  targetSpaceId?: number;
};

type GululuGalDirectedClient = {
  chatController: {
    patchRoomMessages: (requestBody: {
      mutationMeta?: {
        operationCause?: string;
        sourceSurface?: string;
      };
      operations: RoomMessageStreamPatchOperation[];
      roomId: number;
    }) => Promise<ApiResult<Message[]>>;
  };
  roomController?: {
    getUserRooms: (spaceId: number) => Promise<ApiResult<{ rooms?: Array<{ name?: string; roomId?: number }>; spaceId?: number }>>;
  };
  roomRoleController: {
    addRole: (requestBody: { roleIdList: number[]; roomId: number; type?: number }) => Promise<ApiResult<unknown>>;
    roomNpcRole: (roomId: number) => Promise<ApiResult<UserRole[]>>;
  };
  spaceController?: {
    createRoom: (requestBody: { roomName?: string; spaceId: number; userIdList?: number[] }) => Promise<ApiResult<Room>>;
  };
  spaceSidebarTreeController?: {
    getSidebarTree: (spaceId: number) => Promise<ApiResult<{ spaceId?: number; treeJson?: string; version?: number }>>;
    setSidebarTree: (requestBody: {
      expectedVersion: number;
      spaceId: number;
      treeJson: string;
    }) => Promise<ApiResult<{ spaceId?: number; treeJson?: string; version?: number }>>;
  };
};

const NPC_ROLE_TYPE = 2;
const DEFAULT_PATCH_CHUNK_SIZE = 100;
const REVIEWED_AUTHOR_DICE_COMMENT_EVENT_INDICES = new Set([
  69,
  137,
  140,
  142,
  146,
]);
const OMITTED_AUTHOR_STAGE_COMMENT_EVENT_INDICES = new Set([
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122,
  123,
  124,
  125,
  126,
  127,
  318,
  319,
  320,
  321,
  322,
  323,
  340,
  341,
  342,
]);

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function toPositiveInteger(value: string, flag: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function toStagePolicy(value: string, flag: string): StagePolicy {
  if (value === "preserve" || value === "solo-active") {
    return value;
  }
  throw new Error(`${flag} must be preserve or solo-active`);
}

export function parseGululuGalDirectedImportArgs(argv: string[]): GululuGalDirectedImportArgs {
  const args: GululuGalDirectedImportArgs = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") {
      args.apply = true;
    }
    else if (arg === "--live-result") {
      args.liveResult = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--directing-plan") {
      args.directingPlan = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out") {
      args.out = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--target-room-id") {
      args.targetRoomId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--target-space-id") {
      args.targetSpaceId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--room-name") {
      args.roomName = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--stage-policy") {
      args.stagePolicy = toStagePolicy(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--stage-plan") {
      args.stagePlan = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--patch-chunk-size") {
      args.patchChunkSize = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--base-url") {
      args.baseUrl = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--auth-token") {
      args.authToken = readValue(argv, index, arg);
      index++;
    }
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function normalizeMessageType(value: MessageTypeDirective | undefined, fallback: number) {
  if (value === "text") {
    return MESSAGE_TYPE.TEXT;
  }
  if (value === "intro") {
    return MESSAGE_TYPE.INTRO_TEXT;
  }
  if (value === "dice") {
    return MESSAGE_TYPE.DICE;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
}

function buildMap<T extends { key?: string }>(items: T[] | undefined, field: keyof T, label: string) {
  const result = new Map<string, number>();
  for (const item of items ?? []) {
    const key = item.key?.trim();
    const id = item[field];
    if (!key || typeof id !== "number" || !Number.isFinite(id) || id <= 0) {
      continue;
    }
    if (result.has(key)) {
      throw new Error(`重复的 ${label} 映射：${key}`);
    }
    result.set(key, id);
  }
  return result;
}

function assertApiSuccess<T>(result: ApiResult<T>, fallback: string) {
  if (!result?.success) {
    throw new Error(result?.errMsg || fallback);
  }
  return result.data;
}

function assertApiData<T>(result: ApiResult<T>, fallback: string) {
  const data = assertApiSuccess(result, fallback);
  if (data == null) {
    throw new Error(fallback);
  }
  return data;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeAnnotations(value: string[] | undefined) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const annotations = Array.from(new Set(value.filter(item => typeof item === "string" && item.trim().length > 0)));
  return annotations.length > 0 ? annotations : undefined;
}

function removeStageAnnotations(value: string[] | undefined) {
  return (value ?? []).filter(annotation =>
    !annotation.startsWith("figure.pos.")
    && !annotation.startsWith("figure.anim.")
    && annotation !== "figure.clear");
}

function removeFigurePositionAnnotations(value: string[] | undefined) {
  return (value ?? []).filter(annotation => !annotation.startsWith("figure.pos."));
}

function appendUniqueAnnotation(annotations: string[], annotation: string) {
  if (!annotations.includes(annotation)) {
    annotations.push(annotation);
  }
}

function mergeSoloActiveWebgal(
  webgal: Record<string, unknown> | undefined,
  canShowFigure: boolean,
) {
  const next = { ...webgal };
  if (canShowFigure) {
    next.stage = {
      position: "center",
      reason: "solo-active-speaker",
    };
  }
  const diceRender = getRecordField(next, "diceRender");
  if (diceRender) {
    next.diceRender = {
      ...diceRender,
      showFigure: false,
      showMiniAvatar: false,
    };
  }
  return next;
}

function resolveDirectedRoleKey(entry: GululuGalDirectionEntry, sourceMessage: SourceMessagePlan) {
  return entry.roleKey === null ? undefined : entry.roleKey ?? sourceMessage.roleKey;
}

function resolveDirectedAvatarKey(entry: GululuGalDirectionEntry, sourceMessage: SourceMessagePlan) {
  return entry.avatarKey === null ? undefined : entry.avatarKey ?? sourceMessage.avatarKey;
}

function resolveImageShowAvatarKey(entry: GululuGalDirectionEntry, sourceMessage: SourceMessagePlan) {
  if (!entry.imageShow) {
    return undefined;
  }
  if (typeof entry.imageShow === "object" && entry.imageShow.avatarKey) {
    return entry.imageShow.avatarKey;
  }
  return sourceMessage.avatarKey;
}

function getImageShowClearBefore(entry: GululuGalDirectionEntry) {
  return typeof entry.imageShow === "object" && entry.imageShow.clearBefore === true;
}

function getImageShowFileName(entry: GululuGalDirectionEntry) {
  return typeof entry.imageShow === "object" && entry.imageShow.fileName ? entry.imageShow.fileName : undefined;
}

function getImageShowDimension(entry: GululuGalDirectionEntry, field: "height" | "width") {
  const value = typeof entry.imageShow === "object" ? entry.imageShow[field] : undefined;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function getSceneEndEventIndex(scene: GululuGalStageScene, sortedScenes: GululuGalStageScene[], index: number) {
  const explicitEnd = scene.endEventIndex;
  if (explicitEnd != null) {
    return explicitEnd;
  }
  const nextScene = sortedScenes[index + 1];
  return nextScene ? nextScene.startEventIndex - 1 : Number.MAX_SAFE_INTEGER;
}

function validateStagePlan(stagePlan: GululuGalStagePlan) {
  if (stagePlan.schemaVersion !== 1) {
    throw new Error("stage plan schemaVersion must be 1");
  }
  const sortedScenes = [...(stagePlan.scenes ?? [])].sort((left, right) => left.startEventIndex - right.startEventIndex);
  const seenSceneIds = new Set<string>();
  let previousEnd = 0;
  for (let index = 0; index < sortedScenes.length; index++) {
    const scene = sortedScenes[index]!;
    if (!scene.sceneId?.trim()) {
      throw new Error("stage plan sceneId must not be empty");
    }
    if (seenSceneIds.has(scene.sceneId)) {
      throw new Error(`stage plan sceneId 重复：${scene.sceneId}`);
    }
    seenSceneIds.add(scene.sceneId);
    if (!Number.isInteger(scene.startEventIndex) || scene.startEventIndex <= 0) {
      throw new Error(`stage plan scene ${scene.sceneId} startEventIndex must be a positive integer`);
    }
    const endEventIndex = getSceneEndEventIndex(scene, sortedScenes, index);
    if (!Number.isInteger(endEventIndex) || endEventIndex < scene.startEventIndex) {
      throw new Error(`stage plan scene ${scene.sceneId} endEventIndex must be >= startEventIndex`);
    }
    if (scene.startEventIndex <= previousEnd) {
      throw new Error(`stage plan scene ${scene.sceneId} overlaps previous scene`);
    }
    previousEnd = endEventIndex;
  }
  return sortedScenes;
}

function buildStageSceneLookup(stagePlan: GululuGalStagePlan | undefined) {
  if (!stagePlan) {
    return () => undefined;
  }
  const sortedScenes = validateStagePlan(stagePlan);
  return (eventIndex: number) => sortedScenes.find((scene, index) => {
    const endEventIndex = getSceneEndEventIndex(scene, sortedScenes, index);
    return eventIndex >= scene.startEventIndex && eventIndex <= endEventIndex;
  });
}

function applyStagePlanEntry(params: {
  scene?: GululuGalStageScene;
  sourceMessage: SourceMessagePlan;
  entry: GululuGalDirectionEntry;
}) {
  const { scene, sourceMessage } = params;
  const next = cloneJson(params.entry);
  if (!scene) {
    return next;
  }

  let annotations = [...(next.annotations ?? [])];
  if (scene.clearOnStart && sourceMessage.source.eventIndex === scene.startEventIndex) {
    appendUniqueAnnotation(annotations, "figure.clear");
    appendUniqueAnnotation(annotations, "image.clear");
  }

  const roleKey = resolveDirectedRoleKey(next, sourceMessage);
  const avatarKey = resolveDirectedAvatarKey(next, sourceMessage);
  const messageType = normalizeMessageType(next.messageType, sourceMessage.request.messageType);
  const canShowFigure = messageType === MESSAGE_TYPE.TEXT && Boolean(roleKey && avatarKey);
  const position = roleKey ? scene.rolePositions?.[roleKey] : undefined;
  if (canShowFigure && position) {
    annotations = removeFigurePositionAnnotations(annotations);
    appendUniqueAnnotation(annotations, `figure.pos.${position}`);
  }

  next.annotations = annotations;
  next.webgal = {
    ...next.webgal,
    stage: {
      ...getRecordField(next.webgal, "stage"),
      sceneId: scene.sceneId,
      ...(position ? { position, reason: "stage-plan" } : {}),
    },
  };
  return next;
}

export function applySoloActiveStagePolicy(
  liveResult: SourceLiveResult,
  directingPlan: GululuGalDirectingPlan,
): GululuGalDirectingPlan {
  const entriesByIndex = new Map((directingPlan.entries ?? []).map(entry => [entry.eventIndex, entry]));
  let previousActiveKey: string | undefined;
  const entries = (liveResult.plan?.messages ?? []).map((sourceMessage) => {
    const entry = entriesByIndex.get(sourceMessage.source.eventIndex);
    if (!entry) {
      throw new Error(`缺少导演计划事件：${sourceMessage.source.eventIndex}`);
    }
    const next = cloneJson(entry);
    const roleKey = resolveDirectedRoleKey(next, sourceMessage);
    const avatarKey = resolveDirectedAvatarKey(next, sourceMessage);
    const messageType = normalizeMessageType(next.messageType, sourceMessage.request.messageType);
    const canShowFigure = messageType === MESSAGE_TYPE.TEXT && Boolean(roleKey && avatarKey);
    const annotations = removeStageAnnotations(next.annotations);

    if (!canShowFigure || !roleKey) {
      appendUniqueAnnotation(annotations, "figure.clear");
      previousActiveKey = undefined;
    }
    else {
      if (previousActiveKey !== roleKey) {
        appendUniqueAnnotation(annotations, "figure.clear");
        appendUniqueAnnotation(annotations, "figure.anim.enter");
      }
      appendUniqueAnnotation(annotations, "figure.pos.center");
      previousActiveKey = roleKey;
    }

    next.annotations = annotations;
    next.webgal = mergeSoloActiveWebgal(next.webgal, canShowFigure);
    return next;
  });
  return {
    ...directingPlan,
    entries,
  };
}

function applyStagePolicy(
  liveResult: SourceLiveResult,
  directingPlan: GululuGalDirectingPlan,
  stagePolicy: StagePolicy | undefined,
) {
  if (stagePolicy === "solo-active") {
    return applySoloActiveStagePolicy(liveResult, directingPlan);
  }
  return directingPlan;
}

export function applyStagePlan(
  liveResult: SourceLiveResult,
  directingPlan: GululuGalDirectingPlan,
  stagePlan: GululuGalStagePlan,
): GululuGalDirectingPlan {
  const entriesByIndex = new Map((directingPlan.entries ?? []).map(entry => [entry.eventIndex, entry]));
  const lookupScene = buildStageSceneLookup(stagePlan);
  const entries = (liveResult.plan?.messages ?? []).map((sourceMessage) => {
    const entry = entriesByIndex.get(sourceMessage.source.eventIndex);
    if (!entry) {
      throw new Error(`缺少导演计划事件：${sourceMessage.source.eventIndex}`);
    }
    return applyStagePlanEntry({
      entry,
      scene: lookupScene(sourceMessage.source.eventIndex),
      sourceMessage,
    });
  });
  return {
    ...directingPlan,
    entries,
  };
}

function buildSourceMetadata(source: SourceMessagePlan["source"]) {
  return {
    kind: "gululu",
    ...(source.floor != null ? { segmentId: String(source.floor) } : {}),
    eventIndex: source.eventIndex,
    ...(source.speakerName ? { originalSpeaker: source.speakerName } : {}),
    ...(source.imagePath ? { originalAssetPath: source.imagePath } : {}),
    ...(source.sourceTime ? { sourceTime: source.sourceTime } : {}),
  };
}

type AvatarAssetMapValue = {
  fileName?: string;
  height?: number;
  imagePath?: string;
  mediaFileId?: number;
  width?: number;
};

function buildAvatarAssetMap(liveResult: SourceLiveResult) {
  const assets = new Map<string, AvatarAssetMapValue>();
  for (const avatar of liveResult.plan?.avatars ?? []) {
    if (!avatar.key) {
      continue;
    }
    assets.set(avatar.key, {
      fileName: avatar.fileName,
      ...(avatar.height ? { height: avatar.height } : {}),
      imagePath: avatar.imagePath,
      ...(avatar.width ? { width: avatar.width } : {}),
      ...assets.get(avatar.key),
    });
  }
  for (const avatar of liveResult.result?.avatars ?? []) {
    if (!avatar.key) {
      continue;
    }
    assets.set(avatar.key, {
      ...assets.get(avatar.key),
      ...(avatar.mediaFileId ? { mediaFileId: avatar.mediaFileId } : {}),
    });
  }
  return assets;
}

function fileNameFromImagePath(imagePath: string | undefined) {
  if (!imagePath) {
    return undefined;
  }
  const normalized = imagePath.replaceAll("\\", "/");
  return normalized.split("/").pop();
}

function mergeWebgal(
  source: SourceMessagePlan["source"],
  webgal: Record<string, unknown> | undefined,
) {
  return {
    ...webgal,
    source: buildSourceMetadata(source),
  };
}

function getRecordField(value: Record<string, unknown> | undefined, field: string) {
  const next = value?.[field];
  return next && typeof next === "object" && !Array.isArray(next) ? next as Record<string, unknown> : undefined;
}

function getStringField(value: Record<string, unknown> | undefined, field: string) {
  const next = value?.[field];
  return typeof next === "string" && next.trim() ? next.trim() : undefined;
}

type DiceReplyRecord = Record<string, unknown> & { content: string };

type DiceTextPlan = {
  commandContent?: string;
  replies?: DiceReplyRecord[];
  replyContent?: string;
};

function getDirectedDiceText(webgal: Record<string, unknown> | undefined) {
  const diceRender = getRecordField(webgal, "diceRender");
  return {
    commandContent: getStringField(diceRender, "commandContent"),
    replyContent: getStringField(diceRender, "replyContent") ?? getStringField(diceRender, "content"),
  };
}

function getExistingDiceText(request: ChatMessageRequest): DiceTextPlan {
  const existing = request.extra ?? {};
  const diceTurn = getRecordField(existing as Record<string, unknown>, "diceTurn");
  const replies = diceTurn?.replies;
  const normalizedReplies = Array.isArray(replies)
    ? replies.flatMap(item => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return [];
        }
        const content = getStringField(item as Record<string, unknown>, "content");
        return content ? [{ ...(item as Record<string, unknown>), content }] : [];
      })
    : [];
  const fallbackReplyContent = getStringField(getRecordField(existing as Record<string, unknown>, "diceResult"), "result")
    ?? request.content?.trim();
  const replyContent = normalizedReplies.length > 0
    ? normalizedReplies.map(reply => reply.content).join("\n")
    : fallbackReplyContent;
  return {
    commandContent: getStringField(diceTurn, "command"),
    replies: normalizedReplies,
    replyContent,
  };
}

function preserveExistingDiceSplit(
  request: ChatMessageRequest,
  diceText: DiceTextPlan,
) {
  const existing = getExistingDiceText(request);
  if (existing.commandContent && existing.replyContent && existing.replies && existing.replies.length > 1) {
    return existing;
  }
  if (!diceText.commandContent || !diceText.replyContent || diceText.commandContent !== diceText.replyContent) {
    return diceText;
  }
  if (!existing.commandContent || !existing.replyContent || existing.commandContent === existing.replyContent) {
    return diceText;
  }
  // 导演计划若把同一历史结果同时写入 command/reply，则保留源导入阶段已拆好的过程/结果。
  return existing;
}

function mergeDiceRenderText(
  webgal: Record<string, unknown> | undefined,
  diceText: DiceTextPlan,
) {
  const diceRender = getRecordField(webgal, "diceRender");
  if (!diceRender || (!diceText.commandContent && !diceText.replyContent)) {
    return webgal;
  }
  return {
    ...webgal,
    diceRender: {
      ...diceRender,
      ...(diceText.commandContent ? { commandContent: diceText.commandContent } : {}),
      ...(diceText.replyContent ? { content: diceText.replyContent, replyContent: diceText.replyContent } : {}),
    },
  };
}

function buildDiceReply(
  request: ChatMessageRequest,
  reply: DiceReplyRecord | string,
): DiceReplyRecord {
  const source = typeof reply === "string" ? { content: reply } : reply;
  return {
    ...source,
    customRoleName: typeof source.customRoleName === "string" && source.customRoleName.trim()
      ? source.customRoleName
      : request.customRoleName || "骰娘",
    ...(typeof source.roleId === "number" && source.roleId > 0
      ? { roleId: source.roleId }
      : typeof request.roleId === "number" && request.roleId > 0
        ? { roleId: request.roleId }
        : {}),
    ...(typeof source.avatarId === "number" && source.avatarId > 0
      ? { avatarId: source.avatarId }
      : typeof request.avatarId === "number" && request.avatarId > 0
        ? { avatarId: request.avatarId }
        : {}),
  };
}

function buildDiceExtra(
  request: ChatMessageRequest,
  diceText: DiceTextPlan = {},
) {
  const existing = request.extra ?? {};
  if (existing.diceTurn && !diceText.commandContent && !diceText.replyContent) {
    return existing;
  }
  const result = diceText.replyContent || existing.diceResult?.result?.trim() || request.content?.trim() || "";
  if (!result) {
    throw new Error("骰子消息缺少可保留的历史内容");
  }
  const existingCommand = getStringField(getRecordField(existing as Record<string, unknown>, "diceTurn"), "command");
  const command = diceText.commandContent || existingCommand;
  const replies = diceText.replies && diceText.replies.length > 0
    ? diceText.replies.map(reply => buildDiceReply(request, reply))
    : [buildDiceReply(request, result)];
  return {
    ...existing,
    diceResult: { result },
    diceTurn: {
      ...(command ? { command } : {}),
      replies,
    },
  };
}

function isShortParenthesizedDiceComment(message: GululuGalCompiledMessage) {
  const request = message.request;
  const content = request.content?.trim();
  return request.messageType === MESSAGE_TYPE.TEXT
    && typeof content === "string"
    && /^（[^）\r\n]{1,80}）$/.test(content)
    && !hasExplicitSpeaker(message)
    && (request.roleId == null || request.roleId === -1)
    && (request.avatarId == null || request.avatarId === -1)
    && (!request.annotations || request.annotations.length === 0)
    && !getRecordField(request.webgal, "imageShow");
}

function hasExplicitSpeaker(message: GululuGalCompiledMessage) {
  return typeof message.source.speakerName === "string" && message.source.speakerName.trim().length > 0;
}

function isReviewedAuthorDiceComment(message: GululuGalCompiledMessage) {
  // 人工审定名单覆盖自动 speakerName：部分骰后作者吐槽会因邻近头像被误挂角色。
  return REVIEWED_AUTHOR_DICE_COMMENT_EVENT_INDICES.has(message.source.eventIndex)
    && message.request.messageType === MESSAGE_TYPE.TEXT
    && !getRecordField(message.request.webgal, "imageShow");
}

function isMergeableDiceComment(message: GululuGalCompiledMessage) {
  return isShortParenthesizedDiceComment(message) || isReviewedAuthorDiceComment(message);
}

function canMergeDiceComment(previous: GululuGalCompiledMessage | undefined, current: GululuGalCompiledMessage) {
  if (!previous || previous.request.messageType !== MESSAGE_TYPE.DICE || !isMergeableDiceComment(current)) {
    return false;
  }
  if (previous.source.floor !== current.source.floor) {
    return false;
  }
  if (previous.source.sourceTime && current.source.sourceTime && previous.source.sourceTime !== current.source.sourceTime) {
    return false;
  }
  return current.source.eventIndex === previous.source.eventIndex + 1;
}

function findDiceCommentTargetIndex(messages: GululuGalCompiledMessage[], current: GululuGalCompiledMessage) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const previous = messages[index];
    if (!previous) {
      continue;
    }
    if (previous.request.messageType === MESSAGE_TYPE.IMG) {
      continue;
    }
    return canMergeDiceComment(previous, current) ? index : -1;
  }
  return -1;
}

function appendDiceComment(previous: GululuGalCompiledMessage, comment: GululuGalCompiledMessage): GululuGalCompiledMessage {
  const request = cloneJson(previous.request);
  const commentContent = comment.request.content?.trim();
  if (!commentContent) {
    return previous;
  }
  const existing = getExistingDiceText(request);
  const replies = [...(existing.replies ?? [])];
  if (!replies.some(reply => reply.content === commentContent)) {
    replies.push({
      content: commentContent,
      customRoleName: "旁白",
    });
  }
  const diceText = {
    commandContent: existing.commandContent,
    replies,
    replyContent: replies.map(reply => reply.content).join("\n"),
  };
  request.extra = buildDiceExtra(request, diceText);
  request.webgal = mergeDiceRenderText(request.webgal, diceText);
  return {
    ...previous,
    request,
  };
}

function mergeAdjacentDiceComments(messages: GululuGalCompiledMessage[]) {
  const merged: GululuGalCompiledMessage[] = [];
  for (const message of messages) {
    const targetIndex = findDiceCommentTargetIndex(merged, message);
    if (targetIndex >= 0) {
      merged[targetIndex] = appendDiceComment(merged[targetIndex]!, message);
      continue;
    }
    merged.push(message);
  }
  return merged;
}

function removeOmittedAuthorStageComments(messages: GululuGalCompiledMessage[]) {
  return messages.filter(message => !OMITTED_AUTHOR_STAGE_COMMENT_EVENT_INDICES.has(message.source.eventIndex));
}

function materializeRequest(params: {
  avatarIds: Map<string, number>;
  direction: GululuGalDirectionEntry;
  roleIds: Map<string, number>;
  sourceMessage: SourceMessagePlan;
  targetRoomId: number;
  warnings: string[];
}): ChatMessageRequest {
  const request = cloneJson(params.sourceMessage.request);
  request.roomId = params.targetRoomId;

  const roleKey = params.direction.roleKey === null ? undefined : params.direction.roleKey ?? params.sourceMessage.roleKey;
  const avatarKey = params.direction.avatarKey === null ? undefined : params.direction.avatarKey ?? params.sourceMessage.avatarKey;
  if (roleKey) {
    const roleId = params.roleIds.get(roleKey);
    if (!roleId) {
      throw new Error(`缺少复用角色映射：${roleKey}`);
    }
    request.roleId = roleId;
  }
  else if (request.roleId == null || request.roleId > 0) {
    request.roleId = -1;
  }

  if (avatarKey) {
    const avatarId = params.avatarIds.get(avatarKey);
    if (!avatarId) {
      throw new Error(`缺少复用头像映射：${avatarKey}`);
    }
    request.avatarId = avatarId;
  }
  else if (request.avatarId == null || request.avatarId > 0) {
    request.avatarId = -1;
  }

  request.messageType = normalizeMessageType(params.direction.messageType, request.messageType);
  if (params.direction.customRoleName === null) {
    delete request.customRoleName;
  }
  else if (typeof params.direction.customRoleName === "string") {
    request.customRoleName = params.direction.customRoleName;
  }

  const annotations = normalizeAnnotations(params.direction.annotations);
  if (annotations) {
    request.annotations = annotations;
  }
  else {
    delete request.annotations;
  }
  if (request.messageType === MESSAGE_TYPE.DICE) {
    const diceText = preserveExistingDiceSplit(request, getDirectedDiceText(params.direction.webgal));
    request.webgal = mergeWebgal(params.sourceMessage.source, mergeDiceRenderText(params.direction.webgal, diceText));
    if (diceText.commandContent) {
      request.content = diceText.commandContent;
    }
    request.customRoleName = request.customRoleName || "骰娘";
    request.extra = buildDiceExtra(request, diceText);
  }
  else {
    request.webgal = mergeWebgal(params.sourceMessage.source, params.direction.webgal);
    request.extra = request.extra ?? {};
  }
  if (!request.content) {
    params.warnings.push(`第 ${params.sourceMessage.source.eventIndex} 条消息内容为空`);
  }
  return request;
}

function materializeImageShowRequest(params: {
  avatarAssets: Map<string, AvatarAssetMapValue>;
  direction: GululuGalDirectionEntry;
  sourceMessage: SourceMessagePlan;
  targetRoomId: number;
}): ChatMessageRequest | undefined {
  const avatarKey = resolveImageShowAvatarKey(params.direction, params.sourceMessage);
  if (!avatarKey) {
    return undefined;
  }
  const asset = params.avatarAssets.get(avatarKey);
  const mediaFileId = asset?.mediaFileId;
  if (!mediaFileId) {
    throw new Error(`展示图缺少已上传媒体文件：${avatarKey}`);
  }
  const annotations = ["image.show"];
  if (getImageShowClearBefore(params.direction)) {
    annotations.unshift("image.clear");
  }
  const fileName = getImageShowFileName(params.direction) ?? asset?.fileName ?? fileNameFromImagePath(asset?.imagePath);
  const width = getImageShowDimension(params.direction, "width") ?? asset?.width;
  const height = getImageShowDimension(params.direction, "height") ?? asset?.height;
  if (!width || !height) {
    throw new Error(`展示图缺少宽高：${avatarKey}`);
  }
  return {
    annotations,
    avatarId: -1,
    content: "",
    extra: {
      imageMessage: {
        background: false,
        ...(fileName ? { fileName } : {}),
        height,
        source: {
          fileId: mediaFileId,
          kind: "internal",
        },
        width,
      },
    },
    messageType: MESSAGE_TYPE.IMG,
    roleId: -1,
    roomId: params.targetRoomId,
    webgal: mergeWebgal(params.sourceMessage.source, {
      imageShow: {
        avatarKey,
      },
    }),
  };
}

function toInsertOperation(request: ChatMessageRequest): RoomMessageStreamPatchOperation {
  return {
    op: "insert",
    message: {
      messageType: request.messageType,
      content: request.content ?? "",
      ...(Array.isArray(request.annotations) ? { annotations: request.annotations } : {}),
      extra: request.extra,
      ...(request.webgal !== undefined ? { webgal: request.webgal } : {}),
      ...(typeof request.roleId === "number" ? { roleId: request.roleId } : {}),
      ...(typeof request.avatarId === "number" ? { avatarId: request.avatarId } : {}),
      ...(typeof request.customRoleName === "string" ? { customRoleName: request.customRoleName } : {}),
      ...(typeof request.replayMessageId === "number" ? { replayMessageId: request.replayMessageId } : {}),
      ...(typeof request.position === "number" ? { position: request.position } : {}),
    },
  };
}

export function buildGululuGalDirectedImportPlan(
  liveResult: SourceLiveResult,
  directingPlan: GululuGalDirectingPlan,
  options: { roomName?: string; stagePlan?: GululuGalStagePlan; stagePolicy?: StagePolicy; targetRoomId?: number; targetSpaceId: number },
): GululuGalDirectedImportPlan {
  if (!Number.isInteger(options.targetSpaceId) || options.targetSpaceId <= 0) {
    throw new Error("targetSpaceId must be a positive integer");
  }
  if (options.targetRoomId != null && (!Number.isInteger(options.targetRoomId) || options.targetRoomId <= 0)) {
    throw new Error("targetRoomId must be a positive integer");
  }
  if (directingPlan.schemaVersion !== 1) {
    throw new Error("directing plan schemaVersion must be 1");
  }

  const sourceMessages = liveResult.plan?.messages ?? [];
  if (sourceMessages.length === 0) {
    throw new Error("live result plan.messages must not be empty");
  }
  const policyDirectingPlan = applyStagePolicy(liveResult, directingPlan, options.stagePolicy);
  const effectiveDirectingPlan = options.stagePlan
    ? applyStagePlan(liveResult, policyDirectingPlan, options.stagePlan)
    : policyDirectingPlan;
  const directionsByIndex = new Map<number, GululuGalDirectionEntry>();
  for (const entry of effectiveDirectingPlan.entries ?? []) {
    if (!Number.isInteger(entry.eventIndex) || entry.eventIndex <= 0) {
      throw new Error("direction entry eventIndex must be a positive integer");
    }
    if (directionsByIndex.has(entry.eventIndex)) {
      throw new Error(`重复的导演计划事件：${entry.eventIndex}`);
    }
    directionsByIndex.set(entry.eventIndex, entry);
  }
  if (directionsByIndex.size !== sourceMessages.length) {
    throw new Error(`导演计划条数不匹配：${directionsByIndex.size}/${sourceMessages.length}`);
  }

  const roleIds = buildMap(liveResult.result?.roles, "roleId", "角色");
  const avatarIds = buildMap(liveResult.result?.avatars, "avatarId", "头像");
  const avatarAssets = buildAvatarAssetMap(liveResult);
  const warnings: string[] = [];
  const messages: GululuGalCompiledMessage[] = [];
  for (const sourceMessage of sourceMessages) {
    const direction = directionsByIndex.get(sourceMessage.source.eventIndex);
    if (!direction) {
      throw new Error(`缺少导演计划事件：${sourceMessage.source.eventIndex}`);
    }
    const imageShowRequest = materializeImageShowRequest({
      avatarAssets,
      direction,
      sourceMessage,
      targetRoomId: options.targetRoomId ?? 1,
    });
    if (imageShowRequest) {
      messages.push({
        eventIndex: sourceMessage.source.eventIndex,
        request: imageShowRequest,
        source: sourceMessage.source,
      });
    }
    messages.push({
      eventIndex: sourceMessage.source.eventIndex,
      request: materializeRequest({
        avatarIds,
        direction,
        roleIds,
        sourceMessage,
        targetRoomId: options.targetRoomId ?? 1,
        warnings,
      }),
      source: sourceMessage.source,
    });
  }

  const mergedMessages = mergeAdjacentDiceComments(removeOmittedAuthorStageComments(messages));

  return {
    messages: mergedMessages,
    reused: {
      avatars: [...avatarIds.entries()].map(([key, avatarId]) => {
        const source = liveResult.result?.avatars?.find(item => item.key === key);
        return { avatarId, key, ...(source?.roleId ? { roleId: source.roleId } : {}) };
      }),
      roles: [...roleIds.entries()].map(([key, roleId]) => ({ key, roleId })),
    },
    source: liveResult.plan?.source,
    stats: {
      diceMessages: mergedMessages.filter(message => message.request.messageType === MESSAGE_TYPE.DICE).length,
      messages: mergedMessages.length,
      messagesWithAnnotations: mergedMessages.filter(message => (message.request.annotations ?? []).length > 0).length,
      messagesWithWebgal: mergedMessages.filter(message => message.request.webgal && Object.keys(message.request.webgal).length > 0).length,
      reusedAvatars: avatarIds.size,
      reusedRoles: roleIds.size,
    },
    target: {
      roomId: options.targetRoomId,
      roomName: options.roomName,
      spaceId: options.targetSpaceId,
    },
    warnings,
  };
}

async function createTargetRoom(
  plan: GululuGalDirectedImportPlan,
  client: GululuGalDirectedClient,
) {
  if (plan.target.roomId) {
    return undefined;
  }
  if (!client.spaceController) {
    throw new Error("当前 client 缺少 spaceController，无法创建房间");
  }
  const room = assertApiData(
    await client.spaceController.createRoom({
      roomName: plan.target.roomName ?? "GAL 演出版",
      spaceId: plan.target.spaceId,
    }),
    "创建房间失败",
  );
  if (!room.roomId) {
    throw new Error("创建房间响应缺少 roomId");
  }
  plan.target.roomId = room.roomId;
  return {
    name: room.name,
    roomId: room.roomId,
    spaceId: room.spaceId,
  };
}

async function ensureRolesInRoom(
  roomId: number,
  roleIds: number[],
  client: GululuGalDirectedClient,
) {
  const existing = assertApiSuccess(await client.roomRoleController.roomNpcRole(roomId), "读取房间 NPC 角色失败") ?? [];
  const existingIds = new Set(existing.map(role => role.roleId).filter((id): id is number => typeof id === "number" && id > 0));
  const uniqueRoleIds = Array.from(new Set(roleIds));
  const missing = uniqueRoleIds.filter(roleId => !existingIds.has(roleId));
  if (missing.length > 0) {
    assertApiSuccess(
      await client.roomRoleController.addRole({
        roleIdList: missing,
        roomId,
        type: NPC_ROLE_TYPE,
      }),
      "拉入复用 NPC 角色失败",
    );
  }
  return {
    addedRoleIds: missing,
    reusedRoleIds: uniqueRoleIds.filter(roleId => existingIds.has(roleId)),
  };
}

async function patchMessagesInChunks(
  roomId: number,
  messages: GululuGalCompiledMessage[],
  client: GululuGalDirectedClient,
  chunkSize: number,
) {
  const createdMessages: Array<{ messageId?: number; sourceEventIndex: number; syncId?: number }> = [];
  for (let start = 0; start < messages.length; start += chunkSize) {
    const chunk = messages.slice(start, start + chunkSize);
    const result = assertApiSuccess(
      await client.chatController.patchRoomMessages({
        mutationMeta: {
          operationCause: "normal",
          sourceSurface: "import",
        },
        operations: chunk.map(message => toInsertOperation(message.request)),
        roomId,
      }),
      `批量写入消息失败：${start + 1}-${start + chunk.length}`,
    ) ?? [];
    chunk.forEach((compiled, index) => {
      const created = result[index];
      createdMessages.push({
        messageId: created?.messageId,
        sourceEventIndex: compiled.eventIndex,
        syncId: created?.syncId,
      });
    });
  }
  return createdMessages;
}

export async function applyGululuGalDirectedImportPlan(
  plan: GululuGalDirectedImportPlan,
  client: GululuGalDirectedClient,
  options: { patchChunkSize?: number } = {},
): Promise<GululuGalDirectedApplyResult> {
  const createdRoom = await createTargetRoom(plan, client);
  const roomId = plan.target.roomId;
  if (!roomId) {
    throw new Error("target room id is required");
  }
  for (const message of plan.messages) {
    message.request.roomId = roomId;
  }

  const roomRoles = await ensureRolesInRoom(roomId, plan.reused.roles.map(role => role.roleId), client);
  const messages = await patchMessagesInChunks(
    roomId,
    plan.messages,
    client,
    options.patchChunkSize ?? DEFAULT_PATCH_CHUNK_SIZE,
  );
  const sidebarTree = await ensureRoomInSidebarTree({
    target: {
      roomId,
      spaceId: plan.target.spaceId,
    },
  } as GululuLiveImportPlan, client as unknown as Parameters<typeof ensureRoomInSidebarTree>[1]);
  return {
    ...(createdRoom ? { createdRoom } : {}),
    messages,
    roomRoles,
    sidebarTree,
  };
}

function buildDefaultOutPath(liveResultPath: string, apply: boolean | undefined) {
  const suffix = apply ? ".gal-directed-live-import-result.json" : ".gal-directed-live-import-plan.json";
  return liveResultPath.replace(/\.live-import-result\.json$/, suffix);
}

async function readJsonFile<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function createClient(args: GululuGalDirectedImportArgs): GululuGalDirectedClient {
  return new TuanChat({
    BASE: args.baseUrl ?? "http://127.0.0.1:8081",
    TOKEN: args.authToken || env.TUANCHAT_AUTH_TOKEN,
  }) as unknown as GululuGalDirectedClient;
}

export async function runGululuGalDirectedImport(argv: string[]) {
  const args = parseGululuGalDirectedImportArgs(argv);
  if (!args.liveResult) {
    throw new Error("--live-result is required");
  }
  if (!args.directingPlan) {
    throw new Error("--directing-plan is required");
  }
  if (!args.targetSpaceId) {
    throw new Error("--target-space-id is required");
  }
  if (!args.targetRoomId && !args.roomName) {
    throw new Error("--room-name is required when --target-room-id is omitted");
  }

  const liveResultPath = path.resolve(args.liveResult);
  const directingPlanPath = path.resolve(args.directingPlan);
  const liveResult = await readJsonFile<SourceLiveResult>(liveResultPath);
  const directingPlan = await readJsonFile<GululuGalDirectingPlan>(directingPlanPath);
  const stagePlan = args.stagePlan ? await readJsonFile<GululuGalStagePlan>(path.resolve(args.stagePlan)) : undefined;
  const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
    roomName: args.roomName,
    stagePlan,
    stagePolicy: args.stagePolicy,
    targetRoomId: args.targetRoomId,
    targetSpaceId: args.targetSpaceId,
  });
  const outputPath = path.resolve(args.out ?? buildDefaultOutPath(liveResultPath, args.apply));

  if (!args.apply) {
    await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    return { outputPath, plan };
  }

  const client = createClient(args);
  const result = await applyGululuGalDirectedImportPlan(plan, client, { patchChunkSize: args.patchChunkSize });
  await writeFile(outputPath, `${JSON.stringify({ plan, result }, null, 2)}\n`, "utf8");
  return { outputPath, plan, result };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuGalDirectedImport(process.argv.slice(2))
    .then(({ outputPath, plan, result }) => {
      process.stdout.write(`${JSON.stringify({
        applied: Boolean(result),
        outputPath,
        stats: plan.stats,
        target: plan.target,
      }, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
