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
      {/* 闁告帗绋戠紓鎾剁矚濞差亝锛熺€殿喗鎳撻崵顓犵玻濡も偓瑜?*/}
      <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
        <CreateSpaceWindow
          onSuccess={() => setIsSpaceHandleOpen(false)}
        />
      </PopWindow>
      {/* 闁告帗绋戠紓鎾诲箣閸ф锛熺€殿喗鎳撻崵顓犵玻濡も偓瑜?*/}
      <PopWindow
        isOpen={isCreateInCategoryOpen}
        onClose={closeCreateInCategory}
      >
        <div className="w-[min(720px,92vw)] p-6">
          <div className="mb-3">
            <div className="text-sm font-medium opacity-80 mb-2">闁告帗绋戠紓鎾剁尵鐠囪尙鈧?</div>
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
                  aria-label="闁告帗绋戠紓鎾诲箣閸ф锛?"
                />
                <div className="min-w-0">
                  <div className="font-medium">闁告帗绋戠紓鎾诲箣閸ф锛?</div>
                  <div className="text-xs opacity-70">闁告帗绋戠紓鎾诲触鎼存繄绐楅柤濂変簻婵晠宕濋悩鎻掑汲鐟滅増鎸告晶鐘诲礆閸℃瑨顫?</div>
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
                  aria-label="闁告帗绋戠紓鎾诲棘閸ャ劊鈧?"
                />
                <div className="min-w-0">
                  <div className="font-medium">闁告帗绋戠紓鎾诲棘閸ャ劊鈧?</div>
                  <div className="text-xs opacity-70">濞?KP 闁告瑯鍨伴崹鍗烆嚈?缂傚倹鐗炵欢顐﹀棘閸ャ劊鈧?</div>
                </div>
              </label>
            </div>
          </div>

          {createInCategoryMode === "doc"
            ? (
                <div className="bg-base-200 p-4 rounded-lg">
                  <div className="text-sm font-medium opacity-80 mb-2">闁哄倸娲﹂妴鍌炲冀閸ヮ剦鏆?</div>
                  <input
                    className="input input-bordered w-full mb-3"
                    value={createDocTitle}
                    onChange={(e) => {
                      setCreateDocTitle(e.target.value);
                    }}
                    placeholder="閺傜増鏋冨?"
                  />
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={!isKPInSpace || !pendingCreateInCategoryId}
                    onClick={() => {
                      void createDocInSelectedCategory();
                    }}
                  >
                    闁告帗绋戠紓鎾诲棘閸ャ劊鈧?
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
      {/* 闁规潙娼″Λ鍧楁焽閳ь剛鎷犳搴¤礋閻庣懓澧庨悰銉╁矗? */}
      <PopWindow
        isOpen={inviteRoomId !== null}
        onClose={() => setInviteRoomId(null)}
      >
        <AddMemberWindow
          handleAddMember={onAddRoomMember}
          showSpace={true}
        />
      </PopWindow>
      {/* 缂佸本妞藉Λ鍧楀箣閹邦剚鍠呴梺顓涘亾閻犲洭顥撻悰銉╁矗? */}
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
