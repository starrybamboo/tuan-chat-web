import type { Room } from "@tuanchat/openapi-client/models/Room";
import { ArrowSquareIn, Broom, DotsThreeVerticalIcon, ExportIcon } from "@phosphor-icons/react";
import React from "react";
import { useLocation } from "react-router";
import SearchBar from "@/components/chat/input/inlineSearch";
import MobileSearchPage from "@/components/chat/input/mobileSearchPage";
import RoomDescriptionDropdown from "@/components/chat/room/roomDescriptionDropdown";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import ConfirmModal from "@/components/common/comfirmModel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import {
  BaselineArrowBackIosNew,
  Bubble2,
  MemberIcon,
  RoleListIcon,
  XMarkICon,
} from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-base-content/20" aria-hidden="true" />;
}

interface RoomHeaderBarProps {
  roomName?: string;
  room?: Room | null;
  toggleLeftDrawer: () => void;
  onCloseSubWindow?: () => void;
  onClearAndReloadAllMessages?: () => void | Promise<void>;
  isReloadingAllMessages?: boolean;
}

function RoomHeaderBarImpl({
  roomName,
  room,
  toggleLeftDrawer,
  onCloseSubWindow,
  onClearAndReloadAllMessages,
  isReloadingAllMessages = false,
}: RoomHeaderBarProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const setMultiSelecting = useRoomUiStore(state => state.setMultiSelecting);
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const toggleUseChatBubbleStyle = useRoomPreferenceStore(state => state.toggleUseChatBubbleStyle);
  const [, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);
  const isMobile = getScreenSize() === "sm";
  const location = useLocation();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const [isClearReloadConfirmOpen, setIsClearReloadConfirmOpen] = React.useState(false);
  const [isMobileToolsMenuOpen, setIsMobileToolsMenuOpen] = React.useState(false);
  const mobileToolsMenuRef = React.useRef<HTMLDivElement | null>(null);
  const hasSideDrawerOpen = sideDrawerState !== "none";
  const canUseDevTools = Boolean(import.meta.env?.DEV) || import.meta.env.MODE === "test";
  const canClearAndReloadMessages = canUseDevTools && Boolean(onClearAndReloadAllMessages);
  const roomDescriptionPreview = room?.description?.trim() || "暂无房间描述";
  const hasRoomDescription = Boolean(room?.description?.trim());

  const closeThreadPane = () => {
    setComposerTarget("main");
    setThreadRootMessageId(undefined);
  };

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

  const handleOpenImport = () => {
    closeThreadPane();
    if (sideDrawerState === "export") {
      setSideDrawerState("none");
    }
    setIsImportChatTextOpen(true);
    blurActiveElement();
  };

  const handleOpenExport = () => {
    closeThreadPane();
    if (sideDrawerState === "export") {
      setSideDrawerState("none");
    }
    setMultiSelecting(true);
    blurActiveElement();
  };

  const handleRequestClearAndReloadMessages = () => {
    if (!canClearAndReloadMessages || isReloadingAllMessages) {
      return;
    }
    setIsClearReloadConfirmOpen(true);
  };

  const handleToggleMemberDrawer = () => {
    closeThreadPane();
    setSideDrawerState(sideDrawerState === "user" ? "none" : "user");
    blurActiveElement();
  };

  const handleToggleRoleDrawer = () => {
    closeThreadPane();
    setSideDrawerState(sideDrawerState === "role" ? "none" : "role");
    blurActiveElement();
  };

  const handleOpenMobileSearch = () => {
    closeThreadPane();
    setIsMobileSearchOpen(true);
    blurActiveElement();
  };

  const handleMobileBack = () => {
    // 语义对齐 QQ：在“成员/角色/跑团工具”等右侧面板中，返回应先回到群聊主聊天。
    if (hasSideDrawerOpen) {
      closeThreadPane();
      setSideDrawerState("none");
      blurActiveElement();
      return;
    }
    toggleLeftDrawer();
    blurActiveElement();
  };

  // 退出移动端或切路由时，避免搜索页保持打开状态
  React.useEffect(() => {
    if (!isMobile) {
      setIsMobileSearchOpen(false);
      setIsMobileToolsMenuOpen(false);
    }
  }, [isMobile]);

  React.useEffect(() => {
    setIsMobileSearchOpen(false);
    setIsMobileToolsMenuOpen(false);
  }, [location.pathname, location.search]);

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
        <div className="border-gray-300 dark:border-gray-700 border-y flex justify-between items-center overflow-visible relative z-50">
          <div
            className="flex justify-between items-center w-full px-2 h-10
        bg-white/40 dark:bg-slate-950/25 backdrop-blur-xl
        border border-white/40 dark:border-white/10"
          >
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {onCloseSubWindow && (
                <div className="tooltip tooltip-bottom" data-tip="关闭副窗口">
                  <button
                    type="button"
                    aria-label="关闭副窗口"
                    title="关闭副窗口"
                    className="btn btn-ghost btn-square btn-xs"
                    onClick={onCloseSubWindow}
                  >
                    <XMarkICon className="size-4" />
                  </button>
                </div>
              )}
              <div className="sm:hidden">
                <button
                  type="button"
                  aria-label={hasSideDrawerOpen ? "返回群聊" : "打开左侧边栏"}
                  className="btn btn-ghost btn-square btn-sm"
                  onClick={handleMobileBack}
                >
                  <BaselineArrowBackIosNew className="size-6" />
                </button>
              </div>
              <div className="flex min-w-0 shrink-0 items-center gap-1">
                <span className="text-center font-semibold line-clamp-1 truncate max-w-[50vw] sm:max-w-none min-w-0 text-sm sm:text-base">
                  <span className="hidden sm:inline">「 </span>
                  {roomName}
                  <span className="hidden sm:inline"> 」</span>
                </span>
                <RoomDescriptionDropdown room={room} />
              </div>
              <span
                className={`hidden min-w-0 flex-1 truncate text-xs sm:block ${hasRoomDescription ? "text-base-content/45" : "text-base-content/25"}`}
                title={roomDescriptionPreview}
              >
                {roomDescriptionPreview}
              </span>
            </div>
            <div className="flex shrink-0 gap-2 items-center overflow-visible">
              {canClearAndReloadMessages && (
                <>
                  <div className="tooltip tooltip-bottom relative z-50" data-tip="清空本地并重拉全量消息（开发/测试）">
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-xs text-warning"
                      disabled={isReloadingAllMessages}
                      onClick={handleRequestClearAndReloadMessages}
                      aria-label="清空并重拉消息（开发/测试）"
                    >
                      <Broom className="size-5" />
                    </button>
                  </div>
                  {!isMobile && <ToolbarDivider />}
                </>
              )}
              {isMobile
                ? (
                    <div ref={mobileToolsMenuRef} className={`dropdown dropdown-end ${isMobileToolsMenuOpen ? "dropdown-open" : ""}`}>
                      <button
                        type="button"
                        tabIndex={0}
                        className="btn btn-ghost btn-square btn-xs"
                        aria-label="工具菜单"
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
                      >
                        <DotsThreeVerticalIcon className="size-4" />
                      </button>
                      <ul tabIndex={0} className="dropdown-content z-9999 menu p-2 shadow bg-base-100 rounded-box w-56 gap-1">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              closeMobileToolsMenu();
                              handleOpenImport();
                            }}
                          >
                            导入记录
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              closeMobileToolsMenu();
                              handleOpenExport();
                            }}
                          >
                            导出/多选
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              closeMobileToolsMenu();
                              toggleUseChatBubbleStyle();
                              blurActiveElement();
                            }}
                          >
                            {`切换到${useChatBubbleStyle ? "传统" : "气泡"}样式`}
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            data-side-drawer-toggle="true"
                            onClick={() => {
                              closeMobileToolsMenu();
                              handleToggleMemberDrawer();
                            }}
                          >
                            房间成员
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            data-side-drawer-toggle="true"
                            onClick={() => {
                              closeMobileToolsMenu();
                              handleToggleRoleDrawer();
                            }}
                          >
                            房间角色
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              closeMobileToolsMenu();
                              handleOpenMobileSearch();
                            }}
                          >
                            消息搜索
                          </button>
                        </li>
                      </ul>
                    </div>
                  )
                : (
                    <>
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip={`切换到${useChatBubbleStyle ? "传统" : "气泡"}样式`}
                        onClick={() => {
                          toggleUseChatBubbleStyle();
                        }}
                      >
                        <Bubble2 className="size-6" />
                      </div>
                      <ToolbarDivider />
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip="导入记录"
                        onClick={handleOpenImport}
                      >
                        <ArrowSquareIn className="size-6" />
                      </div>
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip="导出/多选"
                        onClick={handleOpenExport}
                      >
                        <ExportIcon className="size-6" />
                      </div>
                      <ToolbarDivider />
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip="房间成员"
                        data-side-drawer-toggle="true"
                        onClick={handleToggleMemberDrawer}
                      >
                        <MemberIcon className="size-6" />
                      </div>
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip="房间角色"
                        data-side-drawer-toggle="true"
                        onClick={handleToggleRoleDrawer}
                      >
                        <RoleListIcon className="size-6" />
                      </div>
                      <SearchBar className="w-64" />
                    </>
                  )}
            </div>
          </div>
        </div>
      </div>
      <MobileSearchPage isOpen={isMobileSearchOpen} onClose={() => setIsMobileSearchOpen(false)} />
      <ConfirmModal
        isOpen={isClearReloadConfirmOpen}
        onClose={() => {
          if (isReloadingAllMessages) {
            return;
          }
          setIsClearReloadConfirmOpen(false);
        }}
        title="确认清空并重拉消息"
        message="此操作会清空当前房间本地缓存消息，并从服务端重新拉取全量历史消息。是否继续？"
        confirmText="确认执行"
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
