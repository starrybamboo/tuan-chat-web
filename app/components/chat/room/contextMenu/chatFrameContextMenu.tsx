import type { ChatMessageResponse, ImageMessage, Message } from "../../../../../api";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useSendMessageMutation } from "../../../../../api/hooks/chatQueryHooks";
import { useAddCluesMutation, useGetMyClueStarsBySpaceQuery } from "../../../../../api/hooks/spaceClueHooks";
import { tuanchat } from "../../../../../api/instance";

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const ensureReadableSnapshot = useCallback(async (params: {
    sourceDocId: string;
  }) => {
    const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
    const key = parseDescriptionDocId(params.sourceDocId);
    if (!key) {
      throw new Error("仅支持复制空间文档（描述文档/我的文档）");
    }

    const { getRemoteSnapshot } = await import("@/components/chat/infra/blocksuite/descriptionDocRemote");
    const snapshot = await getRemoteSnapshot(key);
    if (snapshot?.updateB64) {
      return snapshot;
    }

    // 尝试区分：无权限 vs 暂无内容（blocksuite/doc 返回 ApiResult 时 success=false）
    try {
      const res = await tuanchat.request.request<any>({
        method: "GET",
        url: "/blocksuite/doc",
        query: {
          entityType: key.entityType,
          entityId: key.entityId,
          docType: key.docType,
        },
      });
      if ((res as any)?.success === false) {
        throw new Error((res as any)?.errMsg ?? "无权限读取源文档");
      }
    }
    catch (err) {
      throw err instanceof Error ? err : new Error("无权限读取源文档");
    }

    throw new Error("源文档暂无可复制内容（请先打开并保存一次）");
  }, []);

  const patchSnapshotHeader = useCallback(async (params: {
    snapshot: { v: 1; updateB64: string; updatedAt: number };
    title: string;
    imageUrl?: string;
  }) => {
    const title = params.title.trim();
    const imageUrl = (params.imageUrl ?? "").trim();
    if (!title && !imageUrl) {
      return params.snapshot;
    }

    const [{ base64ToUint8Array, uint8ArrayToBase64 }, Y] = await Promise.all([
      import("@/components/chat/infra/blocksuite/base64"),
      import("yjs"),
    ]);

    const base = base64ToUint8Array(params.snapshot.updateB64);
    const doc = new (Y as any).Doc();
    (Y as any).applyUpdate(doc, base);

    doc.transact(() => {
      const map = doc.getMap("tc_header");
      if (title)
        map.set("title", title);
      if (Object.prototype.hasOwnProperty.call(params, "imageUrl") && imageUrl) {
        map.set("imageUrl", imageUrl);
      }
    }, "tc_copy:patch_header");

    const next = (Y as any).encodeStateAsUpdate(doc) as Uint8Array;
    return {
      v: 1 as const,
      updateB64: uint8ArrayToBase64(next),
      updatedAt: Date.now(),
    };
  }, []);

  const copyToSpaceUserDoc = useCallback(async (params: {
    spaceId: number;
    sourceDocId: string;
    title?: string;
    imageUrl?: string;
  }) => {
    const createTitle = (params.title ?? "").trim();
    const title = createTitle ? `${createTitle}（副本）` : "新文档（副本）";

    const sourceSnapshot = await ensureReadableSnapshot({ sourceDocId: params.sourceDocId });

    const createRes = await tuanchat.spaceUserDocFolderController.createDoc({ spaceId: params.spaceId, title });
    if (!createRes?.success || !createRes.data?.docId) {
      throw new Error(createRes?.errMsg ?? "创建文档失败");
    }
    const newEntityId = createRes.data.docId;

    const { buildDescriptionDocId, parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
    const { setRemoteSnapshot } = await import("@/components/chat/infra/blocksuite/descriptionDocRemote");

    const patchedSnapshot = await patchSnapshotHeader({
      snapshot: sourceSnapshot,
      title,
      imageUrl: params.imageUrl,
    });
    await setRemoteSnapshot({
      entityType: "space_user_doc",
      entityId: newEntityId,
      docType: "description",
      snapshot: patchedSnapshot,
    });

    const newDocId = buildDescriptionDocId({ entityType: "space_user_doc", entityId: newEntityId, docType: "description" });

    // Best-effort：补齐本地 meta，确保可在 Workspace 里打开/展示。
    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      registry.ensureSpaceDocMeta({ spaceId: params.spaceId, docId: newDocId, title });
    }
    catch {
      // ignore
    }

    // Best-effort：写入 doc header 缓存（仅用于本地展示/首屏）
    if (typeof window !== "undefined" && params.imageUrl) {
      try {
        const { useDocHeaderOverrideStore } = await import("@/components/chat/stores/docHeaderOverrideStore");
        useDocHeaderOverrideStore.getState().setHeader({
          docId: newDocId,
          header: { title, imageUrl: params.imageUrl },
        });
      }
      catch {
        // ignore
      }
    }

    queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", params.spaceId] });
    queryClient.invalidateQueries({ queryKey: ["getSpaceUserDocFolderTree", params.spaceId] });

    return { newDocEntityId: newEntityId, newDocId, title };
  }, [ensureReadableSnapshot, patchSnapshotHeader, queryClient]);

  const copyToSpaceDoc = useCallback(async (params: {
    spaceId: number;
    sourceDocId: string;
    title?: string;
    imageUrl?: string;
  }) => {
    const createTitle = (params.title ?? "").trim();
    const title = createTitle ? `${createTitle}（副本）` : "新文档（副本）";

    const sourceSnapshot = await ensureReadableSnapshot({ sourceDocId: params.sourceDocId });

    let createdDocId: number | null = null;
    try {
      const resp = await tuanchat.request.request<any>({
        method: "POST",
        url: "/space/doc",
        body: { spaceId: params.spaceId, title },
        mediaType: "application/json",
      });
      const id = Number((resp as any)?.data?.docId);
      if (Number.isFinite(id) && id > 0) {
        createdDocId = id;
      }
    }
    catch (err) {
      console.error("[SpaceDoc] create failed", err);
    }

    if (!createdDocId) {
      throw new Error("创建文档失败");
    }

    const { buildSpaceDocId } = await import("@/components/chat/infra/blocksuite/spaceDocId");
    const { setRemoteSnapshot } = await import("@/components/chat/infra/blocksuite/descriptionDocRemote");

    const newDocId = buildSpaceDocId({ kind: "independent", docId: createdDocId });

    const patchedSnapshot = await patchSnapshotHeader({
      snapshot: sourceSnapshot,
      title,
      imageUrl: params.imageUrl,
    });
    await setRemoteSnapshot({
      entityType: "space_doc",
      entityId: createdDocId,
      docType: "description",
      snapshot: patchedSnapshot,
    });

    // Best-effort：补齐本地 meta，确保可在 Workspace 里打开/展示。
    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      registry.ensureSpaceDocMeta({ spaceId: params.spaceId, docId: newDocId, title });
    }
    catch {
      // ignore
    }

    // Best-effort：写入 doc header 缓存（仅用于本地展示/首屏）
    if (typeof window !== "undefined" && params.imageUrl) {
      try {
        const { useDocHeaderOverrideStore } = await import("@/components/chat/stores/docHeaderOverrideStore");
        useDocHeaderOverrideStore.getState().setHeader({
          docId: newDocId,
          header: { title, imageUrl: params.imageUrl },
        });
      }
      catch {
        // ignore
      }
    }

    return { newDocEntityId: createdDocId, newDocId, title };
  }, [ensureReadableSnapshot, patchSnapshotHeader]);

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
      setSideDrawerState("docFolder");
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
      const res = await copyToSpaceDoc({
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
  }, [appendDocToSidebarTree, copyToSpaceDoc, docCard?.imageUrl, docCard?.title, ensureCanCopyDoc, navigate, queryClient, spaceContext.isSpaceOwner]);
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
