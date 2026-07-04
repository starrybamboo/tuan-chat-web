import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

import React from "react";

import ClueDrawer from "@/components/chat/clues/clueDrawer";
import CombatDrawer from "@/components/chat/room/drawers/combatDrawer";
import RunSideDrawerButtons from "@/components/chat/room/runSideDrawerButtons";
import { isCombatDrawerState, isRunSideDrawerState } from "@/components/chat/room/runSideDrawerState";
import { WebgalPreviewPanel } from "@/components/chat/room/webgalPreviewDrawer";
import {
  computeWebgalRunSplitMetrics,
  DEFAULT_WEBGAL_RUN_SPLIT_RATIO,
  WEBGAL_RUN_SPLIT_HANDLE_HEIGHT,
} from "@/components/chat/room/webgalRunSplitLayout";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { XMarkICon } from "@/icons";

type SubPane = "map" | "combat" | "clue";

const WEBGAL_RUN_SPLIT_KEYBOARD_STEP = 24;

function resolveActivePane(state: string): SubPane {
  if (state === "clue") {
    return "clue";
  }
  if (isCombatDrawerState(state)) {
    return "combat";
  }
  return "map";
}

function SubRoomWindowImpl() {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const webgalOpen = useSideDrawerStore(state => state.webgalOpen);
  const setWebgalOpen = useSideDrawerStore(state => state.setWebgalOpen);

  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const webgalRunSplitRatio = useDrawerPreferenceStore(state => state.webgalRunSplitRatio);
  const setWebgalRunSplitRatio = useDrawerPreferenceStore(state => state.setWebgalRunSplitRatio);
  const resolvedUserDrawerWidth = Math.min(620, Math.max(240, userDrawerWidth));
  const resolvedRoleDrawerWidth = Math.min(620, Math.max(240, roleDrawerWidth));
  const resolvedExportDrawerWidth = Math.min(760, Math.max(280, exportDrawerWidth));

  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const setRunModeEnabled = useRoomPreferenceStore(state => state.setRunModeEnabled);
  const isRunDrawerOpen = isRunSideDrawerState(sideDrawerState);
  const activePane = resolveActivePane(sideDrawerState);
  const splitEnabled = webgalOpen && isRunDrawerOpen;
  const [splitContainerNode, setSplitContainerNode] = React.useState<HTMLDivElement | null>(null);
  const [splitContainerHeight, setSplitContainerHeight] = React.useState(0);
  const [isDraggingWebgalRunSplit, setIsDraggingWebgalRunSplit] = React.useState(false);
  const dragCleanupRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (runModeEnabled && sideDrawerState === "none") {
      setSideDrawerState("map");
    }
  }, [runModeEnabled, setSideDrawerState, sideDrawerState]);

  React.useLayoutEffect(() => {
    if (!splitEnabled || !splitContainerNode) {
      queueMicrotask(() => setSplitContainerHeight(0));
      return;
    }

    const updateHeight = () => {
      setSplitContainerHeight(splitContainerNode.getBoundingClientRect().height);
    };
    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);
      return () => {
        window.removeEventListener("resize", updateHeight);
      };
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(splitContainerNode);
    return () => {
      observer.disconnect();
    };
  }, [splitContainerNode, splitEnabled]);

  React.useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };
  }, []);

  const splitMetrics = React.useMemo(() => computeWebgalRunSplitMetrics({
    containerHeight: splitContainerHeight,
    ratio: webgalRunSplitRatio,
  }), [splitContainerHeight, webgalRunSplitRatio]);

  React.useEffect(() => {
    if (!splitEnabled || splitMetrics.usableHeight <= 0) {
      return;
    }
    if (Math.abs(splitMetrics.ratio - webgalRunSplitRatio) < 0.0001) {
      return;
    }
    setWebgalRunSplitRatio(splitMetrics.ratio);
  }, [
    setWebgalRunSplitRatio,
    splitEnabled,
    splitMetrics.ratio,
    splitMetrics.usableHeight,
    webgalRunSplitRatio,
  ]);

  // 预留左侧聊天区的“最小可用宽度”。当左侧已经无法继续缩小时，
  // SubRoomWindow 也不允许继续拖宽，避免整体溢出。
  // 这里额外考虑了 RoomSideDrawers（user/role/export）当前占用宽度。
  const minRemainingWidth = React.useMemo(() => {
    const baseMinChatWidth = 520;

    let lightDrawerWidth = 0;
    if (sideDrawerState === "user") {
      lightDrawerWidth = resolvedUserDrawerWidth;
    }
    else if (sideDrawerState === "role") {
      lightDrawerWidth = resolvedRoleDrawerWidth;
    }
    else if (sideDrawerState === "export") {
      lightDrawerWidth = resolvedExportDrawerWidth;
    }
    return baseMinChatWidth + lightDrawerWidth;
  }, [
    resolvedExportDrawerWidth,
    resolvedRoleDrawerWidth,
    resolvedUserDrawerWidth,
    sideDrawerState,
  ]);

  const { minWidth, maxWidth } = React.useMemo(() => {
    const w = typeof window === "undefined" ? 1200 : window.innerWidth;
    const min = 560;
    const max = typeof window === "undefined" ? 1100 : Math.max(min, w - minRemainingWidth);
    return { minWidth: min, maxWidth: max };
  }, [minRemainingWidth]);

  const close = React.useCallback(() => {
    setRunModeEnabled(false);
    setWebgalOpen(false);
    if (isRunSideDrawerState(sideDrawerState)) {
      setSideDrawerState("none");
    }
  }, [setRunModeEnabled, setSideDrawerState, setWebgalOpen, sideDrawerState]);

  const updateSplitRatioFromClientY = React.useCallback((clientY: number) => {
    if (!splitContainerNode) {
      return;
    }

    const rect = splitContainerNode.getBoundingClientRect();
    const usableHeight = Math.max(1, rect.height - WEBGAL_RUN_SPLIT_HANDLE_HEIGHT);
    const rawRatio = (clientY - rect.top - WEBGAL_RUN_SPLIT_HANDLE_HEIGHT / 2) / usableHeight;
    const nextMetrics = computeWebgalRunSplitMetrics({
      containerHeight: rect.height,
      ratio: rawRatio,
    });
    setWebgalRunSplitRatio(nextMetrics.ratio);
  }, [setWebgalRunSplitRatio, splitContainerNode]);

  const shiftSplitBy = React.useCallback((delta: number) => {
    if (!splitEnabled || splitContainerHeight <= 0) {
      return;
    }

    const usableHeight = Math.max(1, splitContainerHeight - WEBGAL_RUN_SPLIT_HANDLE_HEIGHT);
    const nextMetrics = computeWebgalRunSplitMetrics({
      containerHeight: splitContainerHeight,
      ratio: (splitMetrics.webgalHeight + delta) / usableHeight,
    });
    setWebgalRunSplitRatio(nextMetrics.ratio);
  }, [
    setWebgalRunSplitRatio,
    splitContainerHeight,
    splitEnabled,
    splitMetrics.webgalHeight,
  ]);

  const handleSplitPointerDown = React.useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!splitEnabled || !splitContainerNode) {
      return;
    }

    dragCleanupRef.current?.();
    event.preventDefault();
    setIsDraggingWebgalRunSplit(true);
    updateSplitRatioFromClientY(event.clientY);

    const ownerDocument = event.currentTarget.ownerDocument;
    const previousUserSelect = ownerDocument.body.style.userSelect;
    const previousCursor = ownerDocument.body.style.cursor;
    ownerDocument.body.style.userSelect = "none";
    ownerDocument.body.style.cursor = "row-resize";

    function handlePointerMove(moveEvent: PointerEvent) {
      moveEvent.preventDefault();
      updateSplitRatioFromClientY(moveEvent.clientY);
    }

    function finishDrag() {
      ownerDocument.body.style.userSelect = previousUserSelect;
      ownerDocument.body.style.cursor = previousCursor;
      setIsDraggingWebgalRunSplit(false);
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", finishDrag, true);
      window.removeEventListener("pointercancel", finishDrag, true);
      dragCleanupRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", finishDrag, true);
    window.addEventListener("pointercancel", finishDrag, true);
    dragCleanupRef.current = finishDrag;
  }, [splitContainerNode, splitEnabled, updateSplitRatioFromClientY]);

  const handleSplitKeyDown = React.useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!splitEnabled) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      shiftSplitBy(-WEBGAL_RUN_SPLIT_KEYBOARD_STEP);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      shiftSplitBy(WEBGAL_RUN_SPLIT_KEYBOARD_STEP);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setWebgalRunSplitRatio(computeWebgalRunSplitMetrics({
        containerHeight: splitContainerHeight,
        ratio: 0,
      }).ratio);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setWebgalRunSplitRatio(computeWebgalRunSplitMetrics({
        containerHeight: splitContainerHeight,
        ratio: 1,
      }).ratio);
    }
  }, [setWebgalRunSplitRatio, shiftSplitBy, splitContainerHeight, splitEnabled]);

  const resetSplitRatio = React.useCallback(() => {
    setWebgalRunSplitRatio(DEFAULT_WEBGAL_RUN_SPLIT_RATIO);
  }, [setWebgalRunSplitRatio]);

  const topPaneStyle: CSSProperties | undefined = splitEnabled
    ? { height: `${splitMetrics.webgalHeight}px` }
    : undefined;
  const bottomPaneStyle: CSSProperties | undefined = splitEnabled
    ? { height: `${splitMetrics.runHeight}px` }
    : undefined;

  const runPanel = (
    <div className="
      h-full flex flex-col min-h-0 bg-base-200
      dark:bg-base-300/25
      backdrop-blur-xl
    ">
      <div className="
        border-base-300
        dark:border-base-300
        border-y flex justify-between items-center overflow-visible relative
        z-50
      ">
        <div className="flex justify-between items-center w-full h-10">
          <div className="
            flex h-full shrink-0 items-center border-r border-base-300 px-1
          ">
            <RunSideDrawerButtons
              tooltipPlacement="bottom"
            />
          </div>
          <div className="min-w-0 flex-1" />
          <div className="mr-2 flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-square btn-xs"
              aria-label="关闭侧窗"
              title="关闭侧窗"
              onClick={close}
            >
              <XMarkICon className="size-4" />
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
        {activePane === "combat" && (
          <div className="h-full overflow-hidden">
            <CombatDrawer />
          </div>
        )}
        {activePane === "clue" && (
          <div className="h-full overflow-hidden">
            <ClueDrawer />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <OpenAbleDrawer
      isOpen={isRunDrawerOpen}
      className="h-full shrink-0"
      width={subRoomWindowWidth}
      initialWidth={subRoomWindowWidth}
      minWidth={minWidth}
      maxWidth={maxWidth}
      minRemainingWidth={minRemainingWidth}
      onWidthChange={setSubRoomWindowWidth}
      handlePosition="left"
      animationDuration={0.16}
    >
      <div className="
        h-full flex flex-col min-h-0 bg-base-200
        dark:bg-base-300/25
        backdrop-blur-xl border-l border-base-300 shadow-none
      ">
        {splitEnabled
          ? (
              <div ref={setSplitContainerNode} className="flex h-full min-h-0 flex-col">
                <div
                  className="min-h-0 shrink-0 overflow-hidden border-b border-base-300"
                  style={topPaneStyle}
                >
                  <WebgalPreviewPanel
                    className="h-full"
                    isResizing={isDraggingWebgalRunSplit}
                  />
                </div>

                <button
                  type="button"
                  className={`
                    group flex shrink-0 items-center justify-center
                    cursor-row-resize touch-none transition-[background-color]
                    duration-150 focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-info/40
                    ${isDraggingWebgalRunSplit ? `
                      bg-base-300/80
                    ` : `hover:bg-base-300/55`}
                  `}
                  style={{ height: WEBGAL_RUN_SPLIT_HANDLE_HEIGHT }}
                  aria-label="调整 WebGAL 与跑团面板高度"
                  title="拖拽调整 WebGAL 与跑团面板高度"
                  onPointerDown={handleSplitPointerDown}
                  onKeyDown={handleSplitKeyDown}
                  onDoubleClick={resetSplitRatio}
                >
                  <div className={`
                    h-px w-full transition-colors
                    ${isDraggingWebgalRunSplit ? `bg-info/45` : `
                      bg-base-300/80
                      group-hover:bg-base-content/28
                    `}
                  `}></div>
                </button>

                <div
                  className="min-h-0 shrink-0 overflow-hidden"
                  style={bottomPaneStyle}
                >
                  {runPanel}
                </div>
              </div>
            )
          : runPanel}
      </div>
    </OpenAbleDrawer>
  );
}

const SubRoomWindow = React.memo(SubRoomWindowImpl);
export default SubRoomWindow;
