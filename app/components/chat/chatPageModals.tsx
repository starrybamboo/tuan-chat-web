import React from "react";

import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import CreateSpaceWindow from "@/components/chat/window/createSpaceWindow";
import SpaceInvitePanel from "@/components/chat/space/spaceInvitePanel";
import { PopWindow } from "@/components/common/popWindow";

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
      
      <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
        <CreateSpaceWindow
          onSuccess={() => setIsSpaceHandleOpen(false)}
        />
      </PopWindow>
      
      <PopWindow
        isOpen={isCreateInCategoryOpen}
        onClose={closeCreateInCategory}
      >
        <div className="w-[min(720px,92vw)] p-6">
          <div className="mb-3">
            <div className="text-sm font-medium opacity-80 mb-2">闂佸憡甯楃粙鎴犵磽閹惧墎灏甸悹鍥皺閳?</div>
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
                  aria-label="闂佸憡甯楃粙鎴犵磽閹捐绠ｉ柛褎顨嗛敍?"
                />
                <div className="min-w-0">
                  <div className="font-medium">闂佸憡甯楃粙鎴犵磽閹捐绠ｉ柛褎顨嗛敍?</div>
                  <div className="text-xs opacity-70">闂佸憡甯楃粙鎴犵磽閹捐瑙﹂幖瀛樼箘缁愭鏌ゆ總澶夌盎濠殿喒鏅犲畷婵嬫偐閹绘帒姹查悷婊呭閹稿憡鏅堕悩璇茬闁糕剝鐟ㄩ～?</div>
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
                  aria-label="闂佸憡甯楃粙鎴犵磽閹捐妫橀柛銉ｅ妸閳?"
                />
                <div className="min-w-0">
                  <div className="font-medium">闂佸憡甯楃粙鎴犵磽閹捐妫橀柛銉ｅ妸閳?</div>
                  <div className="text-xs opacity-70">婵?KP 闂佸憡鐟崹浼村垂閸楃儐鍤?缂傚倸鍊归悧鐐垫椤愶箑妫橀柛銉ｅ妸閳?</div>
                </div>
              </label>
            </div>
          </div>

          {createInCategoryMode === "doc"
            ? (
                <div className="bg-base-200 p-4 rounded-lg">
                  <div className="text-sm font-medium opacity-80 mb-2">闂佸搫鍊稿ú锕傚Υ閸岀偛鍐€闁搞儺鍓﹂弳?</div>
                  <input
                    className="input input-bordered w-full mb-3"
                    value={createDocTitle}
                    onChange={(e) => {
                      setCreateDocTitle(e.target.value);
                    }}
                    placeholder="闁哄倻澧楅弸鍐浖?"
                  />
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={!isKPInSpace || !pendingCreateInCategoryId}
                    onClick={() => {
                      void createDocInSelectedCategory();
                    }}
                  >
                    闂佸憡甯楃粙鎴犵磽閹捐妫橀柛銉ｅ妸閳?
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
      </PopWindow>
      
      <PopWindow
        isOpen={inviteRoomId !== null}
        onClose={() => setInviteRoomId(null)}
      >
        <AddMemberWindow
          handleAddMember={onAddRoomMember}
          showSpace={true}
        />
      </PopWindow>
      
      <PopWindow
        isOpen={isMemberHandleOpen}
        onClose={() => {
          setIsMemberHandleOpen(false);
        }}
      >
        <SpaceInvitePanel
          onAddSpectator={onAddSpaceMember}
          onAddPlayer={onAddSpacePlayer}
        />
      </PopWindow>
    </>
  );
}
