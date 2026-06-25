import type { UploadedDualImageResult, UploadedMediaAssetResult, UploadUtils } from "@/utils/media/UploadUtils";

import { getImageSize } from "@/utils/media/getImgSize";
import { readMediaDuration } from "@/utils/media/mediaMetadata";

type ReplayAssetManifestRecord = Record<string, unknown>;
type ReplayAssetUploadScene = 1 | 3;
type ReplayAssetUploadMediaKind = "media-audio" | "media-image" | "role-image";

export type ReplayAssetManifestUploadedFile = {
  fileId: number;
  fileName?: string;
  height?: number;
  second?: number;
  size?: number;
  width?: number;
};

export type ReplayAssetManifestUploadOptions = {
  includeMedia?: boolean;
  includeRoles?: boolean;
};

export type ReplayAssetManifestSectionSummary = {
  media: boolean;
  roles: boolean;
};

export type ReplayAssetManifestUploadDeps = {
  measureImage?: (file: File) => Promise<{ height?: number; size?: number; width?: number }>;
  readAudioDuration?: (file: File) => Promise<number | null | undefined>;
  resolveFile: (path: string) => File | Promise<File>;
  uploadAudio: (file: File, context: { groupKey: string; path: string }) => Promise<ReplayAssetManifestUploadedFile>;
  uploadImage: (
    file: File,
    context: { groupKey?: string; kind: ReplayAssetUploadMediaKind; path: string; scene: ReplayAssetUploadScene },
  ) => Promise<ReplayAssetManifestUploadedFile>;
};

const MEDIA_IMAGE_GROUP_KEYS = ["backgrounds", "cg", "references"] as const;
const MEDIA_AUDIO_GROUP_KEYS = ["bgm", "se"] as const;
const ROLE_LOCAL_FILE_KEYS = [
  ["avatarFile", "avatarFileId"],
  ["originFile", "originFileId"],
  ["spriteFile", "spriteFileId"],
] as const;
const PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAMES = [
  "assets.json",
  "replay-assets.json",
  "local-assets.json",
  "asset-manifest.json",
];
const PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAME_LABEL = PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAMES.join("、");

function toRecord(value: unknown): ReplayAssetManifestRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ReplayAssetManifestRecord
    : {};
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveNumber(value: unknown) {
  const numberValue = typeof value === "string" ? Number(value.trim()) : value;
  return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

function hasOwn(record: ReplayAssetManifestRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function fileWebkitRelativePath(file: File) {
  return toTrimmedString((file as File & { webkitRelativePath?: string }).webkitRelativePath);
}

function getFilePathAliases(file: File) {
  const aliases = new Set<string>();
  const fileName = normalizeAssetPath(file.name);
  if (fileName) {
    aliases.add(fileName);
  }

  const relativePath = normalizeAssetPath(fileWebkitRelativePath(file));
  if (relativePath) {
    aliases.add(relativePath);
    const withoutRoot = relativePath.split("/").slice(1).join("/");
    if (withoutRoot) {
      aliases.add(withoutRoot);
    }
  }

  return Array.from(aliases);
}

function isNonEmptyRecord(value: unknown) {
  return Object.keys(toRecord(value)).length > 0;
}

function hasNonEmptyMedia(raw: ReplayAssetManifestRecord) {
  const media = toRecord(raw.media);
  return [...MEDIA_IMAGE_GROUP_KEYS, ...MEDIA_AUDIO_GROUP_KEYS].some(groupKey => isNonEmptyRecord(media[groupKey]));
}

function hasNonEmptyRoles(raw: ReplayAssetManifestRecord) {
  return Object.values(toRecord(raw.roles)).some((roleValue) => {
    const roleEntry = toRecord(roleValue);
    return isNonEmptyRecord(roleEntry.avatars);
  });
}

function cloneWithoutLocalFileKeys(entry: ReplayAssetManifestRecord, keys: string[]) {
  const out: ReplayAssetManifestRecord = { ...entry };
  for (const key of keys) {
    delete out[key];
  }
  return out;
}

function readLocalFilePath(entry: ReplayAssetManifestRecord, key: string, errorName: string) {
  if (!hasOwn(entry, key)) {
    return "";
  }
  const filePath = toTrimmedString(entry[key]);
  if (!filePath) {
    throw new Error(`素材本地文件路径不能为空：${errorName}.${key}`);
  }
  return filePath;
}

function setIfMissing(record: ReplayAssetManifestRecord, key: string, value: unknown) {
  if (record[key] == null || record[key] === "") {
    record[key] = value;
  }
}

function requireUploadedFileId(uploaded: ReplayAssetManifestUploadedFile, errorName: string) {
  const fileId = toPositiveNumber(uploaded.fileId);
  if (!fileId) {
    throw new Error(`素材上传结果缺少 fileId：${errorName}`);
  }
  return fileId;
}

async function measureImageIfNeeded(
  file: File,
  entry: ReplayAssetManifestRecord,
  deps: ReplayAssetManifestUploadDeps,
) {
  if (toPositiveNumber(entry.width) && toPositiveNumber(entry.height) && toPositiveNumber(entry.size)) {
    return {};
  }
  return await deps.measureImage?.(file) ?? {};
}

async function uploadImageEntry(params: {
  deps: ReplayAssetManifestUploadDeps;
  entry: ReplayAssetManifestRecord;
  errorName: string;
  groupKey?: string;
  kind: ReplayAssetUploadMediaKind;
  scene: ReplayAssetUploadScene;
}) {
  const existingFileId = toPositiveNumber(params.entry.fileId);
  const filePath = readLocalFilePath(params.entry, "file", params.errorName);
  const out = cloneWithoutLocalFileKeys(params.entry, ["file"]);
  if (existingFileId) {
    return out;
  }
  if (!filePath) {
    throw new Error(`素材缺少 fileId 或 file：${params.errorName}`);
  }

  const file = await params.deps.resolveFile(filePath);
  const [uploaded, measured] = await Promise.all([
    params.deps.uploadImage(file, {
      groupKey: params.groupKey,
      kind: params.kind,
      path: filePath,
      scene: params.scene,
    }),
    measureImageIfNeeded(file, params.entry, params.deps),
  ]);
  out.fileId = requireUploadedFileId(uploaded, params.errorName);
  setIfMissing(out, "fileName", uploaded.fileName ?? file.name);
  setIfMissing(out, "width", uploaded.width ?? measured.width);
  setIfMissing(out, "height", uploaded.height ?? measured.height);
  setIfMissing(out, "size", uploaded.size ?? measured.size ?? file.size);
  return out;
}

async function uploadAudioEntry(params: {
  deps: ReplayAssetManifestUploadDeps;
  entry: ReplayAssetManifestRecord;
  errorName: string;
  groupKey: string;
}) {
  const existingFileId = toPositiveNumber(params.entry.fileId);
  const filePath = readLocalFilePath(params.entry, "file", params.errorName);
  const out = cloneWithoutLocalFileKeys(params.entry, ["file"]);
  if (existingFileId) {
    return out;
  }
  if (!filePath) {
    throw new Error(`素材缺少 fileId 或 file：${params.errorName}`);
  }

  const file = await params.deps.resolveFile(filePath);
  const [uploaded, second] = await Promise.all([
    params.deps.uploadAudio(file, { groupKey: params.groupKey, path: filePath }),
    toPositiveNumber(params.entry.second) ? undefined : params.deps.readAudioDuration?.(file),
  ]);
  out.fileId = requireUploadedFileId(uploaded, params.errorName);
  setIfMissing(out, "fileName", uploaded.fileName ?? file.name);
  setIfMissing(out, "size", uploaded.size ?? file.size);
  setIfMissing(out, "second", uploaded.second ?? second ?? undefined);
  return out;
}

async function uploadRoleFileOverride(params: {
  deps: ReplayAssetManifestUploadDeps;
  entry: ReplayAssetManifestRecord;
  errorName: string;
  fileKey: string;
  idKey: string;
  out: ReplayAssetManifestRecord;
}) {
  if (toPositiveNumber(params.entry[params.idKey]) || !hasOwn(params.entry, params.fileKey)) {
    return;
  }
  const filePath = readLocalFilePath(params.entry, params.fileKey, params.errorName);
  const file = await params.deps.resolveFile(filePath);
  const uploaded = await params.deps.uploadImage(file, {
    kind: "role-image",
    path: filePath,
    scene: 3,
  });
  params.out[params.idKey] = requireUploadedFileId(uploaded, `${params.errorName}.${params.fileKey}`);
}

function assertRoleDimensions(roleName: string, avatarName: string, entry: ReplayAssetManifestRecord) {
  if (!toPositiveNumber(entry.width) || !toPositiveNumber(entry.height)) {
    throw new Error(`角色素材缺少 width/height：${roleName}.${avatarName}`);
  }
}

async function uploadRoleAvatarEntry(params: {
  avatarName: string;
  deps: ReplayAssetManifestUploadDeps;
  entry: ReplayAssetManifestRecord;
  roleName: string;
}) {
  const errorName = `${params.roleName}.${params.avatarName}`;
  const out = await uploadImageEntry({
    deps: params.deps,
    entry: params.entry,
    errorName,
    kind: "role-image",
    scene: 3,
  });
  for (const [fileKey, idKey] of ROLE_LOCAL_FILE_KEYS) {
    delete out[fileKey];
    await uploadRoleFileOverride({
      deps: params.deps,
      entry: params.entry,
      errorName,
      fileKey,
      idKey,
      out,
    });
  }
  assertRoleDimensions(params.roleName, params.avatarName, out);
  return out;
}

async function uploadMediaGroup(params: {
  deps: ReplayAssetManifestUploadDeps;
  groupKey: string;
  groupValue: unknown;
  kind: "audio" | "image";
}) {
  const group = toRecord(params.groupValue);
  const out: ReplayAssetManifestRecord = {};
  for (const [name, value] of Object.entries(group)) {
    const materialName = name.trim();
    if (!materialName) {
      continue;
    }
    const entry = toRecord(value);
    const errorName = `media.${params.groupKey}.${materialName}`;
    out[materialName] = params.kind === "image"
      ? await uploadImageEntry({
          deps: params.deps,
          entry,
          errorName,
          groupKey: params.groupKey,
          kind: "media-image",
          scene: 1,
        })
      : await uploadAudioEntry({
          deps: params.deps,
          entry,
          errorName,
          groupKey: params.groupKey,
        });
  }
  return out;
}

async function uploadRoles(rawRoles: unknown, deps: ReplayAssetManifestUploadDeps) {
  const roles = toRecord(rawRoles);
  const out: ReplayAssetManifestRecord = {};
  for (const [roleNameRaw, roleValue] of Object.entries(roles)) {
    const roleName = roleNameRaw.trim();
    if (!roleName) {
      continue;
    }
    const roleEntry = toRecord(roleValue);
    const avatars = toRecord(roleEntry.avatars);
    const outAvatars: ReplayAssetManifestRecord = {};
    for (const [avatarNameRaw, avatarValue] of Object.entries(avatars)) {
      const avatarName = avatarNameRaw.trim();
      if (!avatarName) {
        continue;
      }
      outAvatars[avatarName] = await uploadRoleAvatarEntry({
        avatarName,
        deps,
        entry: toRecord(avatarValue),
        roleName,
      });
    }
    out[roleName] = { ...roleEntry, avatars: outAvatars };
  }
  return out;
}

export async function buildUploadedReplayAssetManifest(
  rawManifest: unknown,
  deps: ReplayAssetManifestUploadDeps,
  options: ReplayAssetManifestUploadOptions = {},
): Promise<ReplayAssetManifestRecord> {
  const raw = toRecord(rawManifest);
  if (Object.keys(raw).length === 0) {
    throw new Error("素材清单必须是 JSON 对象");
  }

  const includeMedia = options.includeMedia ?? true;
  const includeRoles = options.includeRoles ?? true;
  const out: ReplayAssetManifestRecord = { ...raw };
  if (includeMedia) {
    const media = toRecord(raw.media);
    const outMedia: ReplayAssetManifestRecord = { ...media };
    for (const groupKey of MEDIA_IMAGE_GROUP_KEYS) {
      if (hasOwn(media, groupKey)) {
        outMedia[groupKey] = await uploadMediaGroup({
          deps,
          groupKey,
          groupValue: media[groupKey],
          kind: "image",
        });
      }
    }
    for (const groupKey of MEDIA_AUDIO_GROUP_KEYS) {
      if (hasOwn(media, groupKey)) {
        outMedia[groupKey] = await uploadMediaGroup({
          deps,
          groupKey,
          groupValue: media[groupKey],
          kind: "audio",
        });
      }
    }
    if (hasOwn(raw, "media")) {
      out.media = outMedia;
    }
  }
  else {
    delete out.media;
  }

  if (includeRoles && hasOwn(raw, "roles")) {
    out.roles = await uploadRoles(raw.roles, deps);
  }
  else if (!includeRoles) {
    delete out.roles;
  }

  return out;
}

function normalizeAssetPath(path: string) {
  return path.trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}

export function summarizeReplayAssetManifestSections(rawManifest: unknown): ReplayAssetManifestSectionSummary {
  const raw = toRecord(rawManifest);
  return {
    media: hasNonEmptyMedia(raw),
    roles: hasNonEmptyRoles(raw),
  };
}

export function parseReplayAssetManifestJsonText(fileName: string, text: string, subject = "素材清单"): unknown {
  try {
    return JSON.parse(text) as unknown;
  }
  catch (error) {
    const displayName = fileName.trim() || "未命名文件";
    const reason = error instanceof Error && error.message ? error.message : "JSON 解析失败";
    throw new Error(`${subject} JSON 解析失败：${displayName}：${reason}`);
  }
}

export async function readReplayAssetManifestJsonFile(file: File, subject = "素材清单"): Promise<unknown> {
  return parseReplayAssetManifestJsonText(file.name, await file.text(), subject);
}

export function buildReplayAssetUploadFileMap(files: Iterable<File>) {
  const aliases = new Map<string, File | null>();
  for (const file of files) {
    for (const alias of getFilePathAliases(file)) {
      const existing = aliases.get(alias);
      if (existing === undefined) {
        aliases.set(alias, file);
        continue;
      }
      if (existing !== file) {
        aliases.set(alias, null);
      }
    }
  }
  return new Map(
    Array.from(aliases.entries()).filter((entry): entry is [string, File] => entry[1] != null),
  );
}

export function findReplayLocalAssetManifestFile(files: Iterable<File>) {
  const candidates = Array.from(files)
    .filter(file => /\.json$/i.test(file.name));
  if (candidates.length === 0) {
    throw new Error(`本地素材目录缺少素材清单 JSON，请提供 ${PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAME_LABEL} 之一`);
  }

  const preferred = candidates.filter((file) => {
    const normalizedName = file.name.trim().toLowerCase();
    return PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAMES.includes(normalizedName);
  });
  if (preferred.length === 1) {
    return preferred[0]!;
  }
  if (preferred.length > 1) {
    throw new Error(`本地素材目录存在多个素材清单 JSON，请只保留一个：${PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAME_LABEL}`);
  }
  if (candidates.length === 1) {
    return candidates[0]!;
  }
  throw new Error(`本地素材目录存在多个 JSON 文件，请使用 ${PREFERRED_LOCAL_ASSET_MANIFEST_FILE_NAME_LABEL} 命名素材清单`);
}

function toUploadedFile(uploaded: UploadedDualImageResult | UploadedMediaAssetResult, fallbackFile: File): ReplayAssetManifestUploadedFile {
  return {
    fileId: uploaded.fileId,
    fileName: "fileName" in uploaded ? uploaded.fileName : fallbackFile.name,
    size: "size" in uploaded ? uploaded.size : uploaded.originalSize,
  };
}

export function createReplayAssetManifestUploadDepsFromUploadUtils(params: {
  filesByPath: ReadonlyMap<string, File>;
  uploadUtils: UploadUtils;
}): ReplayAssetManifestUploadDeps {
  const findFile = (filePath: string) => {
    const normalized = normalizeAssetPath(filePath);
    const file = params.filesByPath.get(filePath) ?? params.filesByPath.get(normalized);
    if (!file) {
      throw new Error(`找不到本地素材文件：${filePath}`);
    }
    return file;
  };

  return {
    measureImage: getImageSize,
    readAudioDuration: readMediaDuration,
    resolveFile: findFile,
    uploadAudio: async (file) => {
      const uploaded = await params.uploadUtils.uploadAudioAsset(file, 1, 0);
      return toUploadedFile(uploaded, file);
    },
    uploadImage: async (file, context) => {
      const uploaded = await params.uploadUtils.uploadDualImage(file, context.scene);
      return toUploadedFile(uploaded, file);
    },
  };
}
