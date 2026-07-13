import type { Sticker as StickerType } from "@tuanchat/openapi-client/models/Sticker";

import { getDirectMessagePreviewText } from "@tuanchat/domain/direct-message";

import StickerWindow from "@/components/chat/window/StickerWindow";
import BetterImg from "@/components/common/betterImg";
import { Button } from "@/components/common/Button";
import { TextArea, TextInput } from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
import PortalTooltip from "@/components/common/portalTooltip";
import { DropdownMenu } from "@/components/common/MenuPopover";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useGlobalWebSocket } from "@/components/globalContextProvider";
import { EmojiIcon, Image2Fill } from "@/icons";
import { mediaFileUrl } from "@/utils/media/mediaUrl";

import { usePrivateMessageSender } from "../hooks/usePrivateMessageSender";

import type { MessageDirectResponse } from "../../../../api";

type MessageInputProps = {
  userId: number;
  currentContactUserId: number | null;
  replyMessage?: MessageDirectResponse | null;
  onCancelReply?: () => void;
  onMessageSent?: () => void;
};

function getPrivateReplyPreview(message: MessageDirectResponse) {
  return getDirectMessagePreviewText(message);
}

export default function MessageInput({ userId, currentContactUserId, replyMessage = null, onCancelReply, onMessageSent }: MessageInputProps) {
  const webSocketUtils = useGlobalWebSocket();

  // 消息发送hook
  const {
    messageInput,
    setMessageInput,
    imgFiles,
    updateImgFiles,
    emojiUrls,
    updateEmojiUrls,
    setEmojiMetaByUrl,
    removeEmojiMetaByUrl,
    handleSendMessage,
  } = usePrivateMessageSender({ webSocketUtils, userId, currentContactUserId, replyMessage, onMessageSent });

  /**
   * 文本消息发送
   */
  // Enter 键发送消息
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentContactUserId) {
    return null;
  }
  return (
    <>
      {/* 移动端样式 */}
      <div className="
        md:hidden
        w-full border-t border-base-300 flex flex-col px-4 py-2 max-h-32
      ">
        <ReplyPreview replyMessage={replyMessage} onCancelReply={onCancelReply} />

        {/* 预览要发送的图片和表情 */}
        {(imgFiles.length > 0 || emojiUrls.length > 0) && (
          <div className="flex flex-row gap-x-3 overflow-x-auto overscroll-x-none pb-2">
            {imgFiles.map((file, index) => (
              <BetterImg
                src={file}
                className="h-14 w-max rounded"
                onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                key={file.name}
              />
            ))}
            {emojiUrls.map((url, index) => (
              <BetterImg
                src={url}
                className="h-14 w-max rounded"
                onClose={() => {
                  updateEmojiUrls(draft => void draft.splice(index, 1));
                  removeEmojiMetaByUrl(url);
                }}
                key={url}
              />
            ))}
          </div>
        )}

        {/* 下方输入框和按钮 */}
        <div className="flex items-center gap-3 w-full h-10">
          <div className="flex-1">
            <TextInput
              type="text"
              name="private_message_mobile"
              className="h-10 rounded-full"
              placeholder="输入消息"
              onChange={(e) => {
                setMessageInput(e.target.value);
              }}
              value={messageInput}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-center gap-2">
            <Emoji updateEmojiUrls={updateEmojiUrls} setEmojiMetaByUrl={setEmojiMetaByUrl}>
              <EmojiIcon className="
                size-6 cursor-pointer
                hover:text-info
                transition-colors
              " />
            </Emoji>

            <Image updateImgFiles={updateImgFiles}>
              <Image2Fill className="
                size-6 cursor-pointer
                hover:text-info
                transition-colors
              " />
            </Image>
          </div>
          <IconButton
            icon={(
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
            label="发送消息"
            tooltip="发送消息"
            variant="primary"
            size="sm"
            shape="circle"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0}
          />
        </div>
      </div>

      {/* 桌面端样式 */}
      <div className="
        hidden
        md:flex
        w-full flex-col border-t border-base-300 px-6 py-3
      ">
        <ReplyPreview replyMessage={replyMessage} onCancelReply={onCancelReply} />

        {/* 预览要发送的图片 */}
        {(imgFiles.length > 0 || emojiUrls.length > 0) && (
          <div className="mb-2 flex flex-row gap-x-3 overflow-x-auto overscroll-x-none">
            {imgFiles.map((file, index) => (
              <BetterImg
                src={file}
                className="h-14 w-max rounded"
                onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                key={file.name}
              />
            ))}
            {emojiUrls.map((url, index) => (
              <BetterImg
                src={url}
                className="h-14 w-max rounded"
                onClose={() => {
                  updateEmojiUrls(draft => void draft.splice(index, 1));
                  removeEmojiMetaByUrl(url);
                }}
                key={url}
              />
            ))}
          </div>
        )}

        <div className="
          flex min-h-11 w-full items-end gap-2 rounded-xl border border-base-300
          bg-base-200/60 px-3 py-2
          focus-within:border-info/60 focus-within:ring-2
          focus-within:ring-info/20
        ">
          <div className="flex h-8 shrink-0 items-center gap-1">
            <Emoji updateEmojiUrls={updateEmojiUrls} setEmojiMetaByUrl={setEmojiMetaByUrl}>
              <EmojiIcon className="
                size-5 cursor-pointer text-base-content/60 transition-colors
                hover:text-info
              " />
            </Emoji>
            <Image updateImgFiles={updateImgFiles}>
              <Image2Fill className="
                size-5 cursor-pointer text-base-content/60 transition-colors
                hover:text-info
              " />
            </Image>
          </div>

          <label htmlFor="private-message-input" className="sr-only">私聊消息</label>
          <TextArea
            appearance="bare"
            id="private-message-input"
            name="privateMessage"
            className="max-h-28 min-h-8 flex-1 resize-none px-1 py-1 text-sm leading-6 placeholder:text-base-content/45"
            placeholder="Enter 发送，Shift+Enter 换行"
            onChange={(e) => {
              setMessageInput(e.target.value);
            }}
            value={messageInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <Button
            variant="primary"
            size="sm"
            className="min-h-8 h-8 shrink-0"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0}
          >
            发送
          </Button>
        </div>
      </div>
    </>
  );
}

function ReplyPreview({
  replyMessage,
  onCancelReply,
}: {
  replyMessage?: MessageDirectResponse | null;
  onCancelReply?: () => void;
}) {
  if (!replyMessage) {
    return null;
  }

  return (
    <div className="
      mb-2 flex items-center gap-2 rounded-md border-l-4 border-info
      bg-base-200/70 px-3 py-2 text-sm
    ">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-base-content/55">回复 {replyMessage.senderUsername || "私聊消息"}</div>
        <div className="truncate text-base-content/80">{getPrivateReplyPreview(replyMessage)}</div>
      </div>
      {onCancelReply && (
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0"
          onClick={onCancelReply}
          aria-label="取消回复"
          title="取消回复"
        >
          取消
        </Button>
      )}
    </div>
  );
}

function Emoji({
  children,
  updateEmojiUrls,
  setEmojiMetaByUrl,
}: {
  children: React.ReactNode;
  updateEmojiUrls: (recipe: (draft: string[]) => void) => void;
  setEmojiMetaByUrl: (url: string, meta: { fileId?: number; width?: number; height?: number; mediaType?: string; size?: number; fileName?: string }) => void;
}) {
  const onChoose = async (emoji: StickerType) => {
    const emojiUrl = mediaFileUrl(emoji?.fileId, emoji?.mediaType, "medium");
    // 添加到表情列表
    updateEmojiUrls((draft) => {
      const newUrl = emojiUrl;
      if (newUrl && !draft.includes(newUrl)) {
        draft.push(newUrl);
      }
    });
    if (emojiUrl) {
      setEmojiMetaByUrl(emojiUrl, {
        fileId: emoji.fileId,
        width: emoji.width,
        height: emoji.height,
        mediaType: emoji.mediaType,
        size: emoji.fileSize,
        fileName: emoji.name,
      });
    }
  };
  return (
    <PortalTooltip label="发送表情" placement="top">
      <DropdownMenu
        ariaLabel="表情选择"
        placement="top-start"
        className="h-full items-center justify-center"
        menuClassName="w-96 overflow-y-auto p-2 shadow-sm"
        trigger={(
          <button type="button" aria-label="发送表情" title="发送表情">
            {children}
          </button>
        )}
      >
        <StickerWindow onChoose={onChoose}></StickerWindow>
      </DropdownMenu>
    </PortalTooltip>
  );
}

function Image({ children, updateImgFiles }: { children: React.ReactNode; updateImgFiles: (recipe: (draft: File[]) => void) => void }) {
  return (
    <ImgUploader setImg={newImg => updateImgFiles((draft: File[]) => {
      draft.push(newImg);
    })}
    >
      <PortalTooltip label="发送图片" placement="top" anchorClassName="items-center justify-center">
        {children}
      </PortalTooltip>
    </ImgUploader>
  );
}
