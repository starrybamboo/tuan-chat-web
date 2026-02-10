import type { VirtuosoHandle } from "react-virtuoso";
import { CheckerboardIcon, FileTextIcon, SwordIcon } from "@phosphor-icons/react";
import React from "react";
import ChatFrame from "@/components/chat/chatFrame";
import { RoomContext } from "@/components/chat/core/roomContext";
import DocFolderForUser from "@/components/chat/room/drawers/docFolderForUser";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { BranchIcon, WebgalIcon, XMarkICon } from "@/icons";

type SubPane = "map" | "initiative" | "webgal" | "thread" | "doc";

function isSubRoomDrawerState(state: string): state is "map" | "thread" | "webgal" | "doc" {
  return state === "map" || state === "thread" || state === "webgal" || state === "doc";
}

function SubRoomWindowImpl() {
  const roomContext = React.use(RoomContext);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);

  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const docFolderDrawerWidth = useDrawerPreferenceStore(state => state.docFolderDrawerWidth);
  const initiativeDrawerWidth = useDrawerPreferenceStore(state => state.initiativeDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const resolvedUserDrawerWidth = Math.min(620, Math.max(240, userDrawerWidth));
  const resolvedRoleDrawerWidth = Math.min(620, Math.max(240, roleDrawerWidth));
  const resolvedDocFolderDrawerWidth = Math.min(760, Math.max(280, docFolderDrawerWidth));
  const resolvedInitiativeDrawerWidth = Math.min(760, Math.max(320, initiativeDrawerWidth));
  const resolvedExportDrawerWidth = Math.min(760, Math.max(280, exportDrawerWidth));

  const [isOpen, setIsOpen] = React.useState(false);
  const [activePane, setActivePane] = React.useState<SubPane>("map");
  const threadVirtuosoRef = React.useRef<VirtuosoHandle | null>(null);

  const webgalPreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const isRealtimeRenderEnabled = useRealtimeRenderStore(state => state.enabled);
  const setRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);
  const prevSideDrawerStateRef = React.useRef(sideDrawerState);

  React.useEffect(() => {
    const prevSideDrawerState = prevSideDrawerStateRef.current;
    prevSideDrawerStateRef.current = sideDrawerState;

    if (sideDrawerState === "map") {
      setIsOpen(true);
      setActivePane("map");
    }
    else if (sideDrawerState === "thread") {
      setIsOpen(true);
      setActivePane("thread");
    }
    else if (sideDrawerState === "webgal") {
      setIsOpen(true);
      setActivePane("webgal");
    }
    else if (sideDrawerState === "doc") {
      setIsOpen(true);
      setActivePane("doc");
    }
    else if (sideDrawerState === "none" && isSubRoomDrawerState(prevSideDrawerState)) {
      setIsOpen(false);
      if (isRealtimeRenderEnabled) {
        setRealtimeRenderEnabled(false);
      }
    }
  }, [isRealtimeRenderEnabled, setRealtimeRenderEnabled, sideDrawerState]);

  const threadMessages = React.useMemo(() => {
    if (!threadRootMessageId) {
      return [];
    }
    const allMessages = roomContext.chatHistory?.messages ?? [];
    return allMessages.filter(message => message.message.threadId === threadRootMessageId);
  }, [roomContext.chatHistory?.messages, threadRootMessageId]);

  // 预留左侧聊天区的“最小可用宽度”。当左侧已经无法继续缩小时，
  // SubRoomWindow 也不允许继续拖宽，避免整体溢出。
  // 这里额外考虑了 RoomSideDrawers（user/role/docFolder/initiative/export）当前占用宽度。
  const minRemainingWidth = React.useMemo(() => {
    const baseMinChatWidth = 520;

    let lightDrawerWidth = 0;
    if (sideDrawerState === "user") {
      lightDrawerWidth = resolvedUserDrawerWidth;
    }
    else if (sideDrawerState === "role") {
      lightDrawerWidth = resolvedRoleDrawerWidth;
    }
    else if (sideDrawerState === "docFolder") {
      lightDrawerWidth = resolvedDocFolderDrawerWidth;
    }
    else if (sideDrawerState === "initiative") {
      lightDrawerWidth = resolvedInitiativeDrawerWidth;
    }
    else if (sideDrawerState === "export") {
      lightDrawerWidth = resolvedExportDrawerWidth;
    }
    return baseMinChatWidth + lightDrawerWidth;
  }, [
    resolvedDocFolderDrawerWidth,
    resolvedExportDrawerWidth,
    resolvedInitiativeDrawerWidth,
    resolvedRoleDrawerWidth,
    resolvedUserDrawerWidth,
    sideDrawerState,
  ]);

  const { minWidth, maxWidth } = React.useMemo(() => {
    const w = typeof window === "undefined" ? 1200 : window.innerWidth;

    switch (activePane) {
      case "initiative": {
        const min = 380;
        const max = 640;
        return { minWidth: min, maxWidth: max };
      }
      case "webgal":
      default: {
        const min = 560;
        const max = typeof window === "undefined" ? 1100 : Math.max(min, w - minRemainingWidth);
        return { minWidth: min, maxWidth: max };
      }
    }
  }, [activePane, minRemainingWidth]);

  const title = activePane === "map"
    ? "地图"
    : activePane === "thread"
      ? "子区"
      : activePane === "initiative"
        ? "先攻栏"
        : activePane === "doc"
          ? "文档"
          : "WebGAL 预览";

  const close = React.useCallback(() => {
    setIsOpen(false);
    if (isRealtimeRenderEnabled) {
      setRealtimeRenderEnabled(false);
    }
    if (isSubRoomDrawerState(sideDrawerState)) {
      setSideDrawerState("none");
    }
  }, [isRealtimeRenderEnabled, setRealtimeRenderEnabled, setSideDrawerState, sideDrawerState]);

  return (
    <OpenAbleDrawer
      isOpen={isOpen}
      className="h-full shrink-0"
      initialWidth={subRoomWindowWidth}
      minWidth={minWidth}
      maxWidth={maxWidth}
      minRemainingWidth={minRemainingWidth}
      onWidthChange={setSubRoomWindowWidth}
      handlePosition="left"
    >
      <div className="h-full flex flex-col min-h-0 bg-base-200 dark:bg-slate-950/25 backdrop-blur-xl border-l border-base-300 shadow-none">
        <div className="border-gray-300 dark:border-gray-700 border-t border-b flex justify-between items-center overflow-visible relative z-50">
          <div className="flex justify-between items-center w-full px-2 h-10">
            <div className="flex items-center gap-2 min-w-0">
              {activePane === "map" && <CheckerboardIcon className="size-5 opacity-80" />}
              {activePane === "thread" && <BranchIcon className="size-5 opacity-80" />}
              {activePane === "initiative" && <SwordIcon className="size-5 opacity-80" />}
              {activePane === "doc" && <FileTextIcon className="size-5 opacity-80" />}
              {activePane === "webgal" && <WebgalIcon className="size-5 opacity-80" />}
              <span className="text-center font-semibold line-clamp-1 truncate min-w-0 text-sm sm:text-base">
                {title}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`tooltip tooltip-bottom ${activePane === "thread" ? "text-primary" : "hover:text-info"}`}
                data-tip="子区"
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7 p-0"
                  aria-label="子区"
                  onClick={() => {
                    setActivePane("thread");
                    setSideDrawerState("thread");
                  }}
                >
                  <BranchIcon className="size-5" />
                </button>
              </div>
              <div
                className={`tooltip tooltip-bottom ${activePane === "doc" ? "text-primary" : "hover:text-info"}`}
                data-tip="文档"
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7 p-0"
                  aria-label="文档"
                  onClick={() => {
                    setActivePane("doc");
                    setSideDrawerState("doc");
                  }}
                >
                  <FileTextIcon className="size-5" />
                </button>
              </div>

              <div className="h-5 w-[2px] bg-base-content/35 mx-1 rounded-full" aria-hidden />

              <div
                className={`tooltip tooltip-bottom ${activePane === "map" ? "text-primary" : "hover:text-info"}`}
                data-tip="地图"
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7 p-0"
                  aria-label="地图"
                  onClick={() => {
                    setActivePane("map");
                    setSideDrawerState("map");
                  }}
                >
                  <CheckerboardIcon className="size-5" />
                </button>
              </div>
              <div
                className={`tooltip tooltip-bottom ${activePane === "initiative" ? "text-primary" : "hover:text-info"}`}
                data-tip="先攻"
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7 p-0"
                  aria-label="先攻栏"
                  onClick={() => setActivePane("initiative")}
                >
                  <SwordIcon className="size-5" />
                </button>
              </div>
              <div
                className={`tooltip tooltip-bottom ${activePane === "webgal" ? "text-primary" : "hover:text-info"}`}
                data-tip="WebGAL"
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7 p-0"
                  aria-label="WebGAL 预览"
                  onClick={() => {
                    setActivePane("webgal");
                    setSideDrawerState("webgal");
                  }}
                >
                  <WebgalIcon className="size-5" />
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7"
                aria-label="关闭"
                title="关闭"
                onClick={close}
              >
                <XMarkICon className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {activePane === "map" && (
            <div className="overflow-auto h-full">
              <DNDMap />
            </div>
          )}
          {activePane === "thread" && (
            <div className="h-full">
              {threadRootMessageId
                ? (
                    <ChatFrame
                      virtuosoRef={threadVirtuosoRef}
                      messagesOverride={threadMessages}
                      enableWsSync={false}
                      enableEffects={false}
                      enableUnreadIndicator={false}
                      isMessageMovable={() => false}
                    />
                  )
                : (
                    <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                      请选择要查看的子区
                    </div>
                  )}
            </div>
          )}
          {activePane === "initiative" && (
            <div className="overflow-auto h-full">
              <InitiativeList />
            </div>
          )}
          {activePane === "doc" && (
            <div className="h-full overflow-hidden">
              <DocFolderForUser />
            </div>
          )}
          {activePane === "webgal" && (
            <WebGALPreview
              previewUrl={webgalPreviewUrl}
              isActive={isRealtimeRenderActive}
              onClose={close}
              className="h-full"
            />
          )}
        </div>
      </div>
    </OpenAbleDrawer>
  );
}

const SubRoomWindow = React.memo(SubRoomWindowImpl);
export default SubRoomWindow;
