import { mediaFileUrl } from "@/utils/mediaUrl";

export type RoleVoiceMediaSource = {
  voiceFileId?: number | null;
  voiceUrl?: string | null;
};

export type UploadedRoleVoiceMedia = {
  voiceFileId: number;
  mediaType?: string | null;
};

export function normalizeLegacyVoiceUrl(url: string | null | undefined): string {
  return typeof url === "string" ? url.trim() : "";
}

export function resolveRoleVoiceUrl(role: RoleVoiceMediaSource | null | undefined): string {
  return mediaFileUrl(role?.voiceFileId, "audio", "original")
    || normalizeLegacyVoiceUrl(role?.voiceUrl);
}

export function hasRoleVoiceMedia(role: RoleVoiceMediaSource | null | undefined): boolean {
  return resolveRoleVoiceUrl(role).length > 0;
}

export function buildRoleVoiceUploadPatch(audio: UploadedRoleVoiceMedia): {
  voiceFileId: number;
  voiceUrl: null;
} {
  return {
    voiceFileId: audio.voiceFileId,
    voiceUrl: null,
  };
}

export function buildRoleVoiceClearPatch(): {
  voiceFileId: null;
  voiceUrl: null;
} {
  return {
    voiceFileId: null,
    voiceUrl: null,
  };
}
