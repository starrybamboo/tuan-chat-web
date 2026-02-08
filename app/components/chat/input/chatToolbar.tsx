import { ArrowSquareIn } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import ChatStatusBar from "@/components/chat/chatStatusBar";
import ChatToolbarDock from "@/components/chat/input/chatToolbarDock";
import EmojiWindow from "@/components/chat/window/EmojiWindow";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import { ImgUploader } from "@/components/common/uploader/imgUploader";

import {
  DiceD6Icon,
  EmojiIconWhite,
  GalleryBroken,
  LinkFilled,
  MusicNote,
  SendIcon,
  SparklesOutline,
} from "@/icons";
import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import type { WebgalChoosePayload } from "@/types/webgalChoose";

const WEBGAL_VAR_KEY_PATTERN = /^[A-Z_]\w*$/i;

type WebgalChooseOptionDraft = {
  text: string;
  target: string;
  showCondition: string;
  enableCondition: string;
};

interface ChatToolbarProps {
  /** 当前房间（用于BGM个人开关/ֹͣȫԱBGM） */
  roomId?: number;
  /** 是否为KP（房主） */
  isKP?: boolean;
  /** KP：发送停止全员BGM指令 */
  onStopBgmForAll?: () => void;

  // 侧边栏状态

  // 文件和表情处理
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateImgFiles: (updater: (draft: File[]) => void) => void;

  // 消息发送
  disableSendMessage: boolean;
  handleMessageSubmit: () => void;

  // 导入消息（外部文本 -> 多条消息）
  disableImportChatText?: boolean;
  onOpenImportChatText?: () => void;

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
  // WebGAL 控制
  onSendEffect?: (effectName: string) => void;
  onClearBackground?: () => void;
  onClearFigure?: () => void;
  /** WebGAL 空间变量：由导演控制台弹窗触发 */
  onSetWebgalVar?: (key: string, expr: string) => Promise<void> | void;
  onSendWebgalChoose?: (payload: WebgalChoosePayload) => Promise<void> | void;
  // 发送音频
  setAudioFile?: (file: File | null) => void;
  onAddTempAnnotations?: (ids: string[]) => void;
  layout?: "stacked" | "inline";
  showStatusBar?: boolean;
  showWebgalLinkToggle?: boolean;
  showRunModeToggle?: boolean;
  showMainActions?: boolean;
  showSendButton?: boolean;
  showWebgalControls?: boolean;
  showRunControls?: boolean;
}

function ChatToolbar({
  roomId,
  updateEmojiUrls,
  updateImgFiles,
  disableSendMessage,
  handleMessageSubmit,
  disableImportChatText = false,
  onOpenImportChatText,
  currentChatStatus,
  onChangeChatStatus,
  statusUserId,
  statusWebSocketUtils,
  statusExcludeSelf = false,
  isSpectator = false,
  webgalLinkMode = false,
  onToggleWebgalLinkMode,
  runModeEnabled = false,
  onToggleRunMode,
  onSendEffect,
  onClearBackground,
  onClearFigure,
  onSetWebgalVar,
  onSendWebgalChoose,
  onToggleRealtimeRender,
  setAudioFile,
  onAddTempAnnotations,
  layout = "stacked",
  showStatusBar = true,
  showWebgalLinkToggle = true,
  showRunModeToggle = true,
  showMainActions = true,
  showSendButton = true,
  showWebgalControls = false,
  showRunControls = false,
}: ChatToolbarProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const aiPromptDropdownRef = useRef<HTMLDivElement>(null);
  const emojiDropdownRef = useRef<HTMLDivElement>(null);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const [isWebgalVarModalOpen, setIsWebgalVarModalOpen] = useState(false);
  const [webgalVarKey, setWebgalVarKey] = useState("");
  const [webgalVarExpr, setWebgalVarExpr] = useState("");
  const [webgalVarError, setWebgalVarError] = useState<string | null>(null);
  const [isWebgalChooseModalOpen, setIsWebgalChooseModalOpen] = useState(false);
  const [webgalChooseOptions, setWebgalChooseOptions] = useState<WebgalChooseOptionDraft[]>([
    { text: "", target: "", showCondition: "", enableCondition: "" },
  ]);
  const [webgalChooseError, setWebgalChooseError] = useState<string | null>(null);
  const webgalVarKeyInputRef = useRef<HTMLInputElement>(null);
  const screenSize = useScreenSize();
  const isMobile = screenSize === "sm";

  const handleOpenImport = useCallback(() => {
    if (!onOpenImportChatText)
      return;
    if (disableImportChatText)
      return;
    setIsAiPromptOpen(false);
    setIsEmojiOpen(false);
    onOpenImportChatText();
  }, [disableImportChatText, onOpenImportChatText]);
  const isInline = layout === "inline";
  const isStacked = !isInline;

  const handleToggleWebgalLinkMode = useCallback(() => {
    if (!onToggleWebgalLinkMode) {
      return;
    }
    if (webgalLinkMode) {
      onToggleWebgalLinkMode();
      return;
    }
    if (onToggleRunMode && runModeEnabled) {
      onToggleRunMode();
    }
    onToggleWebgalLinkMode();
  }, [onToggleRunMode, onToggleWebgalLinkMode, runModeEnabled, webgalLinkMode]);

  const handleToggleRunMode = useCallback(() => {
    if (!onToggleRunMode) {
      return;
    }
    if (!runModeEnabled && onToggleWebgalLinkMode && webgalLinkMode) {
      onToggleWebgalLinkMode();
    }
    onToggleRunMode();
  }, [onToggleRunMode, onToggleWebgalLinkMode, runModeEnabled, webgalLinkMode]);

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
    onAddTempAnnotations?.([ANNOTATION_IDS.BGM]);
    // 重置 input value，允许重复选择同一文件
    e.target.value = "";
  };

  const closeWebgalVarModal = useCallback(() => {
    setIsWebgalVarModalOpen(false);
    setWebgalVarError(null);
    setWebgalVarKey("");
    setWebgalVarExpr("");
  }, []);

  useEffect(() => {
    if (!isWebgalVarModalOpen)
      return;
    const timer = window.setTimeout(() => {
      webgalVarKeyInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isWebgalVarModalOpen]);

  const submitWebgalVar = useCallback(async () => {
    const key = webgalVarKey.trim();
    const expr = webgalVarExpr.trim();

    if (!key) {
      setWebgalVarError("请输入变量名");
      return;
    }
    if (!WEBGAL_VAR_KEY_PATTERN.test(key)) {
      setWebgalVarError("变量名格式不正确（仅字母/下划线开头，后续可包含数字/下划线）");
      return;
    }
    if (!expr) {
      setWebgalVarError("请输入变量表达式");
      return;
    }
    if (!onSetWebgalVar) {
      setWebgalVarError("当前不可设置变量");
      return;
    }

    setWebgalVarError(null);
    try {
      await onSetWebgalVar(key, expr);
      closeWebgalVarModal();
    }
    catch (err: any) {
      console.error("设置变量失败:", err);
      toast.error(err?.message ? `设置变量失败：${err.message}` : "设置变量失败");
    }
  }, [closeWebgalVarModal, onSetWebgalVar, webgalVarExpr, webgalVarKey]);

  const openWebgalVarModal = useCallback(() => {
    setIsWebgalVarModalOpen(true);
  }, []);
  const updateWebgalChooseOption = useCallback((index: number, key: keyof WebgalChooseOptionDraft, value: string) => {
    setWebgalChooseOptions(prev => prev.map((option, idx) => (
      idx === index ? { ...option, [key]: value } : option
    )));
  }, []);

  const addWebgalChooseOption = useCallback(() => {
    setWebgalChooseOptions(prev => ([
      ...prev,
      { text: "", target: "", showCondition: "", enableCondition: "" },
    ]));
  }, []);

  const removeWebgalChooseOption = useCallback((index: number) => {
    setWebgalChooseOptions(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)));
  }, []);

  const closeWebgalChooseModal = useCallback(() => {
    setIsWebgalChooseModalOpen(false);
    setWebgalChooseError(null);
  }, []);

  const openWebgalChooseModal = useCallback(() => {
    if (!onSendWebgalChoose) {
      toast.error("当前不可发送选择");
      return;
    }
    setIsWebgalChooseModalOpen(true);
    setWebgalChooseError(null);
  }, [onSendWebgalChoose]);

  const submitWebgalChoose = useCallback(async () => {
    if (!onSendWebgalChoose) {
      setWebgalChooseError("当前不可发送选择");
      return;
    }
    const normalizedOptions = webgalChooseOptions.map(option => ({
      text: option.text.trim(),
      target: option.target.trim(),
      showCondition: option.showCondition.trim(),
      enableCondition: option.enableCondition.trim(),
    }));
    if (normalizedOptions.length === 0) {
      setWebgalChooseError("请至少添加一个选项");
      return;
    }
    if (normalizedOptions.some(option => !option.text || !option.target)) {
      setWebgalChooseError("选项文本和跳转目标不能为空");
      return;
    }
    const payload: WebgalChoosePayload = {
      options: normalizedOptions.map(option => ({
        text: option.text,
        target: option.target,
        ...(option.showCondition ? { showCondition: option.showCondition } : {}),
        ...(option.enableCondition ? { enableCondition: option.enableCondition } : {}),
      })),
    };
    setWebgalChooseError(null);
    try {
      await onSendWebgalChoose(payload);
      closeWebgalChooseModal();
      setWebgalChooseOptions([{ text: "", target: "", showCondition: "", enableCondition: "" }]);
    }
    catch (err: any) {
      console.error("发送选择失败:", err);
      toast.error(err?.message ? `发送选择失败：${err.message}` : "发送选择失败");
    }
  }, [closeWebgalChooseModal, onSendWebgalChoose, webgalChooseOptions]);


  const webgalVarModal = isWebgalVarModalOpen && typeof document !== "undefined"
    ? createPortal(
        <div className="modal modal-open z-9999">
          <div className="modal-box">
            <h3 className="font-bold text-lg">设置变量</h3>
            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <div className="text-sm opacity-80">变量名</div>
                <input
                  ref={webgalVarKeyInputRef}
                  className="input input-bordered w-full font-mono"
                  value={webgalVarKey}
                  onChange={(e) => {
                    setWebgalVarKey(e.target.value);
                    setWebgalVarError(null);
                  }}
                  placeholder="例如：FLAG_A"
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm opacity-80">表达式</div>
                <textarea
                  className="textarea textarea-bordered w-full font-mono min-h-24"
                  value={webgalVarExpr}
                  onChange={(e) => {
                    setWebgalVarExpr(e.target.value);
                    setWebgalVarError(null);
                  }}
                  placeholder="例如：1 / true / a+1 / random(1,20)"
                />
              </div>
              {webgalVarError && (
                <div className="text-error text-sm">{webgalVarError}</div>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeWebgalVarModal}>取消</button>
              <button type="button" className="btn btn-primary" onClick={submitWebgalVar}>发送</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeWebgalVarModal} />
        </div>,
        document.body,
      )
    : null;
  const webgalChooseInputClass = "w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
  const webgalChooseModal = isWebgalChooseModalOpen && typeof document !== "undefined"
    ? createPortal(
        <div className="modal modal-open z-9999">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg">发送选择</h3>
            <div className="py-4 space-y-3">
              <p className="text-xs opacity-70">将选项转换为 WebGAL choose 指令发送。</p>
              <div className="space-y-2">
                {webgalChooseOptions.map((option, index) => (
                  <div key={`${index}`} className="rounded-md border border-base-300/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">选项 {index + 1}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => removeWebgalChooseOption(index)}
                        disabled={webgalChooseOptions.length <= 1}
                      >
                        删除
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        className={webgalChooseInputClass}
                        placeholder="选项文本"
                        value={option.text}
                        onChange={e => updateWebgalChooseOption(index, "text", e.target.value)}
                      />
                      <input
                        className={webgalChooseInputClass}
                        placeholder="跳转目标 / label / scene"
                        value={option.target}
                        onChange={e => updateWebgalChooseOption(index, "target", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        className={webgalChooseInputClass}
                        placeholder="显示条件（可选）"
                        value={option.showCondition}
                        onChange={e => updateWebgalChooseOption(index, "showCondition", e.target.value)}
                      />
                      <input
                        className={webgalChooseInputClass}
                        placeholder="可选条件（可选）"
                        value={option.enableCondition}
                        onChange={e => updateWebgalChooseOption(index, "enableCondition", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-sm" onClick={addWebgalChooseOption}>
                添加选项
              </button>
              {webgalChooseError && (
                <div className="text-error text-sm">{webgalChooseError}</div>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeWebgalChooseModal}>取消</button>
              <button type="button" className="btn btn-primary" onClick={submitWebgalChoose}>发送</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeWebgalChooseModal} />
        </div>,
        document.body,
      )
    : null;


  return (
    <div className={`flex ${isInline ? "items-start gap-2 flex-nowrap" : "flex-col w-full"}`}>
      {webgalVarModal}
      {webgalChooseModal}
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
                className={`dropdown dropdown-top dropdown-start md:dropdown-center pointer-events-auto ${isAiPromptOpen ? "dropdown-open" : ""}`}
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
                    className={isMobile ? "" : "tooltip tooltip-top"}
                    data-tip={isMobile ? undefined : "编辑AI重写提示词"}
                  >
                    <SparklesOutline className="size-6 cursor-pointer jump_icon mt-1 md:mt-0" />
                  </div>
                </div>
                <div
                  tabIndex={3}
                  className="dropdown-content bg-base-100 rounded-box p-3 shadow-lg border border-base-300 w-55 md:w-70 z-9999 absolute mb-6"
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
                className={`dropdown dropdown-top dropdown-start md:dropdown-center ${isEmojiOpen ? "dropdown-open" : ""}`}
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
                    className={isMobile ? "" : "tooltip tooltip-top"}
                    data-tip={isMobile ? undefined : "发送表情"}
                  >
                    <EmojiIconWhite className="size-6 jump_icon mt-1 md:mt-0"></EmojiIconWhite>
                  </div>
                </div>
                <ul
                  tabIndex={2}
                  className="dropdown-content menu bg-base-100 rounded-box z-9999 w-56 md:w-96 p-2 shadow-sm overflow-y-auto mb-6"
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
              <ImgUploader setImg={(newImg) => {
                updateImgFiles((draft) => {
                  draft.push(newImg);
                });
                onAddTempAnnotations?.([ANNOTATION_IDS.BACKGROUND]);
              }}
              >
                <div className={isMobile ? "" : "tooltip tooltip-top"} data-tip={isMobile ? undefined : "发送图片"}>
                  <GalleryBroken className="size-6 cursor-pointer jump_icon mt-1 md:mt-0"></GalleryBroken>
                </div>
              </ImgUploader>

              {/* 发送音频 */}
              {setAudioFile && (
                <div className={isMobile ? "" : "tooltip tooltip-top"} data-tip={isMobile ? undefined : "发送音频"}>
                  <MusicNote
                    className="size-6 cursor-pointer jump_icon relative md:-top-px"
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

              {/* 导入文本 */}
              {onOpenImportChatText && (
                <div
                  className={isMobile ? "" : "tooltip tooltip-top"}
                  data-tip={isMobile ? undefined : "导入文本"}
                >
                  <ArrowSquareIn
                    className={`size-6 jump_icon mt-1 md:mt-0 ${disableImportChatText ? "cursor-not-allowed opacity-20" : "cursor-pointer"}`}
                    onClick={handleOpenImport}
                  />
                </div>
              )}

              {/* WebGAL 联动模式按钮 */}
              {showWebgalLinkToggle && onToggleWebgalLinkMode && !isStacked && (
                <div
                  className="tooltip tooltip-top"
                  data-tip={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                >
                  <LinkFilled
                    className={`size-6 cursor-pointer jump_icon md:mb-1 ${webgalLinkMode ? "" : "grayscale opacity-50"}`}
                    onClick={handleToggleWebgalLinkMode}
                  />
                </div>
              )}

              {showRunModeToggle && onToggleRunMode && !isStacked && (
                <div
                  className="tooltip tooltip-top"
                  data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/文档/先攻"}
                >
                  <DiceD6Icon
                    className={`md:mb-1 size-6 cursor-pointer jump_icon ${runModeEnabled ? "" : "grayscale opacity-50"}`}
                    onClick={handleToggleRunMode}
                  />
                </div>
              )}

              {/* 发送按钮 */}
              {showSendButton && !isStacked && (
                <div className="tooltip tooltip-top" data-tip="发送">
                  <SendIcon
                    className={`size-6 font-light hover:text-info md:mb-1 ${disableSendMessage ? "cursor-not-allowed opacity-20 " : ""}`}
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
                    className="tooltip tooltip-top"
                    data-tip={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                  >
                    <LinkFilled
                      className={`size-6 cursor-pointer jump_icon ${webgalLinkMode ? "" : "grayscale opacity-50"}`}
                      onClick={handleToggleWebgalLinkMode}
                    />
                  </div>
                )}

                {showRunModeToggle && onToggleRunMode && (
                  <div
                    className="tooltip tooltip-top"
                    data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/文档/先攻"}
                  >
                    <DiceD6Icon
                      className={`size-6 cursor-pointer jump_icon ${runModeEnabled ? "" : "grayscale opacity-50"}`}
                      onClick={handleToggleRunMode}
                    />
                  </div>
                )}

                {showSendButton && (
                  <div className="tooltip tooltip-top" data-tip="发送">
                    <SendIcon
                      className={`size-6 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20 " : ""}`}
                      onClick={handleMessageSubmit}
                    >
                    </SendIcon>
                  </div>
                )}

                {onOpenImportChatText && (
                  <div
                    className={isMobile ? "" : "tooltip tooltip-top"}
                    data-tip={isMobile ? undefined : "导入文本"}
                  >
                    <ArrowSquareIn
                      className={`size-6 jump_icon ${disableImportChatText ? "cursor-not-allowed opacity-20" : "cursor-pointer"}`}
                      onClick={handleOpenImport}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {(showWebgalControls || showRunControls) && (
        <div className={isInline ? "mt-1" : "mt-2"}>
          <ChatToolbarDock
            isInline={isInline}
            isRunModeOnly={runModeEnabled && !webgalLinkMode}
            showWebgalControls={showWebgalControls}
            onSendEffect={onSendEffect}
            onClearBackground={onClearBackground}
            onClearFigure={onClearFigure}
            onSetWebgalVar={onSetWebgalVar}
            onOpenWebgalVarModal={openWebgalVarModal}
            onOpenWebgalChooseModal={onSendWebgalChoose ? openWebgalChooseModal : undefined}
            isSpectator={isSpectator}
            onToggleRealtimeRender={onToggleRealtimeRender}
            showRunControls={showRunControls}
          />
        </div>
      )}
    </div>
  );
}

export default ChatToolbar;
