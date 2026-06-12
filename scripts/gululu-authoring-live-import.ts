import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { Sharp } from "sharp";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process, { env } from "node:process";
import { fileURLToPath } from "node:url";

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

type GululuNamedAvatarManifestItem = {
  assetKind?: string;
  displayName?: string;
  file?: string;
  members?: Array<{
    aggregatedSourceRelPaths?: string[];
    sourceCandidates?: Array<{ sourceRelPath?: string }>;
    sourceRelPath?: string;
  }>;
  representativeSourceRelPath?: string;
  usageKey?: string;
  versionedUsageKey?: string;
};

type GululuNamedAvatarManifest = {
  assetKind?: string;
  items?: GululuNamedAvatarManifestItem[];
  role?: string;
};

type GululuNamedAvatarCatalogItem = {
  assetKind: string;
  displayName?: string;
  fileName: string;
  filePath: string;
  imagePath: string;
  roleName: string;
  sourceRelPaths: string[];
  usageKey?: string;
};

type GululuNamedAvatarCatalog = {
  byRole: Map<string, GululuNamedAvatarCatalogItem[]>;
  byRoleAndSource: Map<string, GululuNamedAvatarCatalogItem>;
};

type GululuCleanIndexAvatarCatalogItem = {
  assetKind: string;
  displayName?: string;
  fileName: string;
  filePath: string;
  imagePath: string;
  renderUse?: string;
  roleName: string;
  sourceRelPaths: string[];
};

type GululuCleanIndexAvatarCatalog = {
  byChatAvatarRole: Map<string, GululuCleanIndexAvatarCatalogItem[]>;
  byChatAvatarRoleAndSource: Map<string, GululuCleanIndexAvatarCatalogItem>;
  byStageSpriteRole: Map<string, GululuCleanIndexAvatarCatalogItem[]>;
  byStageSpriteRoleAndSource: Map<string, GululuCleanIndexAvatarCatalogItem>;
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
  namedAvatarRoot?: string;
  opusId?: number;
  out?: string;
  resumeExistingAvatars?: boolean;
  roomName?: string;
  skipNamedAvatars?: boolean;
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
  assetKind?: string;
  avatarMissing?: boolean;
  avatarTitle: Record<string, string>;
  bindingImagePath?: string;
  displayName?: string;
  fileName: string;
  filePath?: string;
  imagePath: string;
  key: string;
  originMediaKind?: "avatar" | "sprite";
  roleKey: string;
  sourceImagePaths?: string[];
  sourceKey: string;
  spriteAssetKind?: string;
  spriteFileName?: string;
  spriteFilePath?: string;
  spriteImagePath?: string;
  spriteSourceImagePaths?: string[];
  upload: boolean;
  usageKey?: string;
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
    roomId?: number;
    roomName?: string;
    spaceId?: number;
  };
  warnings: string[];
};

export type GululuLiveImportClient = {
  avatarController: {
    getRoleAvatars?: (roleId: number) => Promise<ApiResult<RoleAvatar[]>>;
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
  spaceController?: {
    createRoom: (requestBody: { roomName?: string; spaceId: number; userIdList?: number[] }) => Promise<ApiResult<{
      name?: string;
      roomId?: number;
      spaceId?: number;
    }>>;
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

type GululuImportedSpriteRenderKind = "avatar" | "stage-sprite";

type ApplyLiveImportDeps = {
  resumeExistingAvatars?: boolean;
  uploadAvatarImage?: (params: {
    client: GululuLiveImportClient;
    filePath: string;
    renderKind?: GululuImportedSpriteRenderKind;
  }) => Promise<UploadedAvatarImage>;
};

export type GululuLiveImportApplyResult = {
  avatars: Array<{
    action: "created" | "reused";
    avatarFileId?: number;
    avatarId: number;
    key: string;
    mediaFileId?: number;
    originFileId?: number;
    roleId: number;
    spriteFileId?: number;
    spriteTransform?: SpriteTransform;
  }>;
  messages: Array<{ messageId?: number; sourceEventIndex: number }>;
  room?: {
    action: "created" | "reused";
    name?: string;
    roomId: number;
    spaceId?: number;
  };
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
const IMPORTED_STAGE_SPRITE_BOTTOM_Y = 1220;

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

const IMPORTED_STAGE_SPRITE_COWBOY_LAYOUT: ImportedSpriteLayoutPreset = {
  bottomY: IMPORTED_STAGE_SPRITE_BOTTOM_Y,
  maxScale: 1.12,
  maxWidth: 1320,
  minScale: 0.22,
  targetHeight: 1560,
};

const IMPORTED_HEAD_BUST_SPRITE_LAYOUT: ImportedSpriteLayoutPreset = {
  bottomY: IMPORTED_AVATAR_BOTTOM_Y,
  maxScale: 0.72,
  maxWidth: 1120,
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

const NAMED_AVATAR_RELATIVE_ROOT = path.join("image-role-review-clean-vision-final", "named-avatars");
const NAMED_AVATAR_KIND_PRIORITY = new Map([
  ["character-avatar-bust", 0],
  ["character-avatar-chat", 1],
  ["manga-avatar", 2],
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
  renderKind: GululuImportedSpriteRenderKind,
): ImportedSpriteLayoutPreset {
  if (renderKind === "stage-sprite") {
    return IMPORTED_STAGE_SPRITE_COWBOY_LAYOUT;
  }
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

export function buildGululuImportedSpriteTransform(
  input: GululuImportedSpriteImageMetadata,
  options: { renderKind?: GululuImportedSpriteRenderKind } = {},
): SpriteTransform {
  const width = Number(input.width ?? 0);
  const height = Number(input.height ?? 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return buildImportedSpriteFallbackTransform();
  }

  const containScale = Math.min(WEBGAL_STAGE_WIDTH / width, WEBGAL_STAGE_HEIGHT / height);
  const visibleBounds = normalizeVisibleBounds(input, width, height);
  const kind = resolveImportedSpriteKind(input, visibleBounds);
  const preset = resolveImportedSpriteLayoutPreset(kind, visibleBounds, options.renderKind ?? "avatar");
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
    else if (arg === "--skip-named-avatars") {
      args.skipNamedAvatars = true;
    }
    else if (arg === "--resume-existing-avatars") {
      args.resumeExistingAvatars = true;
    }
    else if (arg === "--input") {
      args.input = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out") {
      args.out = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--room-name") {
      args.roomName = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--source-root") {
      args.sourceRoot = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--named-avatar-root") {
      args.namedAvatarRoot = readValue(argv, index, arg);
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

function normalizeOptionalImagePath(rawPath: string | undefined) {
  return rawPath ? normalizeImagePath(rawPath) : "";
}

function namedAvatarSourceKey(roleName: string, sourceRelPath: string) {
  return `${roleKey(roleName)}\u0000${normalizeImagePath(sourceRelPath)}`;
}

function uniqueNormalizedImagePaths(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeOptionalImagePath(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function collectNamedAvatarSourceRelPaths(item: GululuNamedAvatarManifestItem) {
  return uniqueNormalizedImagePaths([
    item.representativeSourceRelPath,
    ...(item.members ?? []).flatMap(member => [
      member.sourceRelPath,
      ...(member.aggregatedSourceRelPaths ?? []),
      ...(member.sourceCandidates ?? []).map(candidate => candidate.sourceRelPath),
    ]),
  ]);
}

function toPosixPath(value: string) {
  return value.replace(/\\/g, "/");
}

function avatarImagePathFromFile(sourceRoot: string | undefined, filePath: string) {
  if (!sourceRoot) {
    return toPosixPath(filePath);
  }
  const relative = path.relative(sourceRoot, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? toPosixPath(relative)
    : toPosixPath(filePath);
}

function inferNamedAvatarRoot(sourceRoot: string | undefined) {
  if (!sourceRoot) {
    return undefined;
  }
  const candidate = path.join(sourceRoot, NAMED_AVATAR_RELATIVE_ROOT);
  return existsSync(candidate) ? candidate : undefined;
}

function inferCleanIndexRoot(options: Pick<GululuLiveImportArgs, "namedAvatarRoot" | "sourceRoot">) {
  if (options.namedAvatarRoot) {
    const namedRoot = path.resolve(options.namedAvatarRoot);
    return path.basename(namedRoot) === "named-avatars"
      ? path.dirname(namedRoot)
      : namedRoot;
  }
  return options.sourceRoot
    ? path.join(options.sourceRoot, "image-role-review-clean-vision-final")
    : undefined;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "\"") {
      if (quoted && text[index + 1] === "\"") {
        cell += "\"";
        index++;
      }
      else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") {
        index++;
      }
      row.push(cell);
      if (row.some(value => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => value !== "")) {
    rows.push(row);
  }
  const [headers, ...body] = rows;
  if (!headers) {
    return [];
  }
  return body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function splitPipeCell(value: string | undefined) {
  return String(value ?? "").split("|").map(item => normalizeImagePath(item)).filter(Boolean);
}

function compareNamedAvatarItems(left: GululuNamedAvatarCatalogItem, right: GululuNamedAvatarCatalogItem) {
  const leftPriority = NAMED_AVATAR_KIND_PRIORITY.get(left.assetKind) ?? 99;
  const rightPriority = NAMED_AVATAR_KIND_PRIORITY.get(right.assetKind) ?? 99;
  return leftPriority - rightPriority
    || left.fileName.localeCompare(right.fileName, "zh-Hans-CN")
    || left.imagePath.localeCompare(right.imagePath);
}

function compareCleanIndexItems(left: GululuCleanIndexAvatarCatalogItem, right: GululuCleanIndexAvatarCatalogItem) {
  return left.fileName.localeCompare(right.fileName, "zh-Hans-CN")
    || left.imagePath.localeCompare(right.imagePath);
}

function normalizeAssetKind(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeRenderUse(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isStageSpriteCleanIndexItem(item: Pick<GululuCleanIndexAvatarCatalogItem, "assetKind" | "renderUse">) {
  const renderUse = normalizeRenderUse(item.renderUse);
  if (renderUse === "stage" || renderUse === "stage-sprite") {
    return true;
  }
  if (renderUse === "chat-avatar" || renderUse === "avatar") {
    return false;
  }
  return normalizeAssetKind(item.assetKind).includes("sprite");
}

function pushCleanIndexRoleItem(
  map: Map<string, GululuCleanIndexAvatarCatalogItem[]>,
  item: GululuCleanIndexAvatarCatalogItem,
) {
  const items = map.get(item.roleName) ?? [];
  items.push(item);
  map.set(item.roleName, items);
}

function loadNamedAvatarCatalog(options: Pick<GululuLiveImportArgs, "namedAvatarRoot" | "skipNamedAvatars" | "sourceRoot">): GululuNamedAvatarCatalog | undefined {
  if (options.skipNamedAvatars) {
    return undefined;
  }
  const namedAvatarRoot = options.namedAvatarRoot
    ? path.resolve(options.namedAvatarRoot)
    : inferNamedAvatarRoot(options.sourceRoot);
  if (!namedAvatarRoot || !existsSync(namedAvatarRoot)) {
    return undefined;
  }

  const items: GululuNamedAvatarCatalogItem[] = [];
  for (const roleEntry of readdirSync(namedAvatarRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory()) {
      continue;
    }
    const roleDir = path.join(namedAvatarRoot, roleEntry.name);
    for (const kindEntry of readdirSync(roleDir, { withFileTypes: true })) {
      if (!kindEntry.isDirectory()) {
        continue;
      }
      const kindDir = path.join(roleDir, kindEntry.name);
      const manifestPath = path.join(kindDir, "avatar-manifest.json");
      if (!existsSync(manifestPath)) {
        continue;
      }
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as GululuNamedAvatarManifest;
      const roleName = manifest.role?.trim() || roleEntry.name;
      const assetKind = manifest.assetKind?.trim() || kindEntry.name;
      for (const item of manifest.items ?? []) {
        if (!item.file) {
          continue;
        }
        const filePath = path.join(kindDir, item.file);
        if (!existsSync(filePath)) {
          continue;
        }
        const fileName = path.basename(filePath);
        items.push({
          assetKind,
          displayName: item.displayName?.trim() || undefined,
          fileName,
          filePath,
          imagePath: avatarImagePathFromFile(options.sourceRoot, filePath),
          roleName,
          sourceRelPaths: collectNamedAvatarSourceRelPaths(item),
          usageKey: item.usageKey?.trim() || item.versionedUsageKey?.trim() || path.basename(fileName, path.extname(fileName)),
        });
      }
    }
  }
  if (items.length === 0) {
    return undefined;
  }

  const byRole = new Map<string, GululuNamedAvatarCatalogItem[]>();
  const byRoleAndSource = new Map<string, GululuNamedAvatarCatalogItem>();
  for (const item of items.sort(compareNamedAvatarItems)) {
    const roleItems = byRole.get(item.roleName) ?? [];
    roleItems.push(item);
    byRole.set(item.roleName, roleItems);
    for (const sourceRelPath of item.sourceRelPaths) {
      const key = namedAvatarSourceKey(item.roleName, sourceRelPath);
      if (!byRoleAndSource.has(key)) {
        byRoleAndSource.set(key, item);
      }
    }
  }
  return { byRole, byRoleAndSource };
}

function loadCleanIndexAvatarCatalog(options: Pick<GululuLiveImportArgs, "namedAvatarRoot" | "skipNamedAvatars" | "sourceRoot">): GululuCleanIndexAvatarCatalog | undefined {
  if (options.skipNamedAvatars) {
    return undefined;
  }
  const cleanRoot = inferCleanIndexRoot(options);
  const indexPath = cleanRoot ? path.join(cleanRoot, "index.csv") : undefined;
  if (!cleanRoot || !indexPath || !existsSync(indexPath)) {
    return undefined;
  }

  const rows = parseCsv(readFileSync(indexPath, "utf8"));
  const byChatAvatarRole = new Map<string, GululuCleanIndexAvatarCatalogItem[]>();
  const byChatAvatarRoleAndSource = new Map<string, GululuCleanIndexAvatarCatalogItem>();
  const byStageSpriteRole = new Map<string, GululuCleanIndexAvatarCatalogItem[]>();
  const byStageSpriteRoleAndSource = new Map<string, GululuCleanIndexAvatarCatalogItem>();
  for (const row of rows) {
    const roleName = row.character?.trim();
    const outputRelPath = normalizeOptionalImagePath(row.outputRelPath) || normalizeOptionalImagePath(row.transparentRelPath);
    if (!roleName || !outputRelPath) {
      continue;
    }
    const filePath = path.join(cleanRoot, outputRelPath);
    if (!existsSync(filePath)) {
      continue;
    }
    const sourceRelPaths = [
      normalizeOptionalImagePath(row.sourceRelPath),
      ...splitPipeCell(row.aggregatedSourceRelPaths),
    ].filter((value): value is string => Boolean(value));
    if (sourceRelPaths.length === 0) {
      continue;
    }
    const item: GululuCleanIndexAvatarCatalogItem = {
      assetKind: row.assetKind?.trim() || "unknown",
      fileName: path.basename(filePath),
      filePath,
      imagePath: avatarImagePathFromFile(options.sourceRoot, filePath),
      renderUse: row.renderUse?.trim() || undefined,
      roleName,
      sourceRelPaths: [...new Set(sourceRelPaths)],
    };
    const targetRoleMap = isStageSpriteCleanIndexItem(item) ? byStageSpriteRole : byChatAvatarRole;
    const targetSourceMap = isStageSpriteCleanIndexItem(item) ? byStageSpriteRoleAndSource : byChatAvatarRoleAndSource;
    pushCleanIndexRoleItem(targetRoleMap, item);
    for (const sourceRelPath of item.sourceRelPaths) {
      const key = namedAvatarSourceKey(roleName, sourceRelPath);
      if (!targetSourceMap.has(key)) {
        targetSourceMap.set(key, item);
      }
    }
  }
  for (const items of [...byChatAvatarRole.values(), ...byStageSpriteRole.values()]) {
    items.sort(compareCleanIndexItems);
  }
  return byChatAvatarRoleAndSource.size > 0 || byStageSpriteRoleAndSource.size > 0
    ? { byChatAvatarRole, byChatAvatarRoleAndSource, byStageSpriteRole, byStageSpriteRoleAndSource }
    : undefined;
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

function firstNamedAvatarForRole(catalog: GululuNamedAvatarCatalog | undefined, roleName: string) {
  return catalog?.byRole.get(roleName)?.[0];
}

function firstNamedAvatarPathFor(catalog: GululuNamedAvatarCatalog | undefined, roleName: string) {
  return firstNamedAvatarForRole(catalog, roleName)?.imagePath;
}

function firstCleanIndexRoleItem(
  map: Map<string, GululuCleanIndexAvatarCatalogItem[]> | undefined,
  roleName: string,
  role: GululuReplayRole | undefined,
) {
  for (const name of roleSourceNames(roleName, role)) {
    const item = map?.get(name)?.[0];
    if (item) {
      return item;
    }
  }
  return undefined;
}

function firstCleanIndexChatAvatarForRole(
  catalog: GululuCleanIndexAvatarCatalog | undefined,
  roleName: string,
  role: GululuReplayRole | undefined,
) {
  return firstCleanIndexRoleItem(catalog?.byChatAvatarRole, roleName, role);
}

function firstCleanIndexStageSpriteForRole(
  catalog: GululuCleanIndexAvatarCatalog | undefined,
  roleName: string,
  role: GululuReplayRole | undefined,
) {
  return firstCleanIndexRoleItem(catalog?.byStageSpriteRole, roleName, role);
}

function hasRoleAvatarEvidence(
  role: GululuReplayRole | undefined,
  roleName: string,
  catalog: GululuNamedAvatarCatalog | undefined,
  cleanIndexCatalog: GululuCleanIndexAvatarCatalog | undefined,
) {
  return Boolean(
    firstAvatarPathFor(role)
      || firstNamedAvatarPathFor(catalog, roleName)
      || firstCleanIndexChatAvatarForRole(cleanIndexCatalog, roleName, role)
      || firstCleanIndexStageSpriteForRole(cleanIndexCatalog, roleName, role),
  );
}

function collectRoleNamesWithAvatarEvidence(
  importPackage: GululuReplayImportPackage,
  catalog: GululuNamedAvatarCatalog | undefined,
  cleanIndexCatalog: GululuCleanIndexAvatarCatalog | undefined,
) {
  const roleNames = new Set<string>();
  const canonicalRoleNames = new Map<string, string>();
  for (const role of importPackage.roles ?? []) {
    canonicalRoleNames.set(role.name, role.name);
    for (const alias of role.aliases ?? []) {
      const aliasName = alias.name?.trim();
      if (aliasName && !canonicalRoleNames.has(aliasName)) {
        canonicalRoleNames.set(aliasName, role.name);
      }
    }
    if (hasRoleAvatarEvidence(role, role.name, catalog, cleanIndexCatalog)) {
      roleNames.add(role.name);
    }
  }
  for (const roleName of catalog?.byRole.keys() ?? []) {
    roleNames.add(canonicalRoleNames.get(roleName) ?? roleName);
  }
  for (const roleName of cleanIndexCatalog?.byChatAvatarRole.keys() ?? []) {
    roleNames.add(canonicalRoleNames.get(roleName) ?? roleName);
  }
  for (const roleName of cleanIndexCatalog?.byStageSpriteRole.keys() ?? []) {
    roleNames.add(canonicalRoleNames.get(roleName) ?? roleName);
  }
  return [...roleNames].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function namedAvatarTitle(item: GululuNamedAvatarCatalogItem) {
  return {
    label: item.displayName || item.usageKey || item.fileName,
  };
}

function cleanIndexAvatarTitle(item: GululuCleanIndexAvatarCatalogItem) {
  return {
    label: item.assetKind === "manga-avatar" ? "原文漫画配图" : "原文配图",
  };
}

function stageSpriteAvatarTitle(item: GululuCleanIndexAvatarCatalogItem) {
  return {
    label: `立绘：${path.basename(item.fileName, path.extname(item.fileName))}`,
  };
}

function cleanIndexSpriteFields(item: GululuCleanIndexAvatarCatalogItem | undefined) {
  return item
    ? {
        spriteAssetKind: item.assetKind,
        spriteFileName: item.fileName,
        spriteFilePath: item.filePath,
        spriteImagePath: item.imagePath,
        spriteSourceImagePaths: item.sourceRelPaths,
      }
    : {};
}

function roleSourceNames(roleName: string, role: GululuReplayRole | undefined) {
  return [
    roleName,
    ...(role?.aliases ?? []).map(alias => alias.name?.trim()).filter((name): name is string => Boolean(name)),
  ];
}

function findCleanIndexItemForRoleSource(
  map: Map<string, GululuCleanIndexAvatarCatalogItem> | undefined,
  roleName: string,
  role: GululuReplayRole | undefined,
  sourceRelPath: string | undefined,
) {
  if (!map || !sourceRelPath) {
    return undefined;
  }
  for (const name of roleSourceNames(roleName, role)) {
    const item = map.get(namedAvatarSourceKey(name, sourceRelPath));
    if (item) {
      return item;
    }
  }
  return undefined;
}

function findCleanIndexChatAvatarForRoleSource(
  catalog: GululuCleanIndexAvatarCatalog | undefined,
  roleName: string,
  role: GululuReplayRole | undefined,
  sourceRelPath: string | undefined,
) {
  return findCleanIndexItemForRoleSource(catalog?.byChatAvatarRoleAndSource, roleName, role, sourceRelPath);
}

function findCleanIndexStageSpriteForRoleSource(
  catalog: GululuCleanIndexAvatarCatalog | undefined,
  roleName: string,
  role: GululuReplayRole | undefined,
  sourceRelPath: string | undefined,
) {
  return findCleanIndexItemForRoleSource(catalog?.byStageSpriteRoleAndSource, roleName, role, sourceRelPath);
}

function dialogSourceImagePathsForRole(messages: GululuReplayMessage[], roleName: string) {
  const paths = new Set<string>();
  for (const message of messages) {
    if (message.kind !== "dialog" || message.roleName !== roleName) {
      continue;
    }
    const imagePath = normalizeOptionalImagePath(message.imagePath);
    if (imagePath) {
      paths.add(imagePath);
    }
  }
  return [...paths];
}

function cleanIndexAvatarPlanForRole(
  rolePlan: GululuLiveImportRolePlan,
  item: GululuCleanIndexAvatarCatalogItem,
  options: GululuLiveImportArgs,
): GululuLiveImportAvatarPlan {
  return {
    assetKind: item.assetKind,
    avatarTitle: cleanIndexAvatarTitle(item),
    fileName: item.fileName,
    filePath: item.filePath,
    imagePath: item.imagePath,
    key: avatarKey(rolePlan.name, item.imagePath),
    roleKey: rolePlan.key,
    sourceImagePaths: item.sourceRelPaths,
    sourceKey: `gululu:clean-index:${rolePlan.name}:${item.assetKind}:${item.fileName}`,
    upload: !options.skipAvatarUpload,
  };
}

function stageSpriteAvatarPlanForRole(
  rolePlan: GululuLiveImportRolePlan,
  spriteItem: GululuCleanIndexAvatarCatalogItem,
  options: GululuLiveImportArgs,
): GululuLiveImportAvatarPlan {
  return {
    assetKind: spriteItem.assetKind,
    avatarTitle: stageSpriteAvatarTitle(spriteItem),
    bindingImagePath: spriteItem.imagePath,
    fileName: spriteItem.fileName,
    filePath: spriteItem.filePath,
    imagePath: spriteItem.imagePath,
    key: avatarKey(rolePlan.name, spriteItem.imagePath),
    originMediaKind: "sprite",
    roleKey: rolePlan.key,
    sourceImagePaths: spriteItem.sourceRelPaths,
    sourceKey: `gululu:stage-sprite:${rolePlan.name}:${spriteItem.assetKind}:${spriteItem.fileName}`,
    ...cleanIndexSpriteFields(spriteItem),
    upload: !options.skipAvatarUpload,
  };
}

function rawAvatarPlanForRole(
  rolePlan: GululuLiveImportRolePlan,
  imagePath: string,
  index: number,
  options: GululuLiveImportArgs,
): GululuLiveImportAvatarPlan {
  const filePath = resolveImageFilePath(options.sourceRoot, imagePath);
  const fileExists = typeof filePath === "string" && existsSync(filePath);
  const fileName = path.basename(imagePath);
  return {
    avatarTitle: { label: index === 0 ? "原文配图" : fileName },
    fileName,
    ...(filePath ? { filePath } : {}),
    imagePath,
    key: avatarKey(rolePlan.name, imagePath),
    roleKey: rolePlan.key,
    sourceImagePaths: [imagePath],
    sourceKey: sourceKeyForAvatar(imagePath),
    upload: !options.skipAvatarUpload && fileExists,
  };
}

function collectAvatarPlansForRole(
  rolePlan: GululuLiveImportRolePlan,
  role: GululuReplayRole | undefined,
  messages: GululuReplayMessage[],
  options: GululuLiveImportArgs,
  catalog: GululuNamedAvatarCatalog | undefined,
  cleanIndexCatalog: GululuCleanIndexAvatarCatalog | undefined,
): GululuLiveImportAvatarPlan[] {
  const namedItems = catalog?.byRole.get(rolePlan.name);
  const plans: GululuLiveImportAvatarPlan[] = [];
  const plannedKeys = new Set<string>();
  const addPlan = (plan: GululuLiveImportAvatarPlan) => {
    if (plannedKeys.has(plan.key)) {
      return;
    }
    plannedKeys.add(plan.key);
    plans.push(plan);
  };

  if (namedItems?.length) {
    for (const item of namedItems) {
      addPlan({
        assetKind: item.assetKind,
        avatarTitle: namedAvatarTitle(item),
        ...(item.displayName ? { displayName: item.displayName } : {}),
        fileName: item.fileName,
        filePath: item.filePath,
        imagePath: item.imagePath,
        key: avatarKey(rolePlan.name, item.imagePath),
        roleKey: rolePlan.key,
        sourceImagePaths: item.sourceRelPaths,
        sourceKey: `gululu:named-avatar:${rolePlan.name}:${item.assetKind}:${item.usageKey ?? item.fileName}`,
        upload: !options.skipAvatarUpload,
        ...(item.usageKey ? { usageKey: item.usageKey } : {}),
      });
    }
  }

  const messageSourcePaths = dialogSourceImagePathsForRole(messages, rolePlan.name);
  for (const sourceImagePath of messageSourcePaths) {
    const spriteItem = findCleanIndexStageSpriteForRoleSource(cleanIndexCatalog, rolePlan.name, role, sourceImagePath);
    if (spriteItem) {
      addPlan(stageSpriteAvatarPlanForRole(rolePlan, spriteItem, options));
      continue;
    }
    const namedItem = catalog?.byRoleAndSource.get(namedAvatarSourceKey(rolePlan.name, sourceImagePath));
    if (namedItem) {
      continue;
    }
    const cleanItem = findCleanIndexChatAvatarForRoleSource(cleanIndexCatalog, rolePlan.name, role, sourceImagePath);
    if (cleanItem) {
      addPlan(cleanIndexAvatarPlanForRole(rolePlan, cleanItem, options));
      continue;
    }
    addPlan(rawAvatarPlanForRole(rolePlan, sourceImagePath, plans.length, options));
  }

  if (plans.length > 0) {
    return plans;
  }

  const defaultSpriteItem = firstCleanIndexStageSpriteForRole(cleanIndexCatalog, rolePlan.name, role);
  if (defaultSpriteItem) {
    return [stageSpriteAvatarPlanForRole(rolePlan, defaultSpriteItem, options)];
  }

  return role
    ? collectAvatarImagePaths(role, messages).map((imagePath, index) =>
        rawAvatarPlanForRole(rolePlan, imagePath, index, options))
    : [];
}

function resolveDialogAvatarImagePath(params: {
  cleanIndexCatalog?: GululuCleanIndexAvatarCatalog;
  catalog?: GululuNamedAvatarCatalog;
  message: GululuReplayMessage;
  role?: GululuReplayRole;
  roleName: string;
}) {
  const { catalog, cleanIndexCatalog, message, role, roleName } = params;
  const sourceImagePath = normalizeOptionalImagePath(message.imagePath);
  const spriteItem = findCleanIndexStageSpriteForRoleSource(cleanIndexCatalog, roleName, role, sourceImagePath);
  if (spriteItem) {
    return spriteItem.imagePath;
  }
  if (catalog) {
    const namedItem = sourceImagePath
      ? catalog.byRoleAndSource.get(namedAvatarSourceKey(roleName, sourceImagePath))
      : undefined;
    if (namedItem) {
      return namedItem.imagePath;
    }
  }
  if (sourceImagePath) {
    return findCleanIndexChatAvatarForRoleSource(cleanIndexCatalog, roleName, role, sourceImagePath)?.imagePath
      ?? sourceImagePath;
  }
  return firstNamedAvatarPathFor(catalog, roleName)
    ?? firstCleanIndexChatAvatarForRole(cleanIndexCatalog, roleName, role)?.imagePath
    ?? firstCleanIndexStageSpriteForRole(cleanIndexCatalog, roleName, role)?.imagePath
    ?? normalizeOptionalImagePath(firstAvatarPathFor(role));
}

export function buildGululuLiveImportPlan(
  importPackage: GululuReplayImportPackage,
  options: GululuLiveImportArgs,
): GululuLiveImportPlan {
  if (options.targetRoomId != null && (!Number.isInteger(options.targetRoomId) || options.targetRoomId <= 0)) {
    throw new Error("targetRoomId must be a positive integer");
  }
  if (!options.targetRoomId && !options.roomName?.trim()) {
    throw new Error("targetRoomId or roomName is required");
  }
  if (!Number.isInteger(options.targetSpaceId) || !options.targetSpaceId || options.targetSpaceId <= 0) {
    throw new Error("targetSpaceId must be a positive integer");
  }

  // roomName-only plans are retargeted after the real room is created during apply.
  const planRoomId = options.targetRoomId ?? -1;
  const source = buildSource(importPackage, options);
  const warnings: string[] = [];
  const messages = importPackage.messages ?? [];
  const rolesByName = new Map((importPackage.roles ?? []).map(role => [role.name, role]));
  const namedAvatarCatalog = loadNamedAvatarCatalog(options);
  const cleanIndexCatalog = loadCleanIndexAvatarCatalog(options);

  const roles = collectRoleNamesWithAvatarEvidence(importPackage, namedAvatarCatalog, cleanIndexCatalog)
    .map((roleName): GululuLiveImportRolePlan => ({
      createRoleRequest: {
        description: `由咕噜噜 replay 导入：${source.title ?? source.key}`,
        extra: {
          gululuReplaySource: source.key,
          gululuReplayRole: roleName,
        },
        roleName,
        spaceId: options.targetSpaceId,
        type: NPC_ROLE_TYPE,
      },
      displayName: roleName,
      key: roleKey(roleName),
      name: roleName,
      sourceKey: sourceKeyForRole(roleName),
    }));

  const rolePlanKeys = new Set(roles.map(role => role.key));
  const avatars = roles.flatMap((rolePlan): GululuLiveImportAvatarPlan[] => {
    const role = rolesByName.get(rolePlan.name);
    const roleAvatars = collectAvatarPlansForRole(rolePlan, role, messages, options, namedAvatarCatalog, cleanIndexCatalog);
    for (const avatar of roleAvatars) {
      if (!options.skipAvatarUpload && avatar.filePath && !existsSync(avatar.filePath)) {
        warnings.push(`头像文件不存在：${avatar.filePath}`);
      }
      if (!options.skipAvatarUpload && avatar.spriteFilePath && !existsSync(avatar.spriteFilePath)) {
        warnings.push(`立绘文件不存在：${avatar.spriteFilePath}`);
      }
    }
    return roleAvatars;
  });
  const avatarKeys = new Set(avatars.map(avatar => avatar.key));

  const plannedMessages: GululuLiveImportMessagePlan[] = [];
  messages.forEach((message, index) => {
    const eventIndex = index + 1;
    const sourceInfo = createMessageSource(message, eventIndex);

    if (message.kind === "dialog") {
      const roleName = message.roleName || message.speakerName || "";
      const role = rolesByName.get(roleName);
      const imagePath = resolveDialogAvatarImagePath({
        catalog: namedAvatarCatalog,
        cleanIndexCatalog,
        message,
        role,
        roleName,
      });
      const nextRoleKey = roleKey(roleName);
      const nextAvatarKey = imagePath ? avatarKey(roleName, imagePath) : undefined;
      if (!rolePlanKeys.has(nextRoleKey) || !nextAvatarKey || !avatarKeys.has(nextAvatarKey)) {
        plannedMessages.push({
          kind: "narration",
          request: createNarrationRequest(
            planRoomId,
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
          roomId: planRoomId,
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
            roomId: planRoomId,
          }
        : {
            avatarId: -1,
            content: safeMessageContent(visibleContent, warnings, `第 ${eventIndex} 条骰子描述`),
            customRoleName: "骰娘",
            extra: {},
            messageType: MESSAGE_TYPE.TEXT,
            roleId: -1,
            roomId: planRoomId,
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
          roomId: planRoomId,
        },
        source: sourceInfo,
      });
      warnings.push(`BGM 暂以文本事件保留：${message.bgmName ?? contentOrEmpty(message)}`);
      return;
    }

    plannedMessages.push({
      kind: "narration",
      request: createNarrationRequest(
        planRoomId,
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
      ...(options.targetRoomId ? { roomId: options.targetRoomId } : {}),
      ...(options.roomName?.trim() ? { roomName: options.roomName.trim() } : {}),
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

function retargetPlanRoom(plan: GululuLiveImportPlan, roomId: number) {
  plan.target.roomId = roomId;
  for (const message of plan.messages) {
    message.request.roomId = roomId;
  }
}

async function ensureTargetRoom(
  plan: GululuLiveImportPlan,
  client: GululuLiveImportClient,
): Promise<NonNullable<GululuLiveImportApplyResult["room"]>> {
  const existingRoomId = normalizeRoomId(plan.target.roomId);
  if (existingRoomId) {
    retargetPlanRoom(plan, existingRoomId);
    return {
      action: "reused",
      roomId: existingRoomId,
      spaceId: plan.target.spaceId,
    };
  }

  const spaceId = plan.target.spaceId;
  if (!spaceId) {
    throw new Error("创建导入房间需要 targetSpaceId");
  }
  if (!client.spaceController) {
    throw new Error("当前 client 缺少 spaceController，无法创建房间");
  }
  const room = assertApiData(
    await client.spaceController.createRoom({
      roomName: plan.target.roomName ?? "咕噜噜 replay 导入",
      spaceId,
    }),
    "创建导入房间失败",
  );
  const roomId = normalizeRoomId(room.roomId);
  if (!roomId) {
    throw new Error("创建导入房间响应缺少 roomId");
  }
  retargetPlanRoom(plan, roomId);
  return {
    action: "created",
    name: room.name,
    roomId,
    spaceId: room.spaceId ?? spaceId,
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
  const roomId = normalizeRoomId(plan.target.roomId);
  if (!roomId) {
    return { action: "skipped", reason: "missing-room-id", roomId: -1, spaceId };
  }
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

async function loadExistingAvatarQueues(params: {
  client: GululuLiveImportClient;
  plan: GululuLiveImportPlan;
  resumeExistingAvatars: boolean | undefined;
  roleIds: Map<string, number>;
}) {
  if (!params.resumeExistingAvatars) {
    return new Map<number, RoleAvatar[]>();
  }
  if (!params.client.avatarController.getRoleAvatars) {
    throw new Error("当前 client 缺少 getRoleAvatars，无法恢复已有头像导入");
  }

  const roleIdsInPlan = new Set<number>();
  for (const avatar of params.plan.avatars) {
    const roleId = params.roleIds.get(avatar.roleKey);
    if (roleId) {
      roleIdsInPlan.add(roleId);
    }
  }

  const queues = new Map<number, RoleAvatar[]>();
  for (const roleId of roleIdsInPlan) {
    const avatars = assertApiSuccess(
      await params.client.avatarController.getRoleAvatars(roleId),
      `读取角色头像失败：${roleId}`,
    ) ?? [];
    queues.set(roleId, avatars
      .filter(avatar => typeof avatar.avatarId === "number" && avatar.avatarId > 0)
      .sort((left, right) => (left.avatarId ?? 0) - (right.avatarId ?? 0)));
  }
  return queues;
}

function avatarTitleLabel(value: Record<string, string> | undefined) {
  return value?.label ?? "";
}

function planNeedsUploadedAvatarMedia(planned: GululuLiveImportAvatarPlan) {
  return Boolean(planned.upload && planned.filePath);
}

function planNeedsUploadedSpriteMedia(planned: GululuLiveImportAvatarPlan) {
  return Boolean(planned.upload && (planned.spriteFilePath || planned.filePath));
}

function existingAvatarIsComplete(existing: RoleAvatar, planned: GululuLiveImportAvatarPlan) {
  if (avatarTitleLabel(existing.avatarTitle) !== avatarTitleLabel(planned.avatarTitle)) {
    return false;
  }
  if (planNeedsUploadedAvatarMedia(planned) && !existing.avatarFileId) {
    return false;
  }
  if (planNeedsUploadedSpriteMedia(planned) && !existing.spriteFileId) {
    return false;
  }
  if (planNeedsUploadedSpriteMedia(planned) && !existing.spriteTransform) {
    return false;
  }
  return true;
}

function takeExistingAvatarForPlan(
  existingAvatarQueues: Map<number, RoleAvatar[]>,
  roleId: number,
  planned: GululuLiveImportAvatarPlan,
) {
  const queue = existingAvatarQueues.get(roleId);
  const plannedLabel = avatarTitleLabel(planned.avatarTitle);
  if (!queue?.length || !plannedLabel) {
    return undefined;
  }
  const existingIndex = queue.findIndex(avatar => avatarTitleLabel(avatar.avatarTitle) === plannedLabel);
  if (existingIndex < 0) {
    return undefined;
  }
  return queue.splice(existingIndex, 1)[0];
}

export async function applyGululuLiveImportPlan(
  plan: GululuLiveImportPlan,
  client: GululuLiveImportClient,
  deps: ApplyLiveImportDeps = {},
): Promise<GululuLiveImportApplyResult> {
  const room = await ensureTargetRoom(plan, client);
  const existingRoles = await loadExistingNpcRoles(client, room.roomId);
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
        roomId: room.roomId,
        type: NPC_ROLE_TYPE,
      }),
      "拉入 NPC 角色失败",
    );
  }

  const existingAvatarQueues = await loadExistingAvatarQueues({
    client,
    plan,
    resumeExistingAvatars: deps.resumeExistingAvatars,
    roleIds,
  });
  const avatarIds = new Map<string, number>();
  const avatarResults: GululuLiveImportApplyResult["avatars"] = [];
  const uploadedMediaByPath = new Map<string, UploadedAvatarImage>();
  const uploadPlannedImage = async (
    filePath: string | undefined,
    renderKind: GululuImportedSpriteRenderKind,
  ) => {
    if (!filePath || !deps.uploadAvatarImage) {
      return undefined;
    }
    const resolvedFilePath = path.resolve(filePath);
    const cacheKey = `${renderKind}\u0000${resolvedFilePath}`;
    const cached = uploadedMediaByPath.get(cacheKey);
    if (cached) {
      return cached;
    }
    const uploaded = await deps.uploadAvatarImage({ client, filePath, renderKind });
    uploadedMediaByPath.set(cacheKey, uploaded);
    return uploaded;
  };
  for (const avatar of plan.avatars) {
    const roleId = roleIds.get(avatar.roleKey);
    if (!roleId) {
      throw new Error(`头像缺少角色映射：${avatar.key}`);
    }
    const existingAvatar = takeExistingAvatarForPlan(existingAvatarQueues, roleId, avatar);
    let avatarId = existingAvatar?.avatarId;
    if (!avatarId) {
      avatarId = assertApiData(
        await client.avatarController.setRoleAvatar({ category: ROLE_AVATAR_CATEGORY, roleId }),
        `创建头像失败：${avatar.imagePath}`,
      );
    }
    avatarIds.set(avatar.key, avatarId);

    if (existingAvatar && existingAvatarIsComplete(existingAvatar, avatar)) {
      avatarResults.push({
        action: "reused",
        avatarId,
        key: avatar.key,
        ...(existingAvatar.avatarFileId ? {
          avatarFileId: existingAvatar.avatarFileId,
          mediaFileId: existingAvatar.avatarFileId,
        } : {}),
        ...(existingAvatar.originFileId ? { originFileId: existingAvatar.originFileId } : {}),
        roleId,
        ...(existingAvatar.spriteFileId ? { spriteFileId: existingAvatar.spriteFileId } : {}),
        ...(existingAvatar.spriteTransform ? { spriteTransform: existingAvatar.spriteTransform } : {}),
      });
      continue;
    }

    const uploadedSprite = avatar.upload ? await uploadPlannedImage(avatar.spriteFilePath, "stage-sprite") : undefined;
    const uploadedAvatar = avatar.upload && avatar.originMediaKind !== "sprite"
      ? await uploadPlannedImage(avatar.filePath, "avatar")
      : undefined;
    const avatarFileId = uploadedAvatar?.mediaFileId
      ?? (avatar.originMediaKind === "sprite" ? uploadedSprite?.mediaFileId : undefined)
      ?? existingAvatar?.avatarFileId;
    const spriteFileId = uploadedSprite?.mediaFileId ?? avatarFileId ?? existingAvatar?.spriteFileId;
    const originFileId = avatar.originMediaKind === "sprite"
      ? spriteFileId ?? avatarFileId ?? existingAvatar?.originFileId
      : avatarFileId ?? spriteFileId ?? existingAvatar?.originFileId;
    const spriteTransform = uploadedSprite?.spriteTransform ?? uploadedAvatar?.spriteTransform ?? existingAvatar?.spriteTransform;
    assertApiSuccess(
      await client.avatarController.updateRoleAvatar({
        avatarId,
        avatarTitle: avatar.avatarTitle,
        category: ROLE_AVATAR_CATEGORY,
        ...(avatarFileId ? { avatarFileId } : {}),
        ...(originFileId ? { originFileId } : {}),
        roleId,
        ...(spriteTransform ? { spriteTransform } : {}),
        ...(spriteFileId ? { spriteFileId } : {}),
      }),
      `更新头像失败：${avatar.imagePath}`,
    );
    avatarResults.push({
      action: "created",
      avatarId,
      key: avatar.key,
      ...(avatarFileId ? { avatarFileId, mediaFileId: avatarFileId } : {}),
      ...(originFileId ? { originFileId } : {}),
      roleId,
      ...(spriteFileId ? { spriteFileId } : {}),
      ...(spriteTransform ? { spriteTransform } : {}),
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
    room,
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
  renderKind?: GululuImportedSpriteRenderKind;
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
      spriteTransform: buildGululuImportedSpriteTransform(metadata, { renderKind: params.renderKind }),
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
    spriteTransform: buildGululuImportedSpriteTransform(metadata, { renderKind: params.renderKind }),
  };
}

export function createDefaultDeps(client: GululuLiveImportClient): ApplyLiveImportDeps {
  return {
    uploadAvatarImage: ({ filePath, renderKind }) => uploadLocalImageAsRoleAvatarMedia({
      client: client as Parameters<typeof uploadLocalImageAsRoleAvatarMedia>[0]["client"],
      filePath,
      renderKind,
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
  const result = await applyGululuLiveImportPlan(plan, client, {
    ...createDefaultDeps(client),
    resumeExistingAvatars: args.resumeExistingAvatars,
  });
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
