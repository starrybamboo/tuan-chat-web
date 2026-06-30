import { normalizeSpeakerName } from "@/components/chat/utils/importChatText";

import type {
  RoleAvatar,
  RoleAvatarCreateRequest,
  RoleAvatarRequest,
  RoleCreateRequest,
  RoleUpdateRequest,
  RoomRoleAddRequest,
  SpriteTransform,
  UserRole,
} from "../../../../api";

export type ReplayRoleAssetKind = "character-avatar-bust" | "character-avatar-chat" | "character-sprite" | "manga-avatar";

type ReplayManifestRecord = Record<string, unknown>;
type AvatarSource = Record<number, RoleAvatar[]> | Map<number, RoleAvatar[]>;

export type ReplayRoleAvatarImportSources = {
  avatarsByRoleId: AvatarSource;
  roles: Array<Pick<UserRole, "roleId" | "roleName">>;
};

export type ReplayRoleAvatarImportEntry = {
  action: "create" | "update";
  avatarName: string;
  avatarRequest: RoleAvatarRequest;
  createRequest?: RoleAvatarCreateRequest;
  existingAvatarId?: number;
  kind: ReplayRoleAssetKind;
  roleId: number;
  roleName: string;
};

export type ReplayRoleAvatarImportPlan = {
  rolesToCreate: ReplayRoleCreatePlanEntry[];
  entries: ReplayRoleAvatarImportEntry[];
  stats: {
    roleCreate: number;
    create: number;
    update: number;
  };
};

export type ReplayRoleAvatarImportApplyDeps = {
  addRoomRole?: (request: RoomRoleAddRequest) => Promise<{ data?: unknown; errMsg?: string; success?: boolean }>;
  createRole?: (request: RoleCreateRequest) => Promise<{ data?: number; errMsg?: string; success?: boolean }>;
  setRoleAvatar: (request: RoleAvatarCreateRequest) => Promise<{ data?: number; errMsg?: string; success?: boolean }>;
  updateRole?: (request: RoleUpdateRequest) => Promise<{ data?: unknown; errMsg?: string; success?: boolean }>;
  updateRoleAvatar: (request: RoleAvatarRequest) => Promise<{ data?: RoleAvatar; errMsg?: string; success?: boolean }>;
  roomId?: number;
};

export type ReplayRoleAvatarImportApplyResult = {
  entries: Array<{
    action: "create" | "update";
    avatarId: number;
    avatarName: string;
    kind: ReplayRoleAssetKind;
    roleId: number;
    roleName: string;
  }>;
  rolesCreated: Array<{
    roleId: number;
    roleName: string;
  }>;
  stats: {
    roleCreate: number;
    create: number;
    update: number;
  };
};

type ReplayRoleCreatePlanEntry = {
  description: string;
  roleName: string;
  tempRoleId: number;
  type: number;
};

type VisibleBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ImageMetadata = {
  hasAlpha?: boolean;
  height: number;
  visibleBounds?: VisibleBounds;
  width: number;
};

type SpriteLayoutPreset = {
  bottomY: number;
  maxScale: number;
  maxWidth: number;
  minScale: number;
  targetHeight: number;
};

const DEFAULT_REPLAY_ROLE_AVATAR_CATEGORY = "gululu-replay";
const WEBGAL_STAGE_WIDTH = 2560;
const WEBGAL_STAGE_HEIGHT = 1440;
const SAFE_TOP_Y = 80;
const AVATAR_BOTTOM_Y = 990;
const STAGE_SPRITE_BOTTOM_Y = 1220;
const SUPPORTED_ROLE_ASSET_KINDS = new Set<ReplayRoleAssetKind>([
  "character-avatar-bust",
  "character-avatar-chat",
  "character-sprite",
  "manga-avatar",
]);

const STAGE_SPRITE_COWBOY_LAYOUT: SpriteLayoutPreset = {
  bottomY: STAGE_SPRITE_BOTTOM_Y,
  maxScale: 1.12,
  maxWidth: 1320,
  minScale: 0.22,
  targetHeight: 1560,
};

const AVATAR_BUST_LAYOUT: SpriteLayoutPreset = {
  bottomY: AVATAR_BOTTOM_Y,
  maxScale: 0.72,
  maxWidth: 1120,
  minScale: 0.16,
  targetHeight: 660,
};

const FRAMED_CLOSEUP_LAYOUT: SpriteLayoutPreset = {
  bottomY: AVATAR_BOTTOM_Y,
  maxScale: 0.7,
  maxWidth: 820,
  minScale: 0.16,
  targetHeight: 620,
};

const FRAMED_WIDE_LAYOUT: SpriteLayoutPreset = {
  bottomY: AVATAR_BOTTOM_Y,
  maxScale: 0.64,
  maxWidth: 1040,
  minScale: 0.14,
  targetHeight: 560,
};

function toRecord(value: unknown): ReplayManifestRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ReplayManifestRecord
    : {};
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toFiniteNumber(value: unknown) {
  const numberValue = typeof value === "string" ? Number(value.trim()) : value;
  return typeof numberValue === "number" && Number.isFinite(numberValue) ? numberValue : undefined;
}

function toPositiveNumber(value: unknown) {
  const numberValue = toFiniteNumber(value);
  return typeof numberValue === "number" && numberValue > 0 ? numberValue : undefined;
}

function getPositiveId(value: unknown) {
  return toPositiveNumber(value);
}

function hasOwnProperty(record: ReplayManifestRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readOptionalBoolean(
  roleName: string,
  avatarName: string,
  entry: ReplayManifestRecord,
  key: "hasAlpha",
) {
  if (!hasOwnProperty(entry, key)) {
    return undefined;
  }
  if (typeof entry[key] !== "boolean") {
    throw new Error(`角色素材 ${key} 必须是布尔值：${roleName}.${avatarName}`);
  }
  return entry[key];
}

function roundTransformNumber(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAvatarList(source: AvatarSource, roleId: number) {
  if (source instanceof Map) {
    return source.get(roleId) ?? [];
  }
  return source[roleId] ?? [];
}

function getAvatarTitleLabels(avatar: Pick<RoleAvatar, "avatarTitle">) {
  return Object.values(avatar.avatarTitle ?? {})
    .map(label => String(label ?? "").trim())
    .filter(Boolean);
}

function resolveExistingRole(roleName: string, roles: ReplayRoleAvatarImportSources["roles"]) {
  const normalizedRoleName = normalizeSpeakerName(roleName);
  const matched = roles.filter(role => normalizeSpeakerName(role.roleName ?? "") === normalizedRoleName);
  if (matched.length > 1) {
    throw new Error(`角色名重复：${roleName}`);
  }
  return matched[0] ?? null;
}

function findExistingAvatar(avatars: RoleAvatar[], roleName: string, avatarName: string) {
  const matched = avatars.filter(avatar => getAvatarTitleLabels(avatar).includes(avatarName));
  if (matched.length > 1) {
    throw new Error(`角色差分重名：${roleName}.${avatarName}`);
  }
  return matched[0] ?? null;
}

function normalizeVisibleBounds(input: ImageMetadata): VisibleBounds {
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
      height: clampNumber(bounds.height, 1, input.height),
      width: clampNumber(bounds.width, 1, input.width),
      x: clampNumber(bounds.x, 0, input.width),
      y: clampNumber(bounds.y, 0, input.height),
    };
  }
  return { height: input.height, width: input.width, x: 0, y: 0 };
}

function resolveLayoutPreset(kind: ReplayRoleAssetKind, visibleBounds: VisibleBounds): SpriteLayoutPreset {
  if (kind === "character-sprite") {
    return STAGE_SPRITE_COWBOY_LAYOUT;
  }
  if (kind === "character-avatar-bust" || kind === "character-avatar-chat") {
    return AVATAR_BUST_LAYOUT;
  }
  const visibleRatio = visibleBounds.width / visibleBounds.height;
  return visibleRatio >= 1.25 ? FRAMED_WIDE_LAYOUT : FRAMED_CLOSEUP_LAYOUT;
}

function resolveBaseSpriteScale(input: ImageMetadata, kind: ReplayRoleAssetKind) {
  const containScale = Math.min(WEBGAL_STAGE_WIDTH / input.width, WEBGAL_STAGE_HEIGHT / input.height);
  const stageAspect = WEBGAL_STAGE_WIDTH / WEBGAL_STAGE_HEIGHT;
  const imageAspect = input.width / input.height;
  if (kind === "manga-avatar" && imageAspect > stageAspect) {
    return WEBGAL_STAGE_HEIGHT / input.height;
  }
  return containScale;
}

export function buildReplayRoleAvatarSpriteTransform(
  input: ImageMetadata,
  kind: ReplayRoleAssetKind,
): SpriteTransform {
  const visibleBounds = normalizeVisibleBounds(input);
  const preset = resolveLayoutPreset(kind, visibleBounds);
  const webgalBaseScale = resolveBaseSpriteScale(input, kind);
  const renderedVisibleWidthAtScaleOne = visibleBounds.width * webgalBaseScale;
  const renderedVisibleHeightAtScaleOne = visibleBounds.height * webgalBaseScale;
  const scale = clampNumber(
    Math.min(
      preset.maxWidth / renderedVisibleWidthAtScaleOne,
      preset.targetHeight / renderedVisibleHeightAtScaleOne,
    ),
    preset.minScale,
    preset.maxScale,
  );

  const baseRenderedHeight = input.height * webgalBaseScale;
  const baseY = WEBGAL_STAGE_HEIGHT / 2 + Math.max(0, (WEBGAL_STAGE_HEIGHT - baseRenderedHeight) / 2);
  const visibleBottomOffset = (visibleBounds.y + visibleBounds.height - input.height / 2) * webgalBaseScale * scale;
  const visibleTopOffset = (visibleBounds.y - input.height / 2) * webgalBaseScale * scale;
  let positionY = preset.bottomY - baseY - visibleBottomOffset;
  const minPositionY = SAFE_TOP_Y - baseY - visibleTopOffset;
  if (positionY < minPositionY) {
    positionY = minPositionY;
  }

  return {
    alpha: 1,
    positionX: 0,
    positionY: roundTransformNumber(positionY),
    rotation: 0,
    scale: roundTransformNumber(scale),
  };
}

function readRoleEntries(rawManifest: ReplayManifestRecord) {
  const roles = toRecord(rawManifest.roles);
  return Object.entries(roles)
    .map(([roleName, value]) => [roleName.trim(), toRecord(value)] as const)
    .filter(([roleName]) => roleName.length > 0);
}

function readAvatarEntries(roleName: string, roleEntry: ReplayManifestRecord) {
  const avatars = toRecord(roleEntry.avatars);
  const entries = Object.entries(avatars)
    .map(([avatarName, value]) => [avatarName.trim(), toRecord(value)] as const)
    .filter(([avatarName]) => avatarName.length > 0);
  if (entries.length === 0) {
    throw new Error(`角色没有可导入差分：${roleName}`);
  }
  return entries;
}

function readAssetKind(roleName: string, avatarName: string, entry: ReplayManifestRecord): ReplayRoleAssetKind {
  const kind = toTrimmedString(entry.kind) as ReplayRoleAssetKind;
  if (!SUPPORTED_ROLE_ASSET_KINDS.has(kind)) {
    throw new Error(`不支持的角色素材类型：${roleName}.${avatarName} ${kind || "(空)"}`);
  }
  return kind;
}

function readVisibleBounds(
  roleName: string,
  avatarName: string,
  entry: ReplayManifestRecord,
  imageWidth: number,
  imageHeight: number,
): VisibleBounds | undefined {
  const rawBounds = entry.visibleBounds;
  if (rawBounds == null) {
    return undefined;
  }
  if (!rawBounds || typeof rawBounds !== "object" || Array.isArray(rawBounds)) {
    throw new Error(`角色素材 visibleBounds 必须是对象：${roleName}.${avatarName}`);
  }

  const bounds = rawBounds as ReplayManifestRecord;
  const x = toFiniteNumber(bounds.x);
  const y = toFiniteNumber(bounds.y);
  const width = toPositiveNumber(bounds.width);
  const height = toPositiveNumber(bounds.height);
  if (x == null || y == null || width == null || height == null) {
    throw new Error(`角色素材 visibleBounds 缺少 x/y/width/height：${roleName}.${avatarName}`);
  }
  if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight) {
    throw new Error(`角色素材 visibleBounds 超出图片范围：${roleName}.${avatarName}`);
  }

  return { height, width, x, y };
}

function readImageMetadata(roleName: string, avatarName: string, entry: ReplayManifestRecord): ImageMetadata {
  const width = toPositiveNumber(entry.width);
  const height = toPositiveNumber(entry.height);
  if (!width || !height) {
    throw new Error(`角色素材缺少 width/height：${roleName}.${avatarName}`);
  }
  const visibleBounds = readVisibleBounds(roleName, avatarName, entry, width, height);
  const hasAlpha = readOptionalBoolean(roleName, avatarName, entry, "hasAlpha");
  return {
    width,
    height,
    ...(hasAlpha != null ? { hasAlpha } : {}),
    ...(visibleBounds ? { visibleBounds } : {}),
  };
}

function readOptionalFileIdOverride(
  roleName: string,
  avatarName: string,
  entry: ReplayManifestRecord,
  key: "avatarFileId" | "originFileId" | "spriteFileId",
  fallbackFileId: number,
) {
  if (!hasOwnProperty(entry, key)) {
    return fallbackFileId;
  }
  const fileId = toPositiveNumber(entry[key]);
  if (!fileId) {
    throw new Error(`角色素材 ${key} 必须是正数：${roleName}.${avatarName}`);
  }
  return fileId;
}

function buildAvatarRequest(params: {
  avatarName: string;
  entry: ReplayManifestRecord;
  existingAvatarId?: number;
  kind: ReplayRoleAssetKind;
  roleId: number;
  roleName: string;
}): RoleAvatarRequest {
  const fileId = toPositiveNumber(params.entry.fileId);
  if (!fileId) {
    throw new Error(`角色素材缺少 fileId：${params.roleName}.${params.avatarName}`);
  }
  const metadata = readImageMetadata(params.roleName, params.avatarName, params.entry);
  const avatarFileId = readOptionalFileIdOverride(params.roleName, params.avatarName, params.entry, "avatarFileId", fileId);
  const spriteFileId = readOptionalFileIdOverride(params.roleName, params.avatarName, params.entry, "spriteFileId", fileId);
  const originFileId = readOptionalFileIdOverride(params.roleName, params.avatarName, params.entry, "originFileId", fileId);

  return {
    ...(params.existingAvatarId ? { avatarId: params.existingAvatarId } : {}),
    roleId: params.roleId,
    avatarTitle: { label: params.avatarName },
    category: toTrimmedString(params.entry.category) || DEFAULT_REPLAY_ROLE_AVATAR_CATEGORY,
    avatarFileId,
    spriteFileId,
    originFileId,
    spriteTransform: buildReplayRoleAvatarSpriteTransform(metadata, params.kind),
  };
}

export function buildReplayRoleAvatarImportPlanFromAssetManifest(
  rawManifest: unknown,
  sources: ReplayRoleAvatarImportSources,
): ReplayRoleAvatarImportPlan {
  const raw = toRecord(rawManifest);
  if (Object.keys(raw).length === 0) {
    throw new Error("asset-manifest.json 必须是 JSON 对象");
  }

  const entries: ReplayRoleAvatarImportEntry[] = [];
  const rolesToCreate: ReplayRoleCreatePlanEntry[] = [];
  const seenRoleNames = new Set<string>();
  let nextTempRoleId = -1;
  for (const [roleName, roleEntry] of readRoleEntries(raw)) {
    const normalizedRoleName = normalizeSpeakerName(roleName);
    if (seenRoleNames.has(normalizedRoleName)) {
      throw new Error(`manifest 角色名重复：${roleName}`);
    }
    seenRoleNames.add(normalizedRoleName);

    const existingRole = resolveExistingRole(roleName, sources.roles);
    const role = existingRole ?? {
      roleId: nextTempRoleId--,
      roleName,
    };
    if (!existingRole) {
      rolesToCreate.push({
        description: toTrimmedString(roleEntry.description) || "由 Replay 角色素材导入自动创建。",
        roleName,
        tempRoleId: role.roleId,
        type: 0,
      });
    }
    const existingAvatars = getAvatarList(sources.avatarsByRoleId, role.roleId);
    const seenAvatarNames = new Set<string>();
    for (const [avatarName, avatarEntry] of readAvatarEntries(roleName, roleEntry)) {
      if (seenAvatarNames.has(avatarName)) {
        throw new Error(`manifest 差分名重复：${roleName}.${avatarName}`);
      }
      seenAvatarNames.add(avatarName);

      const kind = readAssetKind(roleName, avatarName, avatarEntry);
      const existingAvatar = findExistingAvatar(existingAvatars, roleName, avatarName);
      const existingAvatarId = getPositiveId(existingAvatar?.avatarId);
      if (existingAvatar && !existingAvatarId) {
        throw new Error(`角色差分缺少 avatarId：${roleName}.${avatarName}`);
      }
      const avatarRequest = buildAvatarRequest({
        avatarName,
        entry: avatarEntry,
        ...(existingAvatarId ? { existingAvatarId } : {}),
        kind,
        roleId: role.roleId,
        roleName,
      });
      entries.push({
        action: existingAvatar ? "update" : "create",
        avatarName,
        avatarRequest,
        ...(existingAvatarId ? { existingAvatarId } : {}),
        ...(!existingAvatar ? { createRequest: { roleId: role.roleId, category: avatarRequest.category } } : {}),
        kind,
        roleId: role.roleId,
        roleName: role.roleName ?? roleName,
      });
    }
  }

  if (entries.length === 0) {
    throw new Error("asset-manifest.json 没有可导入的角色素材");
  }

  return {
    rolesToCreate,
    entries,
    stats: {
      roleCreate: rolesToCreate.length,
      create: entries.filter(entry => entry.action === "create").length,
      update: entries.filter(entry => entry.action === "update").length,
    },
  };
}

function requireSuccessfulApiResult<T>(
  result: { data?: T; errMsg?: string; success?: boolean } | null | undefined,
  fallbackMessage: string,
) {
  if (!result?.success) {
    throw new Error(result?.errMsg?.trim() || fallbackMessage);
  }
  return result.data;
}

function requireApplyDep<T>(dep: T | undefined, message: string): T {
  if (!dep) {
    throw new Error(message);
  }
  return dep;
}

async function createMissingRoles(
  plan: ReplayRoleAvatarImportPlan,
  deps: ReplayRoleAvatarImportApplyDeps,
) {
  const createdRoleIdsByTempId = new Map<number, number>();
  const createdRoles: ReplayRoleAvatarImportApplyResult["rolesCreated"] = [];
  if (plan.rolesToCreate.length === 0) {
    return { createdRoleIdsByTempId, createdRoles };
  }

  const createRole = requireApplyDep(deps.createRole, "角色素材导入需要 createRole 依赖以自动创建缺失角色");
  const addRoomRole = requireApplyDep(deps.addRoomRole, "角色素材导入需要 addRoomRole 依赖以把自动创建的角色加入当前房间");
  if (!Number.isFinite(deps.roomId) || (deps.roomId ?? 0) <= 0) {
    throw new Error("角色素材导入需要当前房间 ID 才能自动创建缺失角色");
  }

  for (const role of plan.rolesToCreate) {
    const createdRoleId = requireSuccessfulApiResult(
      await createRole({
        roleName: role.roleName,
        description: role.description,
        type: role.type,
      }),
      `自动创建角色失败：${role.roleName}`,
    );
    const roleId = getPositiveId(createdRoleId);
    if (!roleId) {
      throw new Error(`自动创建角色未返回 roleId：${role.roleName}`);
    }

    requireSuccessfulApiResult(
      await addRoomRole({
        roomId: deps.roomId!,
        roleIdList: [roleId],
        type: role.type,
      }),
      `自动创建角色后加入房间失败：${role.roleName}`,
    );

    createdRoleIdsByTempId.set(role.tempRoleId, roleId);
    createdRoles.push({
      roleId,
      roleName: role.roleName,
    });
  }

  return { createdRoleIdsByTempId, createdRoles };
}

export async function applyReplayRoleAvatarImportPlan(
  plan: ReplayRoleAvatarImportPlan,
  deps: ReplayRoleAvatarImportApplyDeps,
): Promise<ReplayRoleAvatarImportApplyResult> {
  const appliedEntries: ReplayRoleAvatarImportApplyResult["entries"] = [];
  const firstAvatarIdByCreatedRoleId = new Map<number, number>();
  const { createdRoleIdsByTempId, createdRoles } = await createMissingRoles(plan, deps);

  for (const entry of plan.entries) {
    const roleId = entry.roleId > 0
      ? entry.roleId
      : createdRoleIdsByTempId.get(entry.roleId);
    if (!roleId) {
      throw new Error(`角色素材缺少 roleId：${entry.roleName}.${entry.avatarName}`);
    }

    let avatarId = entry.existingAvatarId;
    if (entry.action === "create") {
      const createRequest = {
        ...(entry.createRequest ?? { category: entry.avatarRequest.category }),
        roleId,
      };
      const createdAvatarId = requireSuccessfulApiResult(
        await deps.setRoleAvatar(createRequest),
        `创建角色差分失败：${entry.roleName}.${entry.avatarName}`,
      );
      avatarId = getPositiveId(createdAvatarId);
      if (!avatarId) {
        throw new Error(`创建角色差分未返回 avatarId：${entry.roleName}.${entry.avatarName}`);
      }
    }

    if (!avatarId) {
      throw new Error(`角色差分缺少 avatarId：${entry.roleName}.${entry.avatarName}`);
    }

    requireSuccessfulApiResult(
      await deps.updateRoleAvatar({
        ...entry.avatarRequest,
        avatarId,
        roleId,
      }),
      `更新角色差分失败：${entry.roleName}.${entry.avatarName}`,
    );

    if (createdRoles.some(role => role.roleId === roleId) && !firstAvatarIdByCreatedRoleId.has(roleId)) {
      firstAvatarIdByCreatedRoleId.set(roleId, avatarId);
    }

    appliedEntries.push({
      action: entry.action,
      avatarId,
      avatarName: entry.avatarName,
      kind: entry.kind,
      roleId,
      roleName: entry.roleName,
    });
  }

  if (firstAvatarIdByCreatedRoleId.size > 0) {
    const updateRole = requireApplyDep(deps.updateRole, "角色素材导入需要 updateRole 依赖以设置自动创建角色的默认头像");
    for (const [roleId, avatarId] of firstAvatarIdByCreatedRoleId) {
      requireSuccessfulApiResult(
        await updateRole({ roleId, avatarId }),
        `设置自动创建角色默认头像失败：${roleId}`,
      );
    }
  }

  return {
    entries: appliedEntries,
    rolesCreated: createdRoles,
    stats: {
      roleCreate: createdRoles.length,
      create: appliedEntries.filter(entry => entry.action === "create").length,
      update: appliedEntries.filter(entry => entry.action === "update").length,
    },
  };
}
