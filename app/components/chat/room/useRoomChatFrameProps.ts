import type { ComponentProps } from "react";

import { useMemo } from "react";

import type ChatFrame from "@/components/chat/chatFrame";

type ChatFrameProps = ComponentProps<typeof ChatFrame>;

type UseRoomChatFramePropsParams = Pick<
  ChatFrameProps,
  "virtuosoRef" | "onBackgroundUrlChange" | "onEffectChange" | "onExecuteCommandRequest"
>;

export default function useRoomChatFrameProps({
  virtuosoRef,
  onBackgroundUrlChange,
  onEffectChange,
  onExecuteCommandRequest,
}: UseRoomChatFramePropsParams): ChatFrameProps {
  return useMemo(() => ({
    virtuosoRef,
    onBackgroundUrlChange,
    onEffectChange,
    onExecuteCommandRequest,
  }), [
    virtuosoRef,
    onBackgroundUrlChange,
    onEffectChange,
    onExecuteCommandRequest,
  ]);
}
