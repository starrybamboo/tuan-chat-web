import { mediaFileUrl } from "@/utils/mediaUrl";

export type RoleVoiceMediaSource = {
  voiceFileId?: number | null;
};

export type UploadedRoleVoiceMedia = {
  voiceFileId: number;
  mediaType?: string | null;
};

export function resolveRoleVoiceUrl(role: RoleVoiceMediaSource | null | undefined): string {
  return mediaFileUrl(role?.voiceFileId, "audio", "original") || "";
}

export function hasRoleVoiceMedia(role: RoleVoiceMediaSource | null | undefined): boolean {
  return resolveRoleVoiceUrl(role).length > 0;
}

export function buildRoleVoiceUploadPatch(audio: UploadedRoleVoiceMedia): {
  voiceFileId: number;
} {
  return {
    voiceFileId: audio.voiceFileId,
  };
}

export function buildRoleVoiceClearPatch(): {
  voiceFileId: null;
} {
  return {
    voiceFileId: null,
  };
}
