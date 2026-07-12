import type { Room } from "@tuanchat/openapi-client/models/Room";

import { Broom, DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { useLocation, useRouter } from "@tanstack/react-router";
import React from "react";

import RoomDescriptionDropdown from "@/components/chat/room/roomDescriptionDropdown";
import ChatSearchTrigger from "@/components/chat/search/chatSearchTrigger";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { IconButton } from "@/components/common/IconButton";
import PortalTooltip from "@/components/common/portalTooltip";
import { MenuItem, MenuSurface } from "@/components/common/MenuPopover";
import {
  ArticleIcon,
  BaselineArrowBackIosNew,
  Bubble2,
  XMarkICon,
} from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-base-content/20" aria-hidden="true" />;
}

export type RoomContentMode = "room" | "doc";

type RoomHeaderBarProps = {
  spaceId: number;
  roomId: number;
  roomName?: string;
  room?: Room | null;
  contentMode: RoomContentMode;
  onToggleContentMode: () => void;
  toggleLeftDrawer: () => void;
  onCloseSubWindow?: () => void;
  onClearAndReloadAllMessages?: () => void | Promise<void>;
  isReloadingAllMessages?: boolean;
}

function RoomHeaderBarImpl({
  spaceId,
  roomId,
  roomName,
  room,
  contentMode,
  onToggleContentMode,
  toggleLeftDrawer,
  onCloseSubWindow,
  onClearAndReloadAllMessages,
  isReloadingAllMessages = false,
}: RoomHeaderBarProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const webgalOpen = useSideDrawerStore(state => state.webgalOpen);
  const setWebgalOpen = useSideDrawerStore(state => state.setWebgalOpen);
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const toggleUseChatBubbleStyle = useRoomPreferenceStore(state => state.toggleUseChatBubbleStyle);
  const isMobile = getScreenSize() === "sm";
  const location = useLocation();
  const router = useRouter();
  const [isClearReloadConfirmOpen, setIsClearReloadConfirmOpen] = React.useState(false);
  const [isMobileToolsMenuOpen, setIsMobileToolsMenuOpen] = React.useState(false);
  const mobileToolsMenuRef = React.useRef<HTMLDivElement | null>(null);
  const hasSideDrawerOpen = sideDrawerState !== "none" || webgalOpen;
  const canUseDevTools = Boolean(import.meta.env?.DEV) || import.meta.env.MODE === "test";
  const canClearAndReloadMessages = canUseDevTools && Boolean(onClearAndReloadAllMessages);
  const roomDescriptionPreview = room?.description?.trim() || "暂无房间描述";
  const hasRoomDescription = Boolean(room?.description?.trim());
  const chatBubbleStyleLabel = useChatBubbleStyle ? "当前：气泡样式" : "当前：传统样式";
  const chatBubbleStyleToggleLabel = useChatBubbleStyle ? "切换到传统样式" : "切换到气泡样式";
  const blurActiveElement = () => {
    if (typeof document === "undefined") {
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const openMobileToolsMenu = React.useCallback(() => {
    setIsMobileToolsMenuOpen(true);
  }, []);

  const closeMobileToolsMenu = React.useCallback(() => {
    setIsMobileToolsMenuOpen(false);
    blurActiveElement();
  }, []);

  const handleRequestClearAndReloadMessages = () => {
    if (!canClearAndReloadMessages || isReloadingAllMessages) {
      return;
    }
    setIsClearReloadConfirmOpen(true);
  };

  const openMessageSearch = () => {
    router.history.push(`/chat/${spaceId}/${roomId}/search`);
    blurActiveElement();
  };

  const handleMobileBack = () => {
    // 语义对齐 QQ：在“成员/角色/跑团工具”等右侧面板中，返回应先回到群聊主聊天。
    if (hasSideDrawerOpen) {
      setSideDrawerState("none");
      setWebgalOpen(false);
      blurActiveElement();
      return;
    }
    toggleLeftDrawer();
    blurActiveElement();
  };

  // 退出移动端时收起移动工具菜单。
  React.useEffect(() => {
    if (!isMobile) {
      setIsMobileToolsMenuOpen(false);
    }
  }, [isMobile]);

  React.useEffect(() => {
    setIsMobileToolsMenuOpen(false);
  }, [location.pathname, location.searchStr]);

  React.useEffect(() => {
    if (!isMobile || !isMobileToolsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (mobileToolsMenuRef.current?.contains(target)) {
        return;
      }
      closeMobileToolsMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      closeMobileToolsMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [closeMobileToolsMenu, isMobile, isMobileToolsMenuOpen]);

  return (
    <>
      <div
        className="relative z-50"
      >
        <div className="
          border-base-300
          dark:border-base-300
          border-y flex justify-between items-center overflow-visible relative
          z-50
        ">
          <div
            className="
              flex justify-between items-center w-full px-2 h-10 bg-white/40
              dark:bg-base-300/25
              backdrop-blur-xl border border-white/40
              dark:border-white/10
            "
          >
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {onCloseSubWindow && (
                <PortalTooltip label="关闭副窗口" placement="bottom">
                  <IconButton
                    label="关闭副窗口"
                    title="关闭副窗口"
                    size="xs"
                    shape="square"
                    onClick={onCloseSubWindow}
                    icon={<XMarkICon className="size-4" />}
                  />
                </PortalTooltip>
              )}
              <div className="sm:hidden">
                <IconButton
                  label={hasSideDrawerOpen ? "返回群聊" : "打开左侧边栏"}
                  size="sm"
                  shape="square"
                  onClick={handleMobileBack}
                  icon={<BaselineArrowBackIosNew className="size-6" />}
                />
              </div>
              <div className="flex min-w-0 shrink-0 items-center gap-1">
                <span className="
                  text-center font-semibold line-clamp-1 truncate max-w-[50vw]
                  sm:max-w-none
                  min-w-0 text-sm
                  sm:text-base
                ">
                  <span className="
                    hidden
                    sm:inline
                  ">「 </span>
                  {roomName}
                  <span className="
                    hidden
                    sm:inline
                  "> 」</span>
                </span>
                <RoomDescriptionDropdown room={room} />
              </div>
              <span
                className={`
                  hidden min-w-0 flex-1 truncate text-xs
                  sm:block
                  ${hasRoomDescription ? `text-base-content/50` : `
                    text-base-content/50
                  `}
                `}
                title={roomDescriptionPreview}
              >
                {roomDescriptionPreview}
              </span>
            </div>
            <div className="flex shrink-0 gap-2 items-center overflow-visible">
              {canClearAndReloadMessages && (
                <>
                  <PortalTooltip
                    label="清空本地并重拉全量消息（开发/测试）"
                    placement="bottom"
                    anchorClassName="relative z-50"
                  >
                    <IconButton
                      size="xs"
                      shape="square"
                      className="text-warning"
                      disabled={isReloadingAllMessages}
                      onClick={handleRequestClearAndReloadMessages}
                      label="清空并重拉消息（开发/测试）"
                      icon={<Broom className="size-5" />}
                    />
                  </PortalTooltip>
                  {!isMobile && <ToolbarDivider />}
                </>
              )}
              {isMobile
                ? (
                    <div ref={mobileToolsMenuRef} className="relative inline-flex">
                      <IconButton
                        size="xs"
                        shape="square"
                        aria-controls="room-mobile-tools-menu"
                        label="工具菜单"
                        aria-expanded={isMobileToolsMenuOpen}
                        title="工具菜单"
                        onClick={() => {
                          if (isMobileToolsMenuOpen) {
                            closeMobileToolsMenu();
                            blurActiveElement();
                            return;
                          }
                          openMobileToolsMenu();
                        }}
                        icon={<DotsThreeVerticalIcon className="size-4" />}
                      />
                      <MenuSurface
                        as="ul"
                        ariaLabel="房间工具"
                        className={`absolute right-0 top-full z-9999 mt-2 w-56 gap-1 p-2 shadow ${isMobileToolsMenuOpen ? "" : "hidden"}`}
                        id="room-mobile-tools-menu"
                      >
                        <li role="none">
                          <MenuItem
                            selected={contentMode === "doc"}
                            aria-label={contentMode === "doc" ? "返回房间视图" : "进入文档视图"}
                            title={contentMode === "doc" ? "返回房间视图" : "进入文档视图"}
                            onClick={() => {
                              closeMobileToolsMenu();
                              onToggleContentMode();
                            }}
                          >
                            {contentMode === "doc" ? "返回房间视图" : "进入文档视图"}
                          </MenuItem>
                        </li>
                        <li role="none">
                          <MenuItem
                            selected={useChatBubbleStyle}
                            aria-pressed={useChatBubbleStyle}
                            aria-label={`${chatBubbleStyleLabel}，${chatBubbleStyleToggleLabel}`}
                            onClick={() => {
                              closeMobileToolsMenu();
                              toggleUseChatBubbleStyle();
                              blurActiveElement();
                            }}
                          >
                            {`${chatBubbleStyleLabel}，${chatBubbleStyleToggleLabel}`}
                          </MenuItem>
                        </li>
                        <li role="none">
                          <MenuItem
                            aria-label="搜索房间消息"
                            onClick={() => {
                              closeMobileToolsMenu();
                              openMessageSearch();
                            }}
                          >
                            消息搜索
                          </MenuItem>
                        </li>
                      </MenuSurface>
                    </div>
                  )
                : (
                    <>
                      <PortalTooltip label={contentMode === "doc" ? "返回房间视图" : "进入文档视图"} placement="bottom">
                        <button
                          type="button"
                          className={[
                          "relative z-50 inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150",
                          contentMode === "doc"
                            ? "text-info hover:text-info"
                            : "text-base-content/70 hover:bg-base-300/60 hover:text-info",
                        ].join(" ")}
                        aria-label={contentMode === "doc" ? "返回房间视图" : "进入文档视图"}
                        aria-pressed={contentMode === "doc"}
                        title={contentMode === "doc" ? "返回房间视图" : "进入文档视图"}
                        onClick={onToggleContentMode}
                      >
                        <ArticleIcon className="size-6" />
                        </button>
                      </PortalTooltip>
                      <ToolbarDivider />
                      <PortalTooltip label={`${chatBubbleStyleLabel}，${chatBubbleStyleToggleLabel}`} placement="bottom">
                        <button
                          type="button"
                          className={[
                          "relative z-50 inline-flex size-8 items-center justify-center rounded-md transition-all duration-150",
                          useChatBubbleStyle
                            ? "text-info hover:text-info"
                            : "text-base-content/70 hover:bg-base-300/60 hover:text-info",
                        ].join(" ")}
                        aria-label={`${chatBubbleStyleLabel}，${chatBubbleStyleToggleLabel}`}
                        aria-pressed={useChatBubbleStyle}
                        onClick={() => {
                          toggleUseChatBubbleStyle();
                        }}
                      >
                        <Bubble2 className="size-6" />
                        </button>
                      </PortalTooltip>
                      <ToolbarDivider />
                      <ChatSearchTrigger onClick={openMessageSearch} />
                    </>
                  )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={isClearReloadConfirmOpen}
        onOpenChange={() => {
          if (isReloadingAllMessages) {
            return;
          }
          setIsClearReloadConfirmOpen(false);
        }}
        title="确认清空并重拉消息"
        description="此操作会清空当前房间本地缓存消息，并从服务端重新拉取全量历史消息。是否继续？"
        confirmLabel="确认执行"
        variant="warning"
        onConfirm={() => {
          if (!onClearAndReloadAllMessages) {
            return;
          }
          setIsClearReloadConfirmOpen(false);
          void onClearAndReloadAllMessages();
        }}
      />
    </>
  );
}

const RoomHeaderBar = React.memo(RoomHeaderBarImpl);
export default RoomHeaderBar;
