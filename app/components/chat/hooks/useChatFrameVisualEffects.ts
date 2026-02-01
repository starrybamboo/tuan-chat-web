import { useEffect, useMemo, useState } from "react";

import type { ChatMessageResponse } from "../../../../api";

type UseChatFrameVisualEffectsParams = {
  enableEffects: boolean;
  historyMessages: ChatMessageResponse[];
  onBackgroundUrlChange?: (url: string | null) => void;
  onEffectChange?: (effectName: string | null) => void;
  virtuosoIndexToMessageIndex: (index: number) => number;
};

type UseChatFrameVisualEffectsResult = {
  setCurrentVirtuosoIndex: (index: number) => void;
};

export default function useChatFrameVisualEffects({
  enableEffects,
  historyMessages,
  onBackgroundUrlChange,
  onEffectChange,
  virtuosoIndexToMessageIndex,
}: UseChatFrameVisualEffectsParams): UseChatFrameVisualEffectsResult {
  const [currentVirtuosoIndex, setCurrentVirtuosoIndex] = useState(0);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  /**
   * 背景图片随聊天记录改变
   * 注意：已删除的消息（status === 1）不应该显示背景图片
   */
  const imgNode = useMemo(() => {
    if (!enableEffects) {
      return [];
    }
    return historyMessages
      .map((msg, index) => {
        return { index, imageMessage: msg.message.extra?.imageMessage, status: msg.message.status };
      })
      .filter(item => item.imageMessage && item.imageMessage.background && item.status !== 1);
  }, [enableEffects, historyMessages]);

  /**
   * 特效随聊天记录改变
   * 注意：已删除的消息（status === 1）不应该显示特效
   */
  const effectNode = useMemo(() => {
    if (!enableEffects) {
      return [];
    }
    return historyMessages
      .map((msg, index) => {
        return { index, effectMessage: msg.message.extra?.effectMessage, status: msg.message.status };
      })
      .filter(item => item.effectMessage && item.effectMessage.effectName && item.status !== 1);
  }, [enableEffects, historyMessages]);

  useEffect(() => {
    onBackgroundUrlChange?.(enableEffects ? currentBackgroundUrl : null);
  }, [currentBackgroundUrl, enableEffects, onBackgroundUrlChange]);

  useEffect(() => {
    onEffectChange?.(enableEffects ? currentEffect : null);
  }, [currentEffect, enableEffects, onEffectChange]);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Background URL
    let newBgUrl: string | null = null;

    // 找到最后一个清除背景的位置
    let lastClearIndex = -1;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex && effect.effectMessage?.effectName === "clearBackground") {
        lastClearIndex = effect.index;
      }
    }

    // 从清除背景之后（或从头）开始寻找新的背景图片
    for (const bg of imgNode) {
      if (bg.index <= currentMessageIndex && bg.index > lastClearIndex) {
        newBgUrl = bg.imageMessage?.url ?? null;
      }
      else if (bg.index > currentMessageIndex) {
        break;
      }
    }

    if (newBgUrl !== currentBackgroundUrl) {
      const id = setTimeout(() => setCurrentBackgroundUrl(newBgUrl), 0);
      return () => clearTimeout(id);
    }
  }, [enableEffects, currentVirtuosoIndex, imgNode, effectNode, virtuosoIndexToMessageIndex, currentBackgroundUrl]);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Effect
    let newEffect: string | null = null;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex) {
        newEffect = effect.effectMessage?.effectName ?? null;
      }
      else {
        break;
      }
    }
    if (newEffect !== currentEffect) {
      setCurrentEffect(newEffect);
    }
  }, [enableEffects, currentVirtuosoIndex, effectNode, virtuosoIndexToMessageIndex, currentEffect]);

  return { setCurrentVirtuosoIndex };
}
