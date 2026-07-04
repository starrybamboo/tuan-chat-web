import React, { useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { MessageDirectRecallRequest } from "api";

type PrivateContextMenuState = { messageId: number } | null;

type ContextMenuProps = {
  allMessages: any[];
  userId: number;
  contextMenu: PrivateContextMenuState;
  setContextMenu: (context: PrivateContextMenuState) => void;
  handleRevokeMessage: (messageId: MessageDirectRecallRequest) => void;
}

const MENU_GAP = 8;
const VIEWPORT_PADDING = 8;
const MENU_WIDTH = 160;
const MESSAGE_MENU_ANCHOR_SELECTOR = "data-private-message-menu-anchor";

export default function ContextMenu({
  allMessages,
  userId,
  contextMenu,
  setContextMenu,
  handleRevokeMessage,
}: ContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);

  const message = useMemo(() => {
    if (!contextMenu) {
      return null;
    }
    return allMessages.find(msg => msg.messageId === contextMenu.messageId);
  }, [allMessages, contextMenu]);

  useLayoutEffect(() => {
    if (!contextMenu || typeof document === "undefined") {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const messageElement = document.querySelector<HTMLElement>(
        `[${MESSAGE_MENU_ANCHOR_SELECTOR}="true"][data-message-id="${contextMenu.messageId}"]`,
      );
      if (!messageElement) {
        setMenuPosition(null);
        return;
      }

      const rect = messageElement.getBoundingClientRect();
      const menuHeight = 96;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let left = rect.right + MENU_GAP;
      let top = rect.top;

      if (left + MENU_WIDTH > viewportW - VIEWPORT_PADDING) {
        left = rect.left - MENU_GAP - MENU_WIDTH;
      }

      if (left < VIEWPORT_PADDING) {
        left = Math.max(VIEWPORT_PADDING, viewportW - MENU_WIDTH - VIEWPORT_PADDING);
      }

      top = Math.min(top, viewportH - menuHeight - VIEWPORT_PADDING);
      top = Math.max(VIEWPORT_PADDING, top);

      setMenuPosition({ left, top });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [contextMenu]);

  if (!contextMenu || typeof document === "undefined" || !menuPosition) {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-50 rounded-md bg-base-100 shadow-lg"
      style={{ top: menuPosition.top, left: menuPosition.left }}
    >
      <ul className="menu w-40 p-2">
        {message?.senderId === userId && (
          <li>
            <button
              type="button"
              onClick={() => {
                handleRevokeMessage({ messageId: contextMenu.messageId });
                setContextMenu(null);
              }}
            >
              撤回
            </button>
          </li>
        )}
        <li>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
            }}
          >
            回复
          </button>
        </li>
      </ul>
    </div>,
    document.body,
  );
}
