import React from "react";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import { PopWindow } from "@/components/common/popWindow";

export interface RoomPopWindowsProps {
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (open: boolean) => void;
  handleAddRole: (roleId: number) => void;

  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (open: boolean) => void;
}

export default function RoomPopWindows({
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isRenderWindowOpen,
  setIsRenderWindowOpen,
}: RoomPopWindowsProps) {
  return (
    <>
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
