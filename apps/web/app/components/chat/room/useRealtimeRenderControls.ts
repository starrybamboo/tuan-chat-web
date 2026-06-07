import { useCallback, useRef, useState } from "react";

import type { RealtimeRenderOrchestratorApi } from "@/components/chat/core/realtimeRenderOrchestrator";
import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";

import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";

import type { ChatMessageResponse } from "../../../../api";

type UseRealtimeRenderControlsResult = {
  isRealtimeRenderActive: boolean;
  shouldMountRealtimeRender: boolean;
  handleRealtimeRenderApiChange: (api: RealtimeRenderOrchestratorApi) => void;
  handleToggleRealtimeRender: () => Promise<void>;
  jumpToMessageInWebGAL: (messageId: number) => boolean;
  updateAndRerenderMessageInWebGAL: (
    previousMessage: ChatMessageResponse,
    message: ChatMessageResponse,
    regenerateTTS?: boolean,
  ) => Promise<boolean>;
  rerenderHistoryInWebGAL: (messages?: ChatMessageResponse[]) => Promise<boolean>;
  clearFigure: () => void;
};

type RealtimeRenderMountInput = {
  isActive: boolean;
  isEnabled: boolean;
  sideDrawerState: SideDrawerState;
  loadRequested: boolean;
};

export function shouldMountRealtimeRenderOrchestrator({
  isActive,
  isEnabled,
  sideDrawerState,
  loadRequested,
}: RealtimeRenderMountInput): boolean {
  return loadRequested || isActive || isEnabled || sideDrawerState === "webgal";
}

export default function useRealtimeRenderControls(): UseRealtimeRenderControlsResult {
  const realtimeRenderApiRef = useRef<RealtimeRenderOrchestratorApi | null>(null);
  const pendingToggleRef = useRef(false);
  const [loadRequested, setLoadRequested] = useState(false);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const isRealtimeRenderEnabled = useRealtimeRenderStore(state => state.enabled);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const shouldMountRealtimeRender = shouldMountRealtimeRenderOrchestrator({
    isActive: isRealtimeRenderActive,
    isEnabled: isRealtimeRenderEnabled,
    sideDrawerState,
    loadRequested,
  });

  const handleRealtimeRenderApiChange = useCallback((api: RealtimeRenderOrchestratorApi) => {
    realtimeRenderApiRef.current = api;
    if (!pendingToggleRef.current) {
      return;
    }
    pendingToggleRef.current = false;
    void api.toggleRealtimeRender();
  }, []);

  const handleToggleRealtimeRender = useCallback(async () => {
    const api = realtimeRenderApiRef.current;
    if (api) {
      await api.toggleRealtimeRender();
      return;
    }

    // The orchestrator is lazy-loaded so普通聊天室首屏不会拉起 WebGAL renderer。
    pendingToggleRef.current = true;
    setLoadRequested(true);
  }, []);

  const jumpToMessageInWebGAL = useCallback((messageId: number): boolean => {
    return realtimeRenderApiRef.current?.jumpToMessage(messageId) ?? false;
  }, []);

  const updateAndRerenderMessageInWebGAL = useCallback(async (
    previousMessage: ChatMessageResponse,
    message: ChatMessageResponse,
    regenerateTTS: boolean = false,
  ): Promise<boolean> => {
    return await realtimeRenderApiRef.current?.updateAndRerenderMessage(previousMessage, message, regenerateTTS) ?? false;
  }, []);

  const rerenderHistoryInWebGAL = useCallback(async (
    messages?: ChatMessageResponse[],
  ): Promise<boolean> => {
    return await realtimeRenderApiRef.current?.rerenderHistory(messages) ?? false;
  }, []);

  const clearFigure = useCallback(() => {
    realtimeRenderApiRef.current?.clearFigure();
  }, []);

  return {
    isRealtimeRenderActive,
    shouldMountRealtimeRender,
    handleRealtimeRenderApiChange,
    handleToggleRealtimeRender,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
    clearFigure,
  };
}
