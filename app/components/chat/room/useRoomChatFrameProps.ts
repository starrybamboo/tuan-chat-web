import type { ComponentProps } from "react";

import { useMemo } from "react";

import type ChatFrame from "@/components/chat/chatFrame";

type ChatFrameProps = ComponentProps<typeof ChatFrame>;

type UseRoomChatFramePropsParams = Pick<
  ChatFrameProps,
  "virtuosoRef" | "onBackgroundUrlChange" | "onEffectChange" | "onExecuteCommandRequest" | "onSendDocCard"
>;

export default function useRoomChatFrameProps({
  virtuosoRef,
  onBackgroundUrlChange,
  onEffectChange,
  onExecuteCommandRequest,
  onSendDocCard,
}: UseRoomChatFramePropsParams): ChatFrameProps {
  return useMemo(() => ({
    virtuosoRef,
    onBackgroundUrlChange,
    onEffectChange,
    onExecuteCommandRequest,
    onSendDocCard,
  }), [
    virtuosoRef,
    onBackgroundUrlChange,
    onEffectChange,
    onExecuteCommandRequest,
    onSendDocCard,
  ]);
}
