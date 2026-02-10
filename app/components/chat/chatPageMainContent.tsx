import React from "react";
import { useSearchParams } from "react-router";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import SpaceDetailPanel from "@/components/chat/space/drawers/spaceDetailPanel";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import FriendsPage from "@/components/privateChat/FriendsPage";
import RightChatView from "@/components/privateChat/RightChatView";

export function ChatPageMainContent() {
  const { isSpaceDetailRoute } = useChatPageLayoutContext();

  return isSpaceDetailRoute ? <ChatPageSpaceDetailContent /> : <ChatPageChatContent />;
}

function ChatPageChatContent() {
  const {
    isPrivateChatMode,
    activeRoomId,
    setIsOpenLeftDrawer,
    activeSpaceId,
    targetMessageId,
  } = useChatPageLayoutContext();
  const [searchParams] = useSearchParams();
  const previewParam = searchParams.get("preview");
  const isPreviewMode = previewParam === "1" || previewParam === "true";

  if (isPrivateChatMode) {
    return activeRoomId
      ? (
          <RightChatView
            setIsOpenLeftDrawer={setIsOpenLeftDrawer}
          />
        )
      : (
          <FriendsPage
            setIsOpenLeftDrawer={setIsOpenLeftDrawer}
          />
        );
  }

  if (!activeSpaceId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <RoomWindow
      roomId={activeRoomId ?? -1}
      spaceId={activeSpaceId ?? -1}
      targetMessageId={targetMessageId}
      viewMode={isPreviewMode}
    />
  );
}

export function ChatPageSpaceDetailContent() {
  const { activeSpaceId, spaceDetailTab, closeSpaceDetailPanel } = useChatPageLayoutContext();

  if (!activeSpaceId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-auto flex justify-center">
        <SpaceDetailPanel activeTab={spaceDetailTab} onClose={closeSpaceDetailPanel} />
      </div>
    </div>
  );
}

export function ChatPageRoomSettingContent() {
  const { roomSettingState, closeRoomSettingPage } = useChatPageLayoutContext();

  if (!roomSettingState) {
    return null;
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-auto flex justify-center ">
        <RoomSettingWindow
          roomId={roomSettingState.roomId}
          onClose={closeRoomSettingPage}
          defaultTab={roomSettingState.tab}
        />
      </div>
    </div>
  );
}

export function ChatPageDocContent() {
  const {
    activeSpaceId,
    activeDocId,
    isKPInSpace,
    activeDocTitleForTcHeader,
    onDocTcHeaderChange,
  } = useChatPageLayoutContext();

  if (!activeSpaceId || !activeDocId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-hidden flex justify-center">
        {isKPInSpace
          ? (
              <div className="w-full h-full overflow-hidden bg-base-100 border border-base-300 rounded-box">
                <BlocksuiteDescriptionEditor
                  workspaceId={`space:${activeSpaceId ?? -1}`}
                  spaceId={activeSpaceId ?? -1}
                  docId={activeDocId}
                  variant="full"
                  tcHeader={{ enabled: true, fallbackTitle: activeDocTitleForTcHeader }}
                  onTcHeaderChange={onDocTcHeaderChange}
                  allowModeSwitch
                  fullscreenEdgeless
                />
              </div>
            )
          : (
              <div className="flex items-center justify-center w-full h-full font-bold">
                <span className="text-center">仅 KP 可查看文档</span>
              </div>
            )}
      </div>
    </div>
  );
}

export default ChatPageMainContent;
