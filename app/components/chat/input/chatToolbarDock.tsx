import { FilmSlateIcon, Sparkle } from "@phosphor-icons/react";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { BranchIcon, WebgalIcon } from "@/icons";

interface ChatToolbarDockProps {
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
  showCopilotControl?: boolean;
}

export default function ChatToolbarDock({
  isInline,
  showWebgalControls,
  onSendEffect,
  onToggleRealtimeRender,
  onOpenFullMessageDiff,
  isFullMessageDiffOpen = false,
  showCopilotControl = false,
}: ChatToolbarDockProps) {
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const realtimeRenderStatus = useRealtimeRenderStore(state => state.status);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const isCopilotControlTemporarilyHidden = true;
  const handleToggleCopilotDrawer = () => {
    setSideDrawerState(sideDrawerState === "copilot" ? "none" : "copilot");
  };
  const handleToggleWebgalDrawer = () => {
    if (sideDrawerState === "webgal") {
      setSideDrawerState("none");
      return;
    }
    setSideDrawerState("webgal");
    if (!isRealtimeRenderActive && realtimeRenderStatus !== "initializing") {
      void onToggleRealtimeRender?.();
    }
  };

  return (
    <div
      className={`flex ${isInline ? "mr-2 items-start gap-2 flex-nowrap" : "mt-1 items-center gap-2 flex-wrap justify-end grow"}`}
    >
      {/* 暂时隐藏：AI 对话按钮后续继续开发时再恢复显示。 */}
      {showCopilotControl && !isCopilotControlTemporarilyHidden && (
        <div
          className={`tooltip tooltip-top mt-0.5 md:mt-1 ${sideDrawerState === "copilot" ? "text-info" : "hover:text-info"}`}
          data-tip={sideDrawerState === "copilot" ? "关闭 AI 对话" : "AI 对话"}
          data-side-drawer-toggle="true"
          aria-label={sideDrawerState === "copilot" ? "关闭 AI 对话" : "打开 AI 对话"}
          title={sideDrawerState === "copilot" ? "关闭 AI 对话" : "AI 对话"}
          onClick={handleToggleCopilotDrawer}
        >
          <Sparkle className="size-6 cursor-pointer" />
        </div>
      )}

      {/* WebGAL 导演控制台 */}
      {showWebgalControls && webgalLinkMode && onSendEffect && (
        <div className="dropdown dropdown-top dropdown-center md:dropdown-end mt-0.5 md:mt-1">
          <button type="button" className="tooltip tooltip-top hover:text-info" data-tip="导演控制台" aria-label="导演控制台" title="导演控制台">
            <FilmSlateIcon className="size-6" />
          </button>
          <ul className="dropdown-content z-9999 menu p-2 shadow bg-base-100 rounded-box w-52 mb-2">
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
          className={`tooltip tooltip-top mt-0.5 md:mt-1 ${isFullMessageDiffOpen ? "text-info" : "hover:text-info"}`}
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
          className={`tooltip tooltip-top mt-0.5 md:mt-1 ${sideDrawerState === "webgal" ? "text-info" : isRealtimeRenderActive ? "text-success" : "hover:text-info"}`}
          data-tip={sideDrawerState === "webgal" ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"}
          aria-label={sideDrawerState === "webgal" ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"}
          title={sideDrawerState === "webgal" ? "关闭 WebGAL 预览" : "打开 WebGAL 预览"}
          onClick={handleToggleWebgalDrawer}
        >
          <WebgalIcon className={`size-5 cursor-pointer mb-2 md:mb-0 ${isRealtimeRenderActive ? "animate-pulse" : ""}`} />
        </button>
      )}
    </div>
  );
}
