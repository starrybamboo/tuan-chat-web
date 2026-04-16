import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { MaterialMessageItem } from "@tuanchat/openapi-client/models/MaterialMessageItem";

import { MESSAGE_TYPE } from "./messageType";
import { normalizeStateEventExtra } from "./state-event";

export type MessageDraft = MaterialMessageItem;

export type MessageDraftIdentity = Pick<MessageDraft, "avatarId" | "customRoleName" | "roleId">;

export type UploadedImageMessageDraftAsset = {
  background?: boolean;
  fileName: string;
  height: number;
  size: number;
  url: string;
  width: number;
};

export type UploadedSoundMessageDraftAsset = {
  fileName: string;
  purpose?: string;
  second?: number;
  size: number;
  url: string;
};

export type UploadedVideoMessageDraftAsset = {
  fileName: string;
  second?: number;
  size: number;
  url: string;
};

export type UploadedFileMessageDraftAsset = {
  fileName: string;
  size: number;
  url: string;
};

type MessageExtraRecord = Record<string, unknown>;

type BuildChatMessageRequestFromDraftContext = {
  roomId: number;
  threadId?: number;
  replayMessageId?: number;
  position?: number;
  roleId?: number;
  avatarId?: number;
  customRoleName?: string;
};

type BuildMessageDraftsFromUploadedMediaParams = {
  allowEmptyTextMessage?: boolean;
  baseMessage?: Partial<MessageDraft>;
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
    url: toTrimmedString(image.url),
    fileName: toTrimmedString(image.fileName),
    width: toPositiveNumber(image.width),
    height: toPositiveNumber(image.height),
    size: toPositiveNumber(image.size),
    background: toLooseBoolean(image.background) ?? options?.defaultBackground,
  });
}

function normalizeSoundPayload(rawExtra: unknown, options?: { defaultSecond?: number }): MessageExtraRecord {
  const sound = pickPayload(rawExtra, "soundMessage");
  return compactRecord({
    url: toTrimmedString(sound.url),
    fileName: toTrimmedString(sound.fileName),
    size: toPositiveNumber(sound.size),
    second: toPositiveNumber(sound.second ?? sound.duration) ?? options?.defaultSecond,
    purpose: toTrimmedString(sound.purpose)?.toLowerCase(),
    volume: toFiniteNumber(sound.volume),
  });
}

function normalizeVideoPayload(rawExtra: unknown): MessageExtraRecord {
  const video = pickPayload(rawExtra, "videoMessage");
  return compactRecord({
    url: toTrimmedString(video.url),
    fileName: toTrimmedString(video.fileName),
    size: toPositiveNumber(video.size),
    second: toPositiveNumber(video.second),
  });
}

function normalizeFilePayload(rawExtra: unknown): MessageExtraRecord {
  const file = pickPayload(rawExtra, "fileMessage");
  return compactRecord({
    url: toTrimmedString(file.url),
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

function normalizeForwardPayload(rawExtra: unknown): MessageExtraRecord {
  const forward = pickPayload(rawExtra, "forwardMessage");
  return compactRecord({
    messageList: Array.isArray(forward.messageList) ? forward.messageList : undefined,
  });
}

function normalizeCluePayload(rawExtra: unknown): MessageExtraRecord {
  const clue = pickPayload(rawExtra, "clueMessage");
  return compactRecord({
    img: toTrimmedString(clue.img),
    name: toTrimmedString(clue.name),
    description: toTrimmedString(clue.description),
  });
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

function normalizeThreadRootPayload(rawExtra: unknown): MessageExtraRecord {
  const threadRoot = pickPayload(rawExtra, "threadRoot");
  return compactRecord({
    title: toTrimmedString(threadRoot.title),
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
      const missingFields = collectMissingFields(image, ["url", "fileName", "size", "width", "height"]);
      if (missingFields.length > 0) {
        throw new Error(`图片素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.SOUND: {
      const sound = normalizeSoundPayload(extra);
      const missingFields = collectMissingFields(sound, ["url", "fileName", "size", "second"]);
      if (missingFields.length > 0) {
        throw new Error(`音频素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.VIDEO: {
      const video = normalizeVideoPayload(extra);
      const missingFields = collectMissingFields(video, ["url", "fileName", "size"]);
      if (missingFields.length > 0) {
        throw new Error(`视频素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.FILE: {
      const file = normalizeFilePayload(extra);
      const missingFields = collectMissingFields(file, ["url", "fileName", "size"]);
      if (missingFields.length > 0) {
        throw new Error(`文件素材缺少必要字段：${missingFields.join("、")}`);
      }
      return;
    }
    case MESSAGE_TYPE.DICE:
      if (!toTrimmedString(normalizeDicePayload(extra).result)) {
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
    case MESSAGE_TYPE.THREAD_ROOT:
      if (!toTrimmedString(normalizeThreadRootPayload(extra).title)) {
        throw new Error("Thread 标题不能为空");
      }
      return;
    case MESSAGE_TYPE.STATE_EVENT:
      if (Object.keys(normalizeStateEventPayload(extra)).length === 0) {
        throw new Error("状态事件消息缺少有效 stateEvent");
      }
      return;
    case MESSAGE_TYPE.CLUE_CARD:
      if (!toTrimmedString(normalizeCluePayload(extra).name)) {
        throw new Error("线索卡片缺少名称");
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
      return compactRecord({ soundMessage: normalizeSoundPayload(rawExtra, { defaultSecond: 1 }) });
    case MESSAGE_TYPE.VIDEO:
      return compactRecord({ videoMessage: normalizeVideoPayload(rawExtra) });
    case MESSAGE_TYPE.FILE:
      return compactRecord({ fileMessage: normalizeFilePayload(rawExtra) });
    case MESSAGE_TYPE.DICE:
      return compactRecord({ diceResult: normalizeDicePayload(rawExtra) });
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
    case MESSAGE_TYPE.THREAD_ROOT:
      return compactRecord({ threadRoot: normalizeThreadRootPayload(rawExtra) });
    case MESSAGE_TYPE.STATE_EVENT:
      return compactRecord({ stateEvent: normalizeStateEventPayload(rawExtra) });
    case MESSAGE_TYPE.TEXT:
    case MESSAGE_TYPE.SYSTEM:
    case MESSAGE_TYPE.EFFECT:
    case MESSAGE_TYPE.INTRO_TEXT:
    case MESSAGE_TYPE.READ_LINE:
      return {};
    default:
      return compactRecord(rawExtra);
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
      return compactValue({ diceResult: normalizeDicePayload(rawExtra) });
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
    case MESSAGE_TYPE.THREAD_ROOT:
      return compactValue({ threadRoot: normalizeThreadRootPayload(rawExtra) });
    case MESSAGE_TYPE.STATE_EVENT:
      return compactValue({ stateEvent: normalizeStateEventPayload(rawExtra) });
    default:
      return compactValue(rawExtra);
  }
}

export function buildThreadRootTitleFromMessageContent(
  content: string | null | undefined,
  fallback = "子区",
  maxLength = 20,
): string {
  const trimmed = content?.trim() ?? "";
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function buildDraftIdentityFields(baseMessage?: Partial<MessageDraft>): Partial<MessageDraft> {
  const roleId = typeof baseMessage?.roleId === "number" ? baseMessage.roleId : undefined;
  const avatarId = typeof roleId === "number" && roleId > 0 && typeof baseMessage?.avatarId === "number" && baseMessage.avatarId > 0
    ? baseMessage.avatarId
    : undefined;
  const customRoleName = typeof baseMessage?.customRoleName === "string" && baseMessage.customRoleName.trim()
    ? baseMessage.customRoleName.trim()
    : undefined;

  return {
    roleId,
    avatarId,
    customRoleName,
  };
}

export function buildMessageDraftsFromUploadedMedia({
  baseMessage,
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
  const identityFields = buildDraftIdentityFields(baseMessage);
  let textContent = isBlankInput && hasRawTextInput ? inputText : trimmedInputText;

  uploadedImages.forEach((image) => {
    nextMessages.push({
      ...identityFields,
      ...(imageAnnotations.length > 0 ? { annotations: imageAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          url: image.url,
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
      ...identityFields,
      ...(soundAnnotations.length > 0 ? { annotations: soundAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          url: uploadedSoundMessage.url,
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
      ...identityFields,
      ...(videoAnnotations.length > 0 ? { annotations: videoAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.VIDEO,
      extra: {
        videoMessage: {
          url: video.url,
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
      ...identityFields,
      ...(fileAnnotations.length > 0 ? { annotations: fileAnnotations } : {}),
      content: textContent,
      messageType: MESSAGE_TYPE.FILE,
      extra: {
        fileMessage: {
          url: file.url,
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
      ...identityFields,
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
    threadId,
    replayMessageId,
    position,
    roleId,
    avatarId,
    customRoleName,
  }: BuildChatMessageRequestFromDraftContext,
): ChatMessageRequest {
  const resolvedMessageType = draft.messageType ?? MESSAGE_TYPE.TEXT;
  const resolvedCustomRoleName = typeof customRoleName === "string"
    ? customRoleName.trim()
    : (typeof draft.customRoleName === "string" ? draft.customRoleName.trim() : "");
  const normalizedExtra = buildMessageExtraForRequest(resolvedMessageType, draft.extra);

  const request: ChatMessageRequest = {
    roomId,
    messageType: resolvedMessageType,
    roleId: roleId ?? draft.roleId,
    avatarId: avatarId ?? draft.avatarId,
    content: draft.content ?? "",
    extra: normalizedExtra,
  };

  if (Array.isArray(draft.annotations) && draft.annotations.length > 0) {
    request.annotations = [...draft.annotations];
  }

  if (draft.webgal && typeof draft.webgal === "object") {
    request.webgal = draft.webgal;
  }

  if (typeof threadId === "number") {
    request.threadId = threadId;
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
