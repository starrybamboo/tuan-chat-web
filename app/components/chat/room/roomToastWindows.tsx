import React from "react";
import { AddNpcRoleWindow } from "@/components/chat/window/addNpcRoleWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface RoomToastWindowsProps {
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (open: boolean) => void;
  handleAddRole: (roleId: number) => void;
  isNpcRoleHandleOpen: boolean;
  setIsNpcRoleAddWindowOpen: (open: boolean) => void;
  handleAddNpcRole: (roleId: number) => void;

  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (open: boolean) => void;
}

export default function RoomToastWindows({
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isNpcRoleHandleOpen,
  setIsNpcRoleAddWindowOpen,
  handleAddNpcRole,
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
        isOpen={isNpcRoleHandleOpen}
        onClose={() => setIsNpcRoleAddWindowOpen(false)}
      >
        <AddNpcRoleWindow handleAddRole={handleAddNpcRole}></AddNpcRoleWindow>
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
