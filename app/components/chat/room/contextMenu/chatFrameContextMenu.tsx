import type { ChatMessageResponse, ImageMessage, Message } from "../../../../../api";
import { use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useSendMessageMutation } from "../../../../../api/hooks/chatQueryHooks";
import { useAddCluesMutation, useGetMyClueStarsBySpaceQuery } from "../../../../../api/hooks/spaceClueHooks";

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
  onUnlockCg: (messageId: number) => void;
  onAddEmoji: (imgMessage: ImageMessage) => void;
  onAddClue?: (clueInfo: { img: string; name: string; description: string }) => void;
  onInsertAfter: (messageId: number) => void;
  onToggleNarrator: (messageId: number) => void;
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
  onUnlockCg,
  onAddEmoji,
  onInsertAfter,
  onToggleNarrator,
}: ContextMenuProps) {
  const globalContext = useGlobalContext();
  const spaceContext = use(SpaceContext);
  const roomContext = use(RoomContext);

  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const sendMessageMutation = useSendMessageMutation(roomContext.roomId ?? -1);

  const [showClueFolderSelection, setShowClueFolderSelection] = useState(false);
  const [selectedClueInfo, setSelectedClueInfo] = useState<{ img: string; name: string; description: string } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const clueFolderSelectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const top = `${contextMenu.y}px`;
    const left = `${contextMenu.x}px`;

    if (menuRef.current) {
      menuRef.current.style.top = top;
      menuRef.current.style.left = left;
    }
    if (clueFolderSelectionRef.current) {
      clueFolderSelectionRef.current.style.top = top;
      clueFolderSelectionRef.current.style.left = left;
    }
  }, [contextMenu]);

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

  const contextMenuMessageId = contextMenu?.messageId;
  const message = contextMenuMessageId
    ? historyMessages.find(message => message.message.messageId === contextMenuMessageId)
    : undefined;
  const clueMessage = message?.message.extra?.clueMessage;

  const threadMeta = useMemo(() => {
    const selected = message?.message;
    const allMessages = historyMessages;
    if (!selected) {
      return { threadRootId: undefined as number | undefined, replyCount: 0, hasThreadRoot: false };
    }

    const isThreadReply = !!selected.threadId && selected.threadId !== selected.messageId;
    const isThreadRoot = selected.messageType === MESSAGE_TYPE.THREAD_ROOT && selected.threadId === selected.messageId;

    let rootId: number | undefined;
    if (isThreadReply) {
      rootId = selected.threadId;
    }
    else if (isThreadRoot) {
      rootId = selected.messageId;
    }
    else {
      const threadRoot = allMessages.find((m) => {
        const mm = m.message;
        return mm.messageType === MESSAGE_TYPE.THREAD_ROOT
          && mm.threadId === mm.messageId
          && mm.replyMessageId === selected.messageId;
      });
      rootId = threadRoot?.message.messageId;
    }

    const replyCount = rootId
      ? allMessages.filter(m => m.message.threadId === rootId && m.message.messageId !== rootId).length
      : 0;

    return { threadRootId: rootId, replyCount, hasThreadRoot: !!rootId };
  }, [historyMessages, message?.message]);

  if (!contextMenu)
    return null;

  const handleOpenThread = (rootId: number) => {
    // 打开 Thread 时，清除“插入消息”模式，避免错位。
    setInsertAfterMessageId(undefined);
    setThreadRootMessageId(rootId);
    setComposerTarget("thread");
    // Thread 以右侧固定分栏展示：关闭其它右侧抽屉
    setSideDrawerState("none");
  };

  const handleCreateOrOpenThread = () => {
    const selected = message?.message;
    if (!selected) {
      return;
    }

    if (threadMeta.threadRootId) {
      handleOpenThread(threadMeta.threadRootId);
      onClose();
      return;
    }

    const roomId = roomContext.roomId;
    if (!roomId) {
      toast.error("未找到 roomId，无法创建子区");
      return;
    }

    // 不弹窗输入标题：默认使用原消息内容截断（不加“Thread:”前缀）
    const raw = (selected.content ?? "").trim();
    const title = raw ? raw.slice(0, 20) : "子区";

    sendMessageMutation.mutate({
      roomId,
      messageType: MESSAGE_TYPE.THREAD_ROOT,
      roleId: roomContext.curRoleId,
      avatarId: roomContext.curAvatarId,
      content: title,
      // 复用 replayMessageId 作为 threadParentMessageId：该子区挂到哪条原消息上
      replayMessageId: selected.messageId,
      extra: { title },
    }, {
      onSuccess: (response) => {
        const created = response?.data;
        if (!created) {
          return;
        }
        roomContext.chatHistory?.addOrUpdateMessage({ message: created, messageMark: [] });
        handleOpenThread(created.messageId);
        onClose();
      },
      onError: () => {
        toast.error("创建子区失败");
      },
    });
  };

  // 渲染线索夹选择窗口
  if (showClueFolderSelection && selectedClueInfo) {
    return (
      <div
        ref={clueFolderSelectionRef}
        className="fixed bg-base-100 shadow-lg rounded-md z-50 border border-base-300"
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
      ref={menuRef}
      className="fixed bg-base-100 shadow-lg rounded-md z-50"
      onClick={e => e.stopPropagation()}
    >
      <ul className="menu p-2 w-40">
        <li>
          <a onClick={(e) => {
            e.preventDefault();
            handleCreateOrOpenThread();
          }}
          >
            {threadMeta.hasThreadRoot
              ? `打开子区${threadMeta.replyCount > 0 ? ` (${threadMeta.replyCount})` : ""}`
              : "创建子区"}
          </a>
        </li>
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
          (spaceContext.isSpaceOwner || message?.message.userId === globalContext.userId) && (
            <li>
              <a onClick={(e) => {
                e.preventDefault();
                onToggleNarrator(contextMenu.messageId);
                onClose();
              }}
              >
                切换旁白/角色
              </a>
            </li>
          )
        }
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
                      onUnlockCg(contextMenu.messageId);
                      onClose();
                    }}
                  >
                    {
                      (message?.message.webgal as any)?.unlockCg ? "取消解锁CG" : "解锁CG"
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
