import type { ChatMessageResponse, Room, UserRole } from "../../../../api";
import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  shouldProcessHistoryDelta,
  shouldRenderInitialHistory,
  shouldRerenderForSettingsChange,
} from "@/components/chat/core/realtimeRenderGuards";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { isImageMessageBackground } from "@/types/messageAnnotations";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { getTerreHealthcheckUrl } from "@/webGAL/terreConfig";
import useRealtimeRender from "@/webGAL/useRealtimeRender";

function sortMessagesForRender(messages: ChatMessageResponse[]) {
  return [...messages].sort((a, b) => {
    const positionDiff = (a.message.position ?? 0) - (b.message.position ?? 0);
    if (positionDiff !== 0) {
      return positionDiff;
    }
    const syncIdDiff = (a.message.syncId ?? 0) - (b.message.syncId ?? 0);
    if (syncIdDiff !== 0) {
      return syncIdDiff;
    }
    return a.message.messageId - b.message.messageId;
  });
}

export interface RealtimeRenderOrchestratorApi {
  toggleRealtimeRender: () => Promise<void>;
  stopRealtimeRender: () => void;
  jumpToMessage: (messageId: number) => boolean;
  updateAndRerenderMessage: (message: ChatMessageResponse, regenerateTTS?: boolean) => Promise<boolean>;
  rerenderHistory: (messages?: ChatMessageResponse[]) => Promise<boolean>;
  clearFigure: () => void;
  clearBackground: () => void;
}

interface Props {
  spaceId: number;
  spaceName?: string;
  roomId: number;
  room: Room | undefined;
  roles: UserRole[];
  historyMessages: ChatMessageResponse[];
  chatHistoryLoading: boolean;
  onApiChange: (api: RealtimeRenderOrchestratorApi) => void;
}

export default function RealtimeRenderOrchestrator({
  spaceId,
  spaceName,
  roomId,
  room,
  roles,
  historyMessages,
  chatHistoryLoading,
  onApiChange,
}: Props) {
  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
  useEffect(() => {
    void ensureHydrated(spaceId);
  }, [ensureHydrated, spaceId]);

  const isRealtimeRenderEnabled = useRealtimeRenderStore(state => state.enabled);
  const setIsRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);

  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const prevSideDrawerStateRef = useRef<SideDrawerState>(sideDrawerState);

  const realtimeTTSEnabled = useRealtimeRenderStore(state => state.ttsEnabled);
  const realtimeMiniAvatarEnabled = useRealtimeRenderStore(state => state.miniAvatarEnabled);
  const realtimeAutoFigureEnabled = useRealtimeRenderStore(state => state.autoFigureEnabled);
  const realtimeGameConfig = useRealtimeRenderStore(state => state.gameConfig);
  const ttsApiUrl = useRealtimeRenderStore(state => state.ttsApiUrl);

  const realtimeTTSConfig = useMemo(() => ({
    enabled: realtimeTTSEnabled,
    engine: "index" as const,
    apiUrl: ttsApiUrl || undefined,
    emotionMode: 2,
    emotionWeight: 0.8,
    temperature: 0.8,
    topP: 0.8,
    maxTokensPerSegment: 120,
  }), [realtimeTTSEnabled, ttsApiUrl]);

  const realtimeRender = useRealtimeRender({
    spaceId,
    spaceName,
    enabled: isRealtimeRenderEnabled,
    roles,
    rooms: room ? [room] : [],
    ttsConfig: realtimeTTSConfig,
    miniAvatarEnabled: realtimeMiniAvatarEnabled,
    autoFigureEnabled: realtimeAutoFigureEnabled,
    gameConfig: realtimeGameConfig,
  });

  const setRealtimeRenderRuntime = useRealtimeRenderStore(state => state.setRuntime);
  useEffect(() => {
    setRealtimeRenderRuntime({
      status: realtimeRender.status,
      initProgress: realtimeRender.initProgress,
      isActive: realtimeRender.isActive,
      previewUrl: realtimeRender.previewUrl,
    });
  }, [realtimeRender.status, realtimeRender.initProgress, realtimeRender.isActive, realtimeRender.previewUrl, setRealtimeRenderRuntime]);

  const realtimeStatus = realtimeRender.status;
  const stopRealtimeRender = realtimeRender.stop;

  const lastRenderedMessageIdRef = useRef<number | null>(null);
  const hasRenderedHistoryRef = useRef<boolean>(false);
  const prevRoomIdRef = useRef<number | null>(null);
  const lastBackgroundMessageIdRef = useRef<number | null>(null);
  const isStartingRealtimeRenderRef = useRef(false);

  const isRenderingHistoryRef = useRef(false);
  const orderedHistoryMessages = useMemo(() => {
    return sortMessagesForRender(historyMessages ?? []);
  }, [historyMessages]);

  const prevHistoryOrderIdsRef = useRef<number[] | null>(null);
  const prevHistoryUpdateTimeMapRef = useRef<Map<number, string | undefined>>(new Map());
  const pendingFullRerenderRef = useRef<ChatMessageResponse[] | null>(null);
  const fullRerenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFullRerenderTimer = useCallback(() => {
    if (!fullRerenderTimerRef.current) {
      return;
    }
    clearTimeout(fullRerenderTimerRef.current);
    fullRerenderTimerRef.current = null;
  }, []);
  const resetHistoryTracking = useCallback(() => {
    hasRenderedHistoryRef.current = false;
    lastRenderedMessageIdRef.current = null;
    isRenderingHistoryRef.current = false;
    lastBackgroundMessageIdRef.current = null;
    prevHistoryOrderIdsRef.current = null;
    prevHistoryUpdateTimeMapRef.current = new Map();
    pendingFullRerenderRef.current = null;
    clearFullRerenderTimer();
  }, [clearFullRerenderTimer]);
  const renderHistoryMessages = useCallback(async () => {
    if (!orderedHistoryMessages || orderedHistoryMessages.length === 0) {
      return;
    }

    isRenderingHistoryRef.current = true;
    try {
      console.warn(`[RealtimeRender] 开始渲染历史消息, 共 ${orderedHistoryMessages.length} 条`);
      toast.loading(`正在渲染历史消息...`, { id: "webgal-history" });

      const messagesToRender = orderedHistoryMessages;

      await realtimeRender.renderHistory(messagesToRender, roomId);

      const lastMessage = messagesToRender[messagesToRender.length - 1];
      if (lastMessage) {
        lastRenderedMessageIdRef.current = lastMessage.message.messageId;
      }
      hasRenderedHistoryRef.current = true;
      prevHistoryOrderIdsRef.current = messagesToRender.map(m => m.message.messageId);
      prevHistoryUpdateTimeMapRef.current = new Map(messagesToRender.map(m => [m.message.messageId, m.message.updateTime]));
      toast.success(`历史消息渲染完成`, { id: "webgal-history" });
      console.warn(`[RealtimeRender] 历史消息渲染完成`);
    }
    catch (error) {
      console.error(`[RealtimeRender] 渲染历史消息失败:`, error);
      toast.error(`渲染历史消息失败`, { id: "webgal-history" });
    }
    finally {
      isRenderingHistoryRef.current = false;
    }
  }, [orderedHistoryMessages, realtimeRender, roomId]);

  useEffect(() => {
    if (prevRoomIdRef.current === null) {
      prevRoomIdRef.current = roomId;
      return;
    }

    if (prevRoomIdRef.current !== roomId) {
      prevRoomIdRef.current = roomId;
      setIsRealtimeRenderEnabled(false);
      resetHistoryTracking();
      if (sideDrawerState === "webgal") {
        setSideDrawerState("none");
      }
    }
  }, [resetHistoryTracking, roomId, setIsRealtimeRenderEnabled, sideDrawerState, setSideDrawerState]);

  useEffect(() => {
    if (!shouldRenderInitialHistory({
      isRealtimeActive: realtimeRender.isActive,
      hasRenderedHistory: hasRenderedHistoryRef.current,
      isRenderingHistory: isRenderingHistoryRef.current,
      hasHistoryMessages: Boolean(historyMessages?.length),
      chatHistoryLoading,
      hasRoom: Boolean(room),
    })) {
      return;
    }

    renderHistoryMessages();
  }, [realtimeRender.isActive, historyMessages, chatHistoryLoading, room, renderHistoryMessages]);

  useEffect(() => {
    if (realtimeRender.isActive) {
      return;
    }

    resetHistoryTracking();
  }, [realtimeRender.isActive, resetHistoryTracking]);

  useEffect(() => {
    if (!realtimeRender.isActive || !hasRenderedHistoryRef.current) {
      return;
    }

    if (!orderedHistoryMessages || orderedHistoryMessages.length === 0) {
      return;
    }

    const backgroundMessages = orderedHistoryMessages
      .filter(msg => msg.message.messageType === 2
        && isImageMessageBackground(msg.message.annotations, msg.message.extra?.imageMessage));

    const latestBackgroundMessage = backgroundMessages[backgroundMessages.length - 1];
    const latestBackgroundMessageId = latestBackgroundMessage?.message.messageId ?? null;

    if (lastBackgroundMessageIdRef.current === latestBackgroundMessageId) {
      return;
    }

    const previousBackgroundMessageId = lastBackgroundMessageIdRef.current;
    lastBackgroundMessageIdRef.current = latestBackgroundMessageId;

    if (latestBackgroundMessage) {
      console.warn("[RealtimeRender] 检测到背景更新，重新渲染背景消息:", latestBackgroundMessageId);
      realtimeRender.renderMessage(latestBackgroundMessage, roomId);
    }
    else if (previousBackgroundMessageId !== null) {
      console.warn("[RealtimeRender] 检测到背景被取消，清除背景");
      realtimeRender.clearBackground(roomId);
    }
  }, [orderedHistoryMessages, realtimeRender, roomId]);

  const startRealtimeRender = useCallback(async () => {
    if (realtimeRender.isActive || isStartingRealtimeRenderRef.current) {
      return;
    }

    isStartingRealtimeRenderRef.current = true;
    try {
      await ensureHydrated(spaceId);

      const launchResult = await launchWebGal({
        gameDir: `realtime_${spaceId}`,
      });
      const electronEnv = launchResult.runtime === "electron";
      if (electronEnv && !launchResult.ok) {
        toast.error(launchResult.error || "WebGAL 启动失败", { id: "webgal-init" });
        setIsRealtimeRenderEnabled(false);
        return;
      }

      toast.loading("正在启动 WebGAL...", { id: "webgal-init" });
      try {
        if (!electronEnv) {
          await pollPort(
            getTerreHealthcheckUrl(),
            20_000,
            200,
          );
        }

        toast.loading("正在初始化实时渲染...", { id: "webgal-init" });
        const success = await realtimeRender.start();
        if (success) {
          toast.success("实时渲染已开启", { id: "webgal-init" });
          setIsRealtimeRenderEnabled(true);
          setSideDrawerState("webgal");
          await renderHistoryMessages();
        }
        else {
          toast.error("实时渲染启动失败", { id: "webgal-init" });
          setIsRealtimeRenderEnabled(false);
        }
      }
      catch (error) {
        const message = error instanceof Error && error.message
          ? `WebGAL 启动失败：${error.message}`
          : "WebGAL 启动超时";
        toast.error(message, { id: "webgal-init" });
        setIsRealtimeRenderEnabled(false);
      }
    }
    finally {
      isStartingRealtimeRenderRef.current = false;
    }
  }, [ensureHydrated, realtimeRender, renderHistoryMessages, setIsRealtimeRenderEnabled, setSideDrawerState, spaceId]);

  const handleToggleRealtimeRender = useCallback(async () => {
    if (realtimeRender.isActive) {
      realtimeRender.stop();
      setIsRealtimeRenderEnabled(false);
      setSideDrawerState("none");
      toast.success("已关闭实时渲染");
      return;
    }
    await startRealtimeRender();
  }, [realtimeRender, setIsRealtimeRenderEnabled, setSideDrawerState, startRealtimeRender]);

  useEffect(() => {
    const prevSideDrawerState = prevSideDrawerStateRef.current;
    prevSideDrawerStateRef.current = sideDrawerState;

    if (sideDrawerState !== "webgal" || prevSideDrawerState === "webgal") {
      return;
    }
    if (realtimeRender.isActive) {
      return;
    }
    void startRealtimeRender();
  }, [realtimeRender.isActive, sideDrawerState, startRealtimeRender]);

  useEffect(() => {
    if (realtimeRender.initProgress && realtimeRender.status === "initializing") {
      const { phase, message } = realtimeRender.initProgress;
      if (phase !== "ready" && phase !== "idle") {
        toast.loading(message, { id: "webgal-init" });
      }
    }
  }, [realtimeRender.initProgress, realtimeRender.status]);

  useEffect(() => {
    if (realtimeStatus !== "error") {
      return;
    }

    toast.error("实时渲染连接失败，请确认 WebGAL 已启动", { id: "webgal-error" });
    stopRealtimeRender();
    setIsRealtimeRenderEnabled(false);
    if (sideDrawerState === "webgal") {
      setSideDrawerState("none");
    }
    hasRenderedHistoryRef.current = false;
    lastRenderedMessageIdRef.current = null;
    lastBackgroundMessageIdRef.current = null;
  }, [realtimeStatus, stopRealtimeRender, setIsRealtimeRenderEnabled, sideDrawerState, setSideDrawerState]);

  const jumpToMessageInWebGAL = useCallback((messageId: number): boolean => {
    if (!realtimeRender.isActive) {
      return false;
    }
    return realtimeRender.jumpToMessage(messageId, roomId);
  }, [realtimeRender, roomId]);

  const updateAndRerenderMessageInWebGAL = useCallback(async (
    message: ChatMessageResponse,
    regenerateTTS: boolean = false,
  ): Promise<boolean> => {
    if (!realtimeRender.isActive) {
      return false;
    }
    return realtimeRender.updateAndRerenderMessage(message, roomId, regenerateTTS);
  }, [realtimeRender, roomId]);

  const rerenderHistoryInWebGAL = useCallback(async (
    messages?: ChatMessageResponse[],
  ): Promise<boolean> => {
    if (!realtimeRender.isActive) {
      return false;
    }
    if (isRenderingHistoryRef.current) {
      return false;
    }

    const messagesToRender = sortMessagesForRender(messages ?? orderedHistoryMessages);
    if (messagesToRender.length === 0) {
      return true;
    }

    isRenderingHistoryRef.current = true;
    try {
      toast.loading("正在同步 WebGAL 顺序...", { id: "webgal-rerender-history" });

      hasRenderedHistoryRef.current = false;
      lastRenderedMessageIdRef.current = null;
      lastBackgroundMessageIdRef.current = null;

      await realtimeRender.resetScene(roomId);
      await realtimeRender.renderHistory(messagesToRender, roomId);

      const lastMessage = messagesToRender[messagesToRender.length - 1];
      if (lastMessage) {
        lastRenderedMessageIdRef.current = lastMessage.message.messageId;
      }
      const backgroundMessages = messagesToRender
        .filter(msg => msg.message.messageType === 2
          && isImageMessageBackground(msg.message.annotations, msg.message.extra?.imageMessage));
      lastBackgroundMessageIdRef.current = backgroundMessages[backgroundMessages.length - 1]?.message.messageId ?? null;

      hasRenderedHistoryRef.current = true;
      prevHistoryOrderIdsRef.current = messagesToRender.map(m => m.message.messageId);
      prevHistoryUpdateTimeMapRef.current = new Map(messagesToRender.map(m => [m.message.messageId, m.message.updateTime]));
      toast.success("WebGAL 顺序已同步", { id: "webgal-rerender-history" });
      return true;
    }
    catch (error) {
      console.error("[RealtimeRender] 同步 WebGAL 顺序失败:", error);
      toast.error("WebGAL 顺序同步失败", { id: "webgal-rerender-history" });
      return false;
    }
    finally {
      isRenderingHistoryRef.current = false;
    }
  }, [orderedHistoryMessages, realtimeRender, roomId]);

  const scheduleFullRerender = useCallback(function scheduleFullRerenderInner(messages: ChatMessageResponse[]) {
    pendingFullRerenderRef.current = messages;
    clearFullRerenderTimer();
    fullRerenderTimerRef.current = setTimeout(() => {
      fullRerenderTimerRef.current = null;
      const pending = pendingFullRerenderRef.current;
      if (!pending || pending.length === 0) {
        pendingFullRerenderRef.current = null;
        return;
      }
      if (isRenderingHistoryRef.current) {
        scheduleFullRerenderInner(pending);
        return;
      }
      pendingFullRerenderRef.current = null;
      void rerenderHistoryInWebGAL(pending);
    }, 350);
  }, [clearFullRerenderTimer, rerenderHistoryInWebGAL]);

  const prevRealtimeSettingsRef = useRef({
    miniAvatarEnabled: realtimeMiniAvatarEnabled,
    autoFigureEnabled: realtimeAutoFigureEnabled,
  });

  useEffect(() => {
    return () => {
      clearFullRerenderTimer();
    };
  }, [clearFullRerenderTimer]);

  useEffect(() => {
    const prevSettings = prevRealtimeSettingsRef.current;
    const hasChanges = prevSettings.miniAvatarEnabled !== realtimeMiniAvatarEnabled
      || prevSettings.autoFigureEnabled !== realtimeAutoFigureEnabled;
    prevRealtimeSettingsRef.current = {
      miniAvatarEnabled: realtimeMiniAvatarEnabled,
      autoFigureEnabled: realtimeAutoFigureEnabled,
    };

    if (!hasChanges) {
      return;
    }
    if (!shouldRerenderForSettingsChange({
      hasChanges,
      isRealtimeActive: realtimeRender.isActive,
      hasHistoryMessages: Boolean(orderedHistoryMessages?.length),
      hasRenderedHistory: hasRenderedHistoryRef.current,
      isRenderingHistory: isRenderingHistoryRef.current,
    })) {
      return;
    }

    // 小头像/自动立绘设置变更时，全量重渲染已有消息
    scheduleFullRerender(orderedHistoryMessages);
  }, [orderedHistoryMessages, realtimeAutoFigureEnabled, realtimeMiniAvatarEnabled, realtimeRender.isActive, scheduleFullRerender]);

  useEffect(() => {
    if (!shouldProcessHistoryDelta({
      isRealtimeActive: realtimeRender.isActive,
      chatHistoryLoading,
      hasRenderedHistory: hasRenderedHistoryRef.current,
      isRenderingHistory: isRenderingHistoryRef.current,
      hasHistoryMessages: Boolean(orderedHistoryMessages?.length),
    })) {
      return;
    }

    const currentIds = orderedHistoryMessages.map(m => m.message.messageId);
    const prevIds = prevHistoryOrderIdsRef.current;
    const currentUpdateTimeMap = new Map(orderedHistoryMessages.map(m => [m.message.messageId, m.message.updateTime]));
    const prevUpdateTimeMap = prevHistoryUpdateTimeMapRef.current;

    if (!prevIds || prevIds.length === 0) {
      prevHistoryOrderIdsRef.current = currentIds;
      prevHistoryUpdateTimeMapRef.current = currentUpdateTimeMap;
      return;
    }

    const isSameOrder = prevIds.length === currentIds.length
      && prevIds.every((id, index) => currentIds[index] === id);

    if (isSameOrder) {
      prevHistoryOrderIdsRef.current = currentIds;
      prevHistoryUpdateTimeMapRef.current = currentUpdateTimeMap;

      // 顺序不变但消息发生更新（例如插入模式 position 计算后更新、编辑内容等）：统一走全量重建，避免“只更新最后一条”导致的不同步
      let hasAnyMessageChanged = false;
      for (const [messageId, updateTime] of currentUpdateTimeMap.entries()) {
        if (prevUpdateTimeMap.get(messageId) !== updateTime) {
          hasAnyMessageChanged = true;
          break;
        }
      }
      if (hasAnyMessageChanged) {
        scheduleFullRerender(orderedHistoryMessages);
      }
      return;
    }

    // 增量追加：如果只是尾部追加消息，则逐条追加渲染，避免每次都全量重建
    const isStrictPrefix = prevIds.length < currentIds.length
      && prevIds.every((id, index) => currentIds[index] === id);

    if (isStrictPrefix) {
      const appendedMessages = orderedHistoryMessages.slice(prevIds.length);
      appendedMessages.forEach((message) => {
        void realtimeRender.renderMessage(message, roomId);
      });
      const lastAppended = appendedMessages[appendedMessages.length - 1];
      if (lastAppended) {
        lastRenderedMessageIdRef.current = lastAppended.message.messageId;
      }
      prevHistoryOrderIdsRef.current = currentIds;
      prevHistoryUpdateTimeMapRef.current = currentUpdateTimeMap;
      return;
    }

    prevHistoryOrderIdsRef.current = currentIds;
    prevHistoryUpdateTimeMapRef.current = currentUpdateTimeMap;

    // 非追加场景（插入/删除/移动/重排）：统一按全量重建处理，确保脚本行顺序与跳转映射一致
    scheduleFullRerender(orderedHistoryMessages);
  }, [chatHistoryLoading, orderedHistoryMessages, realtimeRender, roomId, scheduleFullRerender]);

  const clearFigure = useCallback(() => {
    if (!realtimeRender.isActive) {
      return;
    }
    realtimeRender.clearFigure(roomId);
  }, [realtimeRender, roomId]);

  const clearBackground = useCallback(() => {
    if (!realtimeRender.isActive) {
      return;
    }
    realtimeRender.clearBackground(roomId);
  }, [realtimeRender, roomId]);

  const api = useMemo<RealtimeRenderOrchestratorApi>(() => {
    return {
      toggleRealtimeRender: handleToggleRealtimeRender,
      stopRealtimeRender,
      jumpToMessage: jumpToMessageInWebGAL,
      updateAndRerenderMessage: updateAndRerenderMessageInWebGAL,
      rerenderHistory: rerenderHistoryInWebGAL,
      clearFigure,
      clearBackground,
    };
  }, [clearBackground, clearFigure, handleToggleRealtimeRender, jumpToMessageInWebGAL, rerenderHistoryInWebGAL, stopRealtimeRender, updateAndRerenderMessageInWebGAL]);

  useEffect(() => {
    onApiChange(api);
  }, [api, onApiChange]);

  return null;
}
