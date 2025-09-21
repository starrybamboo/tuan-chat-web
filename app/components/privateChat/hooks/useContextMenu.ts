import { useState } from "react";

import type { MessageDirectRecallRequest } from "api";

import { useRecallMessageDirectMutation } from "api/hooks/MessageDirectQueryHooks";

export function useContextMenu(directMessageQuery: any) {
  /**
   * 右键菜单
   */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number } | null>(null);
  const recallMessageMutation = useRecallMessageDirectMutation();
  function handleRevokeMessage(messageId: MessageDirectRecallRequest) {
    recallMessageMutation.mutate(messageId, {
      onSuccess: () => {
        // 强制刷新并清除缓存
        directMessageQuery.refetch();
      },
    });
  }
  function handleContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const messageElement = target.closest("[data-message-id]");
    const messageId = Number(messageElement?.getAttribute("data-message-id"));
    if (messageId) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, messageId });
    }
  }

  return { contextMenu, setContextMenu, handleContextMenu, handleRevokeMessage };
}
