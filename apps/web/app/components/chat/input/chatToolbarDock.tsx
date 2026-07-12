import { FilmSlateIcon } from "@phosphor-icons/react";

import { isRunSideDrawerState } from "@/components/chat/room/runSideDrawerState";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import PortalTooltip from "@/components/common/portalTooltip";
import { DropdownMenu, MenuItem } from "@/components/common/MenuPopover";
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
        <PortalTooltip label="导演控制台" placement="top">
          <DropdownMenu
            ariaLabel="导演控制台"
            placement="top-end"
            className={isInline ? "h-6 items-center" : "mt-0.5 md:mt-1"}
            menuClassName="z-9999 w-52 p-2 shadow"
            trigger={(
              <button type="button" className="inline-flex h-6 items-center hover:text-info" aria-label="导演控制台" title="导演控制台">
                <FilmSlateIcon className="size-6" />
              </button>
            )}
          >
            {onSendEffect && (
              <>
                <li role="none"><MenuItem onClick={() => onSendEffect("rain")}>🌧️ 下雨</MenuItem></li>
                <li role="none"><MenuItem onClick={() => onSendEffect("snow")}>❄️ 下雪</MenuItem></li>
                <li role="none"><MenuItem onClick={() => onSendEffect("sakura")}>🌸 樱花</MenuItem></li>
                <li role="none"><MenuItem onClick={() => onSendEffect("none")}>🛑 停止特效</MenuItem></li>
              </>
            )}
          </DropdownMenu>
        </PortalTooltip>
      )}

      {showWebgalControls && webgalLinkMode && onOpenFullMessageDiff && (
        <PortalTooltip label={isFullMessageDiffOpen ? "关闭消息差异" : "消息差异"} placement="top">
          <button
            type="button"
            className={`
            inline-flex h-6 items-center
            ${isInline ? "" : "mt-0.5 md:mt-1"}
            ${isFullMessageDiffOpen ? `text-info` : `hover:text-info`}
          `}
          aria-label="消息差异"
          title="消息差异"
          onClick={onOpenFullMessageDiff}
        >
          <BranchIcon className="size-6 cursor-pointer" />
          </button>
        </PortalTooltip>
      )}

      {/* WebGAL 入口：打开独立预览侧栏，实时渲染开关留在侧栏内部。 */}
      {showWebgalControls && webgalLinkMode && onToggleRealtimeRender && (
        <PortalTooltip label={webgalOpen ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"} placement="top">
          <button
            type="button"
            className={`
            inline-flex h-6 items-center
            ${isInline ? "" : "mt-0.5 md:mt-1"}
            ${webgalOpen ? `text-info` : isRealtimeRenderActive ? `
              text-success
            ` : `hover:text-info`}
          `}
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
        </PortalTooltip>
      )}
    </div>
  );
}
