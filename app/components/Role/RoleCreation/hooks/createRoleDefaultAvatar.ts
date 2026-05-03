import type { QueryClient } from "@tanstack/react-query";
import type { RoleAvatar } from "api";

import { tuanchat } from "@/../api/instance";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { uploadMediaFile } from "@/utils/mediaUpload";
import { seedRoleAvatarQueryCaches } from "api/hooks/RoleAndAvatarHooks";

const FALLBACK_DEFAULT_AVATAR_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9l6wAAAABJRU5ErkJggg==";

function mergeAvatarPatch(avatar: RoleAvatar, patch?: RoleAvatar | null): RoleAvatar {
  if (!patch) {
    return avatar;
  }

  return {
    ...avatar,
    ...patch,
  };
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function createCanvasDefaultAvatarFile(): Promise<File | null> {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.fillStyle = "#101828";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1d2939";
  context.beginPath();
  context.arc(256, 256, 212, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#38bdf8";
  context.beginPath();
  context.arc(256, 208, 76, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#0ea5e9";
  context.beginPath();
  context.ellipse(256, 374, 138, 96, 0, 0, Math.PI * 2);
  context.fill();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    return null;
  }
  return new File([blob], "role-default-avatar.png", { type: "image/png" });
}

async function createFallbackDefaultAvatarFile(): Promise<File> {
  const bytes = bytesFromBase64(FALLBACK_DEFAULT_AVATAR_PNG_BASE64);
  return new File([bytes], "role-default-avatar.png", { type: "image/png" });
}

async function fetchDefaultAvatarFile(): Promise<File | null> {
  if (typeof fetch !== "function") {
    return null;
  }
  try {
    const response = await fetch(ROLE_DEFAULT_AVATAR_URL, { cache: "force-cache" });
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    const type = blob.type || "image/jpeg";
    if (!type.startsWith("image/")) {
      return null;
    }
    return new File([blob], "role-default-avatar.jpg", { type });
  }
  catch {
    return null;
  }
}

async function uploadDefaultAvatarMediaFile(): Promise<number | null> {
  const defaultAvatarFile = await fetchDefaultAvatarFile()
    ?? await createCanvasDefaultAvatarFile()
    ?? await createFallbackDefaultAvatarFile();
  const uploaded = await uploadMediaFile(defaultAvatarFile);
  return uploaded.fileId || null;
}

export async function ensureRoleAvatarDefaultMedia(
  queryClient: QueryClient,
  roleId: number,
  avatarId: number,
): Promise<RoleAvatar | null> {
  const avatarRes = await tuanchat.avatarController.getRoleAvatar(avatarId);
  if (!avatarRes?.success || !avatarRes.data) {
    return null;
  }

  let nextAvatar: RoleAvatar = {
    ...avatarRes.data,
    roleId,
    avatarId,
  };

  const uploadedAvatarFileId = nextAvatar.avatarFileId ? null : await uploadDefaultAvatarMediaFile();
  const avatarFileId = nextAvatar.avatarFileId ?? uploadedAvatarFileId ?? undefined;
  const spriteFileId = nextAvatar.spriteFileId ?? avatarFileId;

  if (avatarFileId && (nextAvatar.avatarFileId !== avatarFileId || nextAvatar.spriteFileId !== spriteFileId)) {
    const updateRes = await tuanchat.avatarController.updateRoleAvatar({
      ...nextAvatar,
      avatarFileId,
      spriteFileId,
    });
    if (updateRes?.success) {
      nextAvatar = mergeAvatarPatch({
        ...nextAvatar,
        avatarFileId,
        spriteFileId,
      }, updateRes.data);
    }
  }

  seedRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
  return nextAvatar;
}

export async function ensureCreatedRoleDefaultAvatar(
  queryClient: QueryClient,
  roleId: number,
  avatarId: number,
): Promise<RoleAvatar | null> {
  return ensureRoleAvatarDefaultMedia(queryClient, roleId, avatarId);
}
