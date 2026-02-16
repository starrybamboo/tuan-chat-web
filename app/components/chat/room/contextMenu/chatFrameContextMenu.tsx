import type { ChatMessageResponse, ImageMessage, Message } from "../../../../../api";
import { useQueryClient } from "@tanstack/react-query";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { copyDocToSpaceDoc, copyDocToSpaceUserDoc } from "@/components/chat/utils/docCopy";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useSendMessageMutation } from "../../../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../../../api/instance";

interface ContextMenuProps {
  contextMenu: { x: number; y: number; messageId: number } | null;
  historyMessages: ChatMessageResponse[];
  isSelecting: boolean;
  selectedMessageIds: Set<number>;
  onClose: () => void;
  onDelete: () => void;
  onToggleSelection: (messageId: number) => void;
  onReply: (message: Message) => void;
  onMoveMessages: (targetIndex: number, messageIds: number[]) => void;
  onEditMessage: (messageId: number) => void;
  onAddEmoji: (imgMessage: ImageMessage) => void;
  onOpenAnnotations: (messageId: number) => void;
  onInsertAfter: (messageId: number) => void;
  onToggleNarrator?: (messageId: number) => void;
  onOpenThread?: (threadRootMessageId: number) => void;
}

export default function ChatFrameContextMenu({
  contextMenu,
  historyMessages,
  isSelecting,
  selectedMessageIds,
  onClose,
  onDelete,
  onToggleSelection,
  onReply,
  onMoveMessages,
  onEditMessage,
  onAddEmoji,
  onOpenAnnotations,
  onInsertAfter,
  onOpenThread,
}: ContextMenuProps) {
  const globalContext = useGlobalContext();
  const spaceContext = use(SpaceContext);
  const roomContext = use(RoomContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const setSubDrawerState = useSideDrawerStore(state => state.setSubState);

  const sendMessageMutation = useSendMessageMutation(roomContext.roomId ?? -1);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu || !menuRef.current) {
      return;
    }

    const menu = menuRef.current;
    const padding = 8;
    const menuWidth = menu.offsetWidth || menu.getBoundingClientRect().width;
    const menuHeight = menu.offsetHeight || menu.getBoundingClientRect().height;
    const maxLeft = Math.max(padding, window.innerWidth - menuWidth - padding);
    const maxTop = Math.max(padding, window.innerHeight - menuHeight - padding);

    const left = Math.min(Math.max(padding, contextMenu.x), maxLeft);
    const top = Math.min(Math.max(padding, contextMenu.y), maxTop);

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, [contextMenu]);

  const contextMenuMessageId = contextMenu?.messageId;
  const message = contextMenuMessageId
    ? historyMessages.find(message => message.message.messageId === contextMenuMessageId)
    : undefined;
  const canEditMessage = !!message && (message.message.userId === globalContext.userId || spaceContext.isSpaceOwner);

  const docCard = useMemo(() => {
    const extraAny = (message?.message as any)?.extra ?? null;
    const raw = (extraAny?.docCard ?? null) as any;
    const candidate = raw && typeof raw === "object" ? raw : null;
    const fallbackCandidate = !candidate && extraAny && typeof extraAny === "object" ? extraAny : null;

    const maybe = candidate ?? fallbackCandidate;
    const docId = typeof maybe?.docId === "string" ? maybe.docId : "";
    if (!docId)
      return null;

    const spaceId = typeof maybe?.spaceId === "number" ? maybe.spaceId : undefined;
    const title = typeof maybe?.title === "string" ? maybe.title : undefined;
    const imageUrl = typeof maybe?.imageUrl === "string" ? maybe.imageUrl : undefined;
    return { docId, spaceId, title, imageUrl };
  }, [message?.message]);

  const canCopyDoc = useMemo(() => {
    return Boolean(docCard?.docId && spaceContext?.spaceId && spaceContext.spaceId > 0);
  }, [docCard?.docId, spaceContext?.spaceId]);

  const ensureCanCopyDoc = useCallback(async () => {
    const spaceId = spaceContext.spaceId ?? -1;
    if (!docCard?.docId) {
      toast.error("未检测到可复制的文档");
      return null;
    }
    if (!spaceId || spaceId <= 0) {
      toast.error("未选择空间");
      return null;
    }

    const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
    const key = parseDescriptionDocId(docCard.docId);
    if (!key) {
      toast.error("仅支持复制空间文档（描述文档/我的文档）");
      return null;
    }

    if (typeof docCard.spaceId === "number" && docCard.spaceId !== spaceId) {
      toast.error("不允许跨空间复制文档");
      return null;
    }

    return { spaceId, sourceDocId: docCard.docId };
  }, [docCard?.docId, docCard?.spaceId, spaceContext.spaceId]);

  const copyToSpaceUserDoc = useCallback(async (params: {
    spaceId: number;
    sourceDocId: string;
    title?: string;
    imageUrl?: string;
  }) => {
    const { newDocEntityId, newDocId, title } = await copyDocToSpaceUserDoc({
      spaceId: params.spaceId,
      sourceDocId: params.sourceDocId,
      title: params.title,
      imageUrl: params.imageUrl,
    });
    queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", params.spaceId] });

    return { newDocEntityId, newDocId, title };
  }, [queryClient]);

  const appendDocToSidebarTree = useCallback(async (params: {
    spaceId: number;
    docId: string;
    title: string;
    imageUrl?: string;
  }) => {
    const { parseSidebarTree } = await import("@/components/chat/room/sidebarTree");
    const getRes = await tuanchat.spaceSidebarTreeController.getSidebarTree(params.spaceId);
    if (!getRes?.success) {
      throw new Error(getRes?.errMsg ?? "获取侧边栏失败");
    }

    const version = getRes.data?.version ?? 0;
    const parsed = parseSidebarTree(getRes.data?.treeJson ?? null);
    const base: any = parsed ?? { schemaVersion: 2, categories: [{ categoryId: "cat:docs", name: "文档", items: [] }] };

    const nodeId = `doc:${params.docId}`;

    const next: any = JSON.parse(JSON.stringify(base));
    const categories: any[] = Array.isArray(next.categories) ? next.categories : [];
    let target: any = categories.find(c => c?.categoryId === "cat:docs");
    if (!target) {
      target = { categoryId: "cat:docs", name: "文档", items: [] };
      categories.push(target);
      next.categories = categories;
    }
    target.items = Array.isArray(target.items) ? target.items : [];
    if (!target.items.some((i: any) => i?.nodeId === nodeId)) {
      target.items.push({
        nodeId,
        type: "doc",
        targetId: params.docId,
        fallbackTitle: params.title,
        ...(params.imageUrl ? { fallbackImageUrl: params.imageUrl } : {}),
      });
    }

    const setReq = { spaceId: params.spaceId, expectedVersion: version, treeJson: JSON.stringify(next) };
    const setRes = await tuanchat.spaceSidebarTreeController.setSidebarTree(setReq);
    if (setRes?.success) {
      return;
    }

    // 版本冲突：重试一次
    const retryGet = await tuanchat.spaceSidebarTreeController.getSidebarTree(params.spaceId);
    if (!retryGet?.success) {
      throw new Error(retryGet?.errMsg ?? "获取侧边栏失败（重试）");
    }
    const retryVersion = retryGet.data?.version ?? (version + 1);
    const retryParsed: any = parseSidebarTree(retryGet.data?.treeJson ?? null) ?? base;
    const retryNext: any = JSON.parse(JSON.stringify(retryParsed));
    const retryCats: any[] = Array.isArray(retryNext.categories) ? retryNext.categories : [];
    let retryTarget: any = retryCats.find(c => c?.categoryId === "cat:docs");
    if (!retryTarget) {
      retryTarget = { categoryId: "cat:docs", name: "文档", items: [] };
      retryCats.push(retryTarget);
      retryNext.categories = retryCats;
    }
    retryTarget.items = Array.isArray(retryTarget.items) ? retryTarget.items : [];
    if (!retryTarget.items.some((i: any) => i?.nodeId === nodeId)) {
      retryTarget.items.push({
        nodeId,
        type: "doc",
        targetId: params.docId,
        fallbackTitle: params.title,
        ...(params.imageUrl ? { fallbackImageUrl: params.imageUrl } : {}),
      });
    }

    const retrySet = await tuanchat.spaceSidebarTreeController.setSidebarTree({
      spaceId: params.spaceId,
      expectedVersion: retryVersion,
      treeJson: JSON.stringify(retryNext),
    });
    if (!retrySet?.success) {
      throw new Error(retrySet?.errMsg ?? "写入侧边栏失败（可能存在并发修改）");
    }
  }, []);

  const handleCopyToMyDocs = useCallback(async () => {
    const ok = await ensureCanCopyDoc();
    if (!ok)
      return;

    const toastId = toast.loading("正在复制到我的文档…");
    try {
      await copyToSpaceUserDoc({
        spaceId: ok.spaceId,
        sourceDocId: ok.sourceDocId,
        title: docCard?.title,
        imageUrl: docCard?.imageUrl,
      });
      toast.success("已复制到我的文档", { id: toastId });
      setSideDrawerState("doc");
    }
    catch (err) {
      console.error("[DocCopy] copyToMyDocs failed", err);
      toast.error(err instanceof Error ? err.message : "复制失败", { id: toastId });
    }
  }, [copyToSpaceUserDoc, docCard?.imageUrl, docCard?.title, ensureCanCopyDoc, setSideDrawerState]);

  const handleCopyToKpSidebarTree = useCallback(async () => {
    if (!spaceContext.isSpaceOwner) {
      toast.error("仅KP可复制到空间侧边栏");
      return;
    }

    const ok = await ensureCanCopyDoc();
    if (!ok)
      return;

    const toastId = toast.loading("正在复制到空间侧边栏…");
    try {
      const res = await copyDocToSpaceDoc({
        spaceId: ok.spaceId,
        sourceDocId: ok.sourceDocId,
        title: docCard?.title,
        imageUrl: docCard?.imageUrl,
      });
      await appendDocToSidebarTree({
        spaceId: ok.spaceId,
        docId: res.newDocId,
        title: res.title,
        imageUrl: docCard?.imageUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["getSpaceSidebarTree", ok.spaceId] });
      toast.success("已复制到空间侧边栏", { id: toastId });
      navigate(`/chat/${ok.spaceId}/doc/${res.newDocEntityId}`);
    }
    catch (err) {
      console.error("[DocCopy] copyToKpSidebarTree failed", err);
      toast.error(err instanceof Error ? err.message : "复制失败", { id: toastId });
    }
  }, [appendDocToSidebarTree, docCard?.imageUrl, docCard?.title, ensureCanCopyDoc, navigate, queryClient, spaceContext.isSpaceOwner]);
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
    if (onOpenThread) {
      onOpenThread(rootId);
    }
    else {
      setThreadRootMessageId(rootId);
      setComposerTarget("thread");
      toast.error("当前页面未启用副窗口，无法打开子区");
    }
  };

  const handleOpenSubWindow = () => {
    // 副窗口第一个 tab 为 map：通过 sideDrawerState = "map" 触发 SubRoomWindow 打开并切换到首个 tab。
    setSideDrawerState("map");
    setSubDrawerState("none");
    onClose();
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
        roomContext.chatHistory?.addOrUpdateMessage({ message: created });
        handleOpenThread(created.messageId);
        onClose();
      },
      onError: () => {
        toast.error("创建子区失败");
      },
    });
  };

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
            handleOpenSubWindow();
          }}
          >
            打开副窗口
          </a>
        </li>
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
        {canEditMessage && (
          <li>
            <a
              onClick={(e) => {
                e.preventDefault();
                onDelete();
                onClose();
              }}
            >
              删除
            </a>
          </li>
        )}

        {canEditMessage && (
          <li>
            <a
              onClick={(e) => {
                e.preventDefault();
                onOpenAnnotations(contextMenu.messageId);
                onClose();
              }}
            >
              添加标注
            </a>
          </li>
        )}
        {canCopyDoc && (
          <li>
            <a
              onClick={(e) => {
                e.preventDefault();
                onClose();
                void handleCopyToMyDocs();
              }}
            >
              复制到我的文档
            </a>
          </li>
        )}
        {canCopyDoc && spaceContext.isSpaceOwner && (
          <li>
            <a
              onClick={(e) => {
                e.preventDefault();
                onClose();
                void handleCopyToKpSidebarTree();
              }}
            >
              复制到空间侧边栏
            </a>
          </li>
        )}
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
        {(() => {
          if (!canEditMessage) {
            return null;
          }
          if (!message) {
            return null;
          }
          if (message.message.messageType === MESSAGE_TYPE.WEBGAL_CHOOSE) {
            return null;
          }
          if (message.message.messageType !== 2) {
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
          if (message.message.messageType === 2) {
            return (
              <>
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
