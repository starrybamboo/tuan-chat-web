import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";

import type { UserRole } from "../../../../api";

type UseRoomInputControllerParams = {
  roomId: number;
};

type UseRoomInputControllerResult = {
  chatInputRef: React.RefObject<ChatInputAreaHandle | null>;
  atMentionRef: React.RefObject<AtMentionHandle | null>;
  captureInputDraft: () => RoomInputDraft;
  handleInputAreaChange: (plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => void;
  restoreInputDraft: (draft: RoomInputDraft) => void;
  setRoomDraftPersistenceEnabled: (enabled: boolean) => void;
  setInputText: (text: string) => void;
  handleSelectCommand: (cmdName: string) => void;
};

export type RoomInputSnapshot = {
  plainText: string;
  textWithoutMentions: string;
  mentionedRoles: UserRole[];
};

export type RoomInputDraft = {
  editorHtml: string;
  snapshot: RoomInputSnapshot;
};

const roomInputDrafts = new Map<number, RoomInputDraft>();

function isEmptyInputSnapshot(snapshot: RoomInputSnapshot): boolean {
  return snapshot.plainText === ""
    && snapshot.textWithoutMentions === ""
    && snapshot.mentionedRoles.length === 0;
}

function saveRoomInputDraft(roomId: number, draft: RoomInputDraft): void {
  if (draft.editorHtml === "" && isEmptyInputSnapshot(draft.snapshot)) {
    roomInputDrafts.delete(roomId);
    return;
  }
  roomInputDrafts.set(roomId, draft);
}

export default function useRoomInputController({
  roomId,
}: UseRoomInputControllerParams): UseRoomInputControllerResult {
  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);
  const roomDraftPersistenceEnabledRef = useRef(true);

  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    const snapshot = {
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    };
    useChatInputUiStore.getState().setSnapshot(snapshot);
    if (roomDraftPersistenceEnabledRef.current) {
      saveRoomInputDraft(roomId, {
        editorHtml: chatInputRef.current?.getRawElement()?.innerHTML ?? "",
        snapshot,
      });
    }
    atMentionRef.current?.onInput();
  }, [roomId]);

  const captureInputDraft = useCallback((): RoomInputDraft => {
    const {
      plainText,
      textWithoutMentions,
      mentionedRoles,
    } = useChatInputUiStore.getState();
    return {
      editorHtml: chatInputRef.current?.getRawElement()?.innerHTML ?? "",
      snapshot: {
        plainText,
        textWithoutMentions,
        mentionedRoles,
      },
    };
  }, []);

  const restoreInputDraft = useCallback((draft: RoomInputDraft) => {
    chatInputRef.current?.setContent(draft.editorHtml, { moveCursorToEnd: false });
    useChatInputUiStore.getState().setSnapshot(draft.snapshot);
    if (roomDraftPersistenceEnabledRef.current) {
      saveRoomInputDraft(roomId, draft);
    }
  }, [roomId]);

  const setRoomDraftPersistenceEnabled = useCallback((enabled: boolean) => {
    roomDraftPersistenceEnabledRef.current = enabled;
  }, []);

  const setInputText = useCallback((text: string) => {
    chatInputRef.current?.setContent(text);
    chatInputRef.current?.triggerSync();
  }, []);

  useLayoutEffect(() => {
    roomDraftPersistenceEnabledRef.current = true;
    resetChatComposer();
    const draft = roomInputDrafts.get(roomId);
    if (draft) {
      chatInputRef.current?.setContent(draft.editorHtml, { moveCursorToEnd: false });
      useChatInputUiStore.getState().setSnapshot(draft.snapshot);
    }
    else {
      resetChatInputUi();
      chatInputRef.current?.setContent("", { moveCursorToEnd: false });
    }
  }, [resetChatComposer, resetChatInputUi, roomId]);

  useEffect(() => {
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatComposer, resetChatInputUi]);

  const handleSelectCommand = useCallback((cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || ".";
    setInputText(`${prefixChar}${cmdName} `);
  }, [setInputText]);

  return {
    chatInputRef,
    atMentionRef,
    captureInputDraft,
    handleInputAreaChange,
    handleSelectCommand,
    restoreInputDraft,
    setRoomDraftPersistenceEnabled,
    setInputText,
  };
}
