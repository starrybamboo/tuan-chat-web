import { useCallback, useEffect, useRef } from "react";

import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import useAiRewrite from "@/components/chat/room/useAiRewrite";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";

import type { UserRole } from "../../../../api";

type UseRoomInputControllerParams = {
  roomId: number;
};

type UseRoomInputControllerResult = {
  chatInputRef: React.RefObject<ChatInputAreaHandle | null>;
  atMentionRef: React.RefObject<AtMentionHandle | null>;
  handleInputAreaChange: (plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => void;
  setInputText: (text: string) => void;
  handleSelectCommand: (cmdName: string) => void;
} & ReturnType<typeof useAiRewrite>;

export default function useRoomInputController({
  roomId,
}: UseRoomInputControllerParams): UseRoomInputControllerResult {
  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);

  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    useChatInputUiStore.getState().setSnapshot({
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    });
    atMentionRef.current?.onInput();
  }, []);

  const setInputText = useCallback((text: string) => {
    chatInputRef.current?.setContent(text);
    chatInputRef.current?.triggerSync();
  }, []);

  const aiRewrite = useAiRewrite({ chatInputRef, setInputText });

  useEffect(() => {
    resetChatInputUi();
    resetChatComposer();
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatComposer, resetChatInputUi, roomId]);

  const handleSelectCommand = useCallback((cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || ".";
    setInputText(`${prefixChar}${cmdName} `);
  }, [setInputText]);

  return {
    chatInputRef,
    atMentionRef,
    handleInputAreaChange,
    handleSelectCommand,
    setInputText,
    ...aiRewrite,
  };
}
