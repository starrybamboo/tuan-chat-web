import { ANNOTATION_IDS, hasAnnotation } from "@/types/messageAnnotations";

export type SoundMessagePurpose = "bgm" | "se";
export type RenderedSoundMessagePurpose = SoundMessagePurpose | "voice";

export function normalizeSoundMessagePurpose(rawPurpose: unknown): SoundMessagePurpose | undefined {
  if (typeof rawPurpose !== "string") {
    return undefined;
  }
  const normalized = rawPurpose.trim().toLowerCase();
  return normalized === "bgm" || normalized === "se" ? normalized : undefined;
}

export function getSoundMessagePurposeFromAnnotations(annotations?: string[] | null): SoundMessagePurpose | undefined {
  const list = Array.isArray(annotations) ? annotations : undefined;
  if (hasAnnotation(list, ANNOTATION_IDS.BGM)) {
    return "bgm";
  }
  if (hasAnnotation(list, ANNOTATION_IDS.SE)) {
    return "se";
  }
  return undefined;
}

export function resolveRenderedSoundMessagePurpose(params: {
  annotations?: string[] | null;
  payloadPurpose?: unknown;
  content?: unknown;
}): RenderedSoundMessagePurpose {
  const purposeFromAnnotations = getSoundMessagePurposeFromAnnotations(params.annotations);
  if (purposeFromAnnotations) {
    return purposeFromAnnotations;
  }

  const purposeFromPayload = normalizeSoundMessagePurpose(params.payloadPurpose);
  if (purposeFromPayload) {
    return purposeFromPayload;
  }

  const contentText = typeof params.content === "string" ? params.content : "";
  if (contentText.includes("[播放BGM]")) {
    return "bgm";
  }
  if (contentText.includes("[播放音效]")) {
    return "se";
  }
  return "voice";
}

export function getNextSyncedSoundMessagePurpose(params: {
  previousAnnotations?: string[] | null;
  nextAnnotations?: string[] | null;
  currentPurpose?: unknown;
}): SoundMessagePurpose | undefined {
  const previousPurpose = getSoundMessagePurposeFromAnnotations(params.previousAnnotations);
  const nextPurpose = getSoundMessagePurposeFromAnnotations(params.nextAnnotations);

  // 只有“音频用途 annotation 发生变化”或“当前仍然存在音频用途 annotation”时，才强制同步 payload。
  if (previousPurpose !== nextPurpose || nextPurpose != null) {
    return nextPurpose;
  }

  return normalizeSoundMessagePurpose(params.currentPurpose);
}
