import { ArrowClockwise, ArrowCounterClockwise, ArrowSquareIn, Broom, DotsThreeVerticalIcon, ExportIcon, FilmStrip } from "@phosphor-icons/react";
import React from "react";
import { useLocation } from "react-router";
import SearchBar from "@/components/chat/input/inlineSearch";
import MobileSearchPage from "@/components/chat/input/mobileSearchPage";
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

interface RoomHeaderBarProps {
  roomName?: string;
  toggleLeftDrawer: () => void;
  onCloseSubWindow?: () => void;
  onExportPremiere?: () => void;
  onClearAndReloadAllMessages?: () => void | Promise<void>;
  onUndo?: () => void;
  onRedo?: () => void;
  isReloadingAllMessages?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}

const MOBILE_HEADER_AUTO_HIDE_MS = 2600;
const MOBILE_HEADER_HIDE_RETRY_MS = 300;
const MOBILE_SCROLL_GESTURE_ACTIVE_MS = 900;
const MOBILE_KEYBOARD_SCROLL_SUPPRESS_MS = 700;
const MOBILE_KEYBOARD_HEIGHT_DELTA_PX = 80;

function RoomHeaderBarImpl({
  roomName,
  toggleLeftDrawer,
  onCloseSubWindow,
  onExportPremiere,
  onClearAndReloadAllMessages,
  onUndo,
  onRedo,
  isReloadingAllMessages = false,
  canUndo = false,
  canRedo = false,
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
  const [isMobileHeaderVisible, setIsMobileHeaderVisible] = React.useState(() => !isMobile);
  const mobileToolsMenuRef = React.useRef<HTMLDivElement | null>(null);
  const isMobileToolsMenuOpenRef = React.useRef(false);
  const hideTimerRef = React.useRef<number | null>(null);
  const hasSideDrawerOpen = sideDrawerState !== "none";
  const canUseDevTools = Boolean(import.meta.env?.DEV) || import.meta.env.MODE === "test";
  const canClearAndReloadMessages = canUseDevTools && Boolean(onClearAndReloadAllMessages);
  const shouldShowHeaderBar = !isMobile || isMobileHeaderVisible || isMobileToolsMenuOpen;

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

  const clearHideTimer = React.useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleMobileHeaderHide = React.useCallback((delayMs: number = MOBILE_HEADER_AUTO_HIDE_MS) => {
    if (!isMobile) {
      return;
    }
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      const activeElement = typeof document !== "undefined" ? document.activeElement : null;
      const isMenuFocused = activeElement instanceof Node && Boolean(mobileToolsMenuRef.current?.contains(activeElement));
      if (isMobileToolsMenuOpenRef.current || isMenuFocused) {
        scheduleMobileHeaderHide(MOBILE_HEADER_HIDE_RETRY_MS);
        return;
      }
      setIsMobileHeaderVisible(false);
      hideTimerRef.current = null;
    }, delayMs);
  }, [clearHideTimer, isMobile]);

  const showMobileHeaderTemporarily = React.useCallback(() => {
    if (!isMobile) {
      setIsMobileHeaderVisible(true);
      return;
    }

    setIsMobileHeaderVisible(true);
    if (isMobileToolsMenuOpenRef.current) {
      clearHideTimer();
      return;
    }
    scheduleMobileHeaderHide(MOBILE_HEADER_AUTO_HIDE_MS);
  }, [clearHideTimer, isMobile, scheduleMobileHeaderHide]);

  const openMobileToolsMenu = React.useCallback(() => {
    isMobileToolsMenuOpenRef.current = true;
    setIsMobileToolsMenuOpen(true);
    setIsMobileHeaderVisible(true);
    clearHideTimer();
  }, [clearHideTimer]);

  const closeMobileToolsMenu = React.useCallback((resumeAutoHide: boolean = true) => {
    isMobileToolsMenuOpenRef.current = false;
    setIsMobileToolsMenuOpen(false);
    blurActiveElement();
    if (resumeAutoHide) {
      setIsMobileHeaderVisible(true);
      scheduleMobileHeaderHide(MOBILE_HEADER_AUTO_HIDE_MS);
    }
  }, [scheduleMobileHeaderHide]);

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

  const handleOpenPremiere = () => {
    closeThreadPane();
    onExportPremiere?.();
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
      setIsMobileHeaderVisible(true);
      clearHideTimer();
      return;
    }

    setIsMobileHeaderVisible(false);
  }, [clearHideTimer, isMobile]);

  React.useEffect(() => {
    setIsMobileSearchOpen(false);
    setIsMobileToolsMenuOpen(false);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    if (!isMobile) {
      return;
    }

    const lastTopByTarget = new WeakMap<object, number>();
    let isTouchTracking = false;
    let lastTouchY = 0;
    let lastManualUpGestureAt = 0;
    let suppressHeaderRevealUntil = 0;
    let lastVisualViewportHeight = window.visualViewport?.height ?? null;

    const readScrollTop = (target: EventTarget | null): { key: object | null; top: number } => {
      if (target instanceof HTMLElement) {
        return { key: target, top: target.scrollTop };
      }
      if (target instanceof Document) {
        const root = target.scrollingElement ?? target.documentElement;
        return root ? { key: root, top: root.scrollTop } : { key: null, top: 0 };
      }
      const root = document.scrollingElement ?? document.documentElement;
      return root ? { key: root, top: root.scrollTop } : { key: null, top: 0 };
    };

    const handleScrollCapture = (event: Event) => {
      const { key, top } = readScrollTop(event.target);
      if (!key) {
        return;
      }
      const prevTop = lastTopByTarget.get(key);
      lastTopByTarget.set(key, top);
      if (typeof prevTop !== "number") {
        return;
      }
      // 向上滚动（scrollTop 下降）时临时显示 header
      if (prevTop - top > 8) {
        const now = Date.now();
        if (now < suppressHeaderRevealUntil) {
          return;
        }
        if (now - lastManualUpGestureAt > MOBILE_SCROLL_GESTURE_ACTIVE_MS) {
          return;
        }
        showMobileHeaderTemporarily();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        isTouchTracking = false;
        return;
      }
      isTouchTracking = true;
      lastTouchY = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isTouchTracking || event.touches.length !== 1) {
        return;
      }
      const currentY = event.touches[0].clientY;
      const deltaY = currentY - lastTouchY;
      lastTouchY = currentY;
      // 手指向下拖动 => 内容向上（scrollTop 下降）
      if (deltaY > 2) {
        lastManualUpGestureAt = Date.now();
      }
    };

    const handleTouchEnd = () => {
      isTouchTracking = false;
    };

    const handleVisualViewportResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        return;
      }
      const nextHeight = viewport.height;
      if (typeof lastVisualViewportHeight === "number" && nextHeight - lastVisualViewportHeight >= MOBILE_KEYBOARD_HEIGHT_DELTA_PX) {
        suppressHeaderRevealUntil = Date.now() + MOBILE_KEYBOARD_SCROLL_SUPPRESS_MS;
      }
      lastVisualViewportHeight = nextHeight;
    };

    document.addEventListener("scroll", handleScrollCapture, { capture: true, passive: true });
    document.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", handleTouchMove, { capture: true, passive: true });
    document.addEventListener("touchend", handleTouchEnd, { capture: true, passive: true });
    document.addEventListener("touchcancel", handleTouchEnd, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", handleVisualViewportResize);

    return () => {
      document.removeEventListener("scroll", handleScrollCapture, true);
      document.removeEventListener("touchstart", handleTouchStart, true);
      document.removeEventListener("touchmove", handleTouchMove, true);
      document.removeEventListener("touchend", handleTouchEnd, true);
      document.removeEventListener("touchcancel", handleTouchEnd, true);
      window.visualViewport?.removeEventListener("resize", handleVisualViewportResize);
    };
  }, [isMobile, showMobileHeaderTemporarily]);

  React.useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

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

  React.useEffect(() => {
    isMobileToolsMenuOpenRef.current = isMobileToolsMenuOpen;
  }, [isMobileToolsMenuOpen]);

  return (
    <>
      <div
        className={`relative z-50 transition-[max-height,opacity,filter] duration-500 ease-out ${
          shouldShowHeaderBar ? "max-h-20 opacity-100 blur-none overflow-visible" : "max-h-0 opacity-0 blur-sm pointer-events-none overflow-hidden"
        }`}
      >
        <div className="border-gray-300 dark:border-gray-700 border-t border-b flex justify-between items-center overflow-visible relative z-50">
          <div
            className="flex justify-between items-center w-full px-2 h-10
        bg-white/40 dark:bg-slate-950/25 backdrop-blur-xl
        border border-white/40 dark:border-white/10"
          >
            <div className="flex items-center gap-2 min-w-0">
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
              <span className="text-center font-semibold line-clamp-1 truncate max-w-[50vw] sm:max-w-none min-w-0 text-sm sm:text-base">
                <span className="hidden sm:inline">「 </span>
                {roomName}
                <span className="hidden sm:inline"> 」</span>
              </span>
            </div>
            <div className="flex gap-2 items-center overflow-visible">
              {canClearAndReloadMessages && (
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
              )}
              <div className="tooltip tooltip-bottom relative z-50" data-tip="撤销 (Ctrl+Z)">
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs"
                  disabled={!canUndo}
                  onClick={() => onUndo?.()}
                  aria-label="撤销"
                >
                  <ArrowCounterClockwise className="size-5" />
                </button>
              </div>
              <div className="tooltip tooltip-bottom relative z-50" data-tip="回退 (Ctrl+Y / Ctrl+Shift+Z)">
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs"
                  disabled={!canRedo}
                  onClick={() => onRedo?.()}
                  aria-label="回退"
                >
                  <ArrowClockwise className="size-5" />
                </button>
              </div>
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
                              handleOpenPremiere();
                            }}
                          >
                            导出 PR 工程
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
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip="导出 PR 工程"
                        onClick={handleOpenPremiere}
                      >
                        <FilmStrip className="size-6" />
                      </div>
                      <div
                        className="tooltip tooltip-bottom hover:text-info relative z-50"
                        data-tip={`切换到${useChatBubbleStyle ? "传统" : "气泡"}样式`}
                        onClick={() => {
                          toggleUseChatBubbleStyle();
                        }}
                      >
                        <Bubble2 className="size-6" />
                      </div>
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
