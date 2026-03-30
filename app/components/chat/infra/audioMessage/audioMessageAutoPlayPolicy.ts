import { ANNOTATION_IDS, hasAnnotation } from "@/types/messageAnnotations";

export type AudioAutoPlayPurpose = "bgm" | "se";

type AnnotationCarrier = {
  annotations?: string[] | null;
} | null | undefined;

function hasNewAudioPurposeAnnotation(
  previousMessage: AnnotationCarrier,
  nextMessage: AnnotationCarrier,
  annotationId: string,
) {
  const previousAnnotations = Array.isArray(previousMessage?.annotations) ? previousMessage.annotations : undefined;
  const nextAnnotations = Array.isArray(nextMessage?.annotations) ? nextMessage.annotations : undefined;
  return !hasAnnotation(previousAnnotations, annotationId) && hasAnnotation(nextAnnotations, annotationId);
}

/**
 * 自动播放只响应音频 annotation 从无到有，避免消息更新时旧 purpose/tag 残留导致误播。
 */
export function resolveAudioAutoPlayPurposeFromAnnotationTransition(
  previousMessage: AnnotationCarrier,
  nextMessage: AnnotationCarrier,
): AudioAutoPlayPurpose | undefined {
  if (hasNewAudioPurposeAnnotation(previousMessage, nextMessage, ANNOTATION_IDS.BGM)) {
    return "bgm";
  }
  if (hasNewAudioPurposeAnnotation(previousMessage, nextMessage, ANNOTATION_IDS.SE)) {
    return "se";
  }
  return undefined;
}
