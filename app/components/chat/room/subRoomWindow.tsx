import React from "react";
import ClueDrawer from "@/components/chat/clues/clueDrawer";
import CombatDrawer from "@/components/chat/room/drawers/combatDrawer";
import RunSideDrawerButtons from "@/components/chat/room/runSideDrawerButtons";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { XMarkICon } from "@/icons";

type SubPane = "map" | "combat" | "clue";

function isCombatDrawerState(state: string): boolean {
  return state === "combat" || state === "initiative" || state === "state";
}

function isSubRoomDrawerState(state: string): state is "map" | "combat" | "clue" | "initiative" | "state" {
  return state === "map" || state === "clue" || isCombatDrawerState(state);
}

function SubRoomWindowImpl() {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const resolvedUserDrawerWidth = Math.min(620, Math.max(240, userDrawerWidth));
  const resolvedRoleDrawerWidth = Math.min(620, Math.max(240, roleDrawerWidth));
  const resolvedExportDrawerWidth = Math.min(760, Math.max(280, exportDrawerWidth));

  const [isOpen, setIsOpen] = React.useState(false);
  const [activePane, setActivePane] = React.useState<SubPane>("map");
  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const setRunModeEnabled = useRoomPreferenceStore(state => state.setRunModeEnabled);

  const prevSideDrawerStateRef = React.useRef(sideDrawerState);

  React.useEffect(() => {
    if (runModeEnabled && sideDrawerState === "none") {
      setSideDrawerState("map");
    }
  }, [runModeEnabled, setSideDrawerState, sideDrawerState]);

  React.useEffect(() => {
    const prevSideDrawerState = prevSideDrawerStateRef.current;
    prevSideDrawerStateRef.current = sideDrawerState;

    if (sideDrawerState === "map") {
      setIsOpen(true);
      setActivePane("map");
      setRunModeEnabled(true);
    }
    else if (isCombatDrawerState(sideDrawerState)) {
      setIsOpen(true);
      setActivePane("combat");
      setRunModeEnabled(true);
    }
    else if (sideDrawerState === "clue") {
      setIsOpen(true);
      setActivePane("clue");
      setRunModeEnabled(true);
    }
    else if (!isSubRoomDrawerState(sideDrawerState) && isSubRoomDrawerState(prevSideDrawerState)) {
      setIsOpen(false);
      setRunModeEnabled(false);
    }
  }, [setRunModeEnabled, sideDrawerState]);

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
    setIsOpen(false);
    setRunModeEnabled(false);
    if (isSubRoomDrawerState(sideDrawerState)) {
      setSideDrawerState("none");
    }
  }, [setRunModeEnabled, setSideDrawerState, sideDrawerState]);

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
      animationDuration={0.16}
    >
      <div className="h-full flex flex-col min-h-0 bg-base-200 dark:bg-slate-950/25 backdrop-blur-xl border-l border-base-300 shadow-none">
        <div className="border-gray-300 dark:border-gray-700 border-y flex justify-between items-center overflow-visible relative z-50">
          <div className="flex justify-between items-center w-full h-10">
            <div className="flex h-full shrink-0 items-center border-r border-base-300 px-1">
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
    </OpenAbleDrawer>
  );
}

const SubRoomWindow = React.memo(SubRoomWindowImpl);
export default SubRoomWindow;
