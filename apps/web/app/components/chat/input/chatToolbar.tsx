import { FilePlusIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import ChatStatusBar from "@/components/chat/chatStatusBar";
import { formatUnreadBadgeCount } from "@/components/chat/clues/clueUnread";
import ChatToolbarDock from "@/components/chat/input/chatToolbarDock";
import {
  CANCEL_INSERT_MODE_LABEL,
  CANCEL_POKE_MODE_LABEL,
} from "@/components/chat/room/roomComposerInsertMode";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { preheatChatMediaPreprocess } from "@/components/chat/utils/attachmentPreprocess";
import StickerWindow from "@/components/chat/window/StickerWindow";
import { appToast } from "@/components/common/appToast/appToast";
import { FileInput } from "@/components/common/FormField";
import { MenuSurface } from "@/components/common/MenuPopover";
import PortalTooltip from "@/components/common/portalTooltip";
import {
  CloseIcon,
  DiceD6Icon,
  EmojiIconWhite,
  LinkFilled,
  SendIcon,
} from "@/icons";
import { normalizeImageFileOrNull } from "@/utils/media/mediaMime";
import { mediaFileUrl } from "@/utils/media/mediaUrl";

type ChatToolbarProps = {
  /** 当前房间（用于BGM个人开关/停止全员BGM） */
  roomId?: number;
  /** 是否为KP（房主） */
  isKP?: boolean;
  /** 当前空间是否已归档，归档后仅 KP 可发言 */
  isSpaceArchived?: boolean;
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
  isInsertMode?: boolean;
  onCancelInsertMode?: () => void;
  isPokeMode?: boolean;
  onCancelPokeMode?: () => void;

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
  runModeBadgeCount?: number;
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
}

function UnreadBadge({ count }: { count?: number }) {
  if (!count || count <= 0) {
    return null;
  }

  return (
    <span className="
      pointer-events-none absolute -right-2 -top-2 z-10 flex h-4 min-w-4
      items-center justify-center rounded-full bg-error px-1 text-[10px]
      font-semibold leading-none text-error-content shadow-sm
    ">
      {formatUnreadBadgeCount(count)}
    </span>
  );
}

function ChatToolbar({
  roomId,
  isKP,
  isSpaceArchived = false,
  updateEmojiUrls,
  updateImgFiles,
  updateFileAttachments,
  setEmojiMetaByUrl,
  disableSendMessage,
  handleMessageSubmit,
  isInsertMode = false,
  onCancelInsertMode,
  isPokeMode = false,
  onCancelPokeMode,
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
  runModeBadgeCount = 0,
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
}: ChatToolbarProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const emojiDropdownRef = useRef<HTMLDivElement>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const storeSetEmojiMetaByUrl = useChatComposerStore(state => state.setEmojiMetaByUrl);
  const resolvedSetEmojiMetaByUrl = setEmojiMetaByUrl ?? storeSetEmojiMetaByUrl;

  const handleBlockedRichMessageAction = useCallback(() => {
    if (disableRichMessageActions) {
      appToast.error("当前不可发送附件");
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

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const imageFile = await normalizeImageFileOrNull(file);
    if (imageFile) {
      updateImgFiles((draft) => {
        draft.push(imageFile);
      });
      preheatChatMediaPreprocess({ imageFiles: [imageFile] });
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

    appToast.error("当前仅支持图片、音频、视频");
    e.target.value = "";
  };

  const sendButtonTip = isSpaceArchived && !isKP ? "当前空间已归档，仅主持人可发言" : "发送";
  const richActionDisabledClass = disableRichMessageActions ? "cursor-not-allowed opacity-20" : "cursor-pointer";
  const runModeToggleTip = runModeEnabled ? "关闭跑团模式" : "开启跑团模式后显示地图/文档/战斗";
  const cancelMode = isPokeMode && onCancelPokeMode
    ? {
        className: `
          chatToolbarCancelButton--poke
        `,
        label: CANCEL_POKE_MODE_LABEL,
        onCancel: onCancelPokeMode,
      }
    : isInsertMode && onCancelInsertMode
      ? {
          className: `
            text-info hover:bg-info/12 hover:text-info
            focus-visible:ring-info/35
          `,
          label: CANCEL_INSERT_MODE_LABEL,
          onCancel: onCancelInsertMode,
        }
      : null;
  const cancelModeButton = cancelMode
    ? (
        <PortalTooltip label={cancelMode.label} placement="top">
          <button
            type="button"
            className={`
              inline-flex size-6 items-center justify-center rounded-md
              transition-[background-color,color,transform] active:scale-95
              focus-visible:outline-none focus-visible:ring-2
              ${cancelMode.className}
            `}
            aria-label={cancelMode.label}
            title={cancelMode.label}
            onClick={cancelMode.onCancel}
          >
            <CloseIcon className="size-5 stroke-[4]" />
          </button>
        </PortalTooltip>
      )
    : null;
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
        <PortalTooltip label="发送媒体" placement="top">
          <FilePlusIcon className="
            size-6 jump_icon mt-1
            md:mt-0
          " />
        </PortalTooltip>
      </button>
      <FileInput
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
              {cancelModeButton}
              <div
                ref={emojiDropdownRef}
                className="relative inline-flex"
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
                  <PortalTooltip label="发送表情" placement="top">
                    <EmojiIconWhite className="
                      size-6 jump_icon mt-1
                      md:mt-0
                    "></EmojiIconWhite>
                  </PortalTooltip>
                </button>
                <MenuSurface
                  as="ul"
                  ariaLabel="表情选择"
                  className={`absolute bottom-full left-0 z-9999 mb-6 w-56 overflow-y-auto p-2 shadow-sm md:left-1/2 md:w-96 md:-translate-x-1/2 ${isEmojiOpen ? "" : "hidden"}`}
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
                </MenuSurface>
              </div>

              {mediaActionButton}

              {/* WebGAL 联动模式按钮 */}
              {showWebgalLinkToggle && onToggleWebgalLinkMode && !isStacked && (
                <PortalTooltip label={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"} placement="top">
                  <button
                    type="button"
                    className="
                      inline-flex appearance-none items-center justify-center
                      border-0 bg-transparent p-0 text-inherit
                    "
                    aria-label={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                    title={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                    onClick={handleToggleWebgalLinkMode}
                  >
                    <LinkFilled
                      className={`
                        size-6 cursor-pointer jump_icon
                        md:mb-1
                        ${webgalLinkMode ? `text-info` : ""}
                      `}
                    />
                  </button>
                </PortalTooltip>
              )}

              {showRunModeToggle && onToggleRunMode && !isStacked && (
                <PortalTooltip label={runModeToggleTip} placement="top">
                  <button
                    type="button"
                    className="
                      relative inline-flex appearance-none items-center
                      justify-center border-0 bg-transparent p-0 text-inherit
                    "
                    aria-label={runModeToggleTip}
                    title={runModeToggleTip}
                    onClick={handleToggleRunMode}
                  >
                    <DiceD6Icon
                      className={`
                        md:mb-1
                        size-6 cursor-pointer jump_icon
                        ${runModeEnabled ? `text-info` : ""}
                      `}
                    />
                    <UnreadBadge count={runModeBadgeCount} />
                  </button>
                </PortalTooltip>
              )}

              {/* 发送按钮 */}
              {showSendButton && !isStacked && (
                <PortalTooltip label={sendButtonTip} placement="top">
                  <button
                    type="button"
                    className="
                      inline-flex appearance-none items-center justify-center
                      border-0 bg-transparent p-0 text-inherit
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-info/30
                    "
                    aria-label={sendButtonTip}
                    title={sendButtonTip}
                    disabled={disableSendMessage}
                    onClick={handleMessageSubmit}
                  >
                    <SendIcon
                      className={`size-6 font-light hover:text-info md:mb-1 ${disableSendMessage ? "cursor-not-allowed opacity-20" : ""}`.trim()}
                    />
                  </button>
                </PortalTooltip>
              )}
            </div>

            {isStacked && (
              <div className="flex items-center gap-2 flex-nowrap">
                {showWebgalLinkToggle && onToggleWebgalLinkMode && (
                  <PortalTooltip label={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"} placement="top">
                    <button
                      type="button"
                      className="
                        inline-flex appearance-none items-center justify-center
                        border-0 bg-transparent p-0 text-inherit
                      "
                      aria-label={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                      title={webgalLinkMode ? "关闭联动模式" : "开启联动模式（显示联动工具栏）"}
                      onClick={handleToggleWebgalLinkMode}
                    >
                      <LinkFilled
                        className={`
                          size-6 cursor-pointer jump_icon
                          ${webgalLinkMode ? `text-info` : ""}
                        `}
                      />
                    </button>
                  </PortalTooltip>
                )}

                {showRunModeToggle && onToggleRunMode && (
                  <PortalTooltip label={runModeToggleTip} placement="top">
                    <button
                      type="button"
                      className="
                        relative inline-flex appearance-none items-center
                        justify-center border-0 bg-transparent p-0 text-inherit
                      "
                      aria-label={runModeToggleTip}
                      title={runModeToggleTip}
                      onClick={handleToggleRunMode}
                    >
                      <DiceD6Icon
                        className={`
                          size-6 cursor-pointer jump_icon
                          ${runModeEnabled ? `text-info` : ""}
                        `}
                      />
                      <UnreadBadge count={runModeBadgeCount} />
                    </button>
                  </PortalTooltip>
                )}

                {showSendButton && (
                  <PortalTooltip label={sendButtonTip} placement="top">
                    <button
                      type="button"
                      className="
                        inline-flex appearance-none items-center justify-center
                        border-0 bg-transparent p-0 text-inherit
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-info/30
                      "
                      aria-label={sendButtonTip}
                      title={sendButtonTip}
                      disabled={disableSendMessage}
                      onClick={handleMessageSubmit}
                    >
                      <SendIcon
                        className={`size-6 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20" : ""}`.trim()}
                      />
                    </button>
                  </PortalTooltip>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {(showWebgalControls || showRunControls) && (
        <div className={isInline ? "flex h-6 items-center" : "mt-2"}>
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
          />
        </div>
      )}
    </div>
  );
}

export default ChatToolbar;
