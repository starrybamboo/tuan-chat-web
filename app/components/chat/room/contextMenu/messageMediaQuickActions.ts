import type { Message } from "../../../../../api";

import { resolveRenderedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { ANNOTATION_IDS, isImageMessageBackground, setAnnotation } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

const LEGACY_AUDIO_PURPOSE_MARKERS = /\[(播放BGM|播放音效)\]/g;

function stripLegacyAudioPurposeMarkers(content: string | undefined): string {
  if (typeof content !== "string") {
    return "";
  }
  return content.replace(LEGACY_AUDIO_PURPOSE_MARKERS, "").trim();
}

export function isImageMessageMarkedAsBackground(message?: Message | null): boolean {
  if (!message || message.messageType !== MESSAGE_TYPE.IMG) {
    return false;
  }
  return isImageMessageBackground(message.annotations, message.extra?.imageMessage);
}

export function toggleImageMessageBackground(message: Message): Message | null {
  if (message.messageType !== MESSAGE_TYPE.IMG || !message.extra?.imageMessage) {
    return null;
  }
  const nextBackground = !isImageMessageMarkedAsBackground(message);
  return {
    ...message,
    annotations: setAnnotation(message.annotations, ANNOTATION_IDS.BACKGROUND, nextBackground),
    extra: {
      ...message.extra,
      imageMessage: {
        ...message.extra.imageMessage,
        background: nextBackground,
      },
    },
  };
}

export function isSoundMessageMarkedAsBgm(message?: Message | null): boolean {
  if (!message || message.messageType !== MESSAGE_TYPE.SOUND || !message.extra?.soundMessage) {
    return false;
  }
  return resolveRenderedSoundMessagePurpose({
    annotations: message.annotations,
    payloadPurpose: message.extra.soundMessage.purpose,
    content: message.content,
  }) === "bgm";
}

export function toggleSoundMessageBgm(message: Message): Message | null {
  if (message.messageType !== MESSAGE_TYPE.SOUND || !message.extra?.soundMessage) {
    return null;
  }
  const nextIsBgm = !isSoundMessageMarkedAsBgm(message);
  let nextAnnotations = setAnnotation(message.annotations, ANNOTATION_IDS.BGM, nextIsBgm);
  nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.SE, false);

  return {
    ...message,
    content: stripLegacyAudioPurposeMarkers(message.content),
    annotations: nextAnnotations,
    extra: {
      ...message.extra,
      soundMessage: {
        ...message.extra.soundMessage,
        ...(nextIsBgm ? { purpose: "bgm" } : { purpose: undefined }),
      },
    },
  };
}
