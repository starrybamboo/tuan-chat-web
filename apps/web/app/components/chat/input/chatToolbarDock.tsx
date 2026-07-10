import { FilmSlateIcon } from "@phosphor-icons/react";

import { isRunSideDrawerState } from "@/components/chat/room/runSideDrawerState";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { BranchIcon, WebgalIcon } from "@/icons";

type ChatToolbarDockProps = {
  isInline: boolean;
  isRunModeOnly: boolean;
  showWebgalControls?: boolean;
  onSendEffect?: (effectName: string) => void;
  onClearBackground?: () => void;
  onClearFigure?: () => void;
  isSpectator?: boolean;
  onToggleRealtimeRender?: () => void;
  onOpenFullMessageDiff?: () => void;
  isFullMessageDiffOpen?: boolean;
  showRunControls?: boolean;
}

export default function ChatToolbarDock({
  isInline,
  showWebgalControls,
  onSendEffect,
  onToggleRealtimeRender,
  onOpenFullMessageDiff,
  isFullMessageDiffOpen = false,
}: ChatToolbarDockProps) {
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const realtimeRenderStatus = useRealtimeRenderStore(state => state.status);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const webgalOpen = useSideDrawerStore(state => state.webgalOpen);
  const setWebgalOpen = useSideDrawerStore(state => state.setWebgalOpen);
  const handleToggleWebgalDrawer = () => {
    if (webgalOpen) {
      setWebgalOpen(false);
      return;
    }
    if (sideDrawerState !== "none" && !isRunSideDrawerState(sideDrawerState)) {
      setSideDrawerState("none");
    }
    setWebgalOpen(true);
    if (!isRealtimeRenderActive && realtimeRenderStatus !== "initializing") {
      void onToggleRealtimeRender?.();
    }
  };

  return (
    <div
      className={`
        flex
        ${isInline ? "mr-2 h-6 items-center gap-2 flex-nowrap" : `
          mt-1 items-center gap-2 flex-wrap justify-end grow
        `}
      `}
    >
      {/* WebGAL 导演控制台 */}
      {showWebgalControls && webgalLinkMode && onSendEffect && (
        <div className={`
          dropdown dropdown-top dropdown-center md:dropdown-end
          ${isInline ? "inline-flex h-6 items-center" : "mt-0.5 md:mt-1"}
        `}>
          <button type="button" className="
            tooltip tooltip-top inline-flex h-6 items-center
            hover:text-info
          " data-tip="导演控制台" aria-label="导演控制台" title="导演控制台">
            <FilmSlateIcon className="size-6" />
          </button>
          <ul className="
            dropdown-content z-9999 menu p-2 shadow bg-base-100 rounded-box w-52
            mb-2
          ">
            {onSendEffect && (
              <>
                <li><button type="button" onClick={() => onSendEffect("rain")}>🌧️ 下雨</button></li>
                <li><button type="button" onClick={() => onSendEffect("snow")}>❄️ 下雪</button></li>
                <li><button type="button" onClick={() => onSendEffect("sakura")}>🌸 樱花</button></li>
                <li><button type="button" onClick={() => onSendEffect("none")}>🛑 停止特效</button></li>
              </>
            )}
          </ul>
        </div>
      )}

      {showWebgalControls && webgalLinkMode && onOpenFullMessageDiff && (
        <button
          type="button"
          className={`
            tooltip tooltip-top inline-flex h-6 items-center
            ${isInline ? "" : "mt-0.5 md:mt-1"}
            ${isFullMessageDiffOpen ? `text-info` : `hover:text-info`}
          `}
          data-tip={isFullMessageDiffOpen ? "关闭消息差异" : "消息差异"}
          aria-label="消息差异"
          title="消息差异"
          onClick={onOpenFullMessageDiff}
        >
          <BranchIcon className="size-6 cursor-pointer" />
        </button>
      )}

      {/* WebGAL 入口：打开独立预览侧栏，实时渲染开关留在侧栏内部。 */}
      {showWebgalControls && webgalLinkMode && onToggleRealtimeRender && (
        <button
          type="button"
          className={`
            tooltip tooltip-top inline-flex h-6 items-center
            ${isInline ? "" : "mt-0.5 md:mt-1"}
            ${webgalOpen ? `text-info` : isRealtimeRenderActive ? `
              text-success
            ` : `hover:text-info`}
          `}
          data-tip={webgalOpen ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"}
          aria-label={webgalOpen ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"}
          title={webgalOpen ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"}
          onClick={handleToggleWebgalDrawer}
        >
          <WebgalIcon className={`
            size-5 cursor-pointer
            ${isInline ? "" : "mb-2 md:mb-0"}
            ${isRealtimeRenderActive ? `animate-pulse` : ""}
          `} />
        </button>
      )}
    </div>
  );
}
