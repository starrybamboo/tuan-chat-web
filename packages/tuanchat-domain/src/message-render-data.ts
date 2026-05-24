import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import {
  getClueMessageExtra,
  getCommandRequestExtra,
  getDiceTurnExtra,
  getDocCardExtra,
  getForwardMessageExtra,
  getRoomJumpExtra,
} from "./message-extra";
import { getMessagePreviewText } from "./messagePreview";

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export type ForwardMessageRenderData = {
  count: number;
  hiddenDeletedCount: number;
  previewMessages: ChatMessageResponse[];
  remainingCount: number;
  title: string;
};

export function getForwardMessageRenderData(extra: unknown, previewLimit = 3): ForwardMessageRenderData {
  const messageList = getForwardMessageExtra(extra)?.messageList ?? [];
  const visibleMessages = Array.isArray(messageList)
    ? messageList.filter(item => item?.message?.status !== 1)
    : [];
  const limit = Math.max(0, Math.trunc(previewLimit));

  return {
    count: Array.isArray(messageList) ? messageList.length : 0,
    hiddenDeletedCount: Array.isArray(messageList) ? messageList.length - visibleMessages.length : 0,
    previewMessages: visibleMessages.slice(0, limit),
    remainingCount: Math.max(visibleMessages.length - limit, 0),
    title: "转发消息",
  };
}

export type DiceTurnRenderReply = {
  avatarId?: number;
  content: string;
  customRoleName: string;
  hidden: boolean;
  roleId?: number;
};

export type DiceTurnRenderData = {
  command: string;
  replies: DiceTurnRenderReply[];
  summary: string;
  title: string;
};

export function getDiceTurnRenderData(
  extra: unknown,
  fallbackContent = "",
  canViewHiddenReply = false,
): DiceTurnRenderData {
  const diceTurn = getDiceTurnExtra(extra);
  const command = safeTrim(diceTurn?.command) || safeTrim(fallbackContent);
  const replies = Array.isArray(diceTurn?.replies)
    ? diceTurn.replies.map((reply) => {
        const replyRecord = toRecord(reply);
        const hidden = replyRecord?.hidden === true;
        return {
          avatarId: toPositiveNumber(replyRecord?.avatarId),
          content: hidden && !canViewHiddenReply
            ? "掷骰结果已隐藏"
            : safeTrim(replyRecord?.content),
          customRoleName: safeTrim(replyRecord?.customRoleName),
          hidden,
          roleId: toPositiveNumber(replyRecord?.roleId),
        };
      })
    : [];
  const visibleReplyTexts = replies
    .filter(reply => !reply.hidden || canViewHiddenReply)
    .map(reply => safeTrim(reply.content))
    .filter(Boolean);
  const summary = visibleReplyTexts.join("；")
    || command
    || safeTrim(fallbackContent)
    || "骰子结果";

  return {
    command,
    replies,
    summary,
    title: "骰子",
  };
}

export type WebgalChooseRenderOption = {
  code?: string;
  text: string;
};

export type WebgalChooseRenderData = {
  options: WebgalChooseRenderOption[];
  prompt: string;
  summary: string;
  title: string;
};

export function getWebgalChooseRenderData(extra: unknown, fallbackContent = ""): WebgalChooseRenderData {
  const payload = toRecord(toRecord(extra)?.webgalChoose);
  const prompt = safeTrim(payload?.prompt);
  const options = Array.isArray(payload?.options)
    ? payload.options
        .map((item) => {
          const option = toRecord(item);
          const text = safeTrim(option?.text) || safeTrim(option?.label);
          const code = safeTrim(option?.code);
          return text ? { text, ...(code ? { code } : {}) } : null;
        })
        .filter((item): item is WebgalChooseRenderOption => Boolean(item))
    : [];
  const optionSummary = options.slice(0, 3).map(option => option.text).join(" / ");
  const summary = prompt && optionSummary
    ? `${prompt}：${optionSummary}`
    : prompt || optionSummary || safeTrim(fallbackContent) || "选择消息";

  return {
    options,
    prompt,
    summary,
    title: "选择",
  };
}

export type DocCardRenderData = {
  docId: string;
  excerpt: string;
  imageFileId?: number;
  imageMediaType: string;
  imageUrl: string;
  originalImageFileId?: number;
  roomId?: number;
  spaceId?: number;
  title: string;
};

export function getDocCardRenderData(extra: unknown, fallbackContent = ""): DocCardRenderData {
  const docCard = getDocCardExtra(extra);
  const docId = safeTrim(docCard?.docId);
  const title = safeTrim(docCard?.title) || docId || safeTrim(fallbackContent) || "文档";
  const imageFileId = toPositiveNumber(docCard?.imageFileId);
  const originalImageFileId = toPositiveNumber(docCard?.originalImageFileId);

  return {
    docId,
    excerpt: safeTrim(docCard?.excerpt),
    imageFileId,
    imageMediaType: safeTrim(docCard?.imageMediaType),
    imageUrl: imageFileId || originalImageFileId ? "" : safeTrim(docCard?.imageUrl),
    originalImageFileId,
    roomId: toPositiveNumber(docCard?.roomId),
    spaceId: toPositiveNumber(docCard?.spaceId),
    title,
  };
}

export type ClueCardRenderData = {
  snapshot: Pick<Message, "content" | "extra" | "messageType">;
};

export function getClueCardRenderData(extra: unknown, fallbackContent = ""): ClueCardRenderData {
  const clue = toRecord(getClueMessageExtra(extra));
  const snapshot = toRecord(clue?.snapshot);
  const messageType = toPositiveNumber(snapshot?.messageType) ?? 1;
  const snapshotContent = typeof snapshot?.content === "string" ? snapshot.content : "";
  const commandRequest = getCommandRequestExtra(snapshot?.extra);
  const command = safeTrim(commandRequest?.command);
  const resolvedContent = snapshotContent.trim()
    || (command ? `[检定请求] ${command}` : "")
    || safeTrim(fallbackContent)
    || getMessagePreviewText({
      messageType,
      content: snapshotContent,
      ...(snapshot?.extra !== undefined ? { extra: snapshot.extra as Message["extra"] } : {}),
      status: 0,
    } as Message);
  return {
    snapshot: {
      messageType,
      content: resolvedContent,
      ...(snapshot?.extra !== undefined ? { extra: snapshot.extra as Message["extra"] } : {}),
    },
  };
}

export type RoomJumpRenderData = {
  categoryName: string;
  label: string;
  roomId?: number;
  roomName: string;
  spaceId?: number;
  spaceName: string;
};

export function getRoomJumpRenderData(extra: unknown, fallbackContent = ""): RoomJumpRenderData {
  const roomJump = getRoomJumpExtra(extra);
  const roomId = toPositiveNumber(roomJump?.roomId);
  const roomName = safeTrim(roomJump?.roomName);
  const label = safeTrim(roomJump?.label)
    || roomName
    || safeTrim(fallbackContent)
    || (roomId ? `群聊 #${roomId}` : "群聊跳转");

  return {
    categoryName: safeTrim(roomJump?.categoryName),
    label,
    roomId,
    roomName,
    spaceId: toPositiveNumber(roomJump?.spaceId),
    spaceName: safeTrim(roomJump?.spaceName),
  };
}
