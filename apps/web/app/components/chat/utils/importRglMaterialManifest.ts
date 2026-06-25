import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import type {
  MaterialNode,
  MaterialPackageContent,
  MessageDraft,
  SpaceMaterialPackageCreateRequest,
  SpaceMaterialPackageResponse,
  SpaceMaterialPackageUpdateRequest,
} from "../../../../api";

import { MaterialNode as MaterialNodeModel } from "../../../../api";
import { MessageType } from "../../../../api/wsModels";

type ReplayManifestRecord = Record<string, unknown>;

type ReplayImageGroupKey = "backgrounds" | "cg" | "references";
type ReplaySoundGroupKey = "bgm" | "se";
type ReplayMediaGroupKey = ReplayImageGroupKey | ReplaySoundGroupKey;

type ReplayManifestGroupConfig = {
  annotationId: string;
  folderName: string;
  messageType: MessageType;
  mediaKind: "image" | "sound";
  soundPurpose?: "bgm" | "se";
  imageBackground?: boolean;
};

export type ReplayMaterialPackageImportBuildResult = {
  content: MaterialPackageContent;
  description: string;
  name: string;
};

export type ReplayMaterialPackageImportApplyDeps = {
  createPackage: (request: SpaceMaterialPackageCreateRequest) => Promise<ApiResultLike<SpaceMaterialPackageResponse>>;
  findPackageByExactName: (spaceId: number, name: string) => Promise<Pick<SpaceMaterialPackageResponse, "spacePackageId"> | null>;
  updatePackage: (request: SpaceMaterialPackageUpdateRequest) => Promise<ApiResultLike<SpaceMaterialPackageResponse>>;
};

export type ReplayMaterialPackageImportApplyResult = {
  action: "create" | "update";
  materialCount: number;
  name: string;
  spacePackageId?: number;
};

type ApiResultLike<T> = {
  data?: T;
  errMsg?: string;
  success?: boolean;
};

const REPLAY_MATERIAL_GROUPS: Array<[ReplayMediaGroupKey, ReplayManifestGroupConfig]> = [
  ["backgrounds", {
    annotationId: ANNOTATION_IDS.BACKGROUND,
    folderName: "背景",
    imageBackground: true,
    mediaKind: "image",
    messageType: MessageType.IMG,
  }],
  ["bgm", {
    annotationId: ANNOTATION_IDS.BGM,
    folderName: "BGM",
    mediaKind: "sound",
    messageType: MessageType.SOUND,
    soundPurpose: "bgm",
  }],
  ["se", {
    annotationId: ANNOTATION_IDS.SE,
    folderName: "SE",
    mediaKind: "sound",
    messageType: MessageType.SOUND,
    soundPurpose: "se",
  }],
  ["cg", {
    annotationId: ANNOTATION_IDS.CG,
    folderName: "CG",
    imageBackground: false,
    mediaKind: "image",
    messageType: MessageType.IMG,
  }],
  ["references", {
    annotationId: ANNOTATION_IDS.IMAGE_SHOW,
    folderName: "资料",
    imageBackground: false,
    mediaKind: "image",
    messageType: MessageType.IMG,
  }],
];
const KNOWN_ANNOTATION_IDS = new Set<string>(Object.values(ANNOTATION_IDS));

function toRecord(value: unknown): ReplayManifestRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ReplayManifestRecord
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

function compactRecord<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>;
}

function readPackageName(raw: ReplayManifestRecord) {
  const packageInfo = toRecord(raw.package);
  return toTrimmedString(packageInfo.name)
    || toTrimmedString(raw.packageName)
    || toTrimmedString(raw.name)
    || "Replay 导入素材";
}

function readPackageDescription(raw: ReplayManifestRecord) {
  const packageInfo = toRecord(raw.package);
  return toTrimmedString(packageInfo.description)
    || toTrimmedString(raw.description)
    || "由 asset-manifest.json 导入生成；manifest 仅作为导入期文件，不保存进素材包。";
}

function readGroupEntries(media: ReplayManifestRecord, key: ReplayMediaGroupKey) {
  const group = media[key];
  if (group == null) {
    return [];
  }
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new Error(`media.${key} 必须是素材名到素材信息的对象`);
  }
  return Object.entries(group as ReplayManifestRecord)
    .map(([name, value]) => [name.trim(), toRecord(value)] as const)
    .filter(([name]) => name.length > 0);
}

function normalizeManifestMaterialPathParts(value: string, rootFolderName: string) {
  const parts = value
    .replace(/\\/g, "/")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);
  if (parts[0] === rootFolderName) {
    return parts.slice(1);
  }
  return parts;
}

function readExtraAnnotations(materialName: string, rawAnnotations: unknown) {
  if (rawAnnotations == null) {
    return [];
  }
  if (!Array.isArray(rawAnnotations)) {
    throw new Error(`素材 annotations 必须是数组：${materialName}`);
  }
  const annotations = rawAnnotations.map(value => toTrimmedString(value)).filter(Boolean);
  const unknownAnnotation = annotations.find(annotation => !KNOWN_ANNOTATION_IDS.has(annotation));
  if (unknownAnnotation) {
    throw new Error(`未知素材 annotation：${materialName} ${unknownAnnotation}`);
  }
  return annotations;
}

function mergeAnnotations(coreAnnotationId: string, rawAnnotations: unknown, materialName: string) {
  const annotations = readExtraAnnotations(materialName, rawAnnotations);
  return [coreAnnotationId, ...annotations.filter(annotation => annotation !== coreAnnotationId)];
}

function requireFileId(name: string, entry: ReplayManifestRecord) {
  const fileId = toPositiveNumber(entry.fileId);
  if (!fileId) {
    throw new Error(`素材缺少 fileId：${name}`);
  }
  return fileId;
}

function buildImageMessage(
  name: string,
  entry: ReplayManifestRecord,
  config: ReplayManifestGroupConfig,
  errorName = name,
): MessageDraft {
  const fileId = requireFileId(errorName, entry);
  return {
    annotations: mergeAnnotations(config.annotationId, entry.annotations, errorName),
    content: toTrimmedString(entry.content),
    messageType: config.messageType,
    extra: {
      imageMessage: compactRecord({
        source: { kind: "internal", fileId },
        width: toPositiveNumber(entry.width),
        height: toPositiveNumber(entry.height),
        size: toPositiveNumber(entry.size),
        fileName: toTrimmedString(entry.fileName) || `${name}.webp`,
        background: config.imageBackground ?? false,
      }),
    },
  };
}

function buildSoundMessage(
  name: string,
  entry: ReplayManifestRecord,
  config: ReplayManifestGroupConfig,
  errorName = name,
): MessageDraft {
  const fileId = requireFileId(errorName, entry);
  return {
    annotations: mergeAnnotations(config.annotationId, entry.annotations, errorName),
    content: toTrimmedString(entry.content),
    messageType: config.messageType,
    extra: {
      soundMessage: compactRecord({
        source: { kind: "internal", fileId },
        fileName: toTrimmedString(entry.fileName) || `${name}.mp3`,
        size: toPositiveNumber(entry.size),
        second: toPositiveNumber(entry.second),
        purpose: toTrimmedString(entry.purpose) || config.soundPurpose,
      }),
    },
  };
}

function buildMaterialNode(
  name: string,
  entry: ReplayManifestRecord,
  config: ReplayManifestGroupConfig,
  errorName = name,
): MaterialNode {
  const message = config.mediaKind === "image"
    ? buildImageMessage(name, entry, config, errorName)
    : buildSoundMessage(name, entry, config, errorName);

  return {
    type: MaterialNodeModel.type.MATERIAL,
    name,
    note: toTrimmedString(entry.note),
    messages: [message],
  };
}

function createFolderNode(name: string): MaterialNode {
  return {
    type: MaterialNodeModel.type.FOLDER,
    name,
    children: [],
  };
}

function ensureFolderNode(children: MaterialNode[], name: string, path: string) {
  const existing = children.find(child => child.name === name);
  if (!existing) {
    const folder = createFolderNode(name);
    children.push(folder);
    return folder;
  }
  if (existing.type !== MaterialNodeModel.type.FOLDER) {
    throw new Error(`素材路径冲突：${path}`);
  }
  return existing;
}

function insertMaterialPath(
  rootChildren: MaterialNode[],
  rawName: string,
  entry: ReplayManifestRecord,
  config: ReplayManifestGroupConfig,
) {
  const pathParts = normalizeManifestMaterialPathParts(rawName, config.folderName);
  if (pathParts.length === 0) {
    throw new Error(`素材路径不能为空：${rawName}`);
  }

  let children = rootChildren;
  const traversedPath = [config.folderName];
  for (const folderName of pathParts.slice(0, -1)) {
    traversedPath.push(folderName);
    const folder = ensureFolderNode(children, folderName, traversedPath.join("/"));
    folder.children ??= [];
    children = folder.children;
  }

  const materialName = pathParts[pathParts.length - 1]!;
  const materialPath = [...traversedPath, materialName].join("/");
  if (children.some(child => child.name === materialName)) {
    throw new Error(`素材路径冲突：${materialPath}`);
  }
  children.push(buildMaterialNode(materialName, entry, config, materialPath));
}

function buildFolderNode(key: ReplayMediaGroupKey, config: ReplayManifestGroupConfig, media: ReplayManifestRecord): MaterialNode {
  const children: MaterialNode[] = [];
  for (const [name, entry] of readGroupEntries(media, key)) {
    insertMaterialPath(children, name, entry, config);
  }
  return {
    type: MaterialNodeModel.type.FOLDER,
    name: config.folderName,
    children,
  };
}

function countMaterialNodes(nodes: MaterialNode[] | undefined): number {
  let count = 0;
  for (const node of nodes ?? []) {
    if (node.type === MaterialNodeModel.type.MATERIAL) {
      count += 1;
    }
    count += countMaterialNodes(node.children);
  }
  return count;
}

export function buildReplayMaterialPackageFromAssetManifest(rawManifest: unknown): ReplayMaterialPackageImportBuildResult {
  const raw = toRecord(rawManifest);
  if (Object.keys(raw).length === 0) {
    throw new Error("asset-manifest.json 必须是 JSON 对象");
  }

  const media = toRecord(raw.media);
  const root = REPLAY_MATERIAL_GROUPS.map(([key, config]) => buildFolderNode(key, config, media));
  const materialCount = countMaterialNodes(root);
  if (materialCount === 0) {
    throw new Error("asset-manifest.json 没有可导入的通用素材");
  }

  return {
    name: readPackageName(raw),
    description: readPackageDescription(raw),
    content: {
      version: 1,
      root,
    },
  };
}

function requireSuccessfulApiResult<T>(result: ApiResultLike<T> | null | undefined, fallbackMessage: string) {
  if (!result?.success) {
    throw new Error(result?.errMsg?.trim() || fallbackMessage);
  }
  return result.data;
}

export async function applyReplayMaterialPackageImport(
  spaceId: number,
  replayPackage: ReplayMaterialPackageImportBuildResult,
  deps: ReplayMaterialPackageImportApplyDeps,
): Promise<ReplayMaterialPackageImportApplyResult> {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    throw new Error("未找到当前空间，无法导入通用素材");
  }

  const existing = await deps.findPackageByExactName(spaceId, replayPackage.name);
  const materialCount = countMaterialNodes(replayPackage.content.root);
  if (existing?.spacePackageId) {
    const saved = requireSuccessfulApiResult(
      await deps.updatePackage({
        spacePackageId: existing.spacePackageId,
        spaceId,
        name: replayPackage.name,
        description: replayPackage.description,
        content: replayPackage.content,
      }),
      `重写 Replay 通用素材包失败：${replayPackage.name}`,
    );
    return {
      action: "update",
      materialCount,
      name: replayPackage.name,
      spacePackageId: saved?.spacePackageId ?? existing.spacePackageId,
    };
  }

  const saved = requireSuccessfulApiResult(
    await deps.createPackage({
      spaceId,
      name: replayPackage.name,
      description: replayPackage.description,
      content: replayPackage.content,
    }),
    `创建 Replay 通用素材包失败：${replayPackage.name}`,
  );
  return {
    action: "create",
    materialCount,
    name: replayPackage.name,
    spacePackageId: saved?.spacePackageId,
  };
}
