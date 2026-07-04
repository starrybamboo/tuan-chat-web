import React from "react";

import ChatStatusBar from "@/components/chat/chatStatusBar";
import AvatarDropdownContent from "@/components/chat/input/avatarDropdownContent";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { AddRoleIcon, NarratorIcon } from "@/icons";

type RoomComposerHeaderProps = {
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

function resolveAvatarPopoverStyle(triggerRect: DOMRect, isFullscreen: boolean): React.CSSProperties {
  const margin = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minLeft = isFullscreen ? margin : Math.max(triggerRect.left, margin);
  const availableWidth = Math.max(0, viewportWidth - minLeft - margin);
  const minimumWidth = Math.min(360, viewportWidth - margin * 2);
  const targetWidth = isFullscreen
    ? Math.min(Math.floor(viewportWidth * 0.92), viewportWidth - margin * 2)
    : Math.max(minimumWidth, Math.min(860, availableWidth));
  const bottom = Math.max(margin, viewportHeight - triggerRect.top + 8);
  const availableHeight = Math.max(0, viewportHeight - bottom - margin);
  const targetHeight = isFullscreen
    ? Math.min(Math.floor(viewportHeight * 0.82), availableHeight)
    : Math.min(448, availableHeight);
  const panelLeft = isFullscreen
    ? (viewportWidth - targetWidth) / 2
    : minLeft;
  const maxLeft = Math.max(margin, viewportWidth - targetWidth - margin);
  return {
    left: Math.min(Math.max(panelLeft, margin), maxLeft),
    bottom,
    width: targetWidth,
    height: targetHeight,
    maxWidth: `calc(100vw - ${margin * 2}px)`,
    maxHeight: `calc(100vh - ${margin * 2}px)`,
  };
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
  const [isAvatarPopoverPrewarmed, setIsAvatarPopoverPrewarmed] = React.useState(false);
  const [isAvatarChooserFullscreen, setIsAvatarChooserFullscreen] = React.useState(false);
  const avatarPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const avatarTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [avatarPopoverStyle, setAvatarPopoverStyle] = React.useState<React.CSSProperties | undefined>();
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
      setIsAvatarPopoverPrewarmed(false);
    }
  }, [isSpectator]);

  React.useEffect(() => {
    if (isSpectator || curRoleId <= 0 || isAvatarPopoverPrewarmed) {
      return;
    }

    const prewarmAvatarPopover = () => setIsAvatarPopoverPrewarmed(true);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(prewarmAvatarPopover, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(prewarmAvatarPopover, 800);
    return () => globalThis.clearTimeout(timeoutId);
  }, [curRoleId, isAvatarPopoverPrewarmed, isSpectator]);

  React.useEffect(() => {
    if (!isAvatarPopoverOpen) {
      setIsAvatarChooserFullscreen(false);
      setAvatarPopoverStyle(undefined);
    }
  }, [isAvatarPopoverOpen]);

  React.useEffect(() => {
    if (!isAvatarPopoverOpen || isMobile) {
      setAvatarPopoverStyle(undefined);
      return;
    }
    const updateAvatarPopoverStyle = () => {
      const triggerRect = avatarTriggerRef.current?.getBoundingClientRect();
      if (!triggerRect) {
        return;
      }
      setAvatarPopoverStyle(resolveAvatarPopoverStyle(triggerRect, isAvatarChooserFullscreen));
    };
    updateAvatarPopoverStyle();
    window.addEventListener("resize", updateAvatarPopoverStyle);
    window.addEventListener("scroll", updateAvatarPopoverStyle, true);
    return () => {
      window.removeEventListener("resize", updateAvatarPopoverStyle);
      window.removeEventListener("scroll", updateAvatarPopoverStyle, true);
    };
  }, [isAvatarChooserFullscreen, isAvatarPopoverOpen, isMobile]);

  const handleAvatarChooserFullscreenChange = React.useCallback((next: boolean) => {
    setIsAvatarChooserFullscreen(next);
    if (isMobile) {
      return;
    }
    const triggerRect = avatarTriggerRef.current?.getBoundingClientRect();
    if (!triggerRect) {
      return;
    }
    setAvatarPopoverStyle(resolveAvatarPopoverStyle(triggerRect, next));
  }, [isMobile]);

  const prewarmAvatarPopover = React.useCallback(() => {
    if (!isSpectator) {
      setIsAvatarPopoverPrewarmed(true);
    }
  }, [isSpectator]);

  const shouldRenderAvatarPopover = (isAvatarPopoverOpen || isAvatarPopoverPrewarmed) && !isSpectator;
  const isAvatarPopoverVisible = isAvatarPopoverOpen && !isSpectator;

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
              ref={avatarTriggerRef}
              type="button"
              className={`
                flex items-center justify-center leading-none
                ${isSpectator ? `cursor-not-allowed opacity-70` : `
                  cursor-pointer
                `}
              `}
              aria-haspopup="dialog"
              aria-expanded={isAvatarPopoverOpen}
              onClick={() => {
                if (isSpectator) {
                  return;
                }
                setIsAvatarPopoverPrewarmed(true);
                if (isAvatarPopoverOpen) {
                  setIsAvatarPopoverOpen(false);
                  return;
                }
                if (isMobile) {
                  setIsAvatarChooserFullscreen(true);
                  setAvatarPopoverStyle(undefined);
                }
                else {
                  const triggerRect = avatarTriggerRef.current?.getBoundingClientRect();
                  if (triggerRect) {
                    setAvatarPopoverStyle(resolveAvatarPopoverStyle(triggerRect, false));
                  }
                  setIsAvatarChooserFullscreen(false);
                }
                setIsAvatarPopoverOpen(true);
              }}
              onFocus={prewarmAvatarPopover}
              onPointerEnter={prewarmAvatarPopover}
            >
              {curRoleId <= 0 && curAvatarId <= 0
                ? (
                    <div className="
                      size-8 rounded-full bg-base-200/50 flex items-center
                      justify-center shrink-0
                    ">
                      {curRoleId === 0 ? <AddRoleIcon className="
                        size-5 text-base-content/60
                      " /> : <NarratorIcon className="
                        size-5 text-base-content/60
                      " />}
                    </div>
                  )
                : (
                    <RoleAvatarComponent
                      avatarId={curAvatarId}
                      roleId={curRoleId}
                      width={8}
                      isRounded={true}
                      withTitle={false}
                      stopToastWindow={true}
                      useDefaultAvatarFallback={true}
                      alt={curRoleId === 0 ? "未选择角色" : (curRoleId < 0 ? "旁白" : undefined)}
                    />
                  )}
            </button>
            {shouldRenderAvatarPopover && (
              <div
                aria-hidden={!isAvatarPopoverVisible}
                style={isAvatarPopoverVisible && !isMobile ? avatarPopoverStyle : undefined}
                className={!isAvatarPopoverVisible
                  ? "hidden"
                  : isMobile
                  ? "fixed inset-x-2 top-14 bottom-2 z-80 flex items-stretch"
                  : `fixed z-[80] flex items-stretch ${avatarPopoverStyle ? "" : "invisible"}`}
              >
                <div
                  className={`
                    ${isMobile
                    ? "size-full"
                    : "h-full w-full"
                  }
                    rounded-box bg-base-100 border border-base-300 shadow-lg p-2
                    self-stretch flex flex-col
                  `}
                >
                  {isMobile && (
                    <div className="
                      flex items-center justify-between px-1 pb-2 border-b
                      border-base-300 mb-2
                    ">
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
                      selectedAvatarId={curAvatarId > 0 ? curAvatarId : undefined}
                      onAvatarChange={setCurAvatarId}
                      onRoleChange={setCurRoleId}
                      onRequestClose={() => setIsAvatarPopoverOpen(false)}
                      defaultFullscreen={isAvatarChooserFullscreen || isMobile}
                      onRequestFullscreen={handleAvatarChooserFullscreenChange}
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
                  className={`
                    text-sm font-medium truncate
                    ${isSpectator || curRoleId <= 0 ? `
                      text-base-content/50 select-none
                    ` : `cursor-text`}
                  `}
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
                  autoComplete="off"
                  aria-label="名称"
                  className="
                    input input-xs input-bordered bg-base-200 border-base-300
                    px-2 shadow-sm
                    focus:outline-none focus:border-info
                    w-full max-w-48
                  "
                  value={editingName}

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
            <div className={`
              flex items-center gap-1 min-w-0
              ${isMobile ? `overflow-x-auto pb-0.5` : ""}
            `}>
              {leftToolbar}
            </div>
          )}
        </div>
        {headerToolbar && (
          <div className={`
            flex items-start gap-2 shrink-0 min-w-0
            ${isMobile ? `max-w-[50vw]` : ""}
          `}>
            {headerToolbar}
          </div>
        )}
      </div>
    </div>
  );
}
