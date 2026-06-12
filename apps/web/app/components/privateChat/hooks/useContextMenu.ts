import { useState } from "react";

import type { MessageDirectRecallRequest } from "api";

import { useRecallMessageDirectMutation } from "api/hooks/MessageDirectQueryHooks";

export function useContextMenu({ refetch }: { refetch: () => void }) {
  /**
   * 右键菜单
   */
  const [contextMenu, setContextMenu] = useState<{ messageId: number } | null>(null);
  const recallMessageMutation = useRecallMessageDirectMutation();

  function handleRevokeMessage(messageId: MessageDirectRecallRequest) {
    recallMessageMutation.mutate(messageId, {
      onSuccess: () => {
        // 强制刷新消息列表
        refetch();
      },
    });
  }
  function handleContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const messageElement = target.closest("[data-message-id]");
    const messageId = Number(messageElement?.getAttribute("data-message-id"));
    if (messageId) {
      e.preventDefault();
      setContextMenu({ messageId });
    }
  }

  return { contextMenu, setContextMenu, handleContextMenu, handleRevokeMessage };
}
