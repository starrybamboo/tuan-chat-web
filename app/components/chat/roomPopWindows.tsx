import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import { PopWindow } from "@/components/common/popWindow";
import React from "react";

export interface RoomPopWindowsProps {
  spaceId: number;
  spaceAvatar?: string;
  roomId: number;
  onSelectRoom?: (roomId: number) => void;

  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (open: boolean) => void;
  handleAddRole: (roleId: number) => void;

  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (open: boolean) => void;
}

export default function RoomPopWindows({
  spaceId,
  spaceAvatar,
  roomId,
  onSelectRoom,
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isRenderWindowOpen,
  setIsRenderWindowOpen,
}: RoomPopWindowsProps) {
  const isThreadHandleOpen = useRoomUiStore(state => state.isCreateThreadOpen);
  const setIsThreadHandleOpen = useRoomUiStore(state => state.setIsCreateThreadOpen);

  return (
    <>
      {/* 创建子区(Thread) */}
      <PopWindow
        isOpen={isThreadHandleOpen}
        onClose={() => setIsThreadHandleOpen(false)}
      >
        <CreateRoomWindow
          spaceId={spaceId}
          spaceAvatar={spaceAvatar}
          parentRoomId={roomId}
          onSuccess={(newRoomId) => {
            if (newRoomId) {
              onSelectRoom?.(newRoomId);
            }
            setIsThreadHandleOpen(false);
          }}
        />
      </PopWindow>

      <PopWindow
        isOpen={isRoleHandleOpen}
        onClose={() => setIsRoleAddWindowOpen(false)}
      >
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>

      <PopWindow
        isOpen={isRenderWindowOpen}
        onClose={() => setIsRenderWindowOpen(false)}
      >
        <RenderWindow></RenderWindow>
      </PopWindow>
    </>
  );
}
