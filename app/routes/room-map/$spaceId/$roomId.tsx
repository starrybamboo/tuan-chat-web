import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { createFileRoute, useParams } from "@tanstack/react-router";
import { tuanchat } from "api/instance";

import { useCallback, useMemo } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useChatHistory } from "@/components/chat/infra/localDb/useChatHistory";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import { StateRuntimeProvider } from "@/components/chat/state/stateRuntimeContext";

export const Route = createFileRoute("/room-map/$spaceId/$roomId")({
  component: RoomMapFrameRoute,
});

function RoomMapFrameRoute() {
  const params = useParams({ strict: false });
  const roomId = useMemo(() => Number(params.roomId), [params.roomId]);
  const chatHistory = useChatHistory(Number.isFinite(roomId) && roomId > 0 ? roomId : null);
  const sendMessageWithInsert = useCallback(async (request: ChatMessageRequest): Promise<Message | null> => {
    const response = await tuanchat.chatController.sendMessage1(request);
    const message = response?.data ?? null;
    if (message) {
      await chatHistory.addOrUpdateMessage({ message } as Parameters<typeof chatHistory.addOrUpdateMessage>[0]);
    }
    return message;
  }, [chatHistory]);
  const roomContextValue = useMemo(() => ({
    roomId,
    roomMembers: [],
    roomRolesThatUserOwn: [],
    roomAllRoles: [],
    curRoleId: -1,
    curAvatarId: -1,
    chatHistory,
    sendMessageWithInsert,
  }), [chatHistory, roomId, sendMessageWithInsert]);

  if (!Number.isFinite(roomId) || roomId <= 0) {
    return (
      <div className="
        w-full h-full flex items-center justify-center bg-base-200
      ">
        <span className="text-sm text-base-content/60">无效的房间ID</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-base-200">
      <RoomContext value={roomContextValue}>
        <StateRuntimeProvider
          messages={chatHistory.messages}
          ruleId={-1}
          currentRoleId={-1}
        >
          <DNDMap roomId={roomId} variant="frame" />
        </StateRuntimeProvider>
      </RoomContext>
    </div>
  );
}
