import React from "react";

import SpaceInvitePanel from "@/components/chat/space/spaceInvitePanel";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import CreateSpaceWindow from "@/components/chat/window/createSpaceWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface ChatPageModalsProps {
  isSpaceHandleOpen: boolean;
  setIsSpaceHandleOpen: (isOpen: boolean) => void;

  isCreateInCategoryOpen: boolean;
  closeCreateInCategory: () => void;
  createInCategoryMode: "room" | "doc";
  setCreateInCategoryMode: (mode: "room" | "doc") => void;
  isKPInSpace: boolean;
  createDocTitle: string;
  setCreateDocTitle: (title: string) => void;
  pendingCreateInCategoryId: string | null;
  createDocInSelectedCategory: () => void;
  activeSpaceId: number | null;
  activeSpaceAvatar?: string;
  onRoomCreated: (roomId?: number) => void;

  inviteRoomId: number | null;
  setInviteRoomId: (roomId: number | null) => void;
  onAddRoomMember: (userId: number) => void;

  isMemberHandleOpen: boolean;
  setIsMemberHandleOpen: (isOpen: boolean) => void;
  onAddSpaceMember: (userId: number) => void;
  onAddSpacePlayer: (userId: number) => void;
}

export default function ChatPageModals({
  isSpaceHandleOpen,
  setIsSpaceHandleOpen,
  isCreateInCategoryOpen,
  closeCreateInCategory,
  createInCategoryMode,
  setCreateInCategoryMode,
  isKPInSpace,
  createDocTitle,
  setCreateDocTitle,
  pendingCreateInCategoryId,
  createDocInSelectedCategory,
  activeSpaceId,
  activeSpaceAvatar,
  onRoomCreated,
  inviteRoomId,
  setInviteRoomId,
  onAddRoomMember,
  isMemberHandleOpen,
  setIsMemberHandleOpen,
  onAddSpaceMember,
  onAddSpacePlayer,
}: ChatPageModalsProps) {
  return (
    <>

      <ToastWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
        <CreateSpaceWindow
          onSuccess={() => setIsSpaceHandleOpen(false)}
        />
      </ToastWindow>

      <ToastWindow
        isOpen={isCreateInCategoryOpen}
        onClose={closeCreateInCategory}
      >
        <div className="w-[min(720px,92vw)] p-6">
          <div className="mb-3">
            <div className="text-sm font-medium opacity-80 mb-2">选择创建类型</div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 cursor-pointer ${createInCategoryMode === "room" ? "bg-base-200" : "bg-base-100"}`}
              >
                <input
                  type="radio"
                  name="create_in_category_mode"
                  className="radio radio-sm mt-1"
                  checked={createInCategoryMode === "room"}
                  onChange={() => setCreateInCategoryMode("room")}
                  aria-label="创建房间"
                />
                <div className="min-w-0">
                  <div className="font-medium">创建房间</div>
                  <div className="text-xs opacity-70">创建新的房间并放入当前分类</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 ${isKPInSpace ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${createInCategoryMode === "doc" ? "bg-base-200" : "bg-base-100"}`}
              >
                <input
                  type="radio"
                  name="create_in_category_mode"
                  className="radio radio-sm mt-1"
                  checked={createInCategoryMode === "doc"}
                  disabled={!isKPInSpace}
                  onChange={() => setCreateInCategoryMode("doc")}
                  aria-label="创建文档"
                />
                <div className="min-w-0">
                  <div className="font-medium">创建文档</div>
                  <div className="text-xs opacity-70">仅 KP 可创建文档，文档将放入当前分类</div>
                </div>
              </label>
            </div>
          </div>

          {createInCategoryMode === "doc"
            ? (
                <div className="bg-base-200 p-4 rounded-lg">
                  <div className="text-sm font-medium opacity-80 mb-2">文档标题</div>
                  <input
                    className="input input-bordered w-full mb-3"
                    value={createDocTitle}
                    onChange={(e) => {
                      setCreateDocTitle(e.target.value);
                    }}
                    placeholder="请输入文档标题"
                  />
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={!isKPInSpace || !pendingCreateInCategoryId}
                    onClick={() => {
                      void createDocInSelectedCategory();
                    }}
                  >
                    创建文档
                  </button>
                </div>
              )
            : (
                <CreateRoomWindow
                  spaceId={activeSpaceId || -1}
                  spaceAvatar={activeSpaceAvatar}
                  onSuccess={onRoomCreated}
                />
              )}
        </div>
      </ToastWindow>

      <ToastWindow
        isOpen={inviteRoomId !== null}
        onClose={() => setInviteRoomId(null)}
      >
        <AddMemberWindow
          handleAddMember={onAddRoomMember}
          showSpace={true}
        />
      </ToastWindow>

      <ToastWindow
        isOpen={isMemberHandleOpen}
        onClose={() => {
          setIsMemberHandleOpen(false);
        }}
      >
        <SpaceInvitePanel
          onAddSpectator={onAddSpaceMember}
          onAddPlayer={onAddSpacePlayer}
        />
      </ToastWindow>
    </>
  );
}
