import { CheckerboardIcon, SwordIcon } from "@phosphor-icons/react";
import React from "react";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { WebgalIcon, XMarkICon } from "@/icons";

type SubPane = "map" | "initiative" | "webgal";

function SubRoomWindowImpl() {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);

  const [isOpen, setIsOpen] = React.useState(false);
  const [activePane, setActivePane] = React.useState<SubPane>("map");

  const webgalPreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);

  React.useEffect(() => {
    if (sideDrawerState === "map") {
      setIsOpen(true);
      setActivePane("map");
    }
    if (sideDrawerState === "webgal") {
      setIsOpen(true);
      setActivePane("webgal");
    }
  }, [sideDrawerState]);

  // 预留左侧聊天区的“最小可用宽度”。当左侧已经无法继续缩小时，
  // SubRoomWindow 也不允许继续拖宽，避免整体溢出。
  // 这里额外考虑了 RoomSideDrawers（user/role/export）可能占用的固定宽度。
  const minRemainingWidth = React.useMemo(() => {
    const baseMinChatWidth = 520;
    const fixedMemberDrawerWidth = 270;
    const docFolderDrawerWidth = 320;

    let lightDrawerWidth = 0;
    if (sideDrawerState === "user" || sideDrawerState === "role") {
      lightDrawerWidth = fixedMemberDrawerWidth;
    }
    else if (sideDrawerState === "docFolder") {
      lightDrawerWidth = docFolderDrawerWidth;
    }
    else if (sideDrawerState === "export") {
      lightDrawerWidth = exportDrawerWidth;
    }
    return baseMinChatWidth + lightDrawerWidth;
  }, [exportDrawerWidth, sideDrawerState]);

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
    : activePane === "initiative"
      ? "先攻栏"
      : "WebGAL 预览";

  const close = React.useCallback(() => {
    setIsOpen(false);
    if (sideDrawerState === "map" || sideDrawerState === "webgal") {
      setSideDrawerState("none");
    }
  }, [setSideDrawerState, sideDrawerState]);

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
              {activePane === "initiative" && <SwordIcon className="size-5 opacity-80" />}
              {activePane === "webgal" && <WebgalIcon className="size-5 opacity-80" />}
              <span className="text-center font-semibold line-clamp-1 truncate min-w-0 text-sm sm:text-base">
                {title}
              </span>
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-2 mr-1">
                <div
                  className={`tooltip tooltip-bottom ${activePane === "map" ? "text-primary" : "hover:text-info"}`}
                  data-tip="地图"
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label="地图"
                    onClick={() => setActivePane("map")}
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
                    className="btn btn-ghost btn-xs"
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
                    className="btn btn-ghost btn-xs"
                    aria-label="WebGAL 预览"
                    onClick={() => setActivePane("webgal")}
                  >
                    <WebgalIcon className="size-5" />
                  </button>
                </div>
              </div>
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
          {activePane === "map" && (
            <div className="overflow-auto h-full">
              <DNDMap />
            </div>
          )}
          {activePane === "initiative" && (
            <div className="overflow-auto h-full">
              <InitiativeList />
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
