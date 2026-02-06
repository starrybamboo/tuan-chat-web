import { useCallback, useRef } from "react";

import type { RealtimeRenderOrchestratorApi } from "@/components/chat/core/realtimeRenderOrchestrator";

import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";

import type { ChatMessageResponse } from "../../../../api";

type UseRealtimeRenderControlsResult = {
  isRealtimeRenderActive: boolean;
  handleRealtimeRenderApiChange: (api: RealtimeRenderOrchestratorApi) => void;
  handleToggleRealtimeRender: () => Promise<void>;
  jumpToMessageInWebGAL: (messageId: number) => boolean;
  updateAndRerenderMessageInWebGAL: (message: ChatMessageResponse, regenerateTTS?: boolean) => Promise<boolean>;
  rerenderHistoryInWebGAL: (messages?: ChatMessageResponse[]) => Promise<boolean>;
  clearFigure: () => void;
};

export default function useRealtimeRenderControls(): UseRealtimeRenderControlsResult {
  const realtimeRenderApiRef = useRef<RealtimeRenderOrchestratorApi | null>(null);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);

  const handleRealtimeRenderApiChange = useCallback((api: RealtimeRenderOrchestratorApi) => {
    realtimeRenderApiRef.current = api;
  }, []);

  const handleToggleRealtimeRender = useCallback(async () => {
    await realtimeRenderApiRef.current?.toggleRealtimeRender();
  }, []);

  const jumpToMessageInWebGAL = useCallback((messageId: number): boolean => {
    return realtimeRenderApiRef.current?.jumpToMessage(messageId) ?? false;
  }, []);

  const updateAndRerenderMessageInWebGAL = useCallback(async (
    message: ChatMessageResponse,
    regenerateTTS: boolean = false,
  ): Promise<boolean> => {
    return await realtimeRenderApiRef.current?.updateAndRerenderMessage(message, regenerateTTS) ?? false;
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
    handleRealtimeRenderApiChange,
    handleToggleRealtimeRender,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
    clearFigure,
  };
}
