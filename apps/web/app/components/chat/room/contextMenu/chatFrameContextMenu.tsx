import { use, useCallback, useEffect, useMemo, useRef } from "react";

import type { ClueFolderScope } from "@/components/chat/clues/clueRooms";

import { canCopyMessageToClueFolder } from "@/components/chat/clues/clueRooms";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import {
  isImageMessageMarkedAsBackground,
  isSoundMessageMarkedAsBgm,
} from "@/components/chat/room/contextMenu/messageMediaQuickActions";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Message } from "../../../../../api";

type ContextMenuProps = {
  contextMenu: { x: number; y: number; messageId: number } | null;
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  onClose: () => void;
  onDelete: () => void;
  onToggleSelection: (messageId: number) => void;
  onReply: (message: Message) => void;
  onEditMessage: (messageId: number) => void;
  onToggleBackground: (messageId: number) => void;
  onToggleBgm: (messageId: number) => void;
  onOpenAnnotations: (messageId: number) => void;
  onInsertAfter: (messageId: number) => void;
  onCopyMessageToClueFolder?: (message: Message, scope: ClueFolderScope) => void | Promise<void>;
  onToggleNarrator?: (messageId: number) => void;
}

type ContextMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
}

export default function ChatFrameContextMenu({
  contextMenu,
  historyMessages,
  selectedMessageIds,
  onClose,
  onDelete,
  onToggleSelection,
  onReply,
  onEditMessage,
  onToggleBackground,
  onToggleBgm,
  onOpenAnnotations,
  onInsertAfter,
  onCopyMessageToClueFolder,
}: ContextMenuProps) {
  const currentUserId = useGlobalUserId();
  const spaceContext = use(SpaceContext);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu || !menuRef.current) {
      return;
    }

    const menu = menuRef.current;
    const padding = 8;
    const menuWidth = menu.offsetWidth || menu.getBoundingClientRect().width;
    const menuHeight = menu.offsetHeight || menu.getBoundingClientRect().height;
    const maxLeft = Math.max(padding, window.innerWidth - menuWidth - padding);
    const maxTop = Math.max(padding, window.innerHeight - menuHeight - padding);

    const left = Math.min(Math.max(padding, contextMenu.x), maxLeft);
    const top = Math.min(Math.max(padding, contextMenu.y), maxTop);

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, [contextMenu]);

  const contextMenuMessageId = contextMenu?.messageId;
  const message = contextMenuMessageId
    ? historyMessages.find(message => message.message.messageId === contextMenuMessageId)
    : undefined;
  const canEditMessage = !!message && (message.message.userId === currentUserId || spaceContext.isSpaceOwner);
  const shouldDeleteSelectedMessages = Boolean(
    contextMenuMessageId
    && selectedMessageIds.size > 1
    && selectedMessageIds.has(contextMenuMessageId),
  );
  const canToggleBackground = canEditMessage
    && !!message?.message.extra?.imageMessage
    && message.message.messageType === MESSAGE_TYPE.IMG;
  const canToggleBgm = canEditMessage
    && !!message?.message.extra?.soundMessage
    && message.message.messageType === MESSAGE_TYPE.SOUND;
  const isBackgroundMessage = canToggleBackground && message
    ? isImageMessageMarkedAsBackground(message.message)
    : false;
  const isBgmMessage = canToggleBgm && message
    ? isSoundMessageMarkedAsBgm(message.message)
    : false;

  const canCopyClue = Boolean(
    onCopyMessageToClueFolder
    && message?.message
    && canCopyMessageToClueFolder(message.message),
  );

  const handleCopyClue = useCallback((scope: ClueFolderScope) => {
    if (!message?.message || !onCopyMessageToClueFolder) {
      return;
    }
    onClose();
    void onCopyMessageToClueFolder(message.message, scope);
  }, [message?.message, onClose, onCopyMessageToClueFolder]);

  const menuItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) {
      return [];
    }

    const items: ContextMenuItem[] = [
      {
        key: "select",
        label: "多选",
        onSelect: () => {
          onToggleSelection(contextMenu.messageId);
          onClose();
        },
      },
    ];

    if (message?.message) {
      items.push({
        key: "reply",
        label: "回复",
        onSelect: () => {
          onReply(message.message);
          onClose();
        },
      });
    }

    if (canEditMessage) {
      items.push(
        {
          key: "delete",
          label: shouldDeleteSelectedMessages ? `删除选中消息 (${selectedMessageIds.size})` : "删除",
          onSelect: () => {
            onDelete();
            onClose();
          },
        },
        {
          key: "annotations",
          label: "添加标注",
          onSelect: () => {
            onOpenAnnotations(contextMenu.messageId);
            onClose();
          },
        },
      );
    }

    if (canToggleBackground) {
      items.push({
        key: "toggle-background",
        label: isBackgroundMessage ? "取消背景" : "设置为背景",
        onSelect: () => {
          onToggleBackground(contextMenu.messageId);
          onClose();
        },
      });
    }

    if (canToggleBgm) {
      items.push({
        key: "toggle-bgm",
        label: isBgmMessage ? "取消BGM" : "设置为BGM",
        onSelect: () => {
          onToggleBgm(contextMenu.messageId);
          onClose();
        },
      });
    }

    if (canCopyClue) {
      items.push(
        {
          key: "copy-clue-private",
          label: "收藏到我的线索",
          onSelect: () => handleCopyClue("private"),
        },
        {
          key: "copy-clue-public",
          label: "收藏到公共线索",
          onSelect: () => handleCopyClue("public"),
        },
      );
    }

    items.push({
      key: "insert-after",
      label: "插入消息",
      onSelect: () => {
        onInsertAfter(contextMenu.messageId);
        onClose();
      },
    });

    const canEditText = canEditMessage
      && message
      && message.message.messageType !== MESSAGE_TYPE.WEBGAL_CHOOSE
      && message.message.messageType !== 2;
    if (canEditText) {
      items.push({
        key: "edit-text",
        label: "编辑文本",
        onSelect: () => {
          onEditMessage(contextMenu.messageId);
          onClose();
        },
      });
    }

    return items;
  }, [
    canCopyClue,
    canEditMessage,
    canToggleBackground,
    canToggleBgm,
    contextMenu,
    handleCopyClue,
    isBackgroundMessage,
    isBgmMessage,
    message,
    onClose,
    onDelete,
    onEditMessage,
    onInsertAfter,
    onOpenAnnotations,
    onReply,
    onToggleBackground,
    onToggleBgm,
    onToggleSelection,
    selectedMessageIds.size,
    shouldDeleteSelectedMessages,
  ]);
  if (!contextMenu)
    return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-base-100 shadow-lg rounded-md z-50"
    >
      <ul className="menu p-2 w-40">
        {menuItems.map(item => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
