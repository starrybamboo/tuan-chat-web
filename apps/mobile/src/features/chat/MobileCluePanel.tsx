import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";

import { useQueryClient } from "@tanstack/react-query";
import { getClueFolderMeta, getClueFolderRoomName } from "@tuanchat/domain/clue-folder";
import { getClueCardRenderData } from "@tuanchat/domain/message-render-data";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { getMaxRoomMessageSyncId, markRoomSessionReadInCache, useUpdateRoomReadPositionMutation } from "@tuanchat/query";
import { useJoinPublicClueFolderMutation } from "@tuanchat/query/clue-folder";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { TextEnhanceRenderer } from "@/components/TextEnhanceRenderer";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";
import { buildEditedRoomMessage } from "@/features/messages/roomMessageEditPayload";
import { useDeleteRoomMessageMutation, useEditRoomMessageMutation } from "@/features/messages/useRoomMessageMutations";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";
import { useSendRoomMessageMutation } from "@/features/messages/useSendRoomMessageMutation";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import * as Clipboard from "@/lib/clipboard";
import { confirmAction } from "@/lib/confirm";

import type { MessageAction } from "./MessageActionMenu";

import { MessageActionMenu } from "./MessageActionMenu";
import { getErrorMessage } from "./mobileChatUtils";

const styles = StyleSheet.create({
  container: { flex: 1 },
  folderTabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  folderTab: {
    borderRadius: Radius.full,
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  list: { flex: 1 },
  listContent: {
    gap: Spacing.md,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  clueCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  editorSheet: {
    gap: Spacing.lg,
  },
  editorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  editorTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  editorInput: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    padding: Spacing.lg,
    textAlignVertical: "top",
  },
  editorActions: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "flex-end",
  },
  editorButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stateText: {
    fontSize: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
});

const CLUE_MESSAGES_STALE_TIME_MS = 60_000;
const CLUE_INITIAL_RENDER_COUNT = 10;
const CLUE_RENDER_BATCH_SIZE = 8;
const CLUE_WINDOW_SIZE = 7;

function getMessageKey(message: Message, index: number) {
  return `clue:${message.messageId ?? message.syncId ?? index}`;
}

function getClueText(message: Message) {
  return message.content?.trim() || "线索";
}

function buildClueCardSnapshot(message: Message) {
  if (message.messageType === MESSAGE_TYPE.CLUE_CARD) {
    return getClueCardRenderData(message.extra, message.content ?? "").snapshot;
  }

  return {
    messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
    content: message.content ?? "",
    ...(message.extra !== undefined ? { extra: message.extra } : {}),
  };
}

type MobileClueFolderMessagesProps = {
  currentUserId: number | null;
  currentRoleId: number | null;
  currentRoomId: number | null;
  currentRoomMessages: ChatMessageResponse[];
  folderRoom: Room;
  isKP: boolean;
};

function MobileClueFolderMessagesInner({ currentUserId, currentRoleId, currentRoomId, currentRoomMessages, folderRoom, isKP }: MobileClueFolderMessagesProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const roomId = folderRoom.roomId ?? null;
  const messagesQuery = useRoomMessagesQuery(roomId, {
    staleTime: CLUE_MESSAGES_STALE_TIME_MS,
  });
  const updateReadPosition = useUpdateRoomReadPositionMutation(mobileApiClient);
  const { editMessage } = useEditRoomMessageMutation(roomId);
  const { deleteMessage } = useDeleteRoomMessageMutation(roomId);
  const sendRoomMessageMutation = useSendRoomMessageMutation(currentRoomId, currentUserId ?? 0, currentRoomMessages);
  const [actionMenuMessage, setActionMenuMessage] = useState<Message | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const lastReadSyncIdRef = useRef(0);

  const messages = useMemo(() => {
    const next: Message[] = [];
    for (let index = messagesQuery.messages.length - 1; index >= 0; index -= 1) {
      const message = messagesQuery.messages[index]?.message;
      if (message && message.status !== 1) {
        next.push(message);
      }
    }
    return next;
  }, [messagesQuery.messages]);

  useEffect(() => {
    if (!roomId || roomId <= 0) {
      return;
    }
    const targetSyncId = getMaxRoomMessageSyncId(messagesQuery.messages);
    if (targetSyncId <= 0 || lastReadSyncIdRef.current === targetSyncId) {
      return;
    }
    lastReadSyncIdRef.current = targetSyncId;
    markRoomSessionReadInCache(queryClient, roomId, targetSyncId);
    updateReadPosition.mutate({ roomId, syncId: targetSyncId });
  }, [messagesQuery.messages, queryClient, roomId, updateReadPosition]);

  const closeEditor = useCallback(() => {
    setEditingMessage(null);
    setDraftContent("");
    setActionError(null);
  }, []);

  const handleAction = useCallback(async (action: MessageAction, message: Message) => {
    setActionMenuVisible(false);
    setActionError(null);
    if (action === "copy") {
      const text = message.content?.trim();
      if (text) {
        await Clipboard.setStringAsync(text);
      }
      return;
    }
    if (action === "edit") {
      setEditingMessage(message);
      setDraftContent(message.content ?? "");
      return;
    }
    if (action === "sendToRoom") {
      if (!currentRoomId || currentRoomId <= 0) {
        setActionError("未选择当前房间，无法发送线索。");
        return;
      }
      if (!isKP && (!currentRoleId || currentRoleId <= 0)) {
        setActionError("请先选择一个可发言角色，再发送线索。");
        return;
      }
      try {
        await sendRoomMessageMutation.sendRequest({
          content: "",
          extra: {
            clueMessage: {
              snapshot: buildClueCardSnapshot(message),
            },
          },
          messageType: MESSAGE_TYPE.CLUE_CARD,
          roomId: currentRoomId,
          ...(currentRoleId && currentRoleId > 0 ? { roleId: currentRoleId } : { customRoleName: "线索" }),
        });
      }
      catch (error) {
        setActionError(getErrorMessage(error, "发送线索失败。"));
      }
      return;
    }
    if (action === "delete") {
      const confirmed = await confirmAction({
        confirmText: "删除",
        destructive: true,
        message: "确定要删除这条线索吗？",
        title: "删除线索",
      });
      if (!confirmed || !message.messageId) {
        return;
      }
      try {
        await deleteMessage(message.messageId);
      }
      catch (error) {
        setActionError(getErrorMessage(error, "删除线索失败。"));
      }
    }
  }, [currentRoleId, currentRoomId, deleteMessage, isKP, sendRoomMessageMutation]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessage) {
      return;
    }
    const content = draftContent.trim();
    if (!content) {
      setActionError("线索内容不能为空。");
      return;
    }
    try {
      await editMessage({
        originalMessage: editingMessage,
        updatedMessage: buildEditedRoomMessage(editingMessage, content),
      });
      closeEditor();
    }
    catch (error) {
      setActionError(getErrorMessage(error, "保存线索失败。"));
    }
  }, [closeEditor, draftContent, editMessage, editingMessage]);

  const handleOpenActionMenu = useCallback((message: Message) => {
    setActionMenuMessage(message);
    setActionMenuVisible(true);
  }, []);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);

  const handleActionMenuAction = useCallback((action: MessageAction, message: Message) => {
    void handleAction(action, message);
  }, [handleAction]);

  const handleSaveEditPress = useCallback(() => {
    void handleSaveEdit();
  }, [handleSaveEdit]);

  const renderClueMessage = useCallback(({ item }: { item: Message }) => (
    <Pressable
      onPress={() => handleOpenActionMenu(item)}
      style={[styles.clueCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <TextEnhanceRenderer
        content={getClueText(item)}
        style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}
      />
      <MobileMessageMediaPreview
        compact
        content={item.content}
        extra={item.extra}
        messageType={item.messageType}
      />
    </Pressable>
  ), [handleOpenActionMenu, theme.backgroundElement, theme.border, theme.text]);

  const overlays = (
    <>
      {actionMenuVisible
        ? (
            <MessageActionMenu
              canAddClue={false}
              canMultiSelect={false}
              canReply={false}
              canSendToRoom
              currentUserId={currentUserId}
              hasHostPrivileges={isKP}
              message={actionMenuMessage}
              onAction={handleActionMenuAction}
              onClose={handleCloseActionMenu}
              visible
            />
          )
        : null}
      {editingMessage
        ? (
            <BottomSheetModal
              backgroundColor={theme.surface}
              handleColor={theme.border}
              maxHeight="70%"
              onClose={closeEditor}
              sheetStyle={styles.editorSheet}
              visible
            >
              <View style={styles.editorHeader}>
                <ThemedText style={[styles.editorTitle, { color: theme.text }]}>编辑线索</ThemedText>
                <Pressable
                  accessibilityLabel="取消编辑线索"
                  accessibilityRole="button"
                  onPress={closeEditor}
                  style={[styles.editorButton, { backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText type="smallBold" themeColor="textSecondary">取消</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityLabel="保存线索"
                  accessibilityRole="button"
                  onPress={handleSaveEditPress}
                  style={[styles.editorButton, { backgroundColor: theme.accentMuted }]}
                >
                  <ThemedText type="smallBold" themeColor="accent">保存</ThemedText>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="线索内容"
                multiline
                onChangeText={setDraftContent}
                placeholder="写下这条线索..."
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.editorInput,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={draftContent}
              />
              {actionError
                ? <ThemedText type="caption" style={{ color: theme.danger }}>{actionError}</ThemedText>
                : null}
            </BottomSheetModal>
          )
        : null}
    </>
  );

  if (messages.length > 0) {
    return (
      <>
        <FlatList
          data={messages}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyExtractor={getMessageKey}
          renderItem={renderClueMessage}
          initialNumToRender={CLUE_INITIAL_RENDER_COUNT}
          maxToRenderPerBatch={CLUE_RENDER_BATCH_SIZE}
          windowSize={CLUE_WINDOW_SIZE}
        />
        {actionError && !editingMessage
          ? <ThemedText style={styles.stateText} themeColor="textSecondary">{actionError}</ThemedText>
          : null}
        {overlays}
      </>
    );
  }

  if (messagesQuery.isPending) {
    return <ThemedText style={styles.stateText} themeColor="textSecondary">加载线索…</ThemedText>;
  }

  if (messagesQuery.isError) {
    return <ThemedText style={styles.stateText} themeColor="textSecondary">线索加载失败</ThemedText>;
  }

  return <ThemedText style={styles.stateText} themeColor="textSecondary">暂无线索</ThemedText>;
}

const MobileClueFolderMessages = memo(MobileClueFolderMessagesInner);

type MobileCluePanelProps = {
  clueRooms: Room[];
  currentUserId: number | null;
  currentRoleId: number | null;
  currentRoomId: number | null;
  currentRoomMessages: ChatMessageResponse[];
  isKP: boolean;
  spaceId: number | null;
};

function MobileCluePanelInner({ clueRooms, currentUserId, currentRoleId, currentRoomId, currentRoomMessages, isKP, spaceId }: MobileCluePanelProps) {
  const theme = useTheme();
  const visibleFolders = clueRooms;
  const [firstFolder] = visibleFolders;
  const [selectedFolderRoomId, setSelectedFolderRoomId] = useState<number | null>(firstFolder?.roomId ?? null);
  const joinPublicClueFolderMutation = useJoinPublicClueFolderMutation(mobileApiClient);
  const joinAttemptedSpaceIdRef = useRef<number | null>(null);
  const activeRoomId = visibleFolders.some(room => room.roomId === selectedFolderRoomId)
    ? selectedFolderRoomId
    : firstFolder?.roomId ?? null;
  const activeFolder = visibleFolders.find(room => room.roomId === activeRoomId) ?? firstFolder ?? null;
  const hasPublicFolder = visibleFolders.some(room => getClueFolderMeta(room)?.scope === "public");
  const handleSelectFolder = useCallback((roomId: number | null | undefined) => {
    setSelectedFolderRoomId(roomId ?? null);
  }, []);

  useEffect(() => {
    if (!spaceId || spaceId <= 0 || hasPublicFolder || joinAttemptedSpaceIdRef.current === spaceId) {
      return;
    }

    joinAttemptedSpaceIdRef.current = spaceId;
    void joinPublicClueFolderMutation.mutateAsync(spaceId)
      .catch(() => undefined);
  }, [hasPublicFolder, joinPublicClueFolderMutation, spaceId]);

  if (visibleFolders.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.stateText} themeColor="textSecondary">
          {joinPublicClueFolderMutation.isPending ? "同步公共线索…" : "暂无线索"}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.folderTabs, { borderBottomColor: theme.border }]}>
        {visibleFolders.map((room) => {
          const meta = getClueFolderMeta(room);
          const title = meta ? getClueFolderRoomName(meta.scope) : room.name?.trim() || "线索";
          const active = room.roomId === activeFolder?.roomId;
          return (
            <Pressable
              key={`clue-folder:${room.roomId ?? title}`}
              accessibilityLabel={title}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => handleSelectFolder(room.roomId)}
              style={[styles.folderTab, { backgroundColor: active ? theme.accentMuted : theme.backgroundElement }]}
            >
              <ThemedText
                numberOfLines={1}
                type="smallBold"
                themeColor={active ? "accent" : "textSecondary"}
              >
                {title}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {activeFolder
        ? (
            <MobileClueFolderMessages
              key={`clue-messages:${activeFolder.roomId ?? "unknown"}`}
              currentUserId={currentUserId}
              currentRoleId={currentRoleId}
              currentRoomId={currentRoomId}
              currentRoomMessages={currentRoomMessages}
              folderRoom={activeFolder}
              isKP={isKP}
            />
          )
        : <ThemedText style={styles.stateText} themeColor="textSecondary">暂无线索</ThemedText>}
    </View>
  );
}

export const MobileCluePanel = memo(MobileCluePanelInner);
