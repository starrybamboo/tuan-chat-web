import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";
import type { ChatMessageResponse, Role, Room } from "api";

import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import useRealtimeRender from "@/webGAL/useRealtimeRender";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";

export interface RealtimeRenderOrchestratorApi {
  toggleRealtimeRender: () => Promise<void>;
  stopRealtimeRender: () => void;
  jumpToMessage: (messageId: number) => boolean;
  updateAndRerenderMessage: (message: ChatMessageResponse, regenerateTTS?: boolean) => Promise<boolean>;
  clearFigure: () => void;
  clearBackground: () => void;
}

interface Props {
  spaceId: number;
  roomId: number;
  room: Room | undefined;
  roomRoles: Role[];
  historyMessages: ChatMessageResponse[];
  chatHistoryLoading: boolean;
  onApiChange: (api: RealtimeRenderOrchestratorApi) => void;
}

export default function RealtimeRenderOrchestrator({
  spaceId,
  roomId,
  room,
  roomRoles,
  historyMessages,
  chatHistoryLoading,
  onApiChange,
}: Props) {
  const isRealtimeRenderEnabled = useRealtimeRenderStore(state => state.enabled);
  const setIsRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);

  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const sideDrawerStateRef = useRef<SideDrawerState>(sideDrawerState);
  useEffect(() => {
    sideDrawerStateRef.current = sideDrawerState;
  }, [sideDrawerState]);

  const realtimeTTSEnabled = useRealtimeRenderStore(state => state.ttsEnabled);
  const realtimeMiniAvatarEnabled = useRealtimeRenderStore(state => state.miniAvatarEnabled);
  const realtimeAutoFigureEnabled = useRealtimeRenderStore(state => state.autoFigureEnabled);
  const ttsApiUrl = useRealtimeRenderStore(state => state.ttsApiUrl);

  const defaultFigurePositionMap = useRoomPreferenceStore(state => state.defaultFigurePositionMap);

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
    enabled: isRealtimeRenderEnabled,
    roles: roomRoles,
    rooms: room ? [room] : [],
    ttsConfig: realtimeTTSConfig,
    miniAvatarEnabled: realtimeMiniAvatarEnabled,
    autoFigureEnabled: realtimeAutoFigureEnabled,
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
  const realtimeStatusRef = useRef(realtimeRender.status);
  const prevRoomIdRef = useRef<number | null>(null);
  const lastBackgroundMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    realtimeStatusRef.current = realtimeRender.status;
  }, [realtimeRender.status]);

  const isRenderingHistoryRef = useRef(false);
  const renderHistoryMessages = useCallback(async () => {
    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    if (realtimeStatusRef.current !== "connected") {
      console.warn(`[RealtimeRender] 渲染器尚未就绪，当前状态: ${realtimeStatusRef.current}`);
      return;
    }

    isRenderingHistoryRef.current = true;
    try {
      console.warn(`[RealtimeRender] 开始渲染历史消息, 共 ${historyMessages.length} 条`);
      toast.loading(`正在渲染历史消息...`, { id: "webgal-history" });

      const messagesToRender = historyMessages;

      await realtimeRender.renderHistory(messagesToRender, roomId);

      const lastMessage = messagesToRender[messagesToRender.length - 1];
      if (lastMessage) {
        lastRenderedMessageIdRef.current = lastMessage.message.messageId;
      }
      hasRenderedHistoryRef.current = true;
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
  }, [historyMessages, realtimeRender, roomId]);

  useEffect(() => {
    if (prevRoomIdRef.current === null) {
      prevRoomIdRef.current = roomId;
      return;
    }

    if (prevRoomIdRef.current !== roomId) {
      prevRoomIdRef.current = roomId;
      setIsRealtimeRenderEnabled(false);
      hasRenderedHistoryRef.current = false;
      lastRenderedMessageIdRef.current = null;
      isRenderingHistoryRef.current = false;
      lastBackgroundMessageIdRef.current = null;
      if (sideDrawerState === "webgal") {
        setSideDrawerState("none");
      }
    }
  }, [roomId, setIsRealtimeRenderEnabled, sideDrawerState, setSideDrawerState]);

  useEffect(() => {
    if (!realtimeRender.isActive || realtimeRender.status !== "connected" || hasRenderedHistoryRef.current || isRenderingHistoryRef.current) {
      return;
    }
    if (!historyMessages || historyMessages.length === 0 || chatHistoryLoading) {
      return;
    }
    if (!room) {
      return;
    }

    renderHistoryMessages();
  }, [realtimeRender.isActive, realtimeRender.status, historyMessages, chatHistoryLoading, room, renderHistoryMessages]);

  useEffect(() => {
    if (!realtimeRender.isActive) {
      hasRenderedHistoryRef.current = false;
      lastRenderedMessageIdRef.current = null;
      isRenderingHistoryRef.current = false;
      lastBackgroundMessageIdRef.current = null;
      return;
    }

    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    if (!hasRenderedHistoryRef.current) {
      return;
    }

    const latestMessage = historyMessages[historyMessages.length - 1];
    if (!latestMessage) {
      return;
    }

    const messageId = latestMessage.message.messageId;
    if (lastRenderedMessageIdRef.current === messageId) {
      return;
    }

    realtimeRender.renderMessage(latestMessage, roomId);
    lastRenderedMessageIdRef.current = messageId;
  }, [historyMessages, realtimeRender, roomId, defaultFigurePositionMap]);

  useEffect(() => {
    if (!realtimeRender.isActive || !hasRenderedHistoryRef.current) {
      return;
    }

    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    const backgroundMessages = historyMessages
      .filter(msg => msg.message.messageType === 2 && msg.message.extra?.imageMessage?.background);

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
  }, [historyMessages, realtimeRender, roomId]);

  const handleToggleRealtimeRender = useCallback(async () => {
    if (realtimeRender.isActive) {
      realtimeRender.stop();
      setIsRealtimeRenderEnabled(false);
      setSideDrawerState("none");
      toast.success("已关闭实时渲染");
      return;
    }

    launchWebGal();

    toast.loading("正在启动 WebGAL...", { id: "webgal-init" });
    try {
      await pollPort(
        Number((import.meta.env.VITE_TERRE_URL as string).split(":").pop()),
        isElectronEnv() ? 15000 : 500,
        100,
      );

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
    catch {
      toast.error("WebGAL 启动超时", { id: "webgal-init" });
      setIsRealtimeRenderEnabled(false);
    }
  }, [realtimeRender, setIsRealtimeRenderEnabled, setSideDrawerState, renderHistoryMessages]);

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
      clearFigure,
      clearBackground,
    };
  }, [clearBackground, clearFigure, handleToggleRealtimeRender, jumpToMessageInWebGAL, stopRealtimeRender, updateAndRerenderMessageInWebGAL]);

  useEffect(() => {
    onApiChange(api);
  }, [api, onApiChange]);

  return null;
}
