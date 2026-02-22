import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessageResponse } from "../../../../../api";

import { tuanchat } from "../../../../../api/instance";
import { MessageType } from "../../../../../api/wsModels";
import {
  addOrUpdateMessagesBatch as dbAddOrUpdateMessages,
  clearMessagesByRoomId as dbClearMessages,
  deleteMessagesByIds as dbDeleteMessagesByIds,
  getMessagesByRoomId as dbGetMessagesByRoomId,
} from "./chatHistoryDb";

const WS_RECONNECTED_EVENT = "tc:ws-reconnected";
const OPTIMISTIC_MESSAGE_MAX_AGE_MS = 10 * 60 * 1000;

export type UseChatHistoryReturn = {
  messages: ChatMessageResponse[];
  loading: boolean;
  error: Error | null;
  addOrUpdateMessage: (message: ChatMessageResponse) => Promise<void>;
  addOrUpdateMessages: (messages: ChatMessageResponse[]) => Promise<void>;
  removeMessageById: (messageId: number) => Promise<void>;
  replaceMessageById: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
  getMessagesByRoomId: (roomId: number) => Promise<ChatMessageResponse[]>;
  clearHistory: () => Promise<void>;
};

function parseTimeToMs(time: unknown): number | undefined {
  if (time == null) {
    return undefined;
  }
  if (typeof time === "number") {
    return Number.isFinite(time) ? time : undefined;
  }
  if (typeof time !== "string") {
    return undefined;
  }
  const raw = time.trim();
  if (!raw) {
    return undefined;
  }
  const normalized = raw.includes("-") ? raw.replace(/-/g, "/") : raw;
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
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

function normalizeMessageExtraForMatch(message: ChatMessageResponse["message"]): unknown {
  const rawExtra = message.extra as Record<string, unknown> | null | undefined;
  const extra = (rawExtra && typeof rawExtra === "object") ? rawExtra : {};
  switch (message.messageType) {
    case MessageType.IMG: {
      const image = (extra.imageMessage as Record<string, unknown> | undefined) ?? extra;
      return compactValue({
        imageMessage: {
          url: toTrimmedString(image.url),
          fileName: toTrimmedString(image.fileName),
          width: toFiniteNumber(image.width),
          height: toFiniteNumber(image.height),
          size: toFiniteNumber(image.size),
          background: toLooseBoolean(image.background),
        },
      });
    }
    case MessageType.SOUND: {
      const sound = (extra.soundMessage as Record<string, unknown> | undefined) ?? extra;
      return compactValue({
        soundMessage: {
          url: toTrimmedString(sound.url),
          fileName: toTrimmedString(sound.fileName),
          size: toFiniteNumber(sound.size),
          second: toFiniteNumber(sound.second),
          purpose: toTrimmedString(sound.purpose)?.toLowerCase(),
        },
      });
    }
    case MessageType.VIDEO: {
      const video = (extra.videoMessage as Record<string, unknown> | undefined)
        ?? (extra.fileMessage as Record<string, unknown> | undefined)
        ?? extra;
      return compactValue({
        videoMessage: {
          url: toTrimmedString(video.url),
          fileName: toTrimmedString(video.fileName),
          size: toFiniteNumber(video.size),
          second: toFiniteNumber(video.second),
        },
      });
    }
    case MessageType.FILE: {
      const file = (extra.fileMessage as Record<string, unknown> | undefined) ?? extra;
      return compactValue({
        fileMessage: {
          url: toTrimmedString(file.url),
          fileName: toTrimmedString(file.fileName),
          size: toFiniteNumber(file.size),
        },
      });
    }
    case MessageType.ROOM_JUMP: {
      const roomJump = (extra.roomJump as Record<string, unknown> | undefined) ?? extra;
      return compactValue({
        roomJump: {
          spaceId: toFiniteNumber(roomJump.spaceId),
          roomId: toFiniteNumber(roomJump.roomId),
          label: toTrimmedString(roomJump.label),
        },
      });
    }
    case MessageType.WEBGAL_VAR: {
      return compactValue({
        webgalVar: extra.webgalVar ?? extra,
      });
    }
    case MessageType.WEBGAL_CHOOSE: {
      return compactValue({
        webgalChoose: extra.webgalChoose ?? extra,
      });
    }
    default:
      return compactValue(rawExtra);
  }
}

function serializeMatchPosition(position: unknown): string {
  if (!isFiniteNumber(position)) {
    return "";
  }
  return position.toFixed(6);
}

function normalizeOptionalRefId(value: unknown): string {
  if (!isFiniteNumber(value) || value <= 0) {
    return "";
  }
  return String(value);
}

function normalizeNumericForMatch(value: unknown): string {
  if (!isFiniteNumber(value)) {
    return "";
  }
  if (value <= 0) {
    return "0";
  }
  return String(value);
}

function isMediaMessageType(messageType: unknown): boolean {
  return messageType === MessageType.IMG
    || messageType === MessageType.SOUND
    || messageType === MessageType.VIDEO
    || messageType === MessageType.FILE;
}

function buildOptimisticMatchKey(
  message: ChatMessageResponse["message"],
  options?: {
    includePosition?: boolean;
    ignoreContent?: boolean;
    ignoreAnnotations?: boolean;
  },
): string {
  const includePosition = Boolean(options?.includePosition);
  const ignoreContent = Boolean(options?.ignoreContent);
  const ignoreAnnotations = Boolean(options?.ignoreAnnotations);
  const annotations = !ignoreAnnotations && Array.isArray(message.annotations)
    ? [...message.annotations].map(item => String(item)).sort().join("\u0001")
    : "";
  const baseParts = [
    normalizeNumericForMatch(message.roomId),
    normalizeNumericForMatch(message.userId),
    normalizeNumericForMatch(message.roleId),
    normalizeNumericForMatch(message.messageType),
    normalizeOptionalRefId(message.threadId),
    normalizeOptionalRefId(message.replyMessageId),
    String(message.customRoleName ?? "").trim(),
    ignoreContent ? "" : String(message.content ?? ""),
    annotations,
    stableSerialize(message.webgal),
    stableSerialize(normalizeMessageExtraForMatch(message)),
  ];
  if (includePosition) {
    baseParts.push(serializeMatchPosition(message.position));
  }
  return baseParts.join("|");
}

function pushBucketValue(bucket: Map<string, number[]>, key: string, messageId: number): void {
  const list = bucket.get(key);
  if (list) {
    list.push(messageId);
    return;
  }
  bucket.set(key, [messageId]);
}

function buildOptimisticBuckets(messages: ChatMessageResponse[]): {
  exact: Map<string, number[]>;
  loose: Map<string, number[]>;
  mediaLoose: Map<string, number[]>;
} {
  const exact = new Map<string, number[]>();
  const loose = new Map<string, number[]>();
  const mediaLoose = new Map<string, number[]>();
  const now = Date.now();

  for (const item of messages) {
    const message = item.message;
    if (!message || message.messageId >= 0 || message.status === 1) {
      continue;
    }
    const createTimeMs = parseTimeToMs(message.createTime);
    if (createTimeMs !== undefined && now - createTimeMs > OPTIMISTIC_MESSAGE_MAX_AGE_MS) {
      continue;
    }
    pushBucketValue(exact, buildOptimisticMatchKey(message, { includePosition: true }), message.messageId);
    pushBucketValue(loose, buildOptimisticMatchKey(message, { includePosition: false }), message.messageId);
    if (isMediaMessageType(message.messageType)) {
      pushBucketValue(
        mediaLoose,
        buildOptimisticMatchKey(message, { includePosition: false, ignoreContent: true, ignoreAnnotations: true }),
        message.messageId,
      );
    }
  }

  return { exact, loose, mediaLoose };
}

function consumeOptimisticCandidate(
  messageMap: Map<number, ChatMessageResponse>,
  bucket: Map<string, number[]>,
  key: string,
): number | undefined {
  const list = bucket.get(key);
  if (!list || list.length === 0) {
    return undefined;
  }
  while (list.length > 0) {
    const optimisticId = list.shift();
    if (optimisticId === undefined) {
      break;
    }
    if (optimisticId < 0 && messageMap.has(optimisticId)) {
      return optimisticId;
    }
  }
  return undefined;
}

function mergeMessageForLocalState(
  existing: ChatMessageResponse,
  incoming: ChatMessageResponse,
): ChatMessageResponse {
  const existingMessage = existing.message;
  const incomingMessage = incoming.message;
  const mergedMessage = {
    ...existingMessage,
    ...incomingMessage,
  };

  const incomingCreateTimeMs = parseTimeToMs(incomingMessage.createTime);
  const existingCreateTimeMs = parseTimeToMs(existingMessage.createTime);
  if (incomingCreateTimeMs === undefined && existingCreateTimeMs !== undefined) {
    mergedMessage.createTime = existingMessage.createTime;
  }

  const incomingUpdateTimeMs = parseTimeToMs(incomingMessage.updateTime);
  const existingUpdateTimeMs = parseTimeToMs(existingMessage.updateTime);
  if (incomingUpdateTimeMs === undefined && existingUpdateTimeMs !== undefined) {
    mergedMessage.updateTime = existingMessage.updateTime;
  }

  if (!isFiniteNumber(incomingMessage.position) && isFiniteNumber(existingMessage.position)) {
    mergedMessage.position = existingMessage.position;
  }
  if (!isFiniteNumber(incomingMessage.syncId) && isFiniteNumber(existingMessage.syncId)) {
    mergedMessage.syncId = existingMessage.syncId;
  }
  if (incomingMessage.extra == null && existingMessage.extra != null) {
    mergedMessage.extra = existingMessage.extra;
  }
  if (!Array.isArray(incomingMessage.annotations) && Array.isArray(existingMessage.annotations)) {
    mergedMessage.annotations = existingMessage.annotations;
  }

  return {
    ...existing,
    ...incoming,
    message: mergedMessage,
  };
}

/**
 * 用于管理特定房间聊天记录的React Hook
 * @param roomId 要管理的房间ID, 你可以设置为null，然后通过getMessagesByRoomId获取
 */
export function useChatHistory(roomId: number | null): UseChatHistoryReturn {
  const [messagesRaw, setMessages] = useState<ChatMessageResponse[]>([]);
  const messagesWithoutDeletedMessages = useMemo(() => {
    return (messagesRaw ?? []).filter(msg => msg.message.status !== 1);
  }, [messagesRaw]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 使用 ref 保存最新的 roomId，避免依赖变化导致回调重新创建
  const roomIdRef = useRef<number | null>(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  /**
   * 批量添加或更新消息到当前房间，并同步更新UI状态
   * @param newMessages 要处理的消息数组
   */
  const addOrUpdateMessages = useCallback(
    async (newMessages: ChatMessageResponse[]) => {
      if (newMessages.length === 0)
        return;

      // 先更新状态
      // 由于获取消息是异步的，这里的roomId可能是过时的，所以要检查一下。
      if (newMessages[0].message.roomId === roomIdRef.current) {
        setMessages((prevMessages) => {
          const messageMap = new Map(prevMessages.map(msg => [msg.message.messageId, msg]));
          const optimisticBuckets = buildOptimisticBuckets(prevMessages);
          let hasChanges = false;

          newMessages.filter(msg => msg.message.roomId === roomIdRef.current)
            .forEach((msg) => {
              const incomingMessageId = msg.message.messageId;
              const existingMsg = messageMap.get(incomingMessageId);
              if (!existingMsg && incomingMessageId > 0) {
                const exactKey = buildOptimisticMatchKey(msg.message, { includePosition: true });
                const looseKey = buildOptimisticMatchKey(msg.message, { includePosition: false });
                const mediaLooseKey = isMediaMessageType(msg.message.messageType)
                  ? buildOptimisticMatchKey(msg.message, {
                      includePosition: false,
                      ignoreContent: true,
                      ignoreAnnotations: true,
                    })
                  : "";
                const matchedOptimisticId = consumeOptimisticCandidate(messageMap, optimisticBuckets.exact, exactKey)
                  ?? consumeOptimisticCandidate(messageMap, optimisticBuckets.loose, looseKey)
                  ?? (mediaLooseKey
                    ? consumeOptimisticCandidate(messageMap, optimisticBuckets.mediaLoose, mediaLooseKey)
                    : undefined);
                if (matchedOptimisticId !== undefined && matchedOptimisticId !== incomingMessageId) {
                  if (messageMap.delete(matchedOptimisticId)) {
                    hasChanges = true;
                  }
                }
              }
              const latestExisting = messageMap.get(incomingMessageId);
              const mergedMessage = latestExisting
                ? mergeMessageForLocalState(latestExisting, msg)
                : msg;
              // 只有在消息真正变化时才更新
              if (!latestExisting || JSON.stringify(latestExisting) !== JSON.stringify(mergedMessage)) {
                messageMap.set(incomingMessageId, mergedMessage);
                hasChanges = true;
              }
            });

          // 如果没有变化，返回原数组以避免不必要的重渲染
          if (!hasChanges) {
            return prevMessages;
          }

          const updatedMessages = Array.from(messageMap.values());
          // 按 position 排序确保顺序
          return updatedMessages.sort((a, b) => a.message.position - b.message.position);
        });
      }

      // 异步将消息批量存入数据库
      try {
        await dbAddOrUpdateMessages(newMessages);
      }
      catch (err) {
        setError(err as Error);
        console.error(`Failed to batch save messages for room ${roomIdRef.current}:`, err);
      }
    },
    [], // ← 移除依赖，使用 ref 代替
  );

  /**
   * 添加或更新单条消息（作为批量操作的便捷封装）
   * @param message 要处理的单条消息
   */
  const addOrUpdateMessage = useCallback(
    async (message: ChatMessageResponse) => {
      if (roomIdRef.current === null)
        return;
      // 调用批量处理函数
      await addOrUpdateMessages([message]);
    },
    [addOrUpdateMessages], // ← 只依赖 addOrUpdateMessages，不依赖 roomId
  );

  /**
   * 删除单条消息（本地状态 + IndexedDB）
   */
  const removeMessageById = useCallback(async (messageId: number) => {
    if (!Number.isFinite(messageId))
      return;

    setMessages((prevMessages) => {
      const nextMessages = prevMessages.filter(msg => msg.message.messageId !== messageId);
      return nextMessages.length === prevMessages.length ? prevMessages : nextMessages;
    });

    try {
      await dbDeleteMessagesByIds([messageId]);
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to remove message ${messageId} for room ${roomIdRef.current}:`, err);
    }
  }, []);

  /**
   * 使用新消息替换旧 messageId（用于乐观消息回填）
   */
  const replaceMessageById = useCallback(async (fromMessageId: number, message: ChatMessageResponse) => {
    const nextMessage = message?.message;
    if (!nextMessage || !Number.isFinite(fromMessageId)) {
      return;
    }

    const currentRoomId = roomIdRef.current;
    const shouldRenderNextMessage = nextMessage.roomId === currentRoomId;
    let mergedForDb = message;

    setMessages((prevMessages) => {
      const messageMap = new Map(prevMessages.map(msg => [msg.message.messageId, msg]));
      const removed = messageMap.delete(fromMessageId);
      let hasChanges = removed;

      if (shouldRenderNextMessage) {
        const existing = messageMap.get(nextMessage.messageId);
        const merged = existing
          ? mergeMessageForLocalState(existing, message)
          : message;
        mergedForDb = merged;
        if (!existing || JSON.stringify(existing) !== JSON.stringify(merged)) {
          messageMap.set(nextMessage.messageId, merged);
          hasChanges = true;
        }
      }
      else {
        mergedForDb = message;
      }

      if (!hasChanges) {
        return prevMessages;
      }

      return Array.from(messageMap.values()).sort((a, b) => a.message.position - b.message.position);
    });

    try {
      if (fromMessageId !== nextMessage.messageId) {
        await dbDeleteMessagesByIds([fromMessageId]);
      }
      await dbAddOrUpdateMessages([mergedForDb]);
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to replace message ${fromMessageId} for room ${currentRoomId}:`, err);
    }
  }, []);

  /**
   * 从服务器全量获取最新的消息
   */
  const fetchNewestMessages = useCallback(async (maxSyncId: number) => {
    if (roomIdRef.current === null)
      return [];

    // 从服务器获取最新消息
    const serverResponse = await tuanchat.chatController.getHistoryMessages({
      roomId: roomIdRef.current,
      syncId: maxSyncId + 1,
    });

    const newMessages = serverResponse.data ?? [];
    if (newMessages.length > 0) {
      await addOrUpdateMessages(newMessages);
    }

    return newMessages;
  }, [addOrUpdateMessages]); // ← 只依赖 addOrUpdateMessages，不依赖 roomId

  /**
   * 按照房间获取消息
   */
  const currentFetchingRoomId = useRef<number | null>(null);
  const getMessagesByRoomId = useCallback(async (roomId: number) => {
    if (currentFetchingRoomId.current === roomId)
      return [];
    currentFetchingRoomId.current = roomId;

    const messages = await dbGetMessagesByRoomId(roomId);
    if (currentFetchingRoomId.current !== roomId) {
      return [];
    }
    const maxSyncId = messages.length > 0
      ? Math.max(...messages.map(msg => msg.message.syncId))
      : -1;
    const newMessages = await fetchNewestMessages(maxSyncId);
    if (currentFetchingRoomId.current !== roomId) {
      return [];
    }

    return [...messages, ...newMessages].sort((a, b) => a.message.position - b.message.position);
  }, [fetchNewestMessages]);

  /**
   * 清空当前房间的聊天记录
   */
  const clearHistory = useCallback(async () => {
    if (roomId === null)
      return;
    try {
      await dbClearMessages(roomId);
      setMessages([]);
    }
    catch (err) {
      setError(err as Error);
    }
  }, [roomId]);

  /**
   * 初始加载聊天记录
   */
  useEffect(() => {
    if (roomId === null) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
    let isCancelled = false; // Flag to prevent state updates from stale effects

    const loadAndFetch = async () => {
      try {
        // IndexedDB 加载本地历史记录
        const localHistory = await dbGetMessagesByRoomId(roomId);
        if (isCancelled)
          return;
        // 按 position 排序后设置消息
        const sortedLocalHistory = localHistory.sort((a, b) => a.message.position - b.message.position);
        setMessages(sortedLocalHistory);
        const localMaxSyncId = localHistory.length > 0
          ? Math.max(...localHistory.map(msg => msg.message.syncId))
          : -1;

        // 有本地缓存时直接展示，服务端增量同步改为后台进行，避免切房间被网络请求阻塞。
        if (sortedLocalHistory.length > 0) {
          setLoading(false);
          void fetchNewestMessages(localMaxSyncId).catch((err) => {
            if (!isCancelled) {
              setError(err as Error);
            }
          });
          return;
        }

        await fetchNewestMessages(localMaxSyncId);
      }
      catch (err) {
        if (!isCancelled) {
          setError(err as Error);
        }
      }
      finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    loadAndFetch();
    return () => {
      isCancelled = true;
    };
  }, [roomId, fetchNewestMessages]);

  // 监听页面状态, 如果重新页面处于可见状态，则尝试重新获取最新消息
  const messagesRawRef = useRef<ChatMessageResponse[]>([]);
  useEffect(() => {
    messagesRawRef.current = messagesRaw;
  }, [messagesRaw]);

  const refreshNewestMessages = useCallback(() => {
    const maxSyncId = messagesRawRef.current.length > 0
      ? Math.max(...messagesRawRef.current.map(msg => msg.message.syncId))
      : -1;
    void fetchNewestMessages(maxSyncId).catch((err) => {
      setError(err as Error);
    });
  }, [fetchNewestMessages]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // 当页面从后台切换到前台时
      if (document.visibilityState === "visible") {
        refreshNewestMessages();
      }
    };
    const handleWsReconnected = () => {
      // WS 重连后立即做一次增量补拉，覆盖离线期间产生的消息变更。
      refreshNewestMessages();
    };

    // 添加事件监听
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(WS_RECONNECTED_EVENT, handleWsReconnected);

    // 组件卸载时，清理事件监听器，防止内存泄漏
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(WS_RECONNECTED_EVENT, handleWsReconnected);
    };
  }, [refreshNewestMessages]);

  return {
    messages: messagesWithoutDeletedMessages,
    loading,
    error,
    addOrUpdateMessage, // 用于单条消息
    addOrUpdateMessages, // 用于批量消息
    removeMessageById,
    replaceMessageById,
    getMessagesByRoomId,
    clearHistory,
  };
}
