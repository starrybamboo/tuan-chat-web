/* eslint-disable no-console */
import { useCallback, useEffect, useRef } from "react";

import { CURRENT_WINDOW_ID, handleWindowBlur, shouldSendStatusUpdate } from "@/utils/windowInstance";

import type { ChatStatusEvent, ChatStatusType } from "../../../../api/wsModels";

// ==================== 日志系统 ====================
const DEBUG_ENABLED = false; // 设置为 false 可关闭所有日志

enum LogLevel {
  DEBUG = "🔍 DEBUG",
  INFO = "ℹ️  INFO",
  WARN = "⚠️  WARN",
  ERROR = "❌ ERROR",
  PERF = "⚡ PERF",
}

function log(level: LogLevel, message: string, data?: any) {
  if (!DEBUG_ENABLED)
    return;

  const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
  const prefix = `[ChatInputStatus ${timestamp}] ${level}:`;

  if (data !== undefined) {
    console.log(prefix, message, data);
  }
  else {
    console.log(prefix, message);
  }
}

function logGroup(title: string, callback: () => void) {
  if (!DEBUG_ENABLED)
    return;
  console.group(`📦 ${title}`);
  callback();
  console.groupEnd();
}
// ==================== 日志系统结束 ====================

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
  isSpectator?: boolean; // 是否是观战成员，观战成员不发送状态
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
    isSpectator = false,
  } = params;

  const lastActivityRef = useRef<number>(Date.now());
  const lastNonEmptyInputRef = useRef<string>("");
  const manualStatusLockRef = useRef<{ status: ChatStatusType; timestamp: number } | null>(null);
  const inputValueRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusSentRef = useRef<{ status: ChatStatusType; ts: number } | null>(null);
  const inputDebounceTimerRef = useRef<NodeJS.Timeout | null>(null); // ⚡ 新增：输入防抖计时器

  // 缓存 webSocketUtils 的方法，避免依赖整个对象
  const updateChatStatusRef = useRef(webSocketUtils.updateChatStatus);
  const sendRef = useRef(webSocketUtils.send);
  const chatStatusRef = useRef(webSocketUtils.chatStatus);

  // 🔍 Hook 初始化日志（只执行一次）
  useEffect(() => {
    log(LogLevel.INFO, "🚀 Hook 初始化", { roomId, userId, inputTextLength: inputText.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在挂载时执行一次

  // 更新引用
  useEffect(() => {
    updateChatStatusRef.current = webSocketUtils.updateChatStatus;
    sendRef.current = webSocketUtils.send;
    chatStatusRef.current = webSocketUtils.chatStatus;
  });

  // 辅助函数：发送状态更新（带冲突检测）
  const sendStatusUpdate = useCallback((status: ChatStatusType) => {
    logGroup(`📤 尝试发送状态更新: ${status}`, () => {
      log(LogLevel.DEBUG, "参数检查", { userId, roomId, status, isSpectator });

      if (!userId || roomId <= 0) {
        log(LogLevel.WARN, "❌ 参数无效，取消发送", { userId, roomId });
        return;
      }

      // 观战成员不发送状态
      if (isSpectator) {
        log(LogLevel.INFO, "👁️ 观战成员，跳过状态发送");
        return;
      }

      // 使用冲突检测逻辑
      const shouldSend = shouldSendStatusUpdate(roomId, userId, status, CURRENT_WINDOW_ID);
      log(LogLevel.DEBUG, "冲突检测结果", { shouldSend });

      if (!shouldSend) {
        log(LogLevel.WARN, "❌ 冲突检测失败，取消发送");
        return;
      }

      const evt: ChatStatusEvent = { roomId, userId, status, windowId: CURRENT_WINDOW_ID };
      log(LogLevel.INFO, "✅ 发送状态更新", evt);

      updateChatStatusRef.current(evt);
      sendRef.current({ type: 4, data: evt });
      lastStatusSentRef.current = { status, ts: Date.now() };

      log(LogLevel.PERF, "状态已发送", {
        status,
        timestamp: Date.now(),
        lastSent: lastStatusSentRef.current,
      });
    });
  }, [roomId, userId, isSpectator]);

  // 同步输入与活动时间 (添加真正的防抖以避免频繁触发导致卡死)
  useEffect(() => {
    const startTime = performance.now();
    log(LogLevel.DEBUG, "⌨️  输入变化触发 useEffect", {
      inputTextLength: inputText.length,
      trimmedLength: inputText.trim().length,
    });

    inputValueRef.current = inputText;
    const trimmed = inputText.trim();
    const prevTrimmed = lastNonEmptyInputRef.current;

    if (trimmed !== prevTrimmed) {
      log(LogLevel.DEBUG, "文本内容变化", {
        prevLength: prevTrimmed.length,
        newLength: trimmed.length,
      });

      if (trimmed.length > 0) {
        lastActivityRef.current = Date.now();
        log(LogLevel.DEBUG, "更新活动时间", { timestamp: lastActivityRef.current });
      }
      lastNonEmptyInputRef.current = trimmed;
    }

    // ⚡ 清除之前的防抖计时器
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current);
      log(LogLevel.DEBUG, "⏱️  清除旧的防抖计时器");
      inputDebounceTimerRef.current = null;
    }

    // 即时输入状态：只要出现非空文本，使用防抖延迟发送
    if (trimmed.length > 0 && userId && roomId > 0) {
      log(LogLevel.DEBUG, "🕐 启动 300ms 防抖计时器");

      // ⚡ 使用防抖：延迟 300ms 后才发送状态更新
      inputDebounceTimerRef.current = setTimeout(() => {
        const now = Date.now();
        const currentStatus = chatStatusRef.current[roomId]?.find(s => s.userId === userId)?.status ?? "idle";

        logGroup("⏰ 防抖计时器触发", () => {
          log(LogLevel.INFO, "当前状态", { currentStatus });
          log(LogLevel.DEBUG, "手动锁状态", manualStatusLockRef.current);

          // 手动锁保护期内不自动覆盖
          if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp < lockDurationMs)) {
            log(LogLevel.WARN, "🔒 手动锁保护期内，跳过自动更新", {
              lockAge: now - manualStatusLockRef.current.timestamp,
              lockDuration: lockDurationMs,
            });
            return;
          }

          if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp >= lockDurationMs)) {
            log(LogLevel.INFO, "🔓 手动锁已过期，释放锁");
            manualStatusLockRef.current = null;
          }

          // 检查是否需要发送状态更新
          const lastSent = lastStatusSentRef.current;
          const timeSinceLastSent = lastSent ? now - lastSent.ts : Infinity;
          const recentSame = lastSent
            && lastSent.status === "input"
            && timeSinceLastSent < 2000;

          log(LogLevel.DEBUG, "重复发送检查", {
            lastSent,
            timeSinceLastSent,
            recentSame,
            threshold: 2000,
          });

          if (currentStatus !== "input" && !recentSame) {
            log(LogLevel.INFO, "✅ 条件满足，准备发送 input 状态");
            sendStatusUpdate("input");
          }
          else {
            log(LogLevel.WARN, "❌ 条件不满足，跳过发送", {
              currentStatus,
              recentSame,
            });
          }
        });
      }, 300); // ⚡ 300ms 防抖延迟
    }
    else {
      log(LogLevel.DEBUG, "❌ 不满足防抖条件", {
        trimmedLength: trimmed.length,
        userId,
        roomId,
      });
    }

    const endTime = performance.now();
    log(LogLevel.PERF, `⚡ 输入 useEffect 执行耗时: ${(endTime - startTime).toFixed(2)}ms`);

    // ⚡ 清理函数：组件卸载时清除计时器
    return () => {
      if (inputDebounceTimerRef.current) {
        clearTimeout(inputDebounceTimerRef.current);
        log(LogLevel.DEBUG, "🧹 清理：清除防抖计时器");
        inputDebounceTimerRef.current = null;
      }
    };
  }, [inputText, roomId, userId, lockDurationMs, sendStatusUpdate]);

  // 快照轮询
  useEffect(() => {
    log(LogLevel.INFO, "📸 快照轮询 useEffect 初始化", { roomId, userId });

    if (!userId || roomId <= 0) {
      log(LogLevel.WARN, "❌ 参数无效，不启动快照轮询", { userId, roomId });
      return;
    }

    if (intervalRef.current) {
      log(LogLevel.WARN, "⚠️  快照轮询已在运行，跳过重复启动");
      return; // 只启动一次
    }

    function evaluateStatus() {
      const evalStart = performance.now();

      if (roomId <= 0 || !userId) {
        log(LogLevel.WARN, "评估状态：参数无效", { roomId, userId });
        return;
      }

      const now = Date.now();
      const currentStatus = chatStatusRef.current[roomId]?.find(s => s.userId === userId)?.status ?? "idle";
      const trimmed = inputValueRef.current.trim();
      const inactiveFor = now - lastActivityRef.current;

      logGroup("📊 状态评估", () => {
        log(LogLevel.DEBUG, "当前状态", {
          currentStatus,
          trimmedLength: trimmed.length,
          inactiveFor: `${(inactiveFor / 1000).toFixed(1)}s`,
        });

        // 手动锁保护
        if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp < lockDurationMs)) {
          const lockAge = now - manualStatusLockRef.current.timestamp;
          log(LogLevel.INFO, "🔒 手动锁保护中", {
            lockStatus: manualStatusLockRef.current.status,
            lockAge: `${(lockAge / 1000).toFixed(1)}s`,
            lockDuration: `${(lockDurationMs / 1000).toFixed(1)}s`,
          });
          return;
        }

        if (manualStatusLockRef.current && (now - manualStatusLockRef.current.timestamp >= lockDurationMs)) {
          log(LogLevel.INFO, "🔓 手动锁已过期，释放");
          manualStatusLockRef.current = null; // 释放过期锁
        }

        // 特殊处理：wait 和 leave 状态只能由用户手动改变，不会被自动评估覆盖
        if (currentStatus === "wait" || currentStatus === "leave") {
          log(LogLevel.INFO, `⏸️  当前状态 ${currentStatus} 只能手动改变，跳过自动评估`);
          return;
        }

        // 只对 idle 和 input 状态进行自动状态评估
        log(LogLevel.DEBUG, "开始自动状态评估", { currentStatus, inactiveFor });

        // 超过暂离阈值时间，自动切换到 leave
        if (inactiveFor >= leaveThresholdMs) {
          log(LogLevel.INFO, "🚪 超过暂离阈值，切换到 leave", {
            inactiveFor: `${(inactiveFor / 1000).toFixed(1)}s`,
            threshold: `${(leaveThresholdMs / 1000).toFixed(1)}s`,
          });
          sendStatusUpdate("leave");
          return;
        }

        // 超过空闲阈值时间，自动切换到 idle
        if (inactiveFor >= idleThresholdMs && currentStatus !== "idle") {
          log(LogLevel.INFO, "💤 超过空闲阈值，切换到 idle", {
            inactiveFor: `${(inactiveFor / 1000).toFixed(1)}s`,
            threshold: `${(idleThresholdMs / 1000).toFixed(1)}s`,
          });
          sendStatusUpdate("idle");
          return;
        }

        // 有内容且活跃时，自动切换到 input
        if (trimmed.length > 0 && currentStatus !== "input") {
          log(LogLevel.INFO, "⌨️  有内容且活跃，切换到 input", {
            trimmedLength: trimmed.length,
            currentStatus,
          });
          sendStatusUpdate("input");
        }
      });

      const evalEnd = performance.now();
      log(LogLevel.PERF, `⚡ 状态评估耗时: ${(evalEnd - evalStart).toFixed(2)}ms`);
    }

    // 窗口失焦事件处理
    const handleBlur = () => {
      log(LogLevel.INFO, "👁️  窗口失焦事件触发");
      if (userId && roomId > 0) {
        handleWindowBlur(roomId, userId);
        log(LogLevel.DEBUG, "调用 handleWindowBlur", { roomId, userId });
      }
    };

    // 立即执行一次
    log(LogLevel.INFO, "🚀 立即执行第一次状态评估");
    evaluateStatus();

    log(LogLevel.INFO, `⏰ 启动定时器，间隔 ${snapshotIntervalMs}ms`);
    intervalRef.current = setInterval(evaluateStatus, snapshotIntervalMs);

    // 监听窗口失焦事件
    window.addEventListener("blur", handleBlur);
    log(LogLevel.DEBUG, "✅ 已添加窗口失焦监听器");

    return () => {
      log(LogLevel.INFO, "🧹 清理快照轮询");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        log(LogLevel.DEBUG, "✅ 已清除定时器");
      }
      window.removeEventListener("blur", handleBlur);
      log(LogLevel.DEBUG, "✅ 已移除窗口失焦监听器");
    };
  }, [roomId, userId, snapshotIntervalMs, idleThresholdMs, leaveThresholdMs, lockDurationMs, sendStatusUpdate]);

  const handleManualStatusChange = useCallback((newStatus: ChatStatusType) => {
    logGroup(`👆 手动切换状态: ${newStatus}`, () => {
      log(LogLevel.INFO, "切换请求", { newStatus, userId, roomId });

      if (!userId || roomId <= 0) {
        log(LogLevel.ERROR, "❌ 参数无效，取消切换", { userId, roomId });
        return;
      }

      const lockInfo = { status: newStatus, timestamp: Date.now() };
      manualStatusLockRef.current = lockInfo;
      log(LogLevel.INFO, "🔒 设置手动锁", lockInfo);

      sendStatusUpdate(newStatus);

      if (newStatus === "input") {
        lastActivityRef.current = Date.now();
        log(LogLevel.DEBUG, "更新活动时间", { timestamp: lastActivityRef.current });
      }

      log(LogLevel.INFO, "✅ 手动切换完成");
    });
  }, [roomId, userId, sendStatusUpdate]);

  const myStatus: ChatStatusType = webSocketUtils.chatStatus[roomId]?.find(s => s.userId === userId)?.status ?? "idle";

  return { myStatus, handleManualStatusChange };
}

export default useChatInputStatus;
