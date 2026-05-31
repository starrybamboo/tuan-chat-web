import type { RealtimeGameConfig } from "./realtimeRendererConfig";
import type { SpaceWebgalInput, SpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";

import { avatarOriginalUrl, avatarUrl } from "@/utils/mediaUrl";

import { createSquarePngBlobFromUrl } from "./realtimeRendererImageAssets";
import { buildStaticWebgalPackage } from "./spaceWebgalCompiler";
import type { WebgalPublishFile, WebgalPublishPackage } from "./spaceWebgalCompiler";
import { buildSpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";

export type { WebgalPublishFile, WebgalPublishPackage } from "./spaceWebgalCompiler";

export type WebgalPublishRendererInput = SpaceWebgalInput | SpaceWebgalInputSnapshot;

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

export async function renderWebgalPublishPackage(input: WebgalPublishRendererInput): Promise<WebgalPublishPackage> {
  const snapshot: SpaceWebgalInputSnapshot = "renderableRooms" in input
    ? input
    : buildSpaceWebgalInputSnapshot(input);
  const iconFiles = await buildIconPublishFiles(
    snapshot.coverAvatarSource?.fileId,
    snapshot.hydratedGameConfig,
  );
  return buildStaticWebgalPackage({
    snapshot,
    iconFiles,
  });
}
