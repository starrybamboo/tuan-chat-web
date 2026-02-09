import { CheckerboardIcon, FileTextIcon, FilmSlateIcon, SwordIcon } from "@phosphor-icons/react";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { WebgalIcon } from "@/icons";

interface ChatToolbarDockProps {
  isInline: boolean;
  isRunModeOnly: boolean;
  isMobileLinkCompact: boolean;
  showWebgalControls?: boolean;
  onInsertWebgalCommandPrefix?: () => void;
  defaultFigurePosition?: "left" | "center" | "right";
  onSetDefaultFigurePosition?: (position: "left" | "center" | "right" | undefined) => void;
  onToggleDialogNotend?: () => void;
  onToggleDialogConcat?: () => void;
  onSendEffect?: (effectName: string) => void;
  onClearBackground?: () => void;
  onClearFigure?: () => void;
  onSetWebgalVar?: (key: string, expr: string) => Promise<void> | void;
  onOpenWebgalVarModal?: () => void;
  isSpectator?: boolean;
  onToggleRealtimeRender?: () => void;
  showRunControls?: boolean;
}

export default function ChatToolbarDock({
  isInline,
  isRunModeOnly,
  isMobileLinkCompact,
  showWebgalControls,
  onInsertWebgalCommandPrefix,
  defaultFigurePosition,
  onSetDefaultFigurePosition,
  onToggleDialogNotend,
  onToggleDialogConcat,
  onSendEffect,
  onClearBackground,
  onClearFigure,
  onSetWebgalVar,
  onOpenWebgalVarModal,
  isSpectator,
  onToggleRealtimeRender,
  showRunControls,
}: ChatToolbarDockProps) {
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const dialogNotend = useRoomPreferenceStore(state => state.dialogNotend);
  const dialogConcat = useRoomPreferenceStore(state => state.dialogConcat);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const defaultFigurePositionEffective = defaultFigurePosition ?? undefined;
  return (
    <div
      className={`flex ${isInline ? "mr-2 items-start gap-2 flex-nowrap" : "mt-1 items-center gap-2 flex-wrap justify-end grow"} ${
        isInline && showRunControls && isRunModeOnly ? "min-h-8" : ""
      }`}
    >
      {/* WebGAL 指令按钮（仅在联动模式下显示）：点击后给输入框插入 % ǰ׺ */}
      {showWebgalControls && webgalLinkMode && onInsertWebgalCommandPrefix && !isMobileLinkCompact && (
        <div className="tooltip tooltip-top" data-tip="WebGAL 指令（插入 % 前缀）">
          <button
            type="button"
            className="btn btn-xs btn-ghost border border-base-300 md:mt-1"
            onClick={onInsertWebgalCommandPrefix}
          >
            %指令
          </button>
        </div>
      )}

      {/* 默认立绘位置选择器（仅在联动模式下显示） */}
      {showWebgalControls && webgalLinkMode && onSetDefaultFigurePosition && !isMobileLinkCompact && (
        <div className="flex items-center gap-1">
          <div className="tooltip tooltip-top" data-tip="本角色默认位置（点击取消选择）">
            <div className="join">
              {(["left", "center", "right"] as const).map(pos => (
                <button
                  key={pos}
                  type="button"
                  className={`join-item btn btn-xs px-2 md:mt-1 ${defaultFigurePositionEffective === pos ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                    if (defaultFigurePositionEffective === pos) {
                      onSetDefaultFigurePosition?.(undefined);
                    }
                    else {
                      onSetDefaultFigurePosition?.(pos);
                    }
                  }}
                  title={`设置角色默认位置为${pos === "left" ? "左" : pos === "center" ? "中" : "右"}（再次点击取消）`}
                >
                  {pos === "left" ? "左" : pos === "center" ? "中" : "右"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WebGAL 对话参数：-notend 和 -concat（仅在联动模式下显示） */}
      {showWebgalControls && webgalLinkMode && (onToggleDialogNotend || onToggleDialogConcat) && (
        <div className="flex items-center gap-2 text-xs md:mt-2">
          {onToggleDialogNotend && (
            <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary rounded-none"
                checked={!!dialogNotend}
                onChange={onToggleDialogNotend}
              />
              <span className="tooltip tooltip-top" data-tip="此话不停顿，文字展示完立即执行下一句">不停顿</span>
            </label>
          )}
          {onToggleDialogConcat && (
            <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary rounded-none"
                checked={!!dialogConcat}
                onChange={onToggleDialogConcat}
              />
              <span className="tooltip tooltip-top" data-tip="续接上段话，本句对话连接在上一句对话之后">续接</span>
            </label>
          )}
        </div>
      )}

      {/* WebGAL 导演控制台 */}
      {showWebgalControls && webgalLinkMode && onSendEffect && (
        <div className="dropdown dropdown-top dropdown-center md:dropdown-end mt-0.5 md:mt-1">
          <div tabIndex={0} role="button" className="tooltip tooltip-top hover:text-info" data-tip="导演控制台" aria-label="导演控制台" title="导演控制台">
            <FilmSlateIcon className="size-6" />
          </div>
          <ul tabIndex={0} className="dropdown-content z-9999 menu p-2 shadow bg-base-100 rounded-box w-52 mb-2">
            {onSendEffect && (
              <>
                <li><a onClick={() => onSendEffect("rain")}>🌧️ 下雨</a></li>
                <li><a onClick={() => onSendEffect("snow")}>❄️ 下雪</a></li>
                <li><a onClick={() => onSendEffect("sakura")}>🌸 樱花</a></li>
                <li><a onClick={() => onSendEffect("none")}>🛑 停止特效</a></li>
              </>
            )}
            {(onClearBackground || onClearFigure) && (
              <>
                <li className="divider my-1" role="separator"></li>
                {onClearBackground && <li><a onClick={onClearBackground}>🗑️ 清除背景</a></li>}
                {onClearFigure && <li><a onClick={onClearFigure}>👤 清除立绘</a></li>}
              </>
            )}
            {onSetWebgalVar && !isSpectator && (
              <>
                <li className="divider my-1" role="separator"></li>
                <li>
                  <a onClick={onOpenWebgalVarModal}>设置变量…</a>
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* 实时渲染按钮：仅在联动模式开启时展示 */}
      {showWebgalControls && webgalLinkMode && onToggleRealtimeRender && (
        <div
          className={`tooltip tooltip-top mt-0.5 md:mt-1 ${isRealtimeRenderActive ? "text-success" : "hover:text-info"}`}
          data-tip={isRealtimeRenderActive ? "关闭实时渲染" : "开启实时渲染"}
          onClick={onToggleRealtimeRender}
        >
          <WebgalIcon className={`size-5 cursor-pointer mb-2 md:mb-0 ${isRealtimeRenderActive ? "animate-pulse" : ""}`} />
        </div>
      )}

      {showRunControls && runModeEnabled && (
        <div className="flex gap-2 ml-0.5 mb-1 md:mb-0 md:mt-1">
          <div
            className="tooltip tooltip-top hover:text-info"
            data-tip="我的文档"
            data-side-drawer-toggle="true"
            onClick={() => setSideDrawerState(sideDrawerState === "docFolder" ? "none" : "docFolder")}
          >
            <FileTextIcon className="size-6" />
          </div>

          <div className="tooltip tooltip-top" data-tip="展示先攻表" data-side-drawer-toggle="true" onClick={() => setSideDrawerState(sideDrawerState === "initiative" ? "none" : "initiative")}>
            <SwordIcon className="size-6 jump_icon" />
          </div>

          <div
            className="tooltip tooltip-top"
            data-tip="地图"
            data-side-drawer-toggle="true"
            onClick={() => setSideDrawerState(sideDrawerState === "map" ? "none" : "map")}
          >
            <CheckerboardIcon className="size-6 jump_icon" />
          </div>
        </div>
      )}
    </div>
  );
}
