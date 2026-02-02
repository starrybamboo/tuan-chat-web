import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiResultMessage, Message } from "../../../api";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { SpaceContextType } from "@/components/chat/core/spaceContext";
import { useCallback } from "react";
import toast from "react-hot-toast";

import { RoomContext } from "@/components/chat/core/roomContext";
import RoleChooser from "@/components/chat/input/roleChooser";
import toastWindow from "@/components/common/toastWindow/toastWindow";

interface UseChatFrameNarratorToggleParams {
  roomContext: RoomContextType;
  spaceContext: SpaceContextType;
  updateMessageMutation: UseMutationResult<ApiResultMessage, unknown, Message, unknown>;
}

const NARRATOR_PERMISSION_TOAST = "\u53EA\u6709KP\u53EF\u4EE5\u5207\u6362\u65C1\u767D";
const ROLE_CHOOSER_TITLE = "\u9009\u62E9\u89D2\u8272";

export default function useChatFrameNarratorToggle({
  roomContext,
  spaceContext,
  updateMessageMutation,
}: UseChatFrameNarratorToggleParams) {
  const applyUpdatedMessage = useCallback((messageId: number, response?: ApiResultMessage | null) => {
    if (!response?.data || !roomContext.chatHistory)
      return;

    const existingMessage = roomContext.chatHistory.messages.find(
      item => item.message.messageId === messageId,
    );
    if (!existingMessage)
      return;

    roomContext.chatHistory.addOrUpdateMessage({
      ...existingMessage,
      message: response.data,
    });
  }, [roomContext.chatHistory]);

  const handleToggleNarrator = useCallback((messageId: number) => {
    if (!spaceContext.isSpaceOwner) {
      toast.error(NARRATOR_PERMISSION_TOAST);
      return;
    }

    const messageEntry = roomContext.chatHistory?.messages.find(
      item => item.message.messageId === messageId,
    );
    const message = messageEntry?.message;
    if (!message)
      return;

    const isNarrator = !message.roleId || message.roleId <= 0;

    if (isNarrator) {
      toastWindow(onClose => (
        <RoomContext value={roomContext}>
          <div className="flex flex-col items-center gap-4">
            <div>{ROLE_CHOOSER_TITLE}</div>
            <RoleChooser
              handleRoleChange={(role) => {
                const newMessage = {
                  ...message,
                  roleId: role.roleId,
                  avatarId: roomContext.roomRolesThatUserOwn.find(r => r.roleId === role.roleId)?.avatarId ?? -1,
                };
                updateMessageMutation.mutate(newMessage, {
                  onSuccess: response => applyUpdatedMessage(messageId, response),
                });
                onClose();
              }}
              className="menu bg-base-100 rounded-box z-1 p-2 shadow-sm overflow-y-auto"
            />
          </div>
        </RoomContext>
      ));
      return;
    }

    updateMessageMutation.mutate({
      ...message,
      roleId: -1,
    }, {
      onSuccess: response => applyUpdatedMessage(messageId, response),
    });
  }, [applyUpdatedMessage, roomContext, spaceContext.isSpaceOwner, updateMessageMutation]);

  return { handleToggleNarrator };
}
