import React from "react";

import ChatStatusBar from "@/components/chat/chatStatusBar";
import AvatarDropdownContent from "@/components/chat/input/avatarDropdownContent";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { NarratorIcon } from "@/icons";

interface RoomComposerHeaderProps {
  roomId: number;
  userId: number;
  webSocketUtils: any;
  isSpectator: boolean;
  curRoleId: number;
  curAvatarId: number;
  displayRoleName: string;
  currentRoleName?: string;
  setCurRoleId: (roleId: number) => void;
  setCurAvatarId: (avatarId: number) => void;
  setDraftCustomRoleNameForRole: (roleId: number, name: string) => void;
  currentChatStatus: any;
  onChangeChatStatus: (status: any) => void;
  leftToolbar?: React.ReactNode;
  headerToolbar?: React.ReactNode;
}

export default function RoomComposerHeader({
  roomId,
  userId,
  webSocketUtils,
  isSpectator,
  curRoleId,
  curAvatarId,
  displayRoleName,
  currentRoleName,
  setCurRoleId,
  setCurAvatarId,
  setDraftCustomRoleNameForRole,
  currentChatStatus,
  onChangeChatStatus,
  leftToolbar,
  headerToolbar,
}: RoomComposerHeaderProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editingName, setEditingName] = React.useState("");
  const [isAvatarPopoverOpen, setIsAvatarPopoverOpen] = React.useState(false);
  const [isAvatarChooserFullscreen, setIsAvatarChooserFullscreen] = React.useState(false);
  const avatarPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const screenSize = useScreenSize();
  const isMobile = screenSize === "sm";
  const showSelfStatus = Boolean(currentChatStatus && !isSpectator);
  const showOtherStatus = React.useMemo(() => {
    const raw = (webSocketUtils?.chatStatus?.[roomId] ?? []) as { userId: number; status: "input" | "wait" | "leave" | "idle" }[];
    if (!raw.length) {
      return false;
    }
    const others = userId != null ? raw.filter(s => s.userId !== userId) : raw;
    return others.some(s => s.status === "input" || s.status === "wait" || s.status === "leave");
  }, [roomId, userId, webSocketUtils?.chatStatus]);

  React.useEffect(() => {
    setIsEditingName(false);
    setEditingName("");
  }, [curRoleId, isSpectator]);

  React.useEffect(() => {
    if (isSpectator) {
      setIsAvatarPopoverOpen(false);
    }
  }, [isSpectator]);

  React.useEffect(() => {
    if (!isAvatarPopoverOpen) {
      setIsAvatarChooserFullscreen(false);
    }
  }, [isAvatarPopoverOpen]);

  React.useEffect(() => {
    if (!isAvatarPopoverOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (avatarPopoverRef.current?.contains(target)) {
        return;
      }
      const modalRoot = document.getElementById("modal-root");
      if (modalRoot?.contains(target)) {
        return;
      }
      setIsAvatarPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAvatarPopoverOpen]);

  return (
    <div className="w-full border-b border-base-300 px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div ref={avatarPopoverRef} className="relative shrink-0">
            <button
              type="button"
              className={`flex items-center justify-center leading-none ${isSpectator ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
              aria-haspopup="dialog"
              aria-expanded={isAvatarPopoverOpen}
              onClick={() => {
                if (isSpectator) {
                  return;
                }
                setIsAvatarPopoverOpen((prev) => {
                  const next = !prev;
                  if (next && isMobile) {
                    setIsAvatarChooserFullscreen(true);
                  }
                  return next;
                });
              }}
            >
              {curRoleId <= 0
                ? (
                    curAvatarId > 0
                      ? (
                          <RoleAvatarComponent
                            avatarId={curAvatarId}
                            width={8}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                            useDefaultAvatarFallback={false}
                            alt="旁白"
                          />
                        )
                      : (
                          <div className="size-8 rounded-full bg-transparent flex items-center justify-center shrink-0">
                            <NarratorIcon className="size-5 text-base-content/60" />
                          </div>
                        )
                  )
                : (
                    <RoleAvatarComponent
                      avatarId={curAvatarId}
                      roleId={curRoleId}
                      width={8}
                      isRounded={true}
                      withTitle={false}
                      stopToastWindow={true}
                      alt={displayRoleName || "无头像"}
                    />
                  )}
            </button>
            {isAvatarPopoverOpen && !isSpectator && (
              <div
                className={isMobile
                  ? "fixed inset-x-2 top-14 bottom-2 z-[80] flex items-stretch"
                  : "absolute left-0 bottom-full mb-2 z-50 flex items-stretch"}
              >
                <div
                  className={`${isMobile
                    ? "w-full h-full"
                    : (isAvatarChooserFullscreen
                        ? "w-[92vw] md:w-[92vw] max-w-[92vw]"
                        : "w-[92vw] md:w-120 min-w-100 max-w-[92vw]")
                  } rounded-box bg-base-100 border border-base-300 shadow-lg p-2 self-stretch flex flex-col`}
                >
                  {isMobile && (
                    <div className="flex items-center justify-between px-1 pb-2 border-b border-base-300 mb-2">
                      <span className="text-sm font-medium">切换角色与头像</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setIsAvatarPopoverOpen(false)}
                      >
                        关闭
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-h-0">
                    <AvatarDropdownContent
                      roleId={curRoleId}
                      onAvatarChange={setCurAvatarId}
                      onRoleChange={setCurRoleId}
                      onRequestClose={() => setIsAvatarPopoverOpen(false)}
                      defaultFullscreen={isAvatarChooserFullscreen || isMobile}
                      onRequestFullscreen={setIsAvatarChooserFullscreen}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              {!isEditingName && (
                <div
                  className={`text-sm font-medium truncate ${isSpectator || curRoleId <= 0 ? "text-base-content/50 select-none" : "cursor-text"}`}
                  title={isSpectator || curRoleId <= 0 ? undefined : "点击编辑显示名称"}
                  onClick={(event) => {
                    if (isSpectator || curRoleId <= 0) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setEditingName(displayRoleName);
                    setIsEditingName(true);
                  }}
                >
                  {displayRoleName || "\u00A0"}
                </div>
              )}
              {isEditingName && (
                <input
                  className="input input-xs input-bordered bg-base-200 border-base-300 px-2 shadow-sm focus:outline-none focus:border-info w-full max-w-48"
                  value={editingName}
                  autoFocus
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onChange={event => setEditingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsEditingName(false);
                      setEditingName("");
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraftCustomRoleNameForRole(curRoleId, editingName);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={() => {
                    setDraftCustomRoleNameForRole(curRoleId, editingName);
                    setIsEditingName(false);
                  }}
                  placeholder={currentRoleName || ""}
                />
              )}
            </div>
            {showSelfStatus && <span className="h-3 w-px bg-base-content/30" aria-hidden />}
            {showSelfStatus && (
              <ChatStatusBar
                roomId={roomId}
                userId={userId}
                webSocketUtils={webSocketUtils}
                excludeSelf={true}
                showGrouped={false}
                currentChatStatus={currentChatStatus}
                onChangeChatStatus={onChangeChatStatus}
                isSpectator={isSpectator}
                compact={true}
                className="shrink-0"
              />
            )}
            {showOtherStatus && <span className="h-3 w-px bg-base-content/30" aria-hidden />}
            {showOtherStatus && (
              <ChatStatusBar
                roomId={roomId}
                userId={userId}
                webSocketUtils={webSocketUtils}
                excludeSelf={true}
                showGrouped={true}
                showGroupDivider={false}
                isSpectator={isSpectator}
                compact={true}
                className="shrink-0"
              />
            )}
          </div>
          {leftToolbar && (
            <div className={`flex items-center gap-2 min-w-0 ${isMobile ? "overflow-x-auto pb-0.5" : ""}`}>
              {leftToolbar}
            </div>
          )}
        </div>
        {headerToolbar && (
          <div className={`flex items-start gap-2 shrink-0 min-w-0 ${isMobile ? "max-w-[50vw]" : ""}`}>
            {headerToolbar}
          </div>
        )}
      </div>
    </div>
  );
}
