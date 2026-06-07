import { FilePlusIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import ChatStatusBar from "@/components/chat/chatStatusBar";
import ChatToolbarDock from "@/components/chat/input/chatToolbarDock";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { preheatChatMediaPreprocess } from "@/components/chat/utils/attachmentPreprocess";
import StickerWindow from "@/components/chat/window/StickerWindow";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import {
  DiceD6Icon,
  EmojiIconWhite,
  LinkFilled,
  SendIcon,
} from "@/icons";
import { ALLOWED_IMG_TYPES } from "@/utils/allowedImgFiles";
import { mediaFileUrl } from "@/utils/mediaUrl";

interface ChatToolbarProps {
  /** 当前房间（用于BGM个人开关/停止全员BGM） */
  roomId?: number;
  /** 是否为KP（房主） */
  isKP?: boolean;
  /** KP：发送停止全员BGM指令 */
  onStopBgmForAll?: () => void;

  // 侧边栏状态

  // 文件和表情处理
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateImgFiles: (updater: (draft: File[]) => void) => void;
  updateFileAttachments: (updater: (draft: File[]) => void) => void;
  setEmojiMetaByUrl?: (url: string, meta: { fileId?: number; width?: number; height?: number; mediaType?: string; size?: number; fileName?: string }) => void;

  // 消息发送
  disableSendMessage: boolean;
  handleMessageSubmit: () => void;

  // 附件/表情等富消息入口
  disableRichMessageActions?: boolean;

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
  onOpenFullMessageDiff?: () => void;
  isFullMessageDiffOpen?: boolean;
  // 发送音频
  setAudioFile?: (file: File | null) => void;
  onApplyImageTempAnnotations?: () => void;
  onApplyAudioTempAnnotations?: () => void;
  layout?: "stacked" | "inline";
  showStatusBar?: boolean;
  showWebgalLinkToggle?: boolean;
  showRunModeToggle?: boolean;
  showMainActions?: boolean;
  showSendButton?: boolean;
  showWebgalControls?: boolean;
  showRunControls?: boolean;
  showCopilotControl?: boolean;
}

function ChatToolbar({
  roomId,
  updateEmojiUrls,
  updateImgFiles,
  updateFileAttachments,
  setEmojiMetaByUrl,
  disableSendMessage,
  handleMessageSubmit,
  disableRichMessageActions = false,
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
  onOpenFullMessageDiff,
  isFullMessageDiffOpen,
  onToggleRealtimeRender,
  setAudioFile,
  onApplyAudioTempAnnotations,
  onApplyImageTempAnnotations,
  layout = "stacked",
  showStatusBar = true,
  showWebgalLinkToggle = true,
  showRunModeToggle = true,
  showMainActions = true,
  showSendButton = true,
  showWebgalControls = false,
  showRunControls = false,
  showCopilotControl = false,
}: ChatToolbarProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const emojiDropdownRef = useRef<HTMLDivElement>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const screenSize = useScreenSize();
  const isMobile = screenSize === "sm";
  const storeSetEmojiMetaByUrl = useChatComposerStore(state => state.setEmojiMetaByUrl);
  const resolvedSetEmojiMetaByUrl = setEmojiMetaByUrl ?? storeSetEmojiMetaByUrl;

  const handleBlockedRichMessageAction = useCallback(() => {
    if (disableRichMessageActions) {
      toast.error("当前不可发送附件");
    }
  }, [disableRichMessageActions]);
  const isInline = layout === "inline";
  const isStacked = !isInline;

  const handleToggleWebgalLinkMode = useCallback(() => {
    if (!onToggleWebgalLinkMode) {
      return;
    }
    onToggleWebgalLinkMode();
  }, [onToggleWebgalLinkMode]);

  const handleToggleRunMode = useCallback(() => {
    if (!onToggleRunMode) {
      return;
    }
    onToggleRunMode();
  }, [onToggleRunMode]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (emojiDropdownRef.current?.contains(target)) {
        return;
      }

      setIsEmojiOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, []);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (ALLOWED_IMG_TYPES.includes(file.type)) {
      updateImgFiles((draft) => {
        draft.push(file);
      });
      preheatChatMediaPreprocess({ imageFiles: [file] });
      onApplyImageTempAnnotations?.();
      e.target.value = "";
      return;
    }

    if (file.type.startsWith("audio/") && setAudioFile) {
      setAudioFile(file);
      preheatChatMediaPreprocess({ audioFiles: [file] });
      onApplyAudioTempAnnotations?.();
      e.target.value = "";
      return;
    }

    if (file.type.startsWith("video/")) {
      updateFileAttachments((draft) => {
        draft.push(file);
      });
      preheatChatMediaPreprocess({ videoFiles: [file] });
      e.target.value = "";
      return;
    }

    toast.error("当前仅支持图片、音频、视频");
    e.target.value = "";
  };

  const richActionDisabledClass = disableRichMessageActions ? "cursor-not-allowed opacity-20" : "cursor-pointer";
  const openMediaPicker = useCallback(() => {
    if (disableRichMessageActions) {
      handleBlockedRichMessageAction();
      return;
    }
    setIsEmojiOpen(false);
    mediaInputRef.current?.click();
  }, [disableRichMessageActions, handleBlockedRichMessageAction]);

  const mediaActionButton = (
    <div>
      <button
        type="button"
        className={richActionDisabledClass}
        aria-label="发送媒体"
        title="发送媒体"
        onClick={openMediaPicker}
      >
        <div className={isMobile ? "" : "tooltip tooltip-top"} data-tip={isMobile ? undefined : "发送媒体"}>
          <FilePlusIcon className="
            size-6 jump_icon mt-1
            md:mt-0
          " />
        </div>
      </button>
      <input
        type="file"
        ref={mediaInputRef}
        className="hidden"
        accept={setAudioFile ? "image/*,audio/*,video/*" : "image/*,video/*"}
        title="选择媒体文件"
        aria-label="选择媒体文件"
        onChange={handleMediaSelect}
      />
    </div>
  );

  return (
    <div className={`
      flex
      ${isInline ? "items-start gap-2 flex-nowrap" : `flex-col w-full`}
    `}>
      <div className={`
        ${isInline ? "flex items-start gap-2 flex-nowrap" : `w-full`}
      `}>
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
          <div className={`
            ${isStacked ? `
              flex items-center justify-between gap-2 w-full bg-base-100
              rounded-lg px-2 py-1
            ` : `flex items-center gap-2 flex-wrap`}
          `}>
            <div className="flex items-center gap-2 flex-wrap">
              <div
                ref={emojiDropdownRef}
                className={`
                  dropdown dropdown-top dropdown-start
                  md:dropdown-center
                  ${isEmojiOpen ? `dropdown-open` : ""}
                `}
              >
                <button
                  type="button"
                  className={richActionDisabledClass}
                  aria-label="发送表情"
                  title="发送表情"
                  onClick={() => {
                    if (disableRichMessageActions) {
                      handleBlockedRichMessageAction();
                      return;
                    }
                    setIsEmojiOpen(prev => !prev);
                  }}
                >
                  <div
                    className={isMobile ? "" : "tooltip tooltip-top"}
                    data-tip={isMobile ? undefined : "发送表情"}
                  >
                    <EmojiIconWhite className="
                      size-6 jump_icon mt-1
                      md:mt-0
                    "></EmojiIconWhite>
                  </div>
                </button>
                <ul
                  className="
                    dropdown-content menu bg-base-100 rounded-box z-9999 w-56
                    md:w-96
                    p-2 shadow-sm overflow-y-auto mb-6
                  "
                >
                  <StickerWindow onChoose={async (emoji) => {
                    const emojiUrl = mediaFileUrl(emoji?.fileId, emoji?.mediaType, "medium");
                    updateEmojiUrls((draft) => {
                      const newUrl = emojiUrl;
                      if (newUrl && !draft.includes(newUrl)) {
                        draft.push(newUrl);
                      }
                    });
                    if (emojiUrl) {
                      resolvedSetEmojiMetaByUrl(emojiUrl, {
                        fileId: emoji.fileId,
                        width: emoji.width,
                        height: emoji.height,
                        mediaType: emoji.mediaType,
                        size: emoji.fileSize,
                        fileName: emoji.name,
                      });
                    }
                  }}
                  >
                  </StickerWindow>
                </ul>
              </div>

              {mediaActionButton}

              {/* WebGAL 联动模式按钮 */}
              {showWebgalLinkToggle && onToggleWebgalLinkMode && !isStacked && (
                <div
                  className="tooltip tooltip-top"
                  data-tip={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                >
                  <LinkFilled
                    className={`
                      size-6 cursor-pointer jump_icon
                      md:mb-1
                      ${webgalLinkMode ? `text-info` : ""}
                    `}
                    onClick={handleToggleWebgalLinkMode}
                  />
                </div>
              )}

              {showRunModeToggle && onToggleRunMode && !isStacked && (
                <div
                  className="tooltip tooltip-top"
                  data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/文档/战斗"}
                >
                  <DiceD6Icon
                    className={`
                      md:mb-1
                      size-6 cursor-pointer jump_icon
                      ${runModeEnabled ? `text-info` : ""}
                    `}
                    onClick={handleToggleRunMode}
                  />
                </div>
              )}

              {/* 发送按钮 */}
              {showSendButton && !isStacked && (
                <div className="tooltip tooltip-top" data-tip="发送">
                  <SendIcon
                    className={`size-6 font-light hover:text-info md:mb-1 ${disableSendMessage ? "cursor-not-allowed opacity-20" : ""}`.trim()}
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
                      className={`
                        size-6 cursor-pointer jump_icon
                        ${webgalLinkMode ? `text-info` : ""}
                      `}
                      onClick={handleToggleWebgalLinkMode}
                    />
                  </div>
                )}

                {showRunModeToggle && onToggleRunMode && (
                  <div
                    className="tooltip tooltip-top"
                    data-tip={runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/文档/战斗"}
                  >
                    <DiceD6Icon
                      className={`
                        size-6 cursor-pointer jump_icon
                        ${runModeEnabled ? `text-info` : ""}
                      `}
                      onClick={handleToggleRunMode}
                    />
                  </div>
                )}

                {showSendButton && (
                  <div className="tooltip tooltip-top" data-tip="发送">
                    <SendIcon
                      className={`size-6 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20" : ""}`.trim()}
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

      {(showWebgalControls || showRunControls || showCopilotControl) && (
        <div className={isInline ? "mt-1" : "mt-2"}>
          <ChatToolbarDock
            isInline={isInline}
            isRunModeOnly={runModeEnabled && !webgalLinkMode}
            showWebgalControls={showWebgalControls}
            onSendEffect={onSendEffect}
            onClearBackground={onClearBackground}
            onClearFigure={onClearFigure}
            isSpectator={isSpectator}
            onToggleRealtimeRender={onToggleRealtimeRender}
            onOpenFullMessageDiff={onOpenFullMessageDiff}
            isFullMessageDiffOpen={isFullMessageDiffOpen}
            showRunControls={showRunControls}
            showCopilotControl={showCopilotControl}
          />
        </div>
      )}
    </div>
  );
}

export default ChatToolbar;
