import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { ReactElement } from "react";

import * as ContextMenu from "zeego/context-menu";

export type DmMessageAction = "reply" | "copy" | "recall";

type DmMessageActionMenuProps = {
  children: ReactElement;
  currentUserId: number | null;
  message: MessageDirectResponse;
  onAction: (action: DmMessageAction, message: MessageDirectResponse) => void;
};

export function DmMessageActionMenu({ children, currentUserId, message, onAction }: DmMessageActionMenuProps) {
  if (message.status === 1) {
    return children;
  }

  const canRecall = typeof currentUserId === "number" && currentUserId === message.senderId;
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item key="reply" onSelect={() => onAction("reply", message)}>
          <ContextMenu.ItemTitle>回复</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key="copy" onSelect={() => onAction("copy", message)}>
          <ContextMenu.ItemTitle>复制</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        {canRecall
          ? (
              <ContextMenu.Item destructive key="recall" onSelect={() => onAction("recall", message)}>
                <ContextMenu.ItemTitle>撤回</ContextMenu.ItemTitle>
              </ContextMenu.Item>
            )
          : null}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
