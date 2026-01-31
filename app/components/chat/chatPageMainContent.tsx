import type {
  ChatDiscoverMode,
  ChatPageMainView,
  DocTcHeaderPayload,
  RoomSettingState,
  SpaceDetailTab,
} from "@/components/chat/chatPage.types";
import React from "react";

import DiscoverArchivedSpacesView from "@/components/chat/discover/discoverArchivedSpacesView";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import SpaceDetailPanel from "@/components/chat/space/drawers/spaceDetailPanel";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import FriendsPage from "@/components/privateChat/FriendsPage";
import RightChatView from "@/components/privateChat/RightChatView";

interface ChatPageMainContentProps {
  isPrivateChatMode: boolean;
  activeRoomId: number | null;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  mainView: ChatPageMainView;
  discoverMode: ChatDiscoverMode;
  activeSpaceId: number | null;
  spaceDetailTab: SpaceDetailTab;
  onCloseSpaceDetail: () => void;
  roomSettingState: RoomSettingState;
  onCloseRoomSetting: () => void;
  activeDocId: string | null;
  isKPInSpace: boolean;
  activeDocTitleForTcHeader: string;
  onDocTcHeaderChange: (payload: DocTcHeaderPayload) => void;
  targetMessageId: number | null;
}

export default function ChatPageMainContent({
  isPrivateChatMode,
  activeRoomId,
  setIsOpenLeftDrawer,
  mainView,
  discoverMode,
  activeSpaceId,
  spaceDetailTab,
  onCloseSpaceDetail,
  roomSettingState,
  onCloseRoomSetting,
  activeDocId,
  isKPInSpace,
  activeDocTitleForTcHeader,
  onDocTcHeaderChange,
  targetMessageId,
}: ChatPageMainContentProps) {
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

  return (
    <>
      {mainView === "discover"
        ? (
            <DiscoverArchivedSpacesView mode={discoverMode} />
          )
        : (
            activeSpaceId
              ? (
                  mainView === "spaceDetail"
                    ? (
                        <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                          <div className="w-full h-full overflow-auto flex justify-center">
                            <SpaceDetailPanel activeTab={spaceDetailTab} onClose={onCloseSpaceDetail} />
                          </div>
                        </div>
                      )
                    : (mainView === "roomSetting" && roomSettingState)
                        ? (
                            <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                              <div className="w-full h-full overflow-auto flex justify-center ">
                                <RoomSettingWindow
                                  roomId={roomSettingState.roomId}
                                  onClose={onCloseRoomSetting}
                                  defaultTab={roomSettingState.tab}
                                />
                              </div>
                            </div>
                          )
                        : activeDocId
                          ? (
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
                            )
                          : (
                              <RoomWindow
                                roomId={activeRoomId ?? -1}
                                spaceId={activeSpaceId ?? -1}
                                targetMessageId={targetMessageId}
                              />
                            )
                )
              : (
                  <div className="flex items-center justify-center w-full h-full font-bold">
                    <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
                  </div>
                )
          )}
    </>
  );
}
