import type { ChatMessageResponse, ImageMessage, Message } from "../../../api";
import { SpaceContext } from "@/components/chat/spaceContext";
import { useGlobalContext } from "@/components/globalContextProvider";
import { use } from "react";

interface ContextMenuProps {
  contextMenu: { x: number; y: number; messageId: number } | null;
  historyMessages: ChatMessageResponse[];
  isSelecting: boolean;
  selectedMessageIds: Set<number>;
  useChatBubbleStyle: boolean;
  onClose: () => void;
  onDelete: () => void;
  onToggleSelection: (messageId: number) => void;
  onReply: (message: Message) => void;
  onMoveMessages: (targetIndex: number, messageIds: number[]) => void;
  onToggleChatBubbleStyle: () => void;
  onEditMessage: (messageId: number) => void;
  onToggleBackground: (messageId: number) => void;
  onAddEmoji: (imgMessage: ImageMessage) => void;
  onAddClue?: (clueInfo: { img: string; name: string; description: string }) => void;
}

export default function ChatFrameContextMenu({
  contextMenu,
  historyMessages,
  isSelecting,
  selectedMessageIds,
  useChatBubbleStyle,
  onClose,
  onDelete,
  onToggleSelection,
  onReply,
  onMoveMessages,
  onToggleChatBubbleStyle,
  onEditMessage,
  onToggleBackground,
  onAddEmoji,
  onAddClue,
}: ContextMenuProps) {
  const globalContext = useGlobalContext();
  const spaceContext = use(SpaceContext);

  if (!contextMenu)
    return null;

  const message = historyMessages.find(message => message.message.messageId === contextMenu.messageId);
  const clueMessage = message?.message.extra?.clueMessage;

  return (
    <div
      className="fixed bg-base-100 shadow-lg rounded-md z-50"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={e => e.stopPropagation()}
    >
      <ul className="menu p-2 w-40">
        {clueMessage && (
          <li>
            <a onClick={(e) => {
              e.preventDefault();
              onAddClue?.({
                img: clueMessage.img || "",
                name: clueMessage.name || "未知线索",
                description: clueMessage.description || "",
              });
              onClose();
            }}
            >
              收藏线索
            </a>
          </li>
        )}
        {
          (spaceContext.isSpaceOwner || message?.message.userId === globalContext.userId)
          && (
            <li>
              <a onClick={(e) => {
                e.preventDefault();
                onDelete();
                onClose();
              }}
              >
                删除
              </a>
            </li>
          )
        }
        <li>
          <a onClick={(e) => {
            e.preventDefault();
            onToggleSelection(contextMenu.messageId);
            onClose();
          }}
          >
            多选
          </a>
        </li>
        <li>
          <a onClick={(e) => {
            e.preventDefault();
            message?.message && onReply(message.message);
            onClose();
          }}
          >
            回复
          </a>
        </li>
        {
          (isSelecting) && (
            <li>
              <a onClick={(e) => {
                e.preventDefault();
                onMoveMessages(
                  historyMessages.findIndex(message => message.message.messageId === contextMenu.messageId),
                  Array.from(selectedMessageIds),
                );
                onClose();
              }}
              >
                将选中消息移动到此消息下方
              </a>
            </li>
          )
        }
        <li>
          <a onClick={(e) => {
            e.preventDefault();
            onToggleChatBubbleStyle();
          }}
          >
            切换到
            {useChatBubbleStyle ? "传统" : "气泡"}
            样式
          </a>
        </li>
        {(() => {
          if (message?.message.userId !== globalContext.userId && !spaceContext.isSpaceOwner) {
            return null;
          }
          if (!message || (message.message.messageType !== 2 && message.message.messageType !== 1000)) {
            return (
              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    onEditMessage(contextMenu.messageId);
                    onClose();
                  }}
                >
                  编辑文本
                </a>
              </li>
            );
          }
          // 图片消息
          return (
            <>
              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleBackground(contextMenu.messageId);
                    onClose();
                  }}
                >
                  {
                    message?.message.extra?.imageMessage?.background ? "取消设置为背景" : "设为背景"
                  }
                </a>
              </li>
              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    const imgMessage = message?.message.extra?.imageMessage;
                    imgMessage && onAddEmoji(imgMessage);
                    onClose();
                  }}
                >
                  添加到表情
                </a>
              </li>
            </>
          );
        })()}
      </ul>
    </div>
  );
}
