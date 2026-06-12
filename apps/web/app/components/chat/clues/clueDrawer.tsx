import { use, useEffect, useMemo, useState } from "react";

import ClueFolderSidebar from "@/components/chat/clues/clueFolderSidebar";
import { partitionClueFolderRooms, PRIVATE_CLUE_FOLDER_NAME, PUBLIC_CLUE_FOLDER_NAME } from "@/components/chat/clues/clueRooms";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import SidebarSection from "@/components/chat/room/sidebarSection";
import { useClueReferenceNavigationStore } from "@/components/chat/stores/clueReferenceNavigationStore";
import { canManageMemberPermissions } from "@/components/chat/utils/memberPermissions";
import { useGlobalUserId } from "@/components/globalContextProvider";

import { useGetUserRoomsQuery } from "../../../../api/hooks/chatQueryHooks";

export default function ClueDrawer() {
  const spaceContext = use(SpaceContext);
  const currentUserId = useGlobalUserId();
  const spaceId = spaceContext.spaceId ?? -1;
  const roomsQuery = useGetUserRoomsQuery(spaceId);
  const rooms = roomsQuery.data?.data?.rooms;
  const navigationTarget = useClueReferenceNavigationStore(state => state.target);
  const canManagePublicClueMembers = Boolean(spaceContext.isSpaceOwner || canManageMemberPermissions(spaceContext.memberType));
  const { privateClueRoom, publicClueRoom } = useMemo(() => {
    return partitionClueFolderRooms(rooms ?? [], currentUserId);
  }, [currentUserId, rooms]);
  const [privateClueCreateRequestKey, setPrivateClueCreateRequestKey] = useState(0);
  const [publicClueCreateRequestKey, setPublicClueCreateRequestKey] = useState(0);
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({
    private: true,
    public: true,
  });

  const toggleExpanded = (key: "private" | "public") => {
    setExpandedByKey(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    const sourceRoomId = navigationTarget?.sourceRoomId;
    if (!sourceRoomId) {
      return;
    }
    if (privateClueRoom?.roomId === sourceRoomId && !expandedByKey.private) {
      setExpandedByKey(prev => ({ ...prev, private: true }));
    }
    if (publicClueRoom?.roomId === sourceRoomId && !expandedByKey.public) {
      setExpandedByKey(prev => ({ ...prev, public: true }));
    }
  }, [expandedByKey.private, expandedByKey.public, navigationTarget?.sourceRoomId, privateClueRoom?.roomId, publicClueRoom?.roomId]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-200">
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {roomsQuery.isLoading && (
          <div className="
            flex items-center gap-2 px-3 py-2 text-sm text-base-content/55
          ">
            <span className="loading loading-spinner loading-sm"></span>
            <span>正在加载线索...</span>
          </div>
        )}

        <div className="space-y-1">
          <SidebarSection
            title={PRIVATE_CLUE_FOLDER_NAME}
            isExpanded={expandedByKey.private}
            onToggleExpanded={() => toggleExpanded("private")}
            actionTitle="新建线索"
            onAction={() => setPrivateClueCreateRequestKey(key => key + 1)}
          >
            <ClueFolderSidebar
              canManagePublicClueMembers={canManagePublicClueMembers}
              createRequestKey={privateClueCreateRequestKey}
              clueRoom={privateClueRoom}
              currentUserId={currentUserId}
              onCreateRequestHandled={() => setPrivateClueCreateRequestKey(0)}
              scope="private"
              spaceId={spaceId}
              spaceMembers={spaceContext.spaceMembers}
            />
          </SidebarSection>

          <SidebarSection
            title={PUBLIC_CLUE_FOLDER_NAME}
            isExpanded={expandedByKey.public}
            onToggleExpanded={() => toggleExpanded("public")}
            actionTitle="新建线索"
            onAction={() => setPublicClueCreateRequestKey(key => key + 1)}
            withDivider
          >
            <ClueFolderSidebar
              canManagePublicClueMembers={canManagePublicClueMembers}
              createRequestKey={publicClueCreateRequestKey}
              clueRoom={publicClueRoom}
              currentUserId={currentUserId}
              onCreateRequestHandled={() => setPublicClueCreateRequestKey(0)}
              scope="public"
              spaceId={spaceId}
              spaceMembers={spaceContext.spaceMembers}
            />
          </SidebarSection>
        </div>
      </div>
    </div>
  );
}
