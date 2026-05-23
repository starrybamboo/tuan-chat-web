import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { MessageDraft as OpenApiMessageDraft } from "@tuanchat/openapi-client/models/MessageDraft";

import { MESSAGE_TYPE } from "./messageType";
import { normalizeStateEventExtra } from "./state-event";

export type MessageDraftLocalSyncState = "optimistic";

export type MessageDraft = OpenApiMessageDraft & {
  avatarId?: number;
  customRoleName?: string;
  roleId?: number;
  tcLocalSyncState?: MessageDraftLocalSyncState;
};

export type UploadedImageMessageDraftAsset = {
  background?: boolean;
  fileId: number;
  fileName: string;
  height: number;
  mediaType: string;
  size: number;
  width: number;
};

export type UploadedSoundMessageDraftAsset = {
  fileId: number;
  fileName: string;
  mediaType: string;
  purpose?: string;
  second?: number;
  size: number;
};

export type UploadedVideoMessageDraftAsset = {
  fileId: number;
  fileName: string;
  mediaType: string;
  second?: number;
  size: number;
};

export type UploadedFileMessageDraftAsset = {
  fileId: number;
  fileName: string;
  mediaType: string;
  size: number;
};

type MessageExtraRecord = Record<string, unknown>;

type BuildChatMessageRequestFromDraftContext = {
  roomId: number;
  replayMessageId?: number;
  position?: number;
  roleId?: number;
  avatarId?: number;
  customRoleName?: string;
};

type BuildMessageDraftsFromUploadedMediaParams = {
  allowEmptyTextMessage?: boolean;
  fileAnnotations?: string[];
  imageAnnotations?: string[];
  inputText: string;
  soundAnnotations?: string[];
  textAnnotations?: string[];
  textMessageType?: MessageDraft["messageType"];
  uploadedFiles?: UploadedFileMessageDraftAsset[];
  uploadedImages?: UploadedImageMessageDraftAsset[];
  uploadedSoundMessage?: UploadedSoundMessageDraftAsset | null;
  uploadedVideos?: UploadedVideoMessageDraftAsset[];
  videoAnnotations?: string[];
};

function toRecord(value: unknown): MessageExtraRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as MessageExtraRecord
    : {};
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toPositiveNumber(value: unknown): number | undefined {
  const normalized = toFiniteNumber(value);
  return typeof normalized === "number" && normalized > 0 ? normalized : undefined;
}

function toLooseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1" || value === "true" || value === "TRUE") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false" || value === "FALSE") {
    return false;
  }
  return undefined;
}

function compactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const next = value
      .map(item => compactValue(item))
      .filter(item => item !== undefined);
    return next.length > 0 ? next : undefined;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nextEntries = Object.entries(record)
      .map(([key, entry]) => [key, compactValue(entry)] as const)
      .filter(([, entry]) => entry !== undefined);
    if (nextEntries.length === 0) {
      return undefined;
    }
    return Object.fromEntries(nextEntries);
  }
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}

function compactRecord(value: unknown): MessageExtraRecord {
  const next = compactValue(value);
  return next && typeof next === "object" && !Array.isArray(next)
    ? next as MessageExtraRecord
    : {};
}

function stripLegacyMessageEditorExtra(rawExtra: unknown): MessageExtraRecord {
  const extra = toRecord(rawExtra);
  const { messageEditor: _legacyMessageEditor, ...rest } = extra;
  return compactRecord(rest);
}

function pickPayload(rawExtra: unknown, ...keys: string[]): MessageExtraRecord {
  const extra = toRecord(rawExtra);
  for (const key of keys) {
    const nested = extra[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as MessageExtraRecord;
    }
  }
  return {};
}

function normalizeImagePayload(rawExtra: unknown, options?: { defaultBackground?: boolean }): MessageExtraRecord {
  const image = pickPayload(rawExtra, "imageMessage");
  return compactRecord({
    fileId: toPositiveNumber(image.fileId),
    mediaType: toTrimmedString(image.mediaType),
    fileName: toTrimmedString(image.fileName),
    width: toPositiveNumber(image.width),
    height: toPositiveNumber(image.height),
    size: toPositiveNumber(image.size),
    background: toLooseBoolean(image.background) ?? options?.defaultBackground,
  });
}

function normalizeSoundPayload(rawExtra: unknown): MessageExtraRecord {
  const sound = pickPayload(rawExtra, "soundMessage");
  return compactRecord({
    fileId: toPositiveNumber(sound.fileId),
    mediaType: toTrimmedString(sound.mediaType),
    fileName: toTrimmedString(sound.fileName),
    size: toPositiveNumber(sound.size),
    second: toPositiveNumber(sound.second),
    purpose: toTrimmedString(sound.purpose)?.toLowerCase(),
    volume: toFiniteNumber(sound.volume),
  });
}

function normalizeVideoPayload(rawExtra: unknown): MessageExtraRecord {
  const video = pickPayload(rawExtra, "videoMessage");
  return compactRecord({
    fileId: toPositiveNumber(video.fileId),
    mediaType: toTrimmedString(video.mediaType),
    fileName: toTrimmedString(video.fileName),
    size: toPositiveNumber(video.size),
    second: toPositiveNumber(video.second),
  });
}

function normalizeFilePayload(rawExtra: unknown): MessageExtraRecord {
  const file = pickPayload(rawExtra, "fileMessage");
  return compactRecord({
    fileId: toPositiveNumber(file.fileId),
    mediaType: toTrimmedString(file.mediaType),
    fileName: toTrimmedString(file.fileName),
    size: toPositiveNumber(file.size),
  });
}

function normalizeDicePayload(rawExtra: unknown): MessageExtraRecord {
  const dice = pickPayload(rawExtra, "diceResult");
  return compactRecord({
    result: toTrimmedString(dice.result),
    hidden: toLooseBoolean(dice.hidden),
  });
}

function normalizeDiceTurnReplyPayload(rawReply: unknown): MessageExtraRecord {
  if (typeof rawReply === "string") {
    return compactRecord({ content: toTrimmedString(rawReply) });
  }
  const reply = toRecord(rawReply);
  return compactRecord({
    content: toTrimmedString(reply.content),
    hidden: toLooseBoolean(reply.hidden),
    roleId: toPositiveNumber(reply.roleId),
    avatarId: toPositiveNumber(reply.avatarId),
    customRoleName: toTrimmedString(reply.customRoleName),
  });
}

function normalizeDiceTurnPayload(rawExtra: unknown): MessageExtraRecord {
  const diceTurn = pickPayload(rawExtra, "diceTurn");
  const rawReplies = Array.isArray(diceTurn.replies)
    ? diceTurn.replies
    : [];
  const replies = rawReplies
    .map(reply => normalizeDiceTurnReplyPayload(reply))
    .filter(reply => Boolean(toTrimmedString(reply.content)));

  const legacyDice = normalizeDicePayload(rawExtra);
  if (replies.length === 0 && toTrimmedString(legacyDice.result)) {
    replies.push(compactRecord({
      content: toTrimmedString(legacyDice.result),
      hidden: toLooseBoolean(legacyDice.hidden),
    }));
  }

  return compactRecord({
    command: toTrimmedString(diceTurn.command),
    replies,
  });
}

function normalizeDicePayloadFromTurn(rawExtra: unknown, diceTurn: MessageExtraRecord): MessageExtraRecord {
  const explicitDiceResult = normalizeDicePayload(rawExtra);
  const replies = Array.isArray(diceTurn.replies) ? diceTurn.replies : [];
  const replyText = replies
    .map(reply => toTrimmedString(toRecord(reply).content))
    .filter(Boolean)
    .join("\n");
  const hasHiddenReply = replies.some(reply => toLooseBoolean(toRecord(reply).hidden) === true);
  return compactRecord({
    result: toTrimmedString(explicitDiceResult.result) ?? (replyText || undefined),
    hidden: toLooseBoolean(explicitDiceResult.hidden) ?? (hasHiddenReply ? true : undefined),
  });
}

function normalizeDiceExtraPayload(rawExtra: unknown): MessageExtraRecord {
  const diceTurn = normalizeDiceTurnPayload(rawExtra);
  const diceResult = normalizeDicePayloadFromTurn(rawExtra, diceTurn);
  return compactRecord({
    diceResult,
    diceTurn,
  });
}

function normalizeForwardPayload(rawExtra: unknown): MessageExtraRecord {
  const forward = pickPayload(rawExtra, "forwardMessage");
  return compactRecord({
    messageList: Array.isArray(forward.messageList) ? forward.messageList : undefined,
  });
}

function normalizeCluePayload(rawExtra: unknown): MessageExtraRecord {
  const clue = pickPayload(rawExtra, "clueMessage");
  const snapshot = toRecord(clue.snapshot);
  const messageType = toPositiveNumber(snapshot.messageType);
  const content = typeof snapshot.content === "string" ? snapshot.content : "";
  const normalizedSnapshot: MessageExtraRecord = {
    ...(messageType ? { messageType } : {}),
    content,
  };
  if (snapshot.extra !== undefined && snapshot.extra !== null) {
    normalizedSnapshot.extra = snapshot.extra;
  }
  return { snapshot: normalizedSnapshot };
}

function normalizeWebgalChoosePayload(rawExtra: unknown): MessageExtraRecord {
  const webgalChoose = pickPayload(rawExtra, "webgalChoose");
  const normalizedOptions = Array.isArray(webgalChoose.options)
    ? webgalChoose.options
        .map((option) => {
          const normalizedOption = toRecord(option);
          return compactValue({
            text: toTrimmedString(normalizedOption.text),
            code: toTrimmedString(normalizedOption.code),
          });
        })
        .filter((option): option is Record<string, unknown> => {
          return Boolean(option && typeof option === "object" && toTrimmedString((option as Record<string, unknown>).text));
        })
    : undefined;
  return compactRecord({
    options: normalizedOptions,
  });
}

function normalizeCommandRequestPayload(rawExtra: unknown): MessageExtraRecord {
  const commandRequest = pickPayload(rawExtra, "commandRequest");
  const allowedRoleIds = Array.isArray(commandRequest.allowedRoleIds)
    ? commandRequest.allowedRoleIds
        .map(item => toPositiveNumber(item))
        .filter((item): item is number => typeof item === "number")
    : undefined;
  return compactRecord({
    command: toTrimmedString(commandRequest.command),
    allowAll: toLooseBoolean(commandRequest.allowAll),
    allowedRoleIds,
  });
}

function normalizeDocCardPayload(rawExtra: unknown): MessageExtraRecord {
  const docCard = pickPayload(rawExtra, "docCard");
  return compactRecord({
    docId: toTrimmedString(docCard.docId),
    spaceId: toPositiveNumber(docCard.spaceId),
    title: toTrimmedString(docCard.title),
    imageUrl: toTrimmedString(docCard.imageUrl),
    imageFileId: toPositiveNumber(docCard.imageFileId),
    originalImageFileId: toPositiveNumber(docCard.originalImageFileId),
    imageMediaType: toTrimmedString(docCard.imageMediaType),
    excerpt: toTrimmedString(docCard.excerpt),
  });
}

function normalizeRoomJumpPayload(rawExtra: unknown): MessageExtraRecord {
  const roomJump = pickPayload(rawExtra, "roomJump");
  return compactRecord({
    roomId: toPositiveNumber(roomJump.roomId),
    spaceId: toPositiveNumber(roomJump.spaceId),
    roomName: toTrimmedString(roomJump.roomName),
    categoryName: toTrimmedString(roomJump.categoryName),
    spaceName: toTrimmedString(roomJump.spaceName),
    label: toTrimmedString(roomJump.label),
  });
}

function normalizeStateEventPayload(rawExtra: unknown): MessageExtraRecord {
  const stateEvent = normalizeStateEventExtra(pickPayload(rawExtra, "stateEvent"));
  return compactRecord(stateEvent);
}

function collectMissingFields(extra: MessageExtraRecord, fields: string[]): string[] {
  return fields.filter((field) => {
    const value = extra[field];
    if (typeof value === "string") {
      return value.trim().length === 0;
    }
    if (typeof value === "number") {
      return !Number.isFinite(value) || value <= 0;
    }
    if (typeof value === "boolean") {
      return false;
    }
    return value == null;
  });
}

function assertMessageExtraReadyForRequest(messageType: number, extra: MessageExtraRecord): void {
  switch (messageType) {
    case MESSAGE_TYPE.IMG: {
      const image = normalizeImagePayload(extra);
      const missingFields = collectMissingFields(image, ["fileId", "mediaType", "fileName", "size", "width", "height"]);
      if (missingFields.length > 0) {
        throw new Error(`图片素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.SOUND: {
      const sound = normalizeSoundPayload(extra);
      const missingFields = collectMissingFields(sound, ["fileId", "mediaType", "fileName", "size", "second"]);
      if (missingFields.length > 0) {
        throw new Error(`音频素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.VIDEO: {
      const video = normalizeVideoPayload(extra);
      const missingFields = collectMissingFields(video, ["fileId", "mediaType", "fileName", "size"]);
      if (missingFields.length > 0) {
        throw new Error(`视频素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.FILE: {
      const file = normalizeFilePayload(extra);
      const missingFields = collectMissingFields(file, ["fileId", "mediaType", "fileName", "size"]);
      if (missingFields.length > 0) {
        throw new Error(`文件素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.DICE:
      if (!toTrimmedString(toRecord(normalizeDiceExtraPayload(extra).diceResult).result)) {
        throw new Error("骰子消息缺少结果");
      }
      return;
    case MESSAGE_TYPE.WEBGAL_CHOOSE: {
      const options = toRecord(extra.webgalChoose).options;
      if (!Array.isArray(options) || options.length === 0) {
        throw new Error("WebGAL 选择消息至少需要一个选项");
      }
      return;
    }
    case MESSAGE_TYPE.COMMAND_REQUEST:
      if (!toTrimmedString(toRecord(extra.commandRequest).command)) {
        throw new Error("指令请求缺少 command");
      }
      return;
    case MESSAGE_TYPE.DOC_CARD:
      if (!toTrimmedString(toRecord(extra.docCard).docId)) {
        throw new Error("文档卡片缺少 docId");
      }
      return;
    case MESSAGE_TYPE.ROOM_JUMP:
      if (!toPositiveNumber(toRecord(extra.roomJump).roomId)) {
        throw new Error("群聊跳转缺少 roomId");
      }
      return;
    case MESSAGE_TYPE.STATE_EVENT:
      if (Object.keys(normalizeStateEventPayload(extra)).length === 0) {
        throw new Error("状态事件消息缺少有效 stateEvent");
      }
      return;
    case MESSAGE_TYPE.CLUE_CARD:
      if (!toPositiveNumber(toRecord(normalizeCluePayload(extra).snapshot).messageType)) {
        throw new Error("线索卡片缺少快照消息类型");
      }
      break;
    default:
      break;
  }
}

function normalizeMessageExtraForRequest(messageType: number, rawExtra: unknown): MessageExtraRecord {
  switch (messageType) {
    case MESSAGE_TYPE.IMG:
      return compactRecord({ imageMessage: normalizeImagePayload(rawExtra, { defaultBackground: false }) });
    case MESSAGE_TYPE.SOUND:
      return compactRecord({ soundMessage: normalizeSoundPayload(rawExtra) });
    case MESSAGE_TYPE.VIDEO:
      return compactRecord({ videoMessage: normalizeVideoPayload(rawExtra) });
    case MESSAGE_TYPE.FILE:
      return compactRecord({ fileMessage: normalizeFilePayload(rawExtra) });
    case MESSAGE_TYPE.DICE:
      return normalizeDiceExtraPayload(rawExtra);
    case MESSAGE_TYPE.FORWARD:
      return compactRecord({ forwardMessage: normalizeForwardPayload(rawExtra) });
    case MESSAGE_TYPE.CLUE_CARD:
      return compactRecord({ clueMessage: normalizeCluePayload(rawExtra) });
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return compactRecord({ webgalChoose: normalizeWebgalChoosePayload(rawExtra) });
    case MESSAGE_TYPE.COMMAND_REQUEST:
      return compactRecord({ commandRequest: normalizeCommandRequestPayload(rawExtra) });
    case MESSAGE_TYPE.DOC_CARD:
      return compactRecord({ docCard: normalizeDocCardPayload(rawExtra) });
    case MESSAGE_TYPE.ROOM_JUMP:
      return compactRecord({ roomJump: normalizeRoomJumpPayload(rawExtra) });
    case MESSAGE_TYPE.STATE_EVENT:
      return compactRecord({ stateEvent: normalizeStateEventPayload(rawExtra) });
    default:
      return messageType === MESSAGE_TYPE.TEXT || messageType === MESSAGE_TYPE.INTRO_TEXT
        ? {}
        : stripLegacyMessageEditorExtra(rawExtra);
  }
}

export function buildMessageExtraForRequest(messageType: number, rawExtra: unknown): MessageExtraRecord {
  const normalizedExtra = normalizeMessageExtraForRequest(messageType, rawExtra);
  assertMessageExtraReadyForRequest(messageType, normalizedExtra);
  return normalizedExtra;
}

export function normalizeMessageExtraForMatch(messageType: number, rawExtra: unknown): unknown {
  switch (messageType) {
    case MESSAGE_TYPE.IMG:
      return compactValue({ imageMessage: normalizeImagePayload(rawExtra) });
    case MESSAGE_TYPE.SOUND:
      return compactValue({ soundMessage: normalizeSoundPayload(rawExtra) });
    case MESSAGE_TYPE.VIDEO:
      return compactValue({ videoMessage: normalizeVideoPayload(rawExtra) });
    case MESSAGE_TYPE.FILE:
      return compactValue({ fileMessage: normalizeFilePayload(rawExtra) });
    case MESSAGE_TYPE.DICE:
      return compactValue(normalizeDiceExtraPayload(rawExtra));
    case MESSAGE_TYPE.FORWARD:
      return compactValue({ forwardMessage: normalizeForwardPayload(rawExtra) });
    case MESSAGE_TYPE.CLUE_CARD:
      return compactValue({ clueMessage: normalizeCluePayload(rawExtra) });
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return compactValue({ webgalChoose: normalizeWebgalChoosePayload(rawExtra) });
    case MESSAGE_TYPE.COMMAND_REQUEST:
      return compactValue({ commandRequest: normalizeCommandRequestPayload(rawExtra) });
    case MESSAGE_TYPE.DOC_CARD:
      return compactValue({ docCard: normalizeDocCardPayload(rawExtra) });
    case MESSAGE_TYPE.ROOM_JUMP:
      return compactValue({ roomJump: normalizeRoomJumpPayload(rawExtra) });
    case MESSAGE_TYPE.STATE_EVENT:
      return compactValue({ stateEvent: normalizeStateEventPayload(rawExtra) });
    default:
      return messageType === MESSAGE_TYPE.TEXT || messageType === MESSAGE_TYPE.INTRO_TEXT
        ? {}
        : compactValue(stripLegacyMessageEditorExtra(rawExtra));
  }
}

export function buildMessageDraftsFromUploadedMedia({
  fileAnnotations = [],
  inputText,
  imageAnnotations = [],
  soundAnnotations = [],
  textAnnotations = [],
  textMessageType = MESSAGE_TYPE.TEXT,
  uploadedFiles = [],
  uploadedImages = [],
  uploadedSoundMessage = null,
  uploadedVideos = [],
  videoAnnotations = [],
  allowEmptyTextMessage = false,
}: BuildMessageDraftsFromUploadedMediaParams): MessageDraft[] {
  const trimmedInputText = inputText.trim();
  const isBlankInput = trimmedInputText.length === 0;
  const hasRawTextInput = inputText.length > 0;
  const nextMessages: MessageDraft[] = [];
  let textContent = isBlankInput && hasRawTextInput ? inputText : trimmedInputText;

  uploadedImages.forEach((image) => {
    nextMessages.push({
      ...(imageAnnotations.length > 0 ? { annotations: imageAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          fileId: image.fileId,
          mediaType: image.mediaType,
          width: image.width,
          height: image.height,
          size: image.size,
          fileName: image.fileName,
          background: image.background ?? false,
        },
      },
    });
    textContent = "";
  });

  if (uploadedSoundMessage) {
    nextMessages.push({
      ...(soundAnnotations.length > 0 ? { annotations: soundAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          fileId: uploadedSoundMessage.fileId,
          mediaType: uploadedSoundMessage.mediaType,
          fileName: uploadedSoundMessage.fileName,
          size: uploadedSoundMessage.size,
          ...(typeof uploadedSoundMessage.second === "number" ? { second: uploadedSoundMessage.second } : {}),
          ...(uploadedSoundMessage.purpose ? { purpose: uploadedSoundMessage.purpose } : {}),
        },
      },
    });
    textContent = "";
  }

  uploadedVideos.forEach((video) => {
    nextMessages.push({
      ...(videoAnnotations.length > 0 ? { annotations: videoAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.VIDEO,
      extra: {
        videoMessage: {
          fileId: video.fileId,
          mediaType: video.mediaType,
          fileName: video.fileName,
          size: video.size,
          ...(typeof video.second === "number" ? { second: video.second } : {}),
        },
      },
    });
    textContent = "";
  });

  uploadedFiles.forEach((file) => {
    nextMessages.push({
      ...(fileAnnotations.length > 0 ? { annotations: fileAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.FILE,
      extra: {
        fileMessage: {
          fileId: file.fileId,
          mediaType: file.mediaType,
          fileName: file.fileName,
          size: file.size,
        },
      },
    });
    textContent = "";
  });

  const shouldSendEmptyTextMessage = allowEmptyTextMessage
    && !hasRawTextInput
    && uploadedImages.length === 0
    && uploadedVideos.length === 0
    && uploadedFiles.length === 0
    && !uploadedSoundMessage;

  if (textContent || shouldSendEmptyTextMessage) {
    nextMessages.push({
      ...(textAnnotations.length > 0 ? { annotations: textAnnotations } : {}),
      content: textContent,
      messageType: textMessageType,
      extra: {},
    });
  }

  return nextMessages;
}

export function buildChatMessageRequestFromDraft(
  draft: MessageDraft,
  {
    roomId,
    replayMessageId,
    position,
    roleId,
    avatarId,
    customRoleName,
  }: BuildChatMessageRequestFromDraftContext,
): ChatMessageRequest {
  const resolvedMessageType = draft.messageType ?? MESSAGE_TYPE.TEXT;
  const resolvedCustomRoleName = typeof customRoleName === "string" ? customRoleName.trim() : "";
  const normalizedExtra = buildMessageExtraForRequest(resolvedMessageType, draft.extra);

  const request: ChatMessageRequest = {
    roomId,
    messageType: resolvedMessageType,
    roleId,
    avatarId,
    content: draft.content ?? "",
    extra: normalizedExtra,
  };

  if (Array.isArray(draft.annotations) && draft.annotations.length > 0) {
    request.annotations = [...draft.annotations];
  }

  if (draft.webgal && typeof draft.webgal === "object") {
    request.webgal = draft.webgal;
  }

  if (typeof replayMessageId === "number") {
    request.replayMessageId = replayMessageId;
  }

  if (typeof position === "number") {
    request.position = position;
  }

  if (resolvedCustomRoleName) {
    request.customRoleName = resolvedCustomRoleName;
  }

  return request;
}
