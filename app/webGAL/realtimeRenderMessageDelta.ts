import {
  getFigurePositionFromAnnotations,
  getSceneEffectFromAnnotations,
  hasClearBackgroundAnnotation,
  hasClearBgmAnnotation,
  hasClearFigureAnnotation,
  hasClearImageAnnotation,
  hasMiniAvatarAnnotation,
  isImageMessageBackground,
  isImageMessageShown,
  normalizeAnnotations,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalDicePayload } from "@/types/webgalDice";

import type { ChatMessageResponse } from "../../api";

export type RealtimeRenderDeltaOptions = {
  autoFigureEnabled: boolean;
  miniAvatarEnabled: boolean;
};

export type RealtimeRenderUpdateStrategy = "none" | "self" | "suffix";

type RenderComparableMessage = {
  messageType: number | undefined;
  roleId: number | undefined;
  avatarId: number | undefined;
  customRoleName: string | undefined;
  content: string | undefined;
  status: number | undefined;
  annotations: string[];
  extra: unknown;
  webgal: unknown;
};

function buildComparableMessage(message: ChatMessageResponse["message"]): RenderComparableMessage {
  return {
    messageType: message.messageType as number | undefined,
    roleId: message.roleId ?? undefined,
    avatarId: message.avatarId ?? undefined,
    customRoleName: (message.customRoleName as string | undefined) ?? undefined,
    content: message.content ?? undefined,
    status: message.status ?? undefined,
    annotations: normalizeAnnotations(message.annotations),
    extra: message.extra ?? null,
    webgal: message.webgal ?? null,
  };
}

function isDialogLikeMessage(message: ChatMessageResponse["message"]): boolean {
  return (message.messageType as number) === MESSAGE_TYPE.TEXT
    || (message.messageType as number) === MESSAGE_TYPE.DICE;
}

function isSceneStatefulMessage(
  message: ChatMessageResponse["message"],
  options: RealtimeRenderDeltaOptions,
): boolean {
  if ((message.status ?? 0) === 1) {
    return false;
  }

  if (hasClearBackgroundAnnotation(message.annotations)
    || hasClearBgmAnnotation(message.annotations)
    || hasClearImageAnnotation(message.annotations)
    || hasClearFigureAnnotation(message.annotations)
    || hasMiniAvatarAnnotation(message.annotations)) {
    return true;
  }

  if (getFigurePositionFromAnnotations(message.annotations)) {
    return true;
  }

  if (getSceneEffectFromAnnotations(message.annotations)) {
    return true;
  }

  const messageType = message.messageType as number;

  if (messageType === MESSAGE_TYPE.IMG) {
    const imageMessage = message.extra?.imageMessage;
    return isImageMessageBackground(message.annotations, imageMessage) || isImageMessageShown(message.annotations);
  }

  if (messageType === MESSAGE_TYPE.SOUND) {
    const soundMessage = message.extra?.soundMessage ?? (message.extra as any);
    return Boolean(soundMessage?.purpose === "bgm" || message.content?.includes("[播放BGM]"));
  }

  if (messageType === MESSAGE_TYPE.EFFECT) {
    return true;
  }

  if (messageType === MESSAGE_TYPE.INTRO_TEXT) {
    return false;
  }

  if (isDialogLikeMessage(message) && (message.roleId ?? 0) > 0) {
    const dicePayload = messageType === MESSAGE_TYPE.DICE ? extractWebgalDicePayload(message.webgal) : null;
    if (dicePayload?.showFigure === true || dicePayload?.showMiniAvatar === true) {
      return true;
    }
    if (dicePayload?.showFigure === false && dicePayload?.showMiniAvatar === false) {
      return false;
    }
    if (options.autoFigureEnabled || options.miniAvatarEnabled) {
      return true;
    }
  }

  return false;
}

export function getRealtimeRenderMessageFingerprint(message: ChatMessageResponse["message"]): string {
  return JSON.stringify(buildComparableMessage(message));
}

export function areRealtimeRenderMessagesEquivalent(
  previousMessage: ChatMessageResponse["message"] | undefined,
  nextMessage: ChatMessageResponse["message"],
): boolean {
  if (!previousMessage) {
    return false;
  }
  return getRealtimeRenderMessageFingerprint(previousMessage) === getRealtimeRenderMessageFingerprint(nextMessage);
}

export function getRealtimeRenderUpdateStrategy(
  previousMessage: ChatMessageResponse["message"] | undefined,
  nextMessage: ChatMessageResponse["message"],
  options: RealtimeRenderDeltaOptions,
): RealtimeRenderUpdateStrategy {
  if (previousMessage && areRealtimeRenderMessagesEquivalent(previousMessage, nextMessage)) {
    return "none";
  }

  const previousStateful = previousMessage ? isSceneStatefulMessage(previousMessage, options) : false;
  const nextStateful = isSceneStatefulMessage(nextMessage, options);
  if (previousStateful || nextStateful) {
    return "suffix";
  }

  const previousMessageType = previousMessage?.messageType as number | undefined;
  const nextMessageType = nextMessage.messageType as number;
  if (previousMessageType !== undefined && previousMessageType !== nextMessageType) {
    return "suffix";
  }
  if (previousMessageType === MESSAGE_TYPE.DICE || nextMessageType === MESSAGE_TYPE.DICE) {
    return "suffix";
  }

  const previousRoleId = previousMessage?.roleId ?? 0;
  const previousAvatarId = previousMessage?.avatarId ?? 0;
  if (previousRoleId !== (nextMessage.roleId ?? 0) || previousAvatarId !== (nextMessage.avatarId ?? 0)) {
    return "suffix";
  }

  return "self";
}

export function getRealtimeRenderChangedMessageIndices(
  previousMessagesById: ReadonlyMap<number, ChatMessageResponse["message"]>,
  currentMessages: ChatMessageResponse[],
  options: RealtimeRenderDeltaOptions,
): { selfIndices: number[]; firstSuffixIndex: number | null } {
  const selfIndices: number[] = [];
  let firstSuffixIndex: number | null = null;

  currentMessages.forEach((entry, index) => {
    const messageId = entry.message.messageId;
    if (!messageId) {
      return;
    }
    const strategy = getRealtimeRenderUpdateStrategy(previousMessagesById.get(messageId), entry.message, options);
    if (strategy === "self") {
      selfIndices.push(index);
    }
    else if (strategy === "suffix" && firstSuffixIndex === null) {
      firstSuffixIndex = index;
    }
  });

  return { selfIndices, firstSuffixIndex };
}
