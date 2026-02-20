import { ArrowClockwise, ArrowCounterClockwise, ArrowSquareIn, DotsThreeVerticalIcon, ExportIcon, FilmStrip } from "@phosphor-icons/react";
import React from "react";
import { useLocation } from "react-router";
import SearchBar from "@/components/chat/input/inlineSearch";
import MobileSearchPage from "@/components/chat/input/mobileSearchPage";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
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
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

function RoomHeaderBarImpl({
  roomName,
  toggleLeftDrawer,
  onCloseSubWindow,
  onExportPremiere,
  onUndo,
  onRedo,
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

  // 退出移动端或切路由时，避免搜索页保持打开状态
  React.useEffect(() => {
    if (!isMobile) {
      setIsMobileSearchOpen(false);
    }
  }, [isMobile]);

  React.useEffect(() => {
    setIsMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
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
                aria-label="打开左侧边栏"
                className="btn btn-ghost btn-square btn-sm"
                onClick={toggleLeftDrawer}
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
                  <div className="dropdown dropdown-end">
                    <button
                      type="button"
                      tabIndex={0}
                      className="btn btn-ghost btn-square btn-xs"
                      aria-label="工具菜单"
                      title="工具菜单"
                    >
                      <DotsThreeVerticalIcon className="size-4" />
                    </button>
                    <ul tabIndex={0} className="dropdown-content z-9999 menu p-2 shadow bg-base-100 rounded-box w-56 gap-1">
                      <li><button type="button" onClick={handleOpenImport}>导入记录</button></li>
                      <li><button type="button" onClick={handleOpenExport}>导出/多选</button></li>
                      <li><button type="button" onClick={handleOpenPremiere}>导出 PR 工程</button></li>
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            toggleUseChatBubbleStyle();
                            blurActiveElement();
                          }}
                        >
                          {`切换到${useChatBubbleStyle ? "传统" : "气泡"}样式`}
                        </button>
                      </li>
                      <li><button type="button" data-side-drawer-toggle="true" onClick={handleToggleMemberDrawer}>房间成员</button></li>
                      <li><button type="button" data-side-drawer-toggle="true" onClick={handleToggleRoleDrawer}>房间角色</button></li>
                      <li><button type="button" onClick={handleOpenMobileSearch}>消息搜索</button></li>
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
      <MobileSearchPage isOpen={isMobileSearchOpen} onClose={() => setIsMobileSearchOpen(false)} />
    </>
  );
}

const RoomHeaderBar = React.memo(RoomHeaderBarImpl);
export default RoomHeaderBar;
