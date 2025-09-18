import { useCallback, useEffect, useRef } from "react";

import type { ChatStatusEvent, ChatStatusType } from "../../../../api/wsModels";

type UseChatInputStatusParams = {
  roomId: number;
  userId: number | null | undefined;
  webSocketUtils: {
    // 实际数据：Record<roomId, Array<{ userId:number; status: ChatStatusType }>>
    chatStatus: Record<number, Array<{ userId: number; status: ChatStatusType }>>;
    updateChatStatus: (evt: ChatStatusEvent) => void;
    send: (payload: any) => void; // payload: { type: 4, data: ChatStatusEvent }
  };
  inputText: string;
  // 可选自定义
  snapshotIntervalMs?: number; // 默认 10s
  idleThresholdMs?: number; // 默认 10s
  leaveThresholdMs?: number; // 默认 5min
  lockDurationMs?: number; // 默认 3s
};

type UseChatInputStatusReturn = {
  myStatus: ChatStatusType;
  handleManualStatusChange: (newStatus: ChatStatusType) => void;
};

/**
 * 统一聊天输入状态管理：
 * - 每 snapshotIntervalMs 评估一次状态
 * - > leaveThresholdMs 无活动 => leave
 * - > idleThresholdMs 无活动 => idle
 * - 活动期且文本非空 => input
 * - 手动切换添加 lockDurationMs 锁，保护期内不被自动覆盖
 */
export function useChatInputStatus(params: UseChatInputStatusParams): UseChatInputStatusReturn {
  const {
    roomId,
    userId,
    webSocketUtils,
    inputText,
    snapshotIntervalMs = 10_000,
    idleThresholdMs = 10_000,
    leaveThresholdMs = 5 * 60_000,
    lockDurationMs = 3_000,
  } = params;

  const lastActivityRef = useRef<number>(Date.now());
  const lastNonEmptyInputRef = useRef<string>("");
  const manualStatusLockRef = useRef<{ status: ChatStatusType; timestamp: number } | null>(null);
  const inputValueRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusSentRef = useRef<{ status: ChatStatusType; ts: number } | null>(null);

  // 同步输入与活动时间
  useEffect(() => {
    inputValueRef.current = inputText;
    const trimmed = inputText.trim();
    const prevTrimmed = lastNonEmptyInputRef.current;

    if (trimmed !== prevTrimmed) {
      if (trimmed.length > 0) {
        lastActivityRef.current = Date.now();
      }
      lastNonEmptyInputRef.current = trimmed;
    }

    // 即时输入状态：只要出现非空文本（或当前状态不是 input），且不在手动锁保护期，立即上报 input
    if (trimmed.length > 0 && userId && roomId > 0) {
      const now = Date.now();
      const currentStatus = webSocketUtils.chatStatus[roomId]?.find(s => s.userId === userId)?.status ?? "idle";
      // 手动锁保护期内不自动覆盖
      if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp < lockDurationMs)) {
        return;
      }
      // 避免 3 秒后锁失效但仍想保持手动状态（例如 wait），这里按原设计只保护 lockDurationMs
      if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp >= lockDurationMs)) {
        manualStatusLockRef.current = null;
      }

      const recentSame = lastStatusSentRef.current && lastStatusSentRef.current.status === "input" && (now - lastStatusSentRef.current.ts < 400);
      if (currentStatus !== "input" && !recentSame) {
        const evt: ChatStatusEvent = { roomId, userId, status: "input" };
        webSocketUtils.updateChatStatus(evt);
        webSocketUtils.send({ type: 4, data: evt });
        lastStatusSentRef.current = { status: "input", ts: now };
      }
    }
  }, [inputText, roomId, userId, webSocketUtils, lockDurationMs]);

  // 快照轮询
  useEffect(() => {
    if (!userId || roomId <= 0)
      return;
    if (intervalRef.current)
      return; // 只启动一次

    function evaluateStatus() {
      if (roomId <= 0 || !userId)
        return;
      const now = Date.now();
      const currentStatus = webSocketUtils.chatStatus[roomId]?.find(s => s.userId === userId)?.status ?? "idle";
      const trimmed = inputValueRef.current.trim();
      const inactiveFor = now - lastActivityRef.current;

      // 手动锁保护
      if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp < lockDurationMs)) {
        return;
      }
      if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp >= lockDurationMs)) {
        manualStatusLockRef.current = null; // 释放过期锁
      }

      // leave
      if (inactiveFor >= leaveThresholdMs) {
        if (currentStatus !== "leave") {
          const evt: ChatStatusEvent = { roomId, userId, status: "leave" };
          webSocketUtils.updateChatStatus(evt);
          webSocketUtils.send({ type: 4, data: evt });
        }
        return;
      }

      // idle
      if (inactiveFor >= idleThresholdMs) {
        if (currentStatus !== "idle" && currentStatus !== "leave") {
          const evt: ChatStatusEvent = { roomId, userId, status: "idle" };
          webSocketUtils.updateChatStatus(evt);
          webSocketUtils.send({ type: 4, data: evt });
        }
        return;
      }

      // active & has content => input
      if (trimmed.length > 0 && currentStatus !== "input") {
        const evt: ChatStatusEvent = { roomId, userId, status: "input" };
        webSocketUtils.updateChatStatus(evt);
        webSocketUtils.send({ type: 4, data: evt });
      }
    }

    // 立即执行一次
    evaluateStatus();
    intervalRef.current = setInterval(evaluateStatus, snapshotIntervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomId, userId, webSocketUtils, snapshotIntervalMs, idleThresholdMs, leaveThresholdMs, lockDurationMs]);

  const handleManualStatusChange = useCallback((newStatus: ChatStatusType) => {
    if (!userId || roomId <= 0)
      return;
    manualStatusLockRef.current = { status: newStatus, timestamp: Date.now() };
    const evt: ChatStatusEvent = { roomId, userId, status: newStatus };
    webSocketUtils.updateChatStatus(evt);
    webSocketUtils.send({ type: 4, data: evt });
    if (newStatus === "input") {
      lastActivityRef.current = Date.now();
    }
  }, [roomId, userId, webSocketUtils]);

  const myStatus: ChatStatusType = webSocketUtils.chatStatus[roomId]?.find(s => s.userId === userId)?.status ?? "idle";

  return { myStatus, handleManualStatusChange };
}

export default useChatInputStatus;
