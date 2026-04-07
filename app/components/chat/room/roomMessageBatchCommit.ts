import { getSoundMessagePurposeFromAnnotations, normalizeSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { ANNOTATION_IDS, hasAnnotation } from "@/types/messageAnnotations";

import type { ChatMessageResponse } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type CommitBatchOptimisticMessagesParams = {
  optimisticMessages: ChatMessageResponse[];
  createdMessages: ChatMessageResponse["message"][];
  addOrUpdateMessage?: (message: ChatMessageResponse) => Promise<void> | void;
  addOrUpdateMessages?: (messages: ChatMessageResponse[]) => Promise<void> | void;
  replaceMessageById?: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
};

function mergeCommittedSoundAnnotations(optimisticAnnotations: unknown, createdAnnotations: unknown) {
  const optimisticList = Array.isArray(optimisticAnnotations)
    ? optimisticAnnotations.filter((item): item is string => typeof item === "string")
    : [];
  const createdList = Array.isArray(createdAnnotations)
    ? createdAnnotations.filter((item): item is string => typeof item === "string")
    : [];
  const optimisticPurpose = getSoundMessagePurposeFromAnnotations(optimisticList);
  const createdPurpose = getSoundMessagePurposeFromAnnotations(createdList);

  if (!optimisticPurpose || createdPurpose) {
    return Array.isArray(createdAnnotations) ? createdAnnotations : createdList;
  }

  const next = [...createdList];
  const annotationId = optimisticPurpose === "bgm" ? ANNOTATION_IDS.BGM : ANNOTATION_IDS.SE;
  if (!hasAnnotation(next, annotationId)) {
    next.push(annotationId);
  }
  return next;
}

function mergeCommittedSoundExtra(
  optimisticExtra: unknown,
  createdExtra: unknown,
): ChatMessageResponse["message"]["extra"] {
  if (!optimisticExtra || typeof optimisticExtra !== "object" || Array.isArray(optimisticExtra)) {
    return createdExtra as ChatMessageResponse["message"]["extra"];
  }
  if (!createdExtra || typeof createdExtra !== "object" || Array.isArray(createdExtra)) {
    return optimisticExtra as ChatMessageResponse["message"]["extra"];
  }

  const optimisticRecord = optimisticExtra as Record<string, unknown>;
  const createdRecord = createdExtra as Record<string, unknown>;
  const optimisticSound = optimisticRecord.soundMessage;
  const createdSound = createdRecord.soundMessage;

  if (!optimisticSound || typeof optimisticSound !== "object" || Array.isArray(optimisticSound)) {
    return createdExtra as ChatMessageResponse["message"]["extra"];
  }
  if (!createdSound || typeof createdSound !== "object" || Array.isArray(createdSound)) {
    return createdExtra as ChatMessageResponse["message"]["extra"];
  }

  const optimisticPurpose = normalizeSoundMessagePurpose((optimisticSound as Record<string, unknown>).purpose);
  const createdPurpose = normalizeSoundMessagePurpose((createdSound as Record<string, unknown>).purpose);
  if (createdPurpose || !optimisticPurpose) {
    return createdExtra as ChatMessageResponse["message"]["extra"];
  }

  return {
    ...createdRecord,
    soundMessage: {
      ...(createdSound as Record<string, unknown>),
      purpose: optimisticPurpose,
    },
  } as ChatMessageResponse["message"]["extra"];
}

export function buildCommittedResponseFromOptimistic(
  optimisticMessage: ChatMessageResponse | undefined,
  createdMessage: ChatMessageResponse["message"],
): ChatMessageResponse {
  const optimistic = optimisticMessage?.message;
  const nextMessage = {
    ...createdMessage,
    position: typeof createdMessage.position === "number"
      ? createdMessage.position
      : optimistic?.position,
  } as ChatMessageResponse["message"];

  if (optimistic?.messageType === MessageType.SOUND && createdMessage.messageType === MessageType.SOUND) {
    nextMessage.annotations = mergeCommittedSoundAnnotations(optimistic.annotations, createdMessage.annotations);
    nextMessage.extra = mergeCommittedSoundExtra(optimistic.extra, createdMessage.extra);
  }

  return { message: nextMessage };
}

export function buildCommittedBatchResponses(
  optimisticMessages: ChatMessageResponse[],
  createdMessages: ChatMessageResponse["message"][],
): ChatMessageResponse[] {
  return createdMessages.map((createdMessage, index) => buildCommittedResponseFromOptimistic(
    optimisticMessages[index],
    createdMessage,
  ));
}

export async function commitBatchOptimisticMessages({
  optimisticMessages,
  createdMessages,
  addOrUpdateMessage,
  addOrUpdateMessages,
  replaceMessageById,
}: CommitBatchOptimisticMessagesParams): Promise<ChatMessageResponse[]> {
  const committedResponses = buildCommittedBatchResponses(optimisticMessages, createdMessages);

  if (replaceMessageById) {
    for (let index = 0; index < committedResponses.length; index += 1) {
      const optimisticMessage = optimisticMessages[index];
      const committedResponse = committedResponses[index];
      if (!optimisticMessage || !committedResponse) {
        continue;
      }
      await replaceMessageById(optimisticMessage.message.messageId, committedResponse);
    }
    return committedResponses;
  }

  if (addOrUpdateMessages) {
    await addOrUpdateMessages(committedResponses);
    return committedResponses;
  }

  if (addOrUpdateMessage) {
    for (const response of committedResponses) {
      await addOrUpdateMessage(response);
    }
  }

  return committedResponses;
}
