import type { ClueMessage } from "../../../../api/models/ClueMessage";

import { CheckerboardIcon, SwordIcon } from "@phosphor-icons/react";
import React from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import ClueListForPL from "@/components/chat/room/drawers/clueListForPL";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import MessageThreadDrawer from "@/components/chat/room/drawers/messageThreadDrawer";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { ChatBubbleEllipsesOutline, Detective, WebgalIcon, XMarkICon } from "@/icons";
import ChatToolbarDock from "../input/chatToolbarDock";

export interface SubRoomWindowProps {
  onClueSend: (clue: ClueMessage) => void;
  stopRealtimeRender: () => void;
  onSendEffect?: (effectName: string) => void;
  onClearBackground?: () => void;
  onClearFigure?: () => void;
}

type SubPane = "thread" | "initiative" | "map" | "clue" | "webgal";

function SubRoomWindowImpl({ onClueSend, stopRealtimeRender, onSendEffect, onClearBackground, onClearFigure }: SubRoomWindowProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);

  const realtimePreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const setIsRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);
  const isWebgalResizing = false;

  const roomContext = React.use(RoomContext);
  const curMember = roomContext.curMember;
  const isSpectator = (curMember?.memberType ?? 3) >= 3;

  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const isRunModeOnly = runModeEnabled;

  const onToggleRealtimeRender = React.useCallback(() => {
    if (isRealtimeRenderActive) {
      stopRealtimeRender();
      setIsRealtimeRenderEnabled(false);
    }
    else {
      setIsRealtimeRenderEnabled(true);
    }
  }, [isRealtimeRenderActive, setIsRealtimeRenderEnabled, stopRealtimeRender]);

  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);

  const activePane: SubPane | null = React.useMemo(() => {
    if (sideDrawerState === "thread" || typeof threadRootMessageId === "number") {
      return "thread";
    }
    if (sideDrawerState === "initiative") {
      return "initiative";
    }
    if (sideDrawerState === "map") {
      return "map";
    }
    if (sideDrawerState === "clue") {
      return "clue";
    }
    if (sideDrawerState === "webgal") {
      return "webgal";
    }
    return null;
  }, [sideDrawerState, threadRootMessageId]);

  const isOpen = activePane !== null;
  const showRunControls = runModeEnabled && activePane !== "thread" && activePane !== "webgal";

  // 互斥：当用户打开其它右侧工具（initiative/map/clue/webgal）时，自动关闭 Thread。
  React.useEffect(() => {
    if (threadRootMessageId == null) {
      return;
    }
    if (sideDrawerState === "initiative" || sideDrawerState === "map" || sideDrawerState === "clue" || sideDrawerState === "webgal") {
      setComposerTarget("main");
      setThreadRootMessageId(undefined);
    }
  }, [sideDrawerState, setComposerTarget, setThreadRootMessageId, threadRootMessageId]);

  // 从 webgal pane 切走时，确保停止实时渲染（保持原 drawer 行为）。
  const prevPaneRef = React.useRef<SubPane | null>(null);
  React.useEffect(() => {
    const prev = prevPaneRef.current;
    prevPaneRef.current = activePane;

    if (prev === "webgal" && activePane !== "webgal") {
      stopRealtimeRender();
      setIsRealtimeRenderEnabled(false);
    }
  }, [activePane, setIsRealtimeRenderEnabled, stopRealtimeRender]);

  // 预留左侧聊天区的“最小可用宽度”。当左侧已经无法继续缩小时，SubRoomWindow 也不允许继续拖宽，避免整体溢出。
  // 这里额外考虑了 RoomSideDrawers（user/role/export）可能占据的固定宽度。
  const minRemainingWidth = React.useMemo(() => {
    const baseMinChatWidth = 520;
    const fixedMemberDrawerWidth = 270;
    const lightDrawerWidth = (sideDrawerState === "user" || sideDrawerState === "role")
      ? fixedMemberDrawerWidth
      : (sideDrawerState === "export")
          ? exportDrawerWidth
          : 0;
    return baseMinChatWidth + lightDrawerWidth;
  }, [exportDrawerWidth, sideDrawerState]);

  const { minWidth, maxWidth } = React.useMemo(() => {
    const w = typeof window === "undefined" ? 1200 : window.innerWidth;

    switch (activePane) {
      case "thread": {
        const min = 360;
        const max = typeof window === "undefined" ? 900 : Math.max(min, w - minRemainingWidth);
        return { minWidth: min, maxWidth: max };
      }
      case "initiative": {
        const min = 280;
        const max = 420;
        return { minWidth: min, maxWidth: max };
      }
      case "clue": {
        const min = 280;
        const max = 420;
        return { minWidth: min, maxWidth: max };
      }
      case "map": {
        const min = 560;
        const max = typeof window === "undefined" ? 1100 : Math.max(min, w - minRemainingWidth);
        return { minWidth: min, maxWidth: max };
      }
      case "webgal": {
        const min = 520;
        const max = typeof window === "undefined" ? 1100 : Math.max(min, w - minRemainingWidth);
        return { minWidth: min, maxWidth: max };
      }
      default: {
        return { minWidth: 360, maxWidth: 900 };
      }
    }
  }, [activePane, minRemainingWidth]);

  const { title, Icon } = React.useMemo(() => {
    switch (activePane) {
      case "thread":
        return { title: "子区", Icon: ChatBubbleEllipsesOutline };
      case "initiative":
        return { title: "先攻表", Icon: SwordIcon };
      case "map":
        return { title: "地图", Icon: CheckerboardIcon };
      case "clue":
        return { title: "线索", Icon: Detective };
      case "webgal":
        return { title: "WebGAL", Icon: WebgalIcon };
      default:
        return { title: "", Icon: null as any };
    }
  }, [activePane]);

  const close = React.useCallback(() => {
    if (activePane === "thread") {
      setComposerTarget("main");
      setThreadRootMessageId(undefined);
      return;
    }

    if (activePane === "webgal") {
      stopRealtimeRender();
      setIsRealtimeRenderEnabled(false);
    }

    setSideDrawerState("none");
  }, [activePane, setComposerTarget, setIsRealtimeRenderEnabled, setSideDrawerState, setThreadRootMessageId, stopRealtimeRender]);

  const content = React.useMemo(() => {
    switch (activePane) {
      case "thread":
        return <MessageThreadDrawer />;
      case "initiative":
        return (
          <div className="overflow-auto flex-1 min-h-0">
            <InitiativeList />
          </div>
        );
      case "map":
        return (
          <div className="overflow-auto h-full">
            <DNDMap />
          </div>
        );
      case "clue":
        return (
          <div className="overflow-auto flex-1 min-h-0">
            <ClueListForPL onSend={onClueSend} />
          </div>
        );
      case "webgal":
        // 给内容区加 padding，避免拖拽手柄被 Webgal 遮挡
        return (
          <div className="h-full" style={{ paddingLeft: 8 }}>
            <WebGALPreview
              previewUrl={realtimePreviewUrl}
              isActive={isRealtimeRenderActive}
              isResizing={isWebgalResizing}
              onClose={close}
            />
          </div>
        );
      default:
        return null;
    }
  }, [activePane, close, isRealtimeRenderActive, onClueSend, realtimePreviewUrl, isWebgalResizing]);

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
              {Icon
                ? (
                    <Icon className="size-5 opacity-80" />
                  )
                : null}
              <span className="text-center font-semibold line-clamp-1 truncate min-w-0 text-sm sm:text-base">
                {title}
              </span>
            </div>
            <div className="flex items-center">
              {activePane !== "thread" && (
                <ChatToolbarDock
                  isInline={true}
                  isRunModeOnly={isRunModeOnly}
                  isMobileLinkCompact={false}
                  showWebgalControls={false}
                  onInsertWebgalCommandPrefix={undefined}

                  onSendEffect={onSendEffect}
                  onClearBackground={onClearBackground}
                  onClearFigure={onClearFigure}
                  onSetWebgalVar={undefined}
                  isSpectator={isSpectator}

                  onToggleRealtimeRender={onToggleRealtimeRender}

                  showRunControls={showRunControls}
                />
              )}
              <button
                type="button"
                className="btn btn-ghost btn-square btn-sm"
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
          {content}
        </div>
      </div>
    </OpenAbleDrawer>
  );
}

const SubRoomWindow = React.memo(SubRoomWindowImpl);
export default SubRoomWindow;
