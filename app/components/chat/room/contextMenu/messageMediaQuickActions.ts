import { resolveRenderedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { ANNOTATION_IDS, isImageMessageBackground, setAnnotation } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../../api";

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
