import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";
import { CheckerboardIcon, FilmSlateIcon, SwordIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatStatusBar from "@/components/chat/chatStatusBar";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import EmojiWindow from "@/components/chat/window/EmojiWindow";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  Detective,
  DiceD6Icon,
  EmojiIconWhite,
  GalleryBroken,
  LinkFilled,
  MusicNote,
  SendIcon,
  SparklesOutline,
  WebgalIcon,
} from "@/icons";

interface ChatToolbarProps {
  /** 当前房间（用于BGM个人开关/停止全员BGM） */
  roomId?: number;
  /** 是否为KP（房主） */
  isKP?: boolean;
  /** KP：发送停止全员BGM指令 */
  onStopBgmForAll?: () => void;

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
  // ChatStatusBar 所需
  statusUserId?: number | null;
  statusWebSocketUtils?: any;
  statusExcludeSelf?: boolean;
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
  /** 插入 WebGAL 指令前缀（发送侧会把 %xxx 转为 WEBGAL_COMMAND） */
  onInsertWebgalCommandPrefix?: () => void;
  // 发送音频
  setAudioFile?: (file: File | null) => void;
  layout?: "stacked" | "inline";
  showStatusBar?: boolean;
  showWebgalLinkToggle?: boolean;
  showRunModeToggle?: boolean;
  showMainActions?: boolean;
  showSendButton?: boolean;
  showWebgalControls?: boolean;
  showRunControls?: boolean;
}

export function ChatToolbar({
  roomId,
  isKP = false,
  onStopBgmForAll,
  sideDrawerState,
  setSideDrawerState,
  updateEmojiUrls,
  updateImgFiles,
  disableSendMessage,
  handleMessageSubmit,
  currentChatStatus,
  onChangeChatStatus,
  statusUserId,
  statusWebSocketUtils,
  statusExcludeSelf = false,
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
  onInsertWebgalCommandPrefix,
  setAudioFile,
  layout = "stacked",
  showStatusBar = true,
  showWebgalLinkToggle = true,
  showRunModeToggle = true,
  showMainActions = true,
  showSendButton = true,
  showWebgalControls = true,
  showRunControls = true,
}: ChatToolbarProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const aiPromptDropdownRef = useRef<HTMLDivElement>(null);
  const emojiDropdownRef = useRef<HTMLDivElement>(null);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const isInline = layout === "inline";
  const isStacked = !isInline;
  const isRunModeOnly = runModeEnabled && !webgalLinkMode;

  const bgmTrack = useBgmStore(state => (roomId != null ? state.trackByRoomId[roomId] : undefined));
  const bgmDismissed = useBgmStore(state => (roomId != null ? Boolean(state.userDismissedByRoomId[roomId]) : false));
  const bgmIsPlaying = useBgmStore(state => (roomId != null ? (state.isPlaying && state.playingRoomId === roomId) : false));
  const bgmToggle = useBgmStore(state => state.userToggle);

  const blurAiPromptFocus = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && aiPromptDropdownRef.current?.contains(active)) {
      active.blur();
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (aiPromptDropdownRef.current?.contains(target)) {
        setIsEmojiOpen(false);
        return;
      }
      if (emojiDropdownRef.current?.contains(target)) {
        setIsAiPromptOpen(false);
        return;
      }

      setIsAiPromptOpen(false);
      setIsEmojiOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    if (isAiPromptOpen) {
      setIsEmojiOpen(false);
    }
    else {
      blurAiPromptFocus();
    }
  }, [isAiPromptOpen, blurAiPromptFocus]);

  useEffect(() => {
    if (isEmojiOpen)
      setIsAiPromptOpen(false);
  }, [isEmojiOpen]);

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !setAudioFile)
      return;

    setAudioFile(file);
    // 重置 input value，允许重复选择同一文件
    e.target.value = "";
  };

  return (
    <div className={`flex ${isInline ? "items-start gap-2 flex-nowrap" : "flex-col w-full"}`}>
      <div className={`${isInline ? "flex items-start gap-2 flex-nowrap" : "w-full"}`}>
        {showStatusBar && roomId != null && statusWebSocketUtils && (
          <ChatStatusBar
            roomId={roomId}
            userId={statusUserId}
            webSocketUtils={statusWebSocketUtils}
            excludeSelf={statusExcludeSelf}
            currentChatStatus={currentChatStatus}
            onChangeChatStatus={onChangeChatStatus}
            isSpectator={isSpectator}
          />
        )}

        {showMainActions && (
          <div className={`${isStacked ? "flex items-center justify-between gap-2 w-full bg-base-100 rounded-lg px-2 py-1" : "flex items-center gap-2 flex-wrap"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI重写提示词编辑 */}
              <div
                ref={aiPromptDropdownRef}
                className={`dropdown dropdown-top dropdown-center pointer-events-auto ${isAiPromptOpen ? "dropdown-open" : ""}`}
              >
                <div
                  role="button"
                  tabIndex={3}
                  className="cursor-pointer pointer-events-auto relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEmojiOpen(false);
                    setIsAiPromptOpen(prev => !prev);
                  }}
                >
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="编辑AI重写提示词"
                  >
                    <SparklesOutline className="size-6 cursor-pointer jump_icon" />
                  </div>
                </div>
                <div
                  tabIndex={3}
                  className="dropdown-content bg-base-100 rounded-box p-3 shadow-lg border border-base-300 w-[280px] sm:w-[360px] z-[9999] absolute mb-6"
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
              </div>
              <div
                ref={emojiDropdownRef}
                className={`dropdown dropdown-top dropdown-center ${isEmojiOpen ? "dropdown-open" : ""}`}
              >
                <div
                  role="button"
                  tabIndex={2}
                  className="cursor-pointer"
                  aria-label="发送表情"
                  title="发送表情"
                  onClick={() => {
                    setIsAiPromptOpen(false);
                    setIsEmojiOpen(prev => !prev);
                  }}
                >
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="发送表情"
                  >
                    <EmojiIconWhite className="size-6 jump_icon"></EmojiIconWhite>
                  </div>
                </div>
                <ul
                  tabIndex={2}
                  className="dropdown-content menu bg-base-100 rounded-box z-20 w-72 sm:w-96 p-2 shadow-sm overflow-y-auto mb-6"
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
                <div className="tooltip tooltip-bottom" data-tip="发送图片">
                  <GalleryBroken className="size-6 cursor-pointer jump_icon"></GalleryBroken>
                </div>
              </ImgUploader>

              {/* 发送音频 */}
              {setAudioFile && (
                <div className="tooltip tooltip-bottom" data-tip="发送音频">
                  <MusicNote
                    className="size-6 cursor-pointer jump_icon relative -top-px"
                    onClick={() => audioInputRef.current?.click()}
                  />
                  <input
                    type="file"
                    ref={audioInputRef}
                    className="hidden"
                    accept="audio/*"
                    title="选择音频文件"
                    aria-label="选择音频文件"
                    onChange={handleAudioSelect}
                  />
                </div>
              )}

              {/* WebGAL 联动模式按钮 */}
              {showWebgalLinkToggle && onToggleWebgalLinkMode && !isStacked && (
                <div
                  className="tooltip tooltip-bottom"
                  data-tip={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示立绘/情感设置）"}
                >
                  <LinkFilled
                    className={`size-6 cursor-pointer jump_icon ${webgalLinkMode ? "" : "grayscale opacity-50"}`}
                    onClick={onToggleWebgalLinkMode}
                  />
                </div>
              )}

              {showRunModeToggle && onToggleRunMode && !isStacked && (
                <div
                  className="tooltip tooltip-bottom"
                  data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/线索/先攻/角色"}
                >
                  <DiceD6Icon
                    className={`size-6 cursor-pointer jump_icon ${runModeEnabled ? "" : "grayscale opacity-50"}`}
                    onClick={onToggleRunMode}
                  />
                </div>
              )}

              {/* BGM 个人开关（只在当前房间存在BGM时显示；用户主动关闭后按钮失效） */}
              {roomId != null && bgmTrack && (
                <div className="tooltip tooltip-bottom" data-tip={bgmDismissed ? "你已关闭本曲（需KP重新发送）" : (bgmIsPlaying ? "关闭BGM（仅自己）" : "开启BGM")}>
                  <button
                    type="button"
                    className={`btn btn-xs ${bgmDismissed ? "btn-disabled opacity-50" : "btn-ghost"}`}
                    disabled={bgmDismissed}
                    onClick={() => void bgmToggle(roomId)}
                  >
                    {bgmIsPlaying ? "关闭BGM" : "开启BGM"}
                  </button>
                </div>
              )}

              {/* KP：停止全员BGM（发送系统消息） */}
              {roomId != null && bgmTrack && isKP && onStopBgmForAll && (
                <div className="tooltip tooltip-bottom" data-tip="停止全员BGM">
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost text-error"
                    onClick={onStopBgmForAll}
                  >
                    停止全员BGM
                  </button>
                </div>
              )}

              {/* 发送按钮 */}
              {showSendButton && !isStacked && (
                <div className="tooltip tooltip-bottom" data-tip="发送">
                  <SendIcon
                    className={`size-6 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20 " : ""}`}
                    onClick={handleMessageSubmit}
                  >
                  </SendIcon>
                </div>
              )}
            </div>

            {isStacked && (
              <div className="flex items-center gap-2 flex-nowrap">
                {showWebgalLinkToggle && onToggleWebgalLinkMode && (
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示立绘/情感设置）"}
                  >
                    <LinkFilled
                      className={`size-6 cursor-pointer jump_icon ${webgalLinkMode ? "" : "grayscale opacity-50"}`}
                      onClick={onToggleWebgalLinkMode}
                    />
                  </div>
                )}

                {showRunModeToggle && onToggleRunMode && (
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/线索/先攻/角色"}
                  >
                    <DiceD6Icon
                      className={`size-6 cursor-pointer jump_icon ${runModeEnabled ? "" : "grayscale opacity-50"}`}
                      onClick={onToggleRunMode}
                    />
                  </div>
                )}

                {showSendButton && (
                  <div className="tooltip tooltip-bottom" data-tip="发送">
                    <SendIcon
                      className={`size-6 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20 " : ""}`}
                      onClick={handleMessageSubmit}
                    >
                    </SendIcon>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右侧按钮组 */}
      <div
        className={`flex ${isInline ? "mr-2 items-start gap-2 flex-nowrap" : "mt-1 items-center gap-2 flex-wrap justify-end flex-grow"} ${
          isInline && showRunControls && isRunModeOnly ? "min-h-8" : ""
        }`}
      >
        {/* WebGAL 指令按钮（仅在联动模式下显示）：点击后给输入框插入 % 前缀 */}
        {showWebgalControls && webgalLinkMode && onInsertWebgalCommandPrefix && (
          <div className="tooltip tooltip-bottom" data-tip="WebGAL 指令（插入 % 前缀）">
            <button
              type="button"
              className="btn btn-xs btn-ghost border border-base-300"
              onClick={onInsertWebgalCommandPrefix}
            >
              %指令
            </button>
          </div>
        )}

        {/* 默认立绘位置选择器（仅在联动模式下显示） */}
        {showWebgalControls && webgalLinkMode && onSetDefaultFigurePosition && (
          <div className="flex items-center gap-1">
            <div className="tooltip tooltip-bottom" data-tip="本角色默认位置（点击取消选择）">
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
        {showWebgalControls && webgalLinkMode && (onToggleDialogNotend || onToggleDialogConcat) && (
          <div className="flex items-center gap-2 text-xs mt-1.5">
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
        {showWebgalControls && webgalLinkMode && onSendEffect && (
          <div className="dropdown dropdown-top dropdown-end mt-0.5">
            <div
              tabIndex={0}
              role="button"
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="导演控制台"
              aria-label="导演控制台"
              title="导演控制台"
            >
              <FilmSlateIcon className="size-6" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mb-4">
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
            </ul>
          </div>
        )}

        {/* 实时渲染按钮：仅在联动模式开启时展示 */}
        {showWebgalControls && webgalLinkMode && onToggleRealtimeRender && (
          <div
            className={`tooltip tooltip-bottom mt-0.5 ${isRealtimeRenderActive ? "text-success" : "hover:text-info"}`}
            data-tip={isRealtimeRenderActive ? "关闭实时渲染" : "开启实时渲染"}
            onClick={onToggleRealtimeRender}
          >
            <WebgalIcon className={`size-5 cursor-pointer ${isRealtimeRenderActive ? "animate-pulse" : ""}`} />
          </div>
        )}

        {showRunControls && runModeEnabled && (
          <div className="flex gap-2 ml-0.5">
            <div
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="查看线索"
              data-side-drawer-toggle="true"
              onClick={() => setSideDrawerState(sideDrawerState === "clue" ? "none" : "clue")}
            >
              <Detective className="size-6"></Detective>
            </div>

            <div
              className="tooltip tooltip-bottom"
              data-tip="展示先攻表"
              data-side-drawer-toggle="true"
              onClick={() => setSideDrawerState(sideDrawerState === "initiative" ? "none" : "initiative")}
            >
              <SwordIcon className="size-6 jump_icon"></SwordIcon>
            </div>

            <div
              className="tooltip tooltip-bottom"
              data-tip="地图"
              data-side-drawer-toggle="true"
              onClick={() => setSideDrawerState(sideDrawerState === "map" ? "none" : "map")}
            >
              <CheckerboardIcon className="size-6 jump_icon"></CheckerboardIcon>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatToolbar;
