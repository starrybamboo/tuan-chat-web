import type { ChatMessageResponse, ImageMessage, Message } from "../../../api";
import { SpaceContext } from "@/components/chat/spaceContext";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useAddCluesMutation, useGetMyClueStarsBySpaceQuery } from "api/hooks/spaceClueHooks";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";

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
  onInsertAfter: (messageId: number) => void;
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
  onInsertAfter,
}: ContextMenuProps) {
  const globalContext = useGlobalContext();
  const spaceContext = use(SpaceContext);

  const [showClueFolderSelection, setShowClueFolderSelection] = useState(false);
  const [selectedClueInfo, setSelectedClueInfo] = useState<{ img: string; name: string; description: string } | null>(null);

  // 获取用户空间所有线索夹
  const getMyClueStarsBySpaceQuery = useGetMyClueStarsBySpaceQuery(spaceContext.spaceId ?? -1);
  const clueFolders = useMemo(() => getMyClueStarsBySpaceQuery.data?.data ?? [], [getMyClueStarsBySpaceQuery.data?.data]);

  // 添加线索到指定线索夹
  const addCluesMutation = useAddCluesMutation();

  const handleAddClueToFolder = async (folderId: number) => {
    if (!selectedClueInfo || !spaceContext.spaceId) {
      toast.error("无法获取线索信息或空间信息");
      return;
    }

    try {
      const request = [
        {
          clueStarsId: folderId,
          name: selectedClueInfo.name,
          description: selectedClueInfo.description,
          image: selectedClueInfo.img,
          note: "从聊天消息收藏",
          type: "OTHER" as const,
        },
      ];

      await addCluesMutation.mutateAsync(request);
      toast.success("线索收藏成功");
      setShowClueFolderSelection(false);
      setSelectedClueInfo(null);
      onClose();
    }
    catch (error) {
      toast.error("收藏线索失败");
      console.error("收藏线索失败:", error);
    }
  };

  const handleOpenClueFolderSelection = (clueInfo: { img: string; name: string; description: string }) => {
    setSelectedClueInfo(clueInfo);
    setShowClueFolderSelection(true);
  };

  if (!contextMenu)
    return null;

  const message = historyMessages.find(message => message.message.messageId === contextMenu.messageId);
  const clueMessage = message?.message.extra?.clueMessage;

  // 渲染线索夹选择窗口
  if (showClueFolderSelection && selectedClueInfo) {
    return (
      <div
        className="fixed bg-base-100 shadow-lg rounded-md z-50 border border-base-300"
        style={{ top: contextMenu.y, left: contextMenu.x }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 w-48">
          <h3 className="font-semibold text-sm mb-2">选择线索夹</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {clueFolders.length === 0
              ? (
                  <div className="text-center py-2 text-sm text-gray-500">
                    暂无线索夹
                  </div>
                )
              : (
                  clueFolders.map(folder => (
                    <button
                      type="button"
                      key={folder.id}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-base-200 transition-colors"
                      onClick={() => handleAddClueToFolder(folder.id!)}
                      disabled={addCluesMutation.isPending}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="truncate">{folder.name}</span>
                      </div>
                    </button>
                  ))
                )}
          </div>
          <div className="flex gap-2 mt-3 pt-2 border-t border-base-300">
            <button
              className="btn btn-sm btn-ghost flex-1"
              onClick={() => {
                setShowClueFolderSelection(false);
                setSelectedClueInfo(null);
              }}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bg-base-100 shadow-lg rounded-md z-50"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={e => e.stopPropagation()}
    >
      <ul className="menu p-2 w-40">
        {clueMessage && !spaceContext.isSpaceOwner && (
          <li>
            <a onClick={(e) => {
              e.preventDefault();
              handleOpenClueFolderSelection({
                img: clueMessage.img || "",
                name: clueMessage.name || "未知线索",
                description: clueMessage.description || "",
              });
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
        <li>
          <a onClick={(e) => {
            e.preventDefault();
            onInsertAfter(contextMenu.messageId);
            onClose();
          }}
          >
            在此处插入消息
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
          if (!message || message.message.messageType !== 1000) {
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
          }
        })()}
      </ul>
    </div>
  );
}
