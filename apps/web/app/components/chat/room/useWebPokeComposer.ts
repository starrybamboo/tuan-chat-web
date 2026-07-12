import type { PokeTarget } from "@tuanchat/domain/poke-message";
import type { RefObject } from "react";

import { buildDefaultPokeContent } from "@tuanchat/domain/poke-message";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { RoomInputDraft } from "@/components/chat/room/useRoomInputController";
import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";

import { buildChatMentionContentHtml } from "@/components/chat/input/chatMentionNode";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";

import type { Message, UserRole } from "../../../../api";

import { readPokeTemplate, writePokeTemplate } from "./pokeTemplateStorage";

export type WebPokeComposerTarget = PokeTarget & {
  initiatorRole: UserRole;
  initiatorRoleId: number;
  initiatorRoleName: string;
  targetRole: UserRole;
};

type ComposerSnapshot = {
  annotations: string[];
  audioFile: File | null;
  emojiMetaByUrl: Record<string, {
    fileId?: number;
    width?: number;
    height?: number;
    mediaType?: string;
    size?: number;
    fileName?: string;
  }>;
  emojiUrls: string[];
  fileAttachments: File[];
  imgFiles: File[];
  tempAnnotationPreferenceSource: "image" | "audio" | null;
  tempAnnotations: string[];
};

type NormalComposerSnapshot = {
  composer: ComposerSnapshot;
  input: RoomInputDraft;
  insertAfterMessageId?: number;
  replyMessage?: Message;
};

type UseWebPokeComposerParams = {
  captureInputDraft: () => RoomInputDraft;
  chatInputRef: RefObject<ChatInputAreaHandle | null>;
  restoreInputDraft: (draft: RoomInputDraft) => void;
  roomId: number;
  roomUiStoreApi: RoomUiStoreApi;
  setInputText: (text: string) => void;
  setRoomDraftPersistenceEnabled: (enabled: boolean) => void;
  userId: number;
};

function captureComposerSnapshot(): ComposerSnapshot {
  const state = useChatComposerStore.getState();
  return {
    annotations: state.annotations,
    audioFile: state.audioFile,
    emojiMetaByUrl: state.emojiMetaByUrl,
    emojiUrls: state.emojiUrls,
    fileAttachments: state.fileAttachments,
    imgFiles: state.imgFiles,
    tempAnnotationPreferenceSource: state.tempAnnotationPreferenceSource,
    tempAnnotations: state.tempAnnotations,
  };
}

function restoreComposerSnapshot(snapshot: ComposerSnapshot): void {
  useChatComposerStore.setState({
    annotations: snapshot.annotations,
    audioFile: snapshot.audioFile,
    emojiMetaByUrl: snapshot.emojiMetaByUrl,
    emojiUrls: snapshot.emojiUrls,
    fileAttachments: snapshot.fileAttachments,
    imgFiles: snapshot.imgFiles,
    tempAnnotationPreferenceSource: snapshot.tempAnnotationPreferenceSource,
    tempAnnotations: snapshot.tempAnnotations,
  });
}

export default function useWebPokeComposer({
  captureInputDraft,
  chatInputRef,
  restoreInputDraft,
  roomId,
  roomUiStoreApi,
  setInputText,
  setRoomDraftPersistenceEnabled,
  userId,
}: UseWebPokeComposerParams) {
  const [target, setTarget] = useState<WebPokeComposerTarget | null>(null);
  const normalSnapshotRef = useRef<NormalComposerSnapshot | null>(null);
  const scopeKeyRef = useRef(`${roomId}:${userId}`);

  const clearPokeOnlyState = useCallback(() => {
    setTarget(null);
    normalSnapshotRef.current = null;
    setRoomDraftPersistenceEnabled(true);
  }, [setRoomDraftPersistenceEnabled]);

  const restoreNormalComposer = useCallback(() => {
    const snapshot = normalSnapshotRef.current;
    clearPokeOnlyState();
    if (!snapshot) {
      return;
    }
    restoreInputDraft(snapshot.input);
    restoreComposerSnapshot(snapshot.composer);
    const roomUiState = roomUiStoreApi.getState();
    roomUiState.setReplyMessage(snapshot.replyMessage);
    roomUiState.setInsertAfterMessageId(snapshot.insertAfterMessageId);
  }, [clearPokeOnlyState, restoreInputDraft, roomUiStoreApi]);

  const beginPoke = useCallback((nextTarget: WebPokeComposerTarget) => {
    if (!(nextTarget.targetRoleId > 0)) {
      return;
    }
    if (!normalSnapshotRef.current) {
      const roomUiState = roomUiStoreApi.getState();
      normalSnapshotRef.current = {
        composer: captureComposerSnapshot(),
        input: captureInputDraft(),
        insertAfterMessageId: roomUiState.insertAfterMessageId,
        replyMessage: roomUiState.replyMessage,
      };
    }

    setRoomDraftPersistenceEnabled(false);
    useChatComposerStore.getState().reset();
    const roomUiState = roomUiStoreApi.getState();
    roomUiState.setReplyMessage(undefined);
    roomUiState.setInsertAfterMessageId(undefined);
    setTarget(nextTarget);

    const template = readPokeTemplate(userId, nextTarget.targetRoleId)
      ?? buildDefaultPokeContent(nextTarget.initiatorRoleName, nextTarget.targetRoleName);
    setInputText(buildChatMentionContentHtml(template, [
      {
        role: nextTarget.initiatorRole,
        token: `@${nextTarget.initiatorRoleName}`,
      },
      {
        role: nextTarget.targetRole,
        token: `@${nextTarget.targetRoleName}`,
      },
    ]));
    requestAnimationFrame(() => {
      chatInputRef.current?.focus();
    });
  }, [
    captureInputDraft,
    chatInputRef,
    roomUiStoreApi,
    setInputText,
    setRoomDraftPersistenceEnabled,
    userId,
  ]);

  const completePokeSend = useCallback((content: string) => {
    if (!target) {
      return;
    }
    writePokeTemplate(userId, target.targetRoleId, content);
    restoreNormalComposer();
  }, [restoreNormalComposer, target, userId]);

  useEffect(() => {
    const nextScopeKey = `${roomId}:${userId}`;
    if (scopeKeyRef.current === nextScopeKey) {
      return;
    }
    scopeKeyRef.current = nextScopeKey;
    clearPokeOnlyState();
  }, [clearPokeOnlyState, roomId, userId]);

  return {
    beginPoke,
    cancelPoke: restoreNormalComposer,
    completePokeSend,
    pokeTarget: target,
  };
}
