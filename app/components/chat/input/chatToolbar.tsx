import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";
import EmojiWindow from "@/components/chat/window/EmojiWindow";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  CommandSolid,
  Detective,
  EmojiIconWhite,
  GalleryBroken,
  LinkFilled,
  MusicNote,
  PointOnMapPerspectiveLinear,
  SendIcon,
  SparklesOutline,
  SwordSwing,
  WebgalIcon,
} from "@/icons";
import { useRef } from "react";

interface ChatToolbarProps {
  // 侧边栏状态
  sideDrawerState: SideDrawerState;
  setSideDrawerState: (state: SideDrawerState) => void;

  // 文件和表情处理
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateImgFiles: (updater: (draft: File[]) => void) => void;

  // 消息发送
  disableSendMessage: boolean;
  handleMessageSubmit: () => void;

  // AI重写：重写行为由快捷键触发；工具栏仅提供提示词编辑入口
  onAIRewrite?: (prompt: string) => void;
  // 新增：当前聊天状态 & 手动切换
  currentChatStatus: "idle" | "input" | "wait" | "leave";
  onChangeChatStatus: (status: "idle" | "input" | "wait" | "leave") => void;
  // 是否是观战成员
  isSpectator?: boolean;
  // 实时渲染相关
  isRealtimeRenderActive?: boolean;
  onToggleRealtimeRender?: () => void;
  // WebGAL 联动模式
  webgalLinkMode?: boolean;
  onToggleWebgalLinkMode?: () => void;
  // 自动回复模式
  autoReplyMode?: boolean;
  onToggleAutoReplyMode?: () => void;
  // 跑团模式
  runModeEnabled?: boolean;
  onToggleRunMode?: () => void;
  // 默认立绘位置
  defaultFigurePosition?: "left" | "center" | "right";
  onSetDefaultFigurePosition?: (position: "left" | "center" | "right") => void;
  // WebGAL 对话参数：-notend（此话不停顿）和 -concat（续接上段话）
  dialogNotend?: boolean;
  onToggleDialogNotend?: () => void;
  dialogConcat?: boolean;
  onToggleDialogConcat?: () => void;

  // WebGAL 控制
  onSendEffect?: (effectName: string) => void;
  onClearBackground?: () => void;
  onClearFigure?: () => void;
  // 发送音频
  setAudioFile?: (file: File | null) => void;
}

export function ChatToolbar({
  sideDrawerState,
  setSideDrawerState,
  updateEmojiUrls,
  updateImgFiles,
  disableSendMessage,
  handleMessageSubmit,
  currentChatStatus,
  onChangeChatStatus,
  isSpectator = false,
  isRealtimeRenderActive = false,
  onToggleRealtimeRender,
  webgalLinkMode = false,
  onToggleWebgalLinkMode,
  runModeEnabled = false,
  onToggleRunMode,
  defaultFigurePosition,
  onSetDefaultFigurePosition,
  dialogNotend = false,
  onToggleDialogNotend,
  dialogConcat = false,
  onToggleDialogConcat,
  onSendEffect,
  onClearBackground,
  onClearFigure,
  setAudioFile,
}: ChatToolbarProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !setAudioFile)
      return;

    setAudioFile(file);
    // 重置 input value，允许重复选择同一文件
    e.target.value = "";
  };

  return (
    <div className="flex pr-1 pl-2 justify-between flex-wrap gap-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        {/* 聊天状态选择器 - 观战成员不显示 */}
        {!isSpectator && (
          <div
            className="dropdown dropdown-top"
            style={{ pointerEvents: "auto" }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label="切换聊天状态"
              className="min-w-0 cursor-pointer list-none px-2 h-7 rounded-md border border-base-300 flex items-center text-xs select-none gap-1 hover:border-info"
              style={{ pointerEvents: "auto", zIndex: 100, position: "relative" }}
            >
              <span
                className={
                  currentChatStatus === "input"
                    ? "text-info"
                    : currentChatStatus === "wait"
                      ? "text-warning"
                      : currentChatStatus === "leave" ? "text-error" : "opacity-70"
                }
              >
                {currentChatStatus === "idle" && "空闲"}
                {currentChatStatus === "input" && "输入中"}
                {currentChatStatus === "wait" && "等待扮演"}
                {currentChatStatus === "leave" && "暂离"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.173l3.71-3.942a.75.75 0 111.08 1.04l-4.25 4.516a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box w-36 p-2 shadow-md border border-base-200 gap-1 text-sm"
              style={{ zIndex: 9999, position: "absolute" }}
            >
              {[
                { value: "idle", label: "空闲", desc: "清除正在输入" },
                { value: "input", label: "输入中", desc: "标记正在输入" },
                { value: "wait", label: "等待扮演", desc: "等待他人行动" },
                { value: "leave", label: "暂离", desc: "临时离开" },
              ].map(item => (
                <li key={item.value}>
                  <a
                    className={`flex flex-col gap-0.5 py-1 ${currentChatStatus === item.value ? "active bg-base-200" : ""}`}
                    onClick={(e) => {
                      console.warn("🔘 状态按钮被点击", {
                        clickedValue: item.value,
                        currentStatus: currentChatStatus,
                        onChangeChatStatus: typeof onChangeChatStatus,
                      });
                      e.preventDefault();
                      e.stopPropagation();
                      console.warn("✅ 调用 onChangeChatStatus", item.value);
                      onChangeChatStatus(item.value as any);
                      // 关闭 dropdown
                      const elem = document.activeElement as HTMLElement;
                      if (elem) {
                        elem.blur();
                      }
                    }}
                  >
                    <span className="leading-none">{item.label}</span>
                    <span className="text-[10px] opacity-60 leading-none">{item.desc}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="dropdown dropdown-top">
          <div role="button" tabIndex={2} className="">
            <div
              className="tooltip"
              data-tip="发送表情"
            >
              <EmojiIconWhite className="size-7 jump_icon"></EmojiIconWhite>
            </div>
          </div>
          <ul
            tabIndex={2}
            className="dropdown-content menu bg-base-100 rounded-box z-1 w-96 p-2 shadow-sm overflow-y-auto"
          >
            <EmojiWindow onChoose={async (emoji) => {
              updateEmojiUrls((draft) => {
                const newUrl = emoji?.imageUrl;
                if (newUrl && !draft.includes(newUrl)) {
                  draft.push(newUrl);
                }
              });
            }}
            >
            </EmojiWindow>
          </ul>
        </div>

        {/* 发送图片 */}
        <ImgUploader setImg={newImg => updateImgFiles((draft) => {
          draft.push(newImg);
        })}
        >
          <div className="tooltip" data-tip="发送图片">
            <GalleryBroken className="size-7 cursor-pointer jump_icon"></GalleryBroken>
          </div>
        </ImgUploader>

        {/* 发送音频 */}
        {setAudioFile && (
          <div className="tooltip" data-tip="发送音频">
            <MusicNote
              className="size-7 cursor-pointer jump_icon"
              onClick={() => audioInputRef.current?.click()}
            />
            <input
              type="file"
              ref={audioInputRef}
              className="hidden"
              accept="audio/*"
              onChange={handleAudioSelect}
            />
          </div>
        )}

        {/* AI重写提示词编辑 */}
        <details
          className="dropdown dropdown-top"
          style={{ pointerEvents: "auto" }}
        >
          <summary
            tabIndex={3}
            className="cursor-pointer list-none"
            style={{ pointerEvents: "auto", zIndex: 100, position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="tooltip"
              data-tip="编辑AI重写提示词"
            >
              <SparklesOutline className="size-7 cursor-pointer jump_icon" />
            </div>
          </summary>
          <div
            tabIndex={3}
            className="dropdown-content bg-base-100 rounded-box z-50 p-3 shadow-lg border border-base-300"
            style={{ width: "360px", zIndex: 9999, position: "absolute" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <label className="text-sm font-medium">AI重写提示词</label>
                <span className="text-xs opacity-60 select-none">失焦自动保存</span>
              </div>
              <p className="text-xs opacity-70 leading-snug">
                `Tab` 触发 AI 重写；提示词会作为“重写要求”使用。
              </p>
              <textarea
                className="textarea textarea-bordered w-full min-h-28 max-h-48 text-sm leading-relaxed resize-none"
                placeholder="例如：请优化这段文字的表达，使其更加清晰流畅"
                defaultValue={localStorage.getItem("ai-rewrite-prompt") || "请优化这段文字的表达，使其更加清晰流畅"}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    localStorage.setItem("ai-rewrite-prompt", e.target.value.trim());
                  }
                }}
              />
            </div>
          </div>
        </details>
      </div>

      {/* 右侧按钮组 */}
      <div className="flex gap-2 flex-wrap justify-end items-center flex-grow">
        {/* 默认立绘位置选择器（仅在联动模式下显示） */}
        {webgalLinkMode && onSetDefaultFigurePosition && (
          <div className="flex items-center gap-1">
            <div className="tooltip" data-tip="本角色默认位置（点击取消选择）">
              <div className="join">
                {(["left", "center", "right"] as const).map(pos => (
                  <button
                    key={pos}
                    type="button"
                    className={`join-item btn btn-xs px-2 ${defaultFigurePosition === pos ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      // 如果点击的是当前选中的位置，则取消选择
                      if (defaultFigurePosition === pos) {
                        onSetDefaultFigurePosition(undefined as any);
                      }
                      else {
                        onSetDefaultFigurePosition(pos);
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
        {webgalLinkMode && (onToggleDialogNotend || onToggleDialogConcat) && (
          <div className="flex items-center gap-2 text-xs">
            {onToggleDialogNotend && (
              <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary rounded-none"
                  checked={dialogNotend}
                  onChange={onToggleDialogNotend}
                />
                <span className="tooltip tooltip-bottom" data-tip="此话不停顿，文字展示完立即执行下一句">不停顿</span>
              </label>
            )}
            {onToggleDialogConcat && (
              <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary rounded-none"
                  checked={dialogConcat}
                  onChange={onToggleDialogConcat}
                />
                <span className="tooltip tooltip-bottom" data-tip="续接上段话，本句对话连接在上一句对话之后">续接</span>
              </label>
            )}
          </div>
        )}

        {/* WebGAL 导演控制台 */}
        {webgalLinkMode && onSendEffect && (
          <div className="dropdown dropdown-top dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="导演控制台"
            >
              <CommandSolid className="size-7" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
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
                  <div className="divider my-1"></div>
                  {onClearBackground && <li><a onClick={onClearBackground}>🗑️ 清除背景</a></li>}
                  {onClearFigure && <li><a onClick={onClearFigure}>👤 清除立绘</a></li>}
                </>
              )}
            </ul>
          </div>
        )}

        {/* 实时渲染按钮：仅在联动模式开启时展示 */}
        {webgalLinkMode && onToggleRealtimeRender && (
          <div
            className={`tooltip tooltip-bottom ${isRealtimeRenderActive ? "text-success" : "hover:text-info"}`}
            data-tip={isRealtimeRenderActive ? "关闭实时渲染" : "开启实时渲染"}
            onClick={onToggleRealtimeRender}
          >
            <WebgalIcon className={`size-7 cursor-pointer ${isRealtimeRenderActive ? "animate-pulse" : ""}`} />
          </div>
        )}

        {/* WebGAL 联动模式按钮 */}
        {onToggleWebgalLinkMode && (
          <div
            className={`tooltip tooltip-bottom ${webgalLinkMode ? "text-info" : "hover:text-info opacity-50"}`}
            data-tip={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示立绘/情感设置）"}
            onClick={onToggleWebgalLinkMode}
          >
            <LinkFilled className={`size-6 cursor-pointer ${webgalLinkMode ? "" : "grayscale opacity-50"}`} />
          </div>
        )}

        {runModeEnabled && (
          <>
            <div
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="查看线索"
              onClick={() => setSideDrawerState(sideDrawerState === "clue" ? "none" : "clue")}
            >
              <Detective className="size-7"></Detective>
            </div>

            <div
              className="tooltip"
              data-tip="展示先攻表"
              onClick={() => setSideDrawerState(sideDrawerState === "initiative" ? "none" : "initiative")}
            >
              <SwordSwing className="size-7 jump_icon"></SwordSwing>
            </div>

            <div
              className="tooltip"
              data-tip="地图"
              onClick={() => setSideDrawerState(sideDrawerState === "map" ? "none" : "map")}
            >
              <PointOnMapPerspectiveLinear className="size-7 jump_icon"></PointOnMapPerspectiveLinear>
            </div>
          </>
        )}

        {onToggleRunMode && (
          <div
            className="tooltip tooltip-bottom"
            data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/线索/先攻/角色"}
          >
            <button
              type="button"
              className={`btn btn-xs ${runModeEnabled ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={onToggleRunMode}
            >
              <SwordSwing className="size-7" />
            </button>
          </div>
        )}

        {/* 发送按钮 */}
        <div className="tooltip" data-tip="发送">
          <SendIcon
            className={`size-7 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20 " : ""}`}
            onClick={handleMessageSubmit}
          >
          </SendIcon>
        </div>
      </div>
    </div>
  );
}

export default ChatToolbar;
