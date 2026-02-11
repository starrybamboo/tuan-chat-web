import React from "react";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface RoomToastWindowsProps {
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (open: boolean) => void;
  handleAddRole: (roleId: number) => void;

  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (open: boolean) => void;
}

export default function RoomToastWindows({
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isRenderWindowOpen,
  setIsRenderWindowOpen,
}: RoomToastWindowsProps) {
  return (
    <>
      <ToastWindow
        isOpen={isRoleHandleOpen}
        onClose={() => setIsRoleAddWindowOpen(false)}
      >
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </ToastWindow>

      <ToastWindow
        isOpen={isRenderWindowOpen}
        onClose={() => setIsRenderWindowOpen(false)}
      >
        <RenderWindow></RenderWindow>
      </ToastWindow>
    </>
  );
}
