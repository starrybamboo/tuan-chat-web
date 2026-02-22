import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { ANNOTATION_IDS, getSceneEffectAnnotationId } from "@/types/messageAnnotations";

import type { ChatMessageRequest } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type SetState<T> = (value: T | ((prev: T) => T)) => void;

type UseRoomEffectsControllerParams = {
  roomId: number;
  send: (message: ChatMessageRequest) => void;
  isRealtimeRenderActive: boolean;
  clearRealtimeFigure: () => void;
};

type UseRoomEffectsControllerResult = {
  backgroundUrl: string | null;
  displayedBgUrl: string | null;
  currentEffect: string | null;
  setBackgroundUrl: SetState<string | null>;
  setCurrentEffect: SetState<string | null>;
  handleSendEffect: (effectName: string) => void;
  handleClearBackground: () => void;
  handleClearFigure: () => void;
  handleStopBgmForAll: () => void;
};

export default function useRoomEffectsController({
  roomId,
  send,
  isRealtimeRenderActive,
  clearRealtimeFigure,
}: UseRoomEffectsControllerParams): UseRoomEffectsControllerResult {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [displayedBgUrl, setDisplayedBgUrl] = useState<string | null>(null);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  useEffect(() => {
    if (backgroundUrl) {
      const id = setTimeout(() => setDisplayedBgUrl(backgroundUrl), 0);
      return () => clearTimeout(id);
    }
  }, [backgroundUrl]);

  const handleSendEffect = useCallback((effectName: string) => {
    const effectAnnotation = getSceneEffectAnnotationId(effectName);
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: `[特效: ${effectName}]`,
      messageType: MessageType.EFFECT,
      ...(effectAnnotation ? { annotations: [effectAnnotation] } : {}),
      extra: {},
    });
  }, [roomId, send]);

  const handleClearBackground = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[清除背景]",
      messageType: MessageType.EFFECT,
      annotations: [ANNOTATION_IDS.BACKGROUND_CLEAR],
      extra: {},
    });
    toast.success("已清除背景");
  }, [roomId, send]);

  const handleClearFigure = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[清除立绘]",
      messageType: MessageType.EFFECT,
      annotations: [ANNOTATION_IDS.FIGURE_CLEAR],
      extra: {},
    });
    if (isRealtimeRenderActive) {
      clearRealtimeFigure();
    }
    toast.success("已清除立绘");
  }, [clearRealtimeFigure, isRealtimeRenderActive, roomId, send]);

  const handleStopBgmForAll = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[停止全员BGM]",
      messageType: MessageType.SYSTEM,
      extra: {},
    });
    toast.success("已发送停止全员BGM");
  }, [roomId, send]);

  return {
    backgroundUrl,
    displayedBgUrl,
    currentEffect,
    setBackgroundUrl,
    setCurrentEffect,
    handleSendEffect,
    handleClearBackground,
    handleClearFigure,
    handleStopBgmForAll,
  };
}
