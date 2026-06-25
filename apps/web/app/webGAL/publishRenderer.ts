import { resolveRoleAvatarMedia } from "@/components/Role/sprite/roleAvatarMedia";
import { avatarOriginalUrl, avatarUrl } from "@/utils/media/mediaUrl";

import type { RoleAvatar } from "../../api";
import type { RealtimeGameConfig } from "./realtimeRendererConfig";
import type { WebgalPublishFile, WebgalPublishPackage } from "./spaceWebgalCompiler";
import type { SpaceWebgalInput, SpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";

import { getRoleFigureDirName } from "./realtimeRendererAssetUploads";
import { getSafeExtensionFromUrl, hashString } from "./realtimeRendererFileNames";
import { createSquarePngBlobFromUrl } from "./realtimeRendererImageAssets";
import { buildStaticWebgalPackage } from "./spaceWebgalCompiler";
import { buildSpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";
import {
  buildOrdinaryFigureRenderAsset,
  getAvatarCropContextSignature,
  resolveFigureCompositionCandidate,
} from "./webgalFigureComposition";

export type { WebgalPublishFile, WebgalPublishPackage } from "./spaceWebgalCompiler";

export type WebgalPublishRendererInput = SpaceWebgalInput | SpaceWebgalInputSnapshot;

type PublishRoleAvatar = RoleAvatar & {
  webgalSpritePath?: string;
  webgalAvatarLayerPath?: string;
  webgalCompositionBasePath?: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return bytesToBase64(bytes);
}

async function buildIconPublishFiles(
  coverAvatarFileId: number | undefined,
  gameConfig: Partial<RealtimeGameConfig> | undefined,
): Promise<WebgalPublishFile[]> {
  if (!gameConfig?.gameIconFromRoomAvatarEnabled || !Number.isFinite(coverAvatarFileId) || Number(coverAvatarFileId) <= 0) {
    return [];
  }

  const normalizedFileId = Math.floor(Number(coverAvatarFileId));
  const avatarSourceUrl = avatarUrl(normalizedFileId) || avatarOriginalUrl(normalizedFileId);
  if (!avatarSourceUrl) {
    return [];
  }

  const [icon180, icon192, icon512] = await Promise.all([
    createSquarePngBlobFromUrl(avatarSourceUrl, 180),
    createSquarePngBlobFromUrl(avatarSourceUrl, 192),
    createSquarePngBlobFromUrl(avatarSourceUrl, 512),
  ]);
  const [icon180Base64, icon192Base64, icon512Base64] = await Promise.all([
    blobToBase64(icon180),
    blobToBase64(icon192),
    blobToBase64(icon512),
  ]);

  return [
    {
      path: "icons/apple-touch-icon.png",
      content: icon180Base64,
      contentType: "image/png",
      contentEncoding: "base64",
    },
    {
      path: "icons/icon-192.png",
      content: icon192Base64,
      contentType: "image/png",
      contentEncoding: "base64",
    },
    {
      path: "icons/icon-192-maskable.png",
      content: icon192Base64,
      contentType: "image/png",
      contentEncoding: "base64",
    },
    {
      path: "icons/icon-512.png",
      content: icon512Base64,
      contentType: "image/png",
      contentEncoding: "base64",
    },
    {
      path: "icons/icon-512-maskable.png",
      content: icon512Base64,
      contentType: "image/png",
      contentEncoding: "base64",
    },
  ];
}

function resolveFigurePublishContentType(path: string, fallback?: string): string {
  const normalizedFallback = String(fallback ?? "").trim();
  if (normalizedFallback) {
    return normalizedFallback;
  }
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }
  return "application/octet-stream";
}

async function fetchPublishBinaryFile(url: string, path: string): Promise<WebgalPublishFile | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return {
      path,
      content: await blobToBase64(blob),
      contentType: resolveFigurePublishContentType(path, blob.type),
      contentEncoding: "base64",
    };
  }
  catch {
    return null;
  }
}

function buildPublishRelativePath(roleId: number, fileName: string): string {
  return `${getRoleFigureDirName(roleId)}/${fileName}`;
}

async function resolvePublishFigureAssetPath(
  url: string,
  relativePath: string,
  filesByPath: Map<string, WebgalPublishFile>,
): Promise<string> {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return "";
  }
  const packagePath = `game/figure/${relativePath}`;
  if (filesByPath.has(packagePath)) {
    return relativePath;
  }
  const file = await fetchPublishBinaryFile(normalizedUrl, packagePath);
  if (!file) {
    return normalizedUrl;
  }
  filesByPath.set(packagePath, file);
  return relativePath;
}

function buildPublishBaseSpriteRelativePath(candidate: ReturnType<typeof resolveFigureCompositionCandidate>): string {
  if (!candidate) {
    return "";
  }
  const sourceUrl = resolveRoleAvatarMedia(candidate.baseAvatar).sprite.url;
  const extension = getSafeExtensionFromUrl(sourceUrl, "webp");
  return buildPublishRelativePath(
    candidate.roleId,
    `base_${candidate.baseAvatarId}_${candidate.baseSpriteFileId}.${extension}`,
  );
}

function buildPublishAvatarLayerRelativePath(candidate: ReturnType<typeof resolveFigureCompositionCandidate>): string {
  if (!candidate) {
    return "";
  }
  const sourceUrl = resolveRoleAvatarMedia(candidate.avatar).avatar.url;
  const extension = getSafeExtensionFromUrl(sourceUrl, "webp");
  const cropHash = hashString(getAvatarCropContextSignature(candidate.cropContext));
  return buildPublishRelativePath(
    candidate.roleId,
    `avatar_${candidate.avatarId}_${candidate.avatarFileId}_${cropHash}.${extension}`,
  );
}

function buildPublishOrdinarySpriteRelativePath(avatar: RoleAvatar, spriteUrl: string): string {
  const roleId = Number(avatar.roleId ?? 0);
  const avatarId = Number(avatar.avatarId ?? 0);
  const extension = getSafeExtensionFromUrl(spriteUrl, "webp");
  return buildPublishRelativePath(roleId, `sprite_${avatarId}.${extension}`);
}

async function buildPublishFigureAssets(avatars: readonly RoleAvatar[]): Promise<{
  avatars: PublishRoleAvatar[];
  files: WebgalPublishFile[];
}> {
  const clonedAvatars = new Map<number, PublishRoleAvatar>();
  avatars.forEach((avatar) => {
    const avatarId = Number(avatar.avatarId ?? 0);
    if (Number.isFinite(avatarId) && avatarId > 0) {
      clonedAvatars.set(avatarId, { ...avatar });
    }
  });

  const avatarList = Array.from(clonedAvatars.values());
  const filesByPath = new Map<string, WebgalPublishFile>();
  for (const avatar of avatarList) {
    const candidate = resolveFigureCompositionCandidate(avatar, avatarList);
    if (candidate) {
      const baseAvatar = clonedAvatars.get(candidate.baseAvatarId);
      const baseSourceUrl = resolveRoleAvatarMedia(candidate.baseAvatar).sprite.url;
      const avatarLayerSourceUrl = resolveRoleAvatarMedia(avatar).avatar.url;
      const basePath = await resolvePublishFigureAssetPath(
        baseSourceUrl,
        buildPublishBaseSpriteRelativePath(candidate),
        filesByPath,
      );
      const avatarLayerPath = await resolvePublishFigureAssetPath(
        avatarLayerSourceUrl,
        buildPublishAvatarLayerRelativePath(candidate),
        filesByPath,
      );
      if (basePath && avatarLayerPath) {
        if (baseAvatar) {
          baseAvatar.webgalSpritePath = basePath;
        }
        avatar.webgalCompositionBasePath = basePath;
        avatar.webgalAvatarLayerPath = avatarLayerPath;
        if (candidate.baseAvatarId === candidate.avatarId) {
          avatar.webgalSpritePath = basePath;
        }
        continue;
      }
    }

    const spriteUrl = resolveRoleAvatarMedia(avatar).sprite.url;
    const ordinary = buildOrdinaryFigureRenderAsset(spriteUrl);
    if (!ordinary) {
      continue;
    }
    avatar.webgalSpritePath = await resolvePublishFigureAssetPath(
      ordinary.target,
      buildPublishOrdinarySpriteRelativePath(avatar, ordinary.target),
      filesByPath,
    );
  }

  return {
    avatars: Array.from(clonedAvatars.values()),
    files: Array.from(filesByPath.values()),
  };
}

export async function renderWebgalPublishPackage(input: WebgalPublishRendererInput): Promise<WebgalPublishPackage> {
  const snapshot: SpaceWebgalInputSnapshot = "renderableRooms" in input
    ? input
    : buildSpaceWebgalInputSnapshot(input);
  const [iconFiles, figureAssets] = await Promise.all([
    buildIconPublishFiles(
      snapshot.coverAvatarSource?.fileId,
      snapshot.hydratedGameConfig,
    ),
    buildPublishFigureAssets(snapshot.avatars ?? []),
  ]);
  const publishSnapshot: SpaceWebgalInputSnapshot = {
    ...snapshot,
    avatars: figureAssets.avatars,
  };
  return buildStaticWebgalPackage({
    snapshot: publishSnapshot,
    iconFiles: [
      ...iconFiles,
      ...figureAssets.files,
    ],
  });
}
