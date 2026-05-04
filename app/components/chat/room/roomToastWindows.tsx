import React from "react";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

const LazyAddRoleWindow = React.lazy(async () => {
  const module = await import("@/components/chat/window/addRoleWindow");
  return { default: module.AddRoleWindow };
});

const LazyAddNpcRoleWindow = React.lazy(async () => {
  const module = await import("@/components/chat/window/addNpcRoleWindow");
  return { default: module.AddNpcRoleWindow };
});

interface RoomToastWindowsProps {
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (open: boolean) => void;
  handleAddRole: (roleId: number) => void;
  isNpcRoleHandleOpen: boolean;
  setIsNpcRoleAddWindowOpen: (open: boolean) => void;
  handleAddNpcRole: (roleId: number) => void;
}

export default function RoomToastWindows({
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isNpcRoleHandleOpen,
  setIsNpcRoleAddWindowOpen,
  handleAddNpcRole,
}: RoomToastWindowsProps) {
  return (
    <>
      <ToastWindow
        isOpen={isRoleHandleOpen}
        onClose={() => setIsRoleAddWindowOpen(false)}
      >
        {isRoleHandleOpen && (
          <React.Suspense fallback={<RoomToastWindowFallback />}>
            <LazyAddRoleWindow handleAddRole={handleAddRole}></LazyAddRoleWindow>
          </React.Suspense>
        )}
      </ToastWindow>

      <ToastWindow
        isOpen={isNpcRoleHandleOpen}
        onClose={() => setIsNpcRoleAddWindowOpen(false)}
      >
        {isNpcRoleHandleOpen && (
          <React.Suspense fallback={<RoomToastWindowFallback />}>
            <LazyAddNpcRoleWindow handleAddRole={handleAddNpcRole}></LazyAddNpcRoleWindow>
          </React.Suspense>
        )}
      </ToastWindow>
    </>
  );
}

function RoomToastWindowFallback() {
  return (
    <div className="flex min-h-40 w-full items-center justify-center text-base-content/60">
      <span className="loading loading-spinner loading-md"></span>
    </div>
  );
}
