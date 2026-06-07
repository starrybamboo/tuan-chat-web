import type { Sharp } from "sharp";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process, { env } from "node:process";
import { fileURLToPath } from "node:url";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type SpriteTransform = NonNullable<RoleAvatar["spriteTransform"]>;

type GululuReplayImportPackage = {
  messages?: GululuReplayMessage[];
  roles?: GululuReplayRole[];
  source?: {
    floorCount?: number;
    fromFloor?: number;
    title?: string;
    toFloor?: number;
  };
  stats?: Record<string, number>;
};

type GululuReplayRole = {
  aliases?: Array<{ count?: number; name?: string }>;
  avatarImages?: Array<{ count?: number; firstFloor?: number; imagePath?: string }>;
  defaultAvatarPath?: string;
  name: string;
};

type GululuReplayMessage = {
  bgmName?: string;
  content?: string;
  diceDescription?: string;
  diceReplies?: string[];
  floor?: number;
  imagePath?: string;
  kind: "dialog" | "narration" | "dice" | "bgm";
  options?: string[];
  roleName?: string;
  rollText?: string;
  sourceTime?: string;
  speakerName?: string;
};

type SidebarLeafNode = {
  fallbackTitle?: string;
  nodeId: string;
  targetId: number | string;
  type: "room" | "doc";
};

type SidebarTree = {
  categories: Array<{
    categoryId: string;
    collapsed?: boolean;
    items: SidebarLeafNode[];
    name: string;
  }>;
  schemaVersion: 2;
};

type SidebarTreeResponse = {
  spaceId?: number;
  treeJson?: string;
  version?: number;
};

type RoomListResponse = {
  rooms?: Array<{
    name?: string;
    roomId?: number;
  }>;
  spaceId?: number;
};

export type GululuLiveImportArgs = {
  agentId?: string;
  apply?: boolean;
  authToken?: string;
  baseUrl?: string;
  dicerAvatarId?: number;
  dicerRoleId?: number;
  input?: string;
  opusId?: number;
  out?: string;
  skipAvatarUpload?: boolean;
  sourceKey?: string;
  sourceRoot?: string;
  targetRoomId?: number;
  targetSpaceId?: number;
};

export type GululuLiveImportRolePlan = {
  createRoleRequest: RoleCreateRequest;
  displayName: string;
  key: string;
  name: string;
  sourceKey: string;
};

export type GululuLiveImportAvatarPlan = {
  avatarTitle: Record<string, string>;
  fileName: string;
  filePath?: string;
  imagePath: string;
  key: string;
  roleKey: string;
  sourceKey: string;
  upload: boolean;
};

export type GululuLiveImportMessagePlan = {
  avatarKey?: string;
  kind: GululuReplayMessage["kind"];
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

export type GululuLiveImportPlan = {
  avatars: GululuLiveImportAvatarPlan[];
  messages: GululuLiveImportMessagePlan[];
  roles: GululuLiveImportRolePlan[];
  source: {
    agentId?: string;
    key: string;
    title?: string;
    workId?: string;
  };
  stats: {
    avatars: number;
    messages: number;
    roles: number;
    warnings: number;
  };
  target: {
    roomId: number;
    spaceId?: number;
  };
  warnings: string[];
};

export type GululuLiveImportClient = {
  avatarController: {
    setRoleAvatar: (requestBody: { category?: string; roleId?: number }) => Promise<ApiResult<number>>;
    updateRoleAvatar: (requestBody: RoleAvatar) => Promise<ApiResult<RoleAvatar>>;
  };
  chatController: {
    sendMessage1: (requestBody: ChatMessageRequest) => Promise<ApiResult<{ messageId?: number }>>;
  };
  roleController: {
    createRole: (requestBody: RoleCreateRequest) => Promise<ApiResult<number>>;
  };
  roomRoleController: {
    addRole: (requestBody: { roleIdList: number[]; roomId: number; type?: number }) => Promise<ApiResult<unknown>>;
    roomNpcRole: (roomId: number) => Promise<ApiResult<UserRole[]>>;
  };
  roomController?: {
    getUserRooms: (spaceId: number) => Promise<ApiResult<RoomListResponse>>;
  };
  spaceSidebarTreeController?: {
    getSidebarTree: (spaceId: number) => Promise<ApiResult<SidebarTreeResponse>>;
    setSidebarTree: (requestBody: {
      expectedVersion: number;
      spaceId: number;
      treeJson: string;
    }) => Promise<ApiResult<SidebarTreeResponse>>;
  };
};

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success?: boolean;
};

type UploadedAvatarImage = {
  mediaFileId: number;
  spriteTransform: SpriteTransform;
};

type ApplyLiveImportDeps = {
  uploadAvatarImage?: (params: {
    client: GululuLiveImportClient;
    filePath: string;
  }) => Promise<UploadedAvatarImage>;
};

export type GululuLiveImportApplyResult = {
  avatars: Array<{
    action: "created";
    avatarId: number;
    key: string;
    mediaFileId?: number;
    roleId: number;
    spriteTransform?: SpriteTransform;
  }>;
  messages: Array<{ messageId?: number; sourceEventIndex: number }>;
  roles: Array<{ action: "created" | "reused"; key: string; roleId: number }>;
  sidebarTree?: {
    action: "added" | "already-present" | "skipped";
    reason?: string;
    roomId: number;
    spaceId?: number;
    version?: number;
  };
};

const NPC_ROLE_TYPE = 2;
const ROLE_AVATAR_CATEGORY = "gululu-replay";
const AVATAR_UPLOAD_SCENE = 3;
const MAX_MESSAGE_CONTENT_LENGTH = 1024;
const WEBGAL_STAGE_WIDTH = 2560;
const WEBGAL_STAGE_HEIGHT = 1440;
const IMPORTED_SPRITE_SAFE_TOP_Y = 80;
const IMPORTED_FULL_BODY_BOTTOM_Y = 1020;
const IMPORTED_AVATAR_BOTTOM_Y = 990;

type ImportedSpriteKind = "full-body" | "head-bust" | "framed-avatar";

export type GululuImportedSpriteVisibleBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type GululuImportedSpriteImageMetadata = {
  hasAlpha?: boolean;
  height?: number;
  visibleBounds?: GululuImportedSpriteVisibleBounds;
  width?: number;
};

type ImportedSpriteLayoutPreset = {
  bottomY: number;
  maxScale: number;
  maxWidth: number;
  minScale: number;
  targetHeight: number;
};

const IMPORTED_FULL_BODY_SPRITE_LAYOUT: ImportedSpriteLayoutPreset = {
  bottomY: IMPORTED_FULL_BODY_BOTTOM_Y,
  maxScale: 0.78,
  maxWidth: 920,
  minScale: 0.18,
  targetHeight: 920,
};

const IMPORTED_HEAD_BUST_SPRITE_LAYOUT: ImportedSpriteLayoutPreset = {
  bottomY: IMPORTED_AVATAR_BOTTOM_Y,
  maxScale: 0.72,
  maxWidth: 780,
  minScale: 0.16,
  targetHeight: 660,
};

const IMPORTED_FRAMED_CLOSEUP_SPRITE_LAYOUT: ImportedSpriteLayoutPreset = {
  bottomY: IMPORTED_AVATAR_BOTTOM_Y,
  maxScale: 0.7,
  maxWidth: 820,
  minScale: 0.16,
  targetHeight: 620,
};

const IMPORTED_FRAMED_WIDE_SPRITE_LAYOUT: ImportedSpriteLayoutPreset = {
  bottomY: IMPORTED_AVATAR_BOTTOM_Y,
  maxScale: 0.64,
  maxWidth: 1040,
  minScale: 0.14,
  targetHeight: 560,
};

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

function roundTransformNumber(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeVisibleBounds(
  input: GululuImportedSpriteImageMetadata,
  width: number,
  height: number,
): GululuImportedSpriteVisibleBounds {
  const bounds = input.visibleBounds;
  if (bounds
    && Number.isFinite(bounds.x)
    && Number.isFinite(bounds.y)
    && Number.isFinite(bounds.width)
    && Number.isFinite(bounds.height)
    && bounds.width > 0
    && bounds.height > 0
  ) {
    return {
      height: clampNumber(bounds.height, 1, height),
      width: clampNumber(bounds.width, 1, width),
      x: clampNumber(bounds.x, 0, width),
      y: clampNumber(bounds.y, 0, height),
    };
  }
  return { height, width, x: 0, y: 0 };
}

function resolveImportedSpriteKind(input: GululuImportedSpriteImageMetadata, visibleBounds: GululuImportedSpriteVisibleBounds) {
  const visibleRatio = visibleBounds.width / visibleBounds.height;
  if (input.hasAlpha === true && visibleRatio <= 0.9 && visibleBounds.height >= 480) {
    return "full-body";
  }
  if (input.hasAlpha === true) {
    return "head-bust";
  }
  return "framed-avatar";
}

function resolveImportedSpriteLayoutPreset(
  kind: ImportedSpriteKind,
  visibleBounds: GululuImportedSpriteVisibleBounds,
): ImportedSpriteLayoutPreset {
  if (kind === "full-body") {
    return IMPORTED_FULL_BODY_SPRITE_LAYOUT;
  }
  if (kind === "head-bust") {
    return IMPORTED_HEAD_BUST_SPRITE_LAYOUT;
  }
  const visibleRatio = visibleBounds.width / visibleBounds.height;
  if (visibleRatio >= 1.25) {
    return IMPORTED_FRAMED_WIDE_SPRITE_LAYOUT;
  }
  return IMPORTED_FRAMED_CLOSEUP_SPRITE_LAYOUT;
}

function buildImportedSpriteFallbackTransform(): SpriteTransform {
  return {
    alpha: 1,
    positionX: 0,
    positionY: -80,
    rotation: 0,
    scale: 0.42,
  };
}

export function buildGululuImportedSpriteTransform(input: GululuImportedSpriteImageMetadata): SpriteTransform {
  const width = Number(input.width ?? 0);
  const height = Number(input.height ?? 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return buildImportedSpriteFallbackTransform();
  }

  const containScale = Math.min(WEBGAL_STAGE_WIDTH / width, WEBGAL_STAGE_HEIGHT / height);
  const visibleBounds = normalizeVisibleBounds(input, width, height);
  const kind = resolveImportedSpriteKind(input, visibleBounds);
  const preset = resolveImportedSpriteLayoutPreset(kind, visibleBounds);
  const renderedVisibleWidthAtScaleOne = visibleBounds.width * containScale;
  const renderedVisibleHeightAtScaleOne = visibleBounds.height * containScale;
  const scale = clampNumber(
    Math.min(
      preset.maxWidth / renderedVisibleWidthAtScaleOne,
      preset.targetHeight / renderedVisibleHeightAtScaleOne,
    ),
    preset.minScale,
    preset.maxScale,
  );

  // Transform origin is the whole image center, so align the visible bottom edge, not the file bounds.
  const visibleBottomOffset = (visibleBounds.y + visibleBounds.height - height / 2) * containScale * scale;
  const visibleTopOffset = (visibleBounds.y - height / 2) * containScale * scale;
  let centerY = preset.bottomY - visibleBottomOffset;
  const minCenterY = IMPORTED_SPRITE_SAFE_TOP_Y - visibleTopOffset;
  if (centerY < minCenterY) {
    centerY = minCenterY;
  }

  return {
    alpha: 1,
    positionX: 0,
    positionY: roundTransformNumber(centerY - WEBGAL_STAGE_HEIGHT / 2),
    rotation: 0,
    scale: roundTransformNumber(scale),
  };
}

async function readVisibleAlphaBounds(image: Sharp): Promise<GululuImportedSpriteVisibleBounds | undefined> {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha == null || alpha <= 8) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    return undefined;
  }
  return {
    height: maxY - minY + 1,
    width: maxX - minX + 1,
    x: minX,
    y: minY,
  };
}

export async function readGululuImportedSpriteImageMetadata(filePath: string): Promise<GululuImportedSpriteImageMetadata> {
  const sharpModule = await import("sharp");
  const image = sharpModule.default(filePath).rotate();
  const metadata = await image.metadata();
  const hasAlpha = metadata.hasAlpha === true;
  return {
    hasAlpha,
    height: metadata.height,
    ...(hasAlpha ? { visibleBounds: await readVisibleAlphaBounds(image) } : {}),
    width: metadata.width,
  };
}

export function parseLiveImportArgs(argv: string[]): GululuLiveImportArgs {
  const args: GululuLiveImportArgs = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") {
      args.apply = true;
    }
    else if (arg === "--skip-avatar-upload") {
      args.skipAvatarUpload = true;
    }
    else if (arg === "--input") {
      args.input = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out") {
      args.out = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--source-root") {
      args.sourceRoot = readValue(argv, index, arg);
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
    else if (arg === "--dicer-role-id") {
      args.dicerRoleId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--dicer-avatar-id") {
      args.dicerAvatarId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--opus-id") {
      args.opusId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--source-key") {
      args.sourceKey = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--agent-id") {
      args.agentId = readValue(argv, index, arg);
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
  }
  return args;
}

function normalizeImagePath(rawPath: string) {
  return rawPath.trim().replace(/\\/g, "/").replace(/^\.\.\/images\//, "");
}

function roleKey(roleName: string) {
  return `role:${roleName}`;
}

function avatarKey(roleName: string, imagePath: string) {
  return `${roleKey(roleName)}:image:${normalizeImagePath(imagePath)}`;
}

function sourceKeyForRole(roleName: string) {
  return `gululu:${roleKey(roleName)}`;
}

function sourceKeyForAvatar(imagePath: string) {
  return `gululu:image:${normalizeImagePath(imagePath)}`;
}

function buildWorkId(importPackage: GululuReplayImportPackage, options: GululuLiveImportArgs) {
  if (options.opusId) {
    return `opus-${options.opusId}`;
  }
  const sourceKey = options.sourceKey ?? "";
  const matched = sourceKey.match(/opus-\d+/i)?.[0];
  return matched;
}

function buildSource(importPackage: GululuReplayImportPackage, options: GululuLiveImportArgs) {
  const source = importPackage.source ?? {};
  const workId = buildWorkId(importPackage, options);
  const fromFloor = source.fromFloor ?? "unknown";
  const toFloor = source.toFloor ?? "unknown";
  return {
    agentId: options.agentId,
    key: options.sourceKey ?? `${workId ?? "gululu"}:floors:${fromFloor}-${toFloor}`,
    title: source.title,
    workId,
  };
}

function resolveImageFilePath(sourceRoot: string | undefined, imagePath: string) {
  if (!sourceRoot) {
    return undefined;
  }
  const normalized = normalizeImagePath(imagePath);
  const direct = path.resolve(sourceRoot, normalized);
  if (existsSync(direct)) {
    return direct;
  }
  const underImages = path.resolve(sourceRoot, "images", normalized);
  if (existsSync(underImages)) {
    return underImages;
  }
  return underImages;
}

function buildDefaultOutPath(inputPath: string, apply: boolean | undefined) {
  const suffix = apply ? ".live-import-result.json" : ".live-import-plan.json";
  return inputPath.replace(/\.tuanchat-replay-import\.json$/, suffix);
}

async function inferSourceRoot(inputPath: string) {
  let current = path.dirname(inputPath);
  for (let depth = 0; depth < 5; depth++) {
    const imagesDir = path.join(current, "images");
    const metaPath = path.join(current, "meta.json");
    if (existsSync(imagesDir) || existsSync(metaPath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return undefined;
}

function contentOrEmpty(message: GululuReplayMessage) {
  return message.content ?? "";
}

function hasDiceRoll(text: string) {
  const hasDiceExpression = (value: string) => /\d*d\d+|1d/i.test(value);
  const chineseBracketBodies = text.match(/【([^】]*)】/g) ?? [];
  if (chineseBracketBodies.some(hasDiceExpression)) {
    return true;
  }
  return (text.match(/\[([^\]]*)\]/g) ?? []).some((token) => {
    const separatorIndex = token.search(/[:：=]/);
    return separatorIndex > 0 && hasDiceExpression(token.slice(0, separatorIndex));
  });
}

function buildDiceVisibleContent(message: GululuReplayMessage) {
  const content = contentOrEmpty(message).trim();
  const description = message.diceDescription?.trim();
  const command = message.rollText?.trim() || (description && description !== content ? description : "");
  const options = (message.options ?? []).map(option => option.trim()).filter(Boolean);
  if (command) {
    return [command, ...options].join("\n").trim();
  }
  if (description && description !== content) {
    return [description, ...options, content].join("\n").trim();
  }
  return [content || description || "", ...options].filter(Boolean).join("\n").trim();
}

function buildDiceReplyContents(message: GululuReplayMessage) {
  const explicitReplies = Array.isArray(message.diceReplies)
    ? message.diceReplies.map(reply => reply.trim()).filter(Boolean)
    : [];
  if (explicitReplies.length > 0) {
    return explicitReplies;
  }
  const result = contentOrEmpty(message).trim();
  return result ? [result] : [];
}

function buildDiceExtra(message: GululuReplayMessage, options: GululuLiveImportArgs) {
  const visibleContent = buildDiceVisibleContent(message);
  const replyContents = buildDiceReplyContents(message);
  const result = replyContents.join("\n") || visibleContent;
  const replies = replyContents.map(replyContent => ({
    content: replyContent,
    customRoleName: "骰娘",
    ...(options.dicerRoleId ? { roleId: options.dicerRoleId } : {}),
    ...(options.dicerAvatarId ? { avatarId: options.dicerAvatarId } : {}),
  }));
  return {
    diceResult: { result },
    diceTurn: {
      ...(visibleContent ? { command: visibleContent } : {}),
      replies,
    },
  };
}

function buildBgmText(message: GululuReplayMessage) {
  const name = message.bgmName || contentOrEmpty(message).replace(/^\s*BGM\s*[:：]\s*/i, "").trim();
  return name ? `[BGM] ${name}` : contentOrEmpty(message);
}

function safeMessageContent(content: string, warnings: string[], context: string) {
  if (content.length <= MAX_MESSAGE_CONTENT_LENGTH) {
    return content;
  }
  warnings.push(`${context} 内容超过 ${MAX_MESSAGE_CONTENT_LENGTH} 字符，已截断；后续需要补批量拆分策略`);
  return content.slice(0, MAX_MESSAGE_CONTENT_LENGTH);
}

function createNarrationRequest(roomId: number, content: string): ChatMessageRequest {
  return {
    avatarId: -1,
    content,
    customRoleName: "旁白",
    extra: {},
    messageType: MESSAGE_TYPE.TEXT,
    roleId: -1,
    roomId,
  };
}

function createMessageSource(message: GululuReplayMessage, eventIndex: number) {
  return {
    eventIndex,
    ...(message.floor != null ? { floor: message.floor } : {}),
    ...(message.imagePath ? { imagePath: normalizeImagePath(message.imagePath) } : {}),
    ...(message.sourceTime ? { sourceTime: message.sourceTime } : {}),
    ...(message.speakerName ? { speakerName: message.speakerName } : {}),
  };
}

function collectAvatarImagePaths(role: GululuReplayRole, messages: GululuReplayMessage[]) {
  const paths = new Set<string>();
  for (const avatar of role.avatarImages ?? []) {
    if (avatar.imagePath) {
      paths.add(normalizeImagePath(avatar.imagePath));
    }
  }
  if (role.defaultAvatarPath) {
    paths.add(normalizeImagePath(role.defaultAvatarPath));
  }
  for (const message of messages) {
    if (message.kind === "dialog" && message.roleName === role.name && message.imagePath) {
      paths.add(normalizeImagePath(message.imagePath));
    }
  }
  return [...paths];
}

function firstAvatarPathFor(role: GululuReplayRole | undefined) {
  return role?.defaultAvatarPath
    ?? role?.avatarImages?.find(avatar => avatar.imagePath)?.imagePath;
}

export function buildGululuLiveImportPlan(
  importPackage: GululuReplayImportPackage,
  options: GululuLiveImportArgs,
): GululuLiveImportPlan {
  if (!Number.isInteger(options.targetRoomId) || !options.targetRoomId || options.targetRoomId <= 0) {
    throw new Error("targetRoomId must be a positive integer");
  }
  if (!Number.isInteger(options.targetSpaceId) || !options.targetSpaceId || options.targetSpaceId <= 0) {
    throw new Error("targetSpaceId must be a positive integer");
  }

  const source = buildSource(importPackage, options);
  const warnings: string[] = [];
  const messages = importPackage.messages ?? [];
  const rolesByName = new Map((importPackage.roles ?? []).map(role => [role.name, role]));

  const roles = (importPackage.roles ?? [])
    .filter(role => firstAvatarPathFor(role))
    .map((role): GululuLiveImportRolePlan => ({
      createRoleRequest: {
        description: `由咕噜噜 replay 导入：${source.title ?? source.key}`,
        extra: {
          gululuReplaySource: source.key,
          gululuReplayRole: role.name,
        },
        roleName: role.name,
        spaceId: options.targetSpaceId,
        type: NPC_ROLE_TYPE,
      },
      displayName: role.name,
      key: roleKey(role.name),
      name: role.name,
      sourceKey: sourceKeyForRole(role.name),
    }));

  const rolePlanKeys = new Set(roles.map(role => role.key));
  const avatars = roles.flatMap((rolePlan): GululuLiveImportAvatarPlan[] => {
    const role = rolesByName.get(rolePlan.name);
    return collectAvatarImagePaths(role!, messages).map((imagePath, index) => {
      const filePath = resolveImageFilePath(options.sourceRoot, imagePath);
      if (!options.skipAvatarUpload && filePath && !existsSync(filePath)) {
        warnings.push(`头像文件不存在：${filePath}`);
      }
      const fileName = path.basename(imagePath);
      const upload = !options.skipAvatarUpload && typeof filePath === "string" && existsSync(filePath);
      return {
        avatarTitle: { label: index === 0 ? "默认" : fileName },
        fileName,
        ...(filePath ? { filePath } : {}),
        imagePath,
        key: avatarKey(rolePlan.name, imagePath),
        roleKey: rolePlan.key,
        sourceKey: sourceKeyForAvatar(imagePath),
        upload,
      };
    });
  });
  const avatarKeys = new Set(avatars.map(avatar => avatar.key));

  const plannedMessages: GululuLiveImportMessagePlan[] = [];
  messages.forEach((message, index) => {
    const eventIndex = index + 1;
    const sourceInfo = createMessageSource(message, eventIndex);

    if (message.kind === "dialog") {
      const roleName = message.roleName || message.speakerName || "";
      const role = rolesByName.get(roleName);
      const imagePath = normalizeImagePath(message.imagePath || firstAvatarPathFor(role) || "");
      const nextRoleKey = roleKey(roleName);
      const nextAvatarKey = imagePath ? avatarKey(roleName, imagePath) : undefined;
      if (!rolePlanKeys.has(nextRoleKey) || !nextAvatarKey || !avatarKeys.has(nextAvatarKey)) {
        plannedMessages.push({
          kind: "narration",
          request: createNarrationRequest(
            options.targetRoomId!,
            safeMessageContent(`${message.speakerName ?? roleName}：${contentOrEmpty(message)}`, warnings, `第 ${eventIndex} 条对白`),
          ),
          source: sourceInfo,
        });
        return;
      }

      plannedMessages.push({
        avatarKey: nextAvatarKey,
        kind: "dialog",
        request: {
          content: safeMessageContent(contentOrEmpty(message), warnings, `第 ${eventIndex} 条对白`),
          customRoleName: message.speakerName && message.speakerName !== roleName
            ? message.speakerName
            : undefined,
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roomId: options.targetRoomId!,
        },
        roleKey: nextRoleKey,
        source: sourceInfo,
      });
      return;
    }

    if (message.kind === "dice") {
      const visibleContent = buildDiceVisibleContent(message);
      const diceResult = contentOrEmpty(message).trim();
      const request: ChatMessageRequest = hasDiceRoll(diceResult)
        ? {
            avatarId: options.dicerAvatarId ?? -1,
            content: safeMessageContent(visibleContent, warnings, `第 ${eventIndex} 条骰子`),
            customRoleName: "骰娘",
            extra: buildDiceExtra(message, options),
            messageType: MESSAGE_TYPE.DICE,
            roleId: options.dicerRoleId ?? -1,
            roomId: options.targetRoomId!,
          }
        : {
            avatarId: -1,
            content: safeMessageContent(visibleContent, warnings, `第 ${eventIndex} 条骰子描述`),
            customRoleName: "骰娘",
            extra: {},
            messageType: MESSAGE_TYPE.TEXT,
            roleId: -1,
            roomId: options.targetRoomId!,
          };
      plannedMessages.push({
        kind: "dice",
        request,
        source: sourceInfo,
      });
      return;
    }

    if (message.kind === "bgm") {
      plannedMessages.push({
        kind: "bgm",
        request: {
          avatarId: -1,
          content: safeMessageContent(buildBgmText(message), warnings, `第 ${eventIndex} 条 BGM`),
          customRoleName: "BGM",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: options.targetRoomId!,
        },
        source: sourceInfo,
      });
      warnings.push(`BGM 暂以文本事件保留：${message.bgmName ?? contentOrEmpty(message)}`);
      return;
    }

    plannedMessages.push({
      kind: "narration",
      request: createNarrationRequest(
        options.targetRoomId!,
        safeMessageContent(contentOrEmpty(message), warnings, `第 ${eventIndex} 条旁白`),
      ),
      source: sourceInfo,
    });
  });

  return {
    avatars,
    messages: plannedMessages,
    roles,
    source,
    stats: {
      avatars: avatars.length,
      messages: plannedMessages.length,
      roles: roles.length,
      warnings: warnings.length,
    },
    target: {
      roomId: options.targetRoomId,
      spaceId: options.targetSpaceId,
    },
    warnings,
  };
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

function materializeMessageRequest(
  message: GululuLiveImportMessagePlan,
  roleIds: Map<string, number>,
  avatarIds: Map<string, number>,
): ChatMessageRequest {
  return {
    ...message.request,
    ...(message.roleKey ? { roleId: roleIds.get(message.roleKey) ?? -1 } : {}),
    ...(message.avatarKey ? { avatarId: avatarIds.get(message.avatarKey) ?? -1 } : {}),
  };
}

async function loadExistingNpcRoles(client: GululuLiveImportClient, roomId: number) {
  const result = await client.roomRoleController.roomNpcRole(roomId);
  return assertApiSuccess(result, "读取房间 NPC 角色失败") ?? [];
}

function normalizeRoomId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function parseStoredSidebarTree(treeJson: string | undefined): SidebarTree | null {
  if (!treeJson?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(treeJson) as SidebarTree;
    if (parsed?.schemaVersion === 2 && Array.isArray(parsed.categories)) {
      return parsed;
    }
  }
  catch {
    return null;
  }
  return null;
}

function buildSidebarRoomNode(roomId: number, fallbackTitle: string): SidebarLeafNode {
  return {
    fallbackTitle,
    nodeId: `room:${roomId}`,
    targetId: roomId,
    type: "room",
  };
}

function sidebarTreeHasRoom(tree: SidebarTree, roomId: number) {
  return tree.categories.some(category => (category.items ?? []).some((item) => {
    return item?.type === "room" && normalizeRoomId(item.targetId) === roomId;
  }));
}

function findRoomTitle(rooms: RoomListResponse["rooms"], roomId: number) {
  const room = (rooms ?? []).find(item => normalizeRoomId(item.roomId) === roomId);
  return room?.name?.trim() || String(roomId);
}

function buildDefaultSidebarTreeForImport(rooms: RoomListResponse["rooms"], roomId: number): SidebarTree {
  const usedRoomIds = new Set<number>();
  const items: SidebarLeafNode[] = [];
  for (const room of rooms ?? []) {
    const nextRoomId = normalizeRoomId(room.roomId);
    if (!nextRoomId || usedRoomIds.has(nextRoomId)) {
      continue;
    }
    usedRoomIds.add(nextRoomId);
    items.push(buildSidebarRoomNode(nextRoomId, room.name?.trim() || String(nextRoomId)));
  }
  if (!usedRoomIds.has(roomId)) {
    items.push(buildSidebarRoomNode(roomId, findRoomTitle(rooms, roomId)));
  }
  return {
    categories: [{
      categoryId: "cat:channels",
      items,
      name: "频道",
    }],
    schemaVersion: 2,
  };
}

function appendRoomToSidebarTree(tree: SidebarTree, roomId: number, fallbackTitle: string): SidebarTree {
  const next = JSON.parse(JSON.stringify(tree)) as SidebarTree;
  if (!Array.isArray(next.categories) || next.categories.length === 0) {
    return buildDefaultSidebarTreeForImport([{ name: fallbackTitle, roomId }], roomId);
  }

  const category = next.categories.find(item => item.categoryId === "cat:channels")
    ?? next.categories.find(item => item.name === "频道")
    ?? next.categories[0]!;
  category.items = Array.isArray(category.items) ? category.items : [];
  category.items.push(buildSidebarRoomNode(roomId, fallbackTitle));
  return next;
}

export async function ensureRoomInSidebarTree(
  plan: GululuLiveImportPlan,
  client: GululuLiveImportClient,
): Promise<NonNullable<GululuLiveImportApplyResult["sidebarTree"]>> {
  const spaceId = plan.target.spaceId;
  const roomId = plan.target.roomId;
  if (!spaceId) {
    return { action: "skipped", reason: "missing-space-id", roomId };
  }
  if (!client.spaceSidebarTreeController) {
    return { action: "skipped", reason: "missing-sidebar-tree-controller", roomId, spaceId };
  }

  const sidebarResponse = assertApiData(
    await client.spaceSidebarTreeController.getSidebarTree(spaceId),
    "读取空间侧边栏失败",
  );
  const currentTree = parseStoredSidebarTree(sidebarResponse.treeJson);
  if (currentTree && sidebarTreeHasRoom(currentTree, roomId)) {
    return {
      action: "already-present",
      roomId,
      spaceId,
      version: sidebarResponse.version,
    };
  }

  const rooms = client.roomController
    ? assertApiSuccess(await client.roomController.getUserRooms(spaceId), "读取空间房间列表失败")?.rooms ?? []
    : [];
  const fallbackTitle = findRoomTitle(rooms, roomId);
  const nextTree = currentTree
    ? appendRoomToSidebarTree(currentTree, roomId, fallbackTitle)
    : buildDefaultSidebarTreeForImport(rooms, roomId);
  const updated = assertApiData(
    await client.spaceSidebarTreeController.setSidebarTree({
      expectedVersion: sidebarResponse.version ?? 0,
      spaceId,
      treeJson: JSON.stringify(nextTree),
    }),
    "更新空间侧边栏失败",
  );

  return {
    action: "added",
    roomId,
    spaceId,
    version: updated.version,
  };
}

export async function applyGululuLiveImportPlan(
  plan: GululuLiveImportPlan,
  client: GululuLiveImportClient,
  deps: ApplyLiveImportDeps = {},
): Promise<GululuLiveImportApplyResult> {
  const existingRoles = await loadExistingNpcRoles(client, plan.target.roomId);
  const existingRoleByName = new Map(existingRoles
    .filter(role => role.roleName && role.roleId > 0)
    .map(role => [role.roleName!, role]));

  const roleIds = new Map<string, number>();
  const roleResults: GululuLiveImportApplyResult["roles"] = [];
  const createdRoleIds: number[] = [];
  for (const role of plan.roles) {
    const existing = existingRoleByName.get(role.name);
    if (existing) {
      roleIds.set(role.key, existing.roleId);
      roleResults.push({ action: "reused", key: role.key, roleId: existing.roleId });
      continue;
    }

    const roleId = assertApiData(
      await client.roleController.createRole(role.createRoleRequest),
      `创建角色失败：${role.name}`,
    );
    roleIds.set(role.key, roleId);
    createdRoleIds.push(roleId);
    roleResults.push({ action: "created", key: role.key, roleId });
  }

  if (createdRoleIds.length > 0) {
    assertApiSuccess(
      await client.roomRoleController.addRole({
        roleIdList: createdRoleIds,
        roomId: plan.target.roomId,
        type: NPC_ROLE_TYPE,
      }),
      "拉入 NPC 角色失败",
    );
  }

  const avatarIds = new Map<string, number>();
  const avatarResults: GululuLiveImportApplyResult["avatars"] = [];
  for (const avatar of plan.avatars) {
    const roleId = roleIds.get(avatar.roleKey);
    if (!roleId) {
      throw new Error(`头像缺少角色映射：${avatar.key}`);
    }
    const avatarId = assertApiData(
      await client.avatarController.setRoleAvatar({ category: ROLE_AVATAR_CATEGORY, roleId }),
      `创建头像失败：${avatar.imagePath}`,
    );
    avatarIds.set(avatar.key, avatarId);

    const uploadedAvatar = avatar.upload && avatar.filePath && deps.uploadAvatarImage
      ? await deps.uploadAvatarImage({ client, filePath: avatar.filePath })
      : undefined;
    const mediaFileId = uploadedAvatar?.mediaFileId;
    assertApiSuccess(
      await client.avatarController.updateRoleAvatar({
        avatarFileId: mediaFileId,
        avatarId,
        avatarTitle: avatar.avatarTitle,
        category: ROLE_AVATAR_CATEGORY,
        originFileId: mediaFileId,
        roleId,
        ...(uploadedAvatar?.spriteTransform ? { spriteTransform: uploadedAvatar.spriteTransform } : {}),
        spriteFileId: mediaFileId,
      }),
      `更新头像失败：${avatar.imagePath}`,
    );
    avatarResults.push({
      action: "created",
      avatarId,
      key: avatar.key,
      ...(mediaFileId ? { mediaFileId } : {}),
      roleId,
      ...(uploadedAvatar?.spriteTransform ? { spriteTransform: uploadedAvatar.spriteTransform } : {}),
    });
  }

  const messageResults: GululuLiveImportApplyResult["messages"] = [];
  for (const message of plan.messages) {
    const request = materializeMessageRequest(message, roleIds, avatarIds);
    const created = assertApiSuccess(
      await client.chatController.sendMessage1(request),
      `发送第 ${message.source.eventIndex} 条消息失败`,
    );
    messageResults.push({
      messageId: created?.messageId,
      sourceEventIndex: message.source.eventIndex,
    });
  }

  const sidebarTree = await ensureRoomInSidebarTree(plan, client);

  return {
    avatars: avatarResults,
    messages: messageResults,
    roles: roleResults,
    sidebarTree,
  };
}

function createClient(args: GululuLiveImportArgs): GululuLiveImportClient {
  return new TuanChat({
    BASE: args.baseUrl ?? "http://127.0.0.1:8081",
    TOKEN: args.authToken || env.TUANCHAT_AUTH_TOKEN,
  }) as unknown as GululuLiveImportClient;
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function uploadLocalImageAsRoleAvatarMedia(params: {
  client: GululuLiveImportClient & {
    mediaController?: {
      completeUpload: (sessionId: number) => Promise<ApiResult<{ fileId?: number }>>;
      prepareUpload: (requestBody: {
        contentType?: string;
        fileName?: string;
        metadata?: Record<string, Record<string, unknown> | unknown>;
        mimeType?: string;
        scene?: number;
        sha256: string;
        sizeBytes: number;
      }) => Promise<ApiResult<{
        fileId?: number;
        sessionId?: number;
        uploadRequired?: boolean;
        uploadTargets?: Record<string, { uploadHeaders?: Record<string, string>; uploadUrl?: string }>;
      }>>;
    };
  };
  filePath: string;
}): Promise<UploadedAvatarImage> {
  if (!params.client.mediaController) {
    throw new Error("当前 client 缺少 mediaController，无法上传头像图片");
  }
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const metadata = await readGululuImportedSpriteImageMetadata(params.filePath);
  const webp = await sharp(params.filePath).rotate().webp({ quality: 90 }).toBuffer();
  const parsed = path.parse(params.filePath);
  const fileName = `${parsed.name}.webp`;
  const prepared = assertApiData(
    await params.client.mediaController.prepareUpload({
      contentType: "image/webp",
      fileName,
      metadata: {
        height: metadata.height,
        uploadedQualities: ["original"],
        width: metadata.width,
      },
      mimeType: "image/webp",
      scene: AVATAR_UPLOAD_SCENE,
      sha256: sha256(webp),
      sizeBytes: webp.length,
    }),
    `准备上传头像失败：${params.filePath}`,
  );
  if (!prepared.uploadRequired) {
    if (!prepared.fileId) {
      throw new Error(`头像秒传响应缺少 fileId：${params.filePath}`);
    }
    return {
      mediaFileId: prepared.fileId,
      spriteTransform: buildGululuImportedSpriteTransform(metadata),
    };
  }
  if (!prepared.sessionId || !prepared.uploadTargets) {
    throw new Error(`头像上传响应缺少会话：${params.filePath}`);
  }
  for (const target of Object.values(prepared.uploadTargets)) {
    if (!target.uploadUrl) {
      throw new Error(`头像上传目标缺少 URL：${params.filePath}`);
    }
    const response = await fetch(target.uploadUrl, {
      body: webp,
      headers: {
        "Content-Type": "image/webp",
        ...target.uploadHeaders,
      },
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`头像文件上传失败：${response.status}`);
    }
  }
  const completed = assertApiData(
    await params.client.mediaController.completeUpload(prepared.sessionId),
    `完成头像上传失败：${params.filePath}`,
  );
  if (!completed.fileId) {
    throw new Error(`完成头像上传响应缺少 fileId：${params.filePath}`);
  }
  return {
    mediaFileId: completed.fileId,
    spriteTransform: buildGululuImportedSpriteTransform(metadata),
  };
}

function createDefaultDeps(client: GululuLiveImportClient): ApplyLiveImportDeps {
  return {
    uploadAvatarImage: ({ filePath }) => uploadLocalImageAsRoleAvatarMedia({
      client: client as Parameters<typeof uploadLocalImageAsRoleAvatarMedia>[0]["client"],
      filePath,
    }),
  };
}

async function readImportPackage(inputPath: string) {
  const raw = await readFile(inputPath, "utf8");
  return JSON.parse(raw) as GululuReplayImportPackage;
}

export async function runGululuAuthoringLiveImport(argv: string[]) {
  const args = parseLiveImportArgs(argv);
  if (!args.input) {
    throw new Error("--input is required");
  }
  const inputPath = path.resolve(args.input);
  const sourceRoot = args.sourceRoot ? path.resolve(args.sourceRoot) : await inferSourceRoot(inputPath);
  const importPackage = await readImportPackage(inputPath);
  const plan = buildGululuLiveImportPlan(importPackage, {
    ...args,
    sourceRoot,
  });
  const outputPath = path.resolve(args.out ?? buildDefaultOutPath(inputPath, args.apply));

  if (!args.apply) {
    await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    return { outputPath, plan };
  }

  for (const avatar of plan.avatars) {
    if (avatar.upload && avatar.filePath) {
      const fileStat = await stat(avatar.filePath);
      if (!fileStat.isFile()) {
        throw new Error(`头像路径不是文件：${avatar.filePath}`);
      }
    }
  }

  const client = createClient(args);
  const result = await applyGululuLiveImportPlan(plan, client, createDefaultDeps(client));
  await writeFile(outputPath, `${JSON.stringify({ plan, result }, null, 2)}\n`, "utf8");
  return { outputPath, plan, result };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuAuthoringLiveImport(process.argv.slice(2))
    .then(({ outputPath, plan, result }) => {
      process.stdout.write(`${JSON.stringify({
        outputPath,
        applied: Boolean(result),
        stats: plan.stats,
        target: plan.target,
      }, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
