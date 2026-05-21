import type { QueryClient } from "@tanstack/react-query";
import type { ChangeEvent, ClipboardEvent, DragEvent } from "react";

import type { ChatMessageResponse, Message, Room, SpaceMember } from "../../../../api";

import type { ClueFolderScope } from "@/components/chat/clues/clueRooms";
import type { MessageDraft } from "@/types/messageDraft";
import { FilmSlateIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAllRoomMessagesQueryKey,
  markRoomMessageDeletedData,
  replaceRoomMessageListData,
  upsertRoomMessagesInfiniteData,
  upsertRoomMessagesListData,
} from "@tuanchat/query/chat";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useClueFolderActions } from "@/components/chat/clues/useClueFolderActions";
import useChatFrameMessages from "@/components/chat/hooks/useChatFrameMessages";
import { useChatHistory } from "@/components/chat/infra/localDb/useChatHistory";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import { MessagePreviewContent } from "@/components/chat/message/preview/messagePreviewContent";
import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";
import { useClueReferenceNavigationStore } from "@/components/chat/stores/clueReferenceNavigationStore";
import { setClueRefDragData } from "@/components/chat/utils/clueRef";
import { isFileDrag } from "@/components/chat/utils/dndUpload";
import { setDragPreview } from "@/components/chat/utils/dragPreview";
import { useGlobalWebSocket } from "@/components/globalContextProvider";
import { BaselineDeleteOutline, CloseIcon, FileTextIcon, ImageIcon, MusicNotesIcon, PlusIcon, SaveIcon } from "@/icons";
import { buildChatMessageRequestFromDraft, buildMessageDraftsFromUploadedMedia } from "@/types/messageDraft";
import { getImageMessageExtra } from "@/types/messageExtra";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../../api/hooks/chatQueryHooks";
import { MessageType } from "../../../../api/wsModels";

interface ClueFolderSidebarProps {
  canManagePublicClueMembers?: boolean;
  createRequestKey?: number;
  currentUserId?: number | null;
  clueRoom?: Room | null;
  onCreateRequestHandled?: () => void;
  scope: ClueFolderScope;
  spaceId?: number | null;
  spaceMembers?: SpaceMember[];
}

type ClueFolderRoom = Room & {
  roomId: number;
};

interface ClueFolderSectionProps {
  activeMessageId?: number;
  isLoading: boolean;
  messages: ChatMessageResponse[];
  onEditClue: (message: Message) => void;
  onReorderClue: (params: ClueReorderParams) => void;
  roomId: number;
}

interface ApiResultLike {
  errMsg?: string;
  success?: boolean;
}

type ClueEditorState
  = | { mode: "create"; message: null }
    | { mode: "edit"; message: Message };

type ClueAttachmentKind = "image" | "audio" | "video" | "file";
type ClueDropPlacement = "before" | "after";

interface ClueReorderParams {
  draggedMessageId: number;
  targetMessageId: number;
  placement: ClueDropPlacement;
}

interface ClueReorderState {
  placement: ClueDropPlacement;
  targetMessageId: number;
}

interface ClueAttachmentDraft {
  file: File;
  kind: ClueAttachmentKind;
  previewUrl: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isMessage(value: unknown): value is Message {
  return isRecord(value)
    && typeof value.messageId === "number"
    && typeof value.roomId === "number"
    && typeof value.content === "string";
}

function extractClueMessages(value: unknown): ChatMessageResponse[] {
  const rawList = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.data)
      ? value.data
      : isRecord(value) && isRecord(value.data) && Array.isArray(value.data.list)
        ? value.data.list
        : [];

  return rawList
    .map((item): ChatMessageResponse | null => {
      if (isRecord(item) && isMessage(item.message)) {
        return { message: item.message };
      }
      if (isMessage(item)) {
        return { message: item };
      }
      return null;
    })
    .filter((item): item is ChatMessageResponse => item != null);
}

function getMessageId(message: Message): number | null {
  return typeof message.messageId === "number" && Number.isFinite(message.messageId) && message.messageId > 0
    ? message.messageId
    : null;
}

function getFinitePosition(message: Message): number | null {
  if (typeof message.position === "number" && Number.isFinite(message.position)) {
    return message.position;
  }
  if (typeof message.position === "string") {
    const parsed = Number(message.position);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getClueDisplayMessages(messages: ChatMessageResponse[]): ChatMessageResponse[] {
  return messages
    .filter(item => item.message.status !== 1)
    .sort(compareChatMessageResponsesByOrder)
    .reverse();
}

function getDisplayPositionValue(item: ChatMessageResponse | undefined, index: number, total: number): number | null {
  if (!item) {
    return null;
  }
  return getFinitePosition(item.message) ?? total - index;
}

export function getReorderedCluePosition(
  messages: ChatMessageResponse[],
  { draggedMessageId, placement, targetMessageId }: ClueReorderParams,
): number | null {
  if (draggedMessageId === targetMessageId) {
    return null;
  }

  const displayMessages = getClueDisplayMessages(messages);
  const dragged = displayMessages.find(item => getMessageId(item.message) === draggedMessageId);
  if (!dragged) {
    return null;
  }

  const withoutDragged = displayMessages.filter(item => getMessageId(item.message) !== draggedMessageId);
  const targetIndex = withoutDragged.findIndex(item => getMessageId(item.message) === targetMessageId);
  if (targetIndex < 0) {
    return null;
  }

  const insertIndex = placement === "before" ? targetIndex : targetIndex + 1;
  const prev = withoutDragged[insertIndex - 1];
  const next = withoutDragged[insertIndex];
  const total = withoutDragged.length;
  const prevPosition = getDisplayPositionValue(prev, insertIndex - 1, total);
  const nextPosition = getDisplayPositionValue(next, insertIndex, total);

  if (prevPosition == null && nextPosition == null) {
    return getFinitePosition(dragged.message);
  }
  if (prevPosition == null) {
    return (nextPosition ?? 0) + 1;
  }
  if (nextPosition == null) {
    return prevPosition - 1;
  }
  if (prevPosition > nextPosition) {
    return (prevPosition + nextPosition) / 2;
  }
  return placement === "before" ? nextPosition + 0.5 : prevPosition - 0.5;
}

export function hasRenderableClueImage(message: Message): boolean {
  return message.messageType === MessageType.IMG || Boolean(getImageMessageExtra(message.extra));
}

export function getClueAttachmentKind(file: File): ClueAttachmentKind {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("audio/")) {
    return "audio";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  return "file";
}

export function buildClueDragPayload(message: Message) {
  return {
    snapshot: {
      messageType: message.messageType,
      content: message.content ?? "",
      ...(message.extra ? { extra: JSON.parse(JSON.stringify(message.extra)) } : {}),
    },
  };
}

async function getMediaDuration(file: File): Promise<number | undefined> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<number | undefined>((resolve) => {
      const element = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      const cleanup = () => {
        element.onloadedmetadata = null;
        element.onerror = null;
        URL.revokeObjectURL(objectUrl);
      };

      element.preload = "metadata";
      element.src = objectUrl;
      element.onloadedmetadata = () => {
        const duration = Number.isFinite(element.duration) && element.duration > 0
          ? Math.max(1, Math.round(element.duration))
          : undefined;
        cleanup();
        resolve(duration);
      };
      element.onerror = () => {
        cleanup();
        resolve(undefined);
      };
    });
  }
  catch {
    URL.revokeObjectURL(objectUrl);
    return undefined;
  }
}

function createNamedClipboardFile(blob: File): File {
  const mime = blob.type || "application/octet-stream";
  const extension = (() => {
    const subType = mime.split("/")[1] || "bin";
    const normalized = subType.split(";")[0]?.trim() || "bin";
    return normalized.replace(/[^a-z0-9.+-]/gi, "") || "bin";
  })();
  const typePrefix = mime.startsWith("image/")
    ? "pasted-image"
    : mime.startsWith("audio/")
      ? "pasted-audio"
      : mime.startsWith("video/")
        ? "pasted-video"
        : "pasted-file";
  return new File([blob], `${typePrefix}-${Date.now()}.${extension}`, { type: mime });
}

function hasPositiveRoomId(room: Room): room is ClueFolderRoom {
  return typeof room.roomId === "number" && Number.isFinite(room.roomId) && room.roomId > 0;
}

function isSuccess(result: ApiResultLike | null | undefined): boolean {
  return result?.success === true;
}

function getErrorMessage(result: ApiResultLike | null | undefined, fallback: string): string {
  return result?.errMsg?.trim() || fallback;
}

function patchAllMessageCache(
  queryClient: QueryClient,
  roomId: number,
  updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[],
) {
  queryClient.setQueryData(getAllRoomMessagesQueryKey(roomId), (oldData: unknown) => {
    if (Array.isArray(oldData)) {
      return updater(extractClueMessages(oldData));
    }
    if (isRecord(oldData) && Array.isArray(oldData.data)) {
      return {
        ...oldData,
        data: updater(extractClueMessages(oldData.data)),
      };
    }
    if (isRecord(oldData) && isRecord(oldData.data) && Array.isArray(oldData.data.list)) {
      return {
        ...oldData,
        data: {
          ...oldData.data,
          list: updater(extractClueMessages(oldData.data.list)),
        },
      };
    }
    return oldData;
  });
}

function patchRoomMessagesCache(
  queryClient: QueryClient,
  roomId: number,
  updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[],
) {
  queryClient.setQueriesData({ queryKey: ["getRoomMessages", roomId] }, (oldData: unknown) => {
    if (!isRecord(oldData) || !Array.isArray(oldData.pages)) {
      return oldData;
    }
    const firstPage = oldData.pages[0];
    if (!isRecord(firstPage) || !isRecord(firstPage.data) || !Array.isArray(firstPage.data.list)) {
      return oldData;
    }
    const nextPages = [...oldData.pages];
    nextPages[0] = {
      ...firstPage,
      data: {
        ...firstPage.data,
        list: updater(extractClueMessages(firstPage.data.list)),
      },
    };
    return {
      ...oldData,
      pages: nextPages,
    };
  });
}

function patchClueMessageCreated(queryClient: QueryClient, roomId: number, message: Message) {
  const response: ChatMessageResponse = { message };
  patchAllMessageCache(queryClient, roomId, messages => upsertRoomMessagesListData(messages, [response]));
  queryClient.setQueriesData({ queryKey: ["getRoomMessages", roomId] }, (oldData: unknown) => {
    return upsertRoomMessagesInfiniteData(oldData as any, roomId, [response]);
  });
}

function patchClueMessageUpdated(queryClient: QueryClient, message: Message) {
  const response: ChatMessageResponse = { message };
  const messageId = message.messageId;
  patchAllMessageCache(queryClient, message.roomId, messages => replaceRoomMessageListData(messages, messageId, response));
  patchRoomMessagesCache(queryClient, message.roomId, messages => replaceRoomMessageListData(messages, messageId, response));
}

function patchClueMessageDeleted(queryClient: QueryClient, roomId: number, messageId: number) {
  patchAllMessageCache(queryClient, roomId, messages => markRoomMessageDeletedData(messages, messageId));
  patchRoomMessagesCache(queryClient, roomId, messages => markRoomMessageDeletedData(messages, messageId));
}

async function invalidateClueMessageQueries(queryClient: QueryClient, roomId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getAllRoomMessagesQueryKey(roomId) }),
    queryClient.invalidateQueries({ queryKey: ["getRoomMessages", roomId] }),
  ]);
}

function ClueFolderSection({
  activeMessageId,
  isLoading,
  messages,
  onEditClue,
  onReorderClue,
  roomId,
}: ClueFolderSectionProps) {
  const [reorderState, setReorderState] = useState<ClueReorderState | null>(null);
  const [draggingClue, setDraggingClue] = useState<{ sourceMessageId: number; sourceRoomId: number } | null>(null);
  const clueMessages = useMemo(() => {
    return getClueDisplayMessages(messages);
  }, [messages]);

  return (
    <div className="space-y-1">
      {isLoading && (
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-base-content/45">
          <span className="loading loading-spinner loading-xs"></span>
          <span>正在加载线索...</span>
        </div>
      )}

      {!isLoading && clueMessages.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-base-content/45">
          暂无线索
        </div>
      )}

      {clueMessages.map(({ message }) => {
        const messageId = getMessageId(message);
        if (!messageId) {
          return null;
        }
        const isDropTarget = reorderState?.targetMessageId === messageId;
        return (
          <button
            key={messageId}
            type="button"
            className={`group relative w-full rounded-md px-2 py-1.5 text-left text-xs text-base-content/80 transition-colors hover:bg-base-300 ${activeMessageId === messageId ? "bg-info/12 ring-1 ring-info/35" : ""}`}
            data-clue-message-id={messageId}
            draggable
            title={message.content || "线索"}
            onClick={() => onEditClue(message)}
            onDragStart={(event) => {
              const payload = buildClueDragPayload(message);
              const sourceMessageId = getMessageId(message);
              event.dataTransfer.effectAllowed = "copyMove";
              setClueRefDragData(event.dataTransfer, payload);
              if (sourceMessageId) {
                setDraggingClue({
                  sourceRoomId: message.roomId,
                  sourceMessageId,
                });
              }
              setDragPreview({
                dataTransfer: event.dataTransfer,
                sourceElement: event.currentTarget,
                title: "移动线索消息",
                subtitle: "拖到目标位置或群聊",
                variant: "message",
              });
            }}
            onDragEnd={() => {
              setDraggingClue(null);
              setReorderState(null);
            }}
            onDragOver={(event) => {
              if (draggingClue?.sourceRoomId !== roomId || draggingClue.sourceMessageId === messageId) {
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const rect = event.currentTarget.getBoundingClientRect();
              const placement: ClueDropPlacement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
              setReorderState({ targetMessageId: messageId, placement });
            }}
            onDragLeave={(event) => {
              const relatedTarget = event.relatedTarget as Node | null;
              if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
                return;
              }
              if (reorderState?.targetMessageId === messageId) {
                setReorderState(null);
              }
            }}
            onDrop={(event) => {
              if (draggingClue?.sourceRoomId !== roomId || !draggingClue.sourceMessageId || draggingClue.sourceMessageId === messageId) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              const placement: ClueDropPlacement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
              setDraggingClue(null);
              setReorderState(null);
              onReorderClue({
                draggedMessageId: draggingClue.sourceMessageId,
                targetMessageId: messageId,
                placement,
              });
            }}
          >
            {isDropTarget && (
              <span
                className={`pointer-events-none absolute left-1 right-1 z-10 h-[2px] rounded-full bg-info ${
                  reorderState?.placement === "before" ? "-top-px" : "-bottom-px"
                }`}
                aria-hidden="true"
              />
            )}
            <span className="block min-w-0 overflow-hidden text-ellipsis break-words leading-5 line-clamp-2">
              <MessagePreviewContent message={message} withMediaPreview />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function ClueFolderSidebar({
  canManagePublicClueMembers = false,
  createRequestKey = 0,
  currentUserId,
  clueRoom,
  onCreateRequestHandled,
  scope,
  spaceId,
  spaceMembers = [],
}: ClueFolderSidebarProps) {
  const queryClient = useQueryClient();
  const { ensureClueFolderRoom, joinPublicClueFolder } = useClueFolderActions({
    currentUserId,
    hasHostPrivileges: canManagePublicClueMembers,
    spaceId,
    spaceMembers,
  });
  const [editorState, setEditorState] = useState<ClueEditorState | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftAttachment, setDraftAttachment] = useState<ClueAttachmentDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const uploadUtils = useMemo(() => new UploadUtils(), []);
  const draftAttachmentRef = useRef<ClueAttachmentDraft | null>(null);
  const room = useMemo(() => {
    return clueRoom && hasPositiveRoomId(clueRoom) ? clueRoom : null;
  }, [clueRoom]);
  const sendMessageMutation = useSendMessageMutation(room?.roomId ?? 0);
  const updateMessageMutation = useUpdateMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const clueHistory = useChatHistory(room?.roomId ?? null);
  const navigationTarget = useClueReferenceNavigationStore(state => state.target);
  const clearNavigationTarget = useClueReferenceNavigationStore(state => state.clearTarget);
  const websocketUtils = useGlobalWebSocket();
  const lastMarkedReadSyncRef = useRef<Record<number, number>>({});
  const receivedMessages = useMemo(() => {
    return room ? (websocketUtils.receivedMessages[room.roomId] ?? []) : [];
  }, [room, websocketUtils.receivedMessages]);
  const { historyMessages } = useChatFrameMessages({
    chatHistory: clueHistory,
    currentUserId,
    enableWsSync: Boolean(room),
    receivedMessages,
    roomId: room?.roomId ?? -1,
  });
  useEffect(() => {
    if (!room || clueHistory.loading) {
      return;
    }
    const latestSyncId = clueHistory.latestSyncId;
    if (!Number.isFinite(latestSyncId) || latestSyncId < 0) {
      return;
    }
    const roomId = room.roomId;
    if (lastMarkedReadSyncRef.current[roomId] === latestSyncId) {
      return;
    }
    lastMarkedReadSyncRef.current[roomId] = latestSyncId;
    websocketUtils.updateLastReadSyncId(roomId, latestSyncId);
  }, [clueHistory.latestSyncId, clueHistory.loading, room, websocketUtils]);

  const closeEditor = () => {
    if (isSaving || isDeleting) {
      return;
    }
    if (draftAttachmentRef.current) {
      URL.revokeObjectURL(draftAttachmentRef.current.previewUrl);
    }
    draftAttachmentRef.current = null;
    setDraftAttachment(null);
    setEditorState(null);
    setDraftContent("");
  };

  const openCreateEditor = () => {
    if (draftAttachmentRef.current) {
      URL.revokeObjectURL(draftAttachmentRef.current.previewUrl);
    }
    draftAttachmentRef.current = null;
    setDraftAttachment(null);
    setEditorState({ mode: "create", message: null });
    setDraftContent("");
  };

  useEffect(() => {
    if (createRequestKey <= 0) {
      return;
    }
    openCreateEditor();
    onCreateRequestHandled?.();
  }, [createRequestKey, onCreateRequestHandled]);

  useEffect(() => {
    if (scope !== "public") {
      return;
    }
    if (!room && !canManagePublicClueMembers) {
      void joinPublicClueFolder().catch((error) => {
        console.warn("[ClueFolder] join public clue folder failed", error);
      });
    }
  }, [canManagePublicClueMembers, joinPublicClueFolder, room, scope]);

  const openEditEditor = (message: Message) => {
    if (draftAttachmentRef.current) {
      URL.revokeObjectURL(draftAttachmentRef.current.previewUrl);
    }
    draftAttachmentRef.current = null;
    setDraftAttachment(null);
    setEditorState({ mode: "edit", message });
    setDraftContent(message.content ?? "");
  };

  useEffect(() => {
    if (!navigationTarget?.sourceMessageId || !room) {
      return;
    }
    if (navigationTarget.sourceRoomId && navigationTarget.sourceRoomId !== room.roomId) {
      return;
    }
    if (clueHistory.loading) {
      return;
    }

    const targetMessage = historyMessages.find(({ message }) => getMessageId(message) === navigationTarget.sourceMessageId)?.message;
    if (!targetMessage) {
      toast.error("未找到原线索，可能已删除");
      clearNavigationTarget(navigationTarget.requestId);
      return;
    }

    const selector = `[data-clue-message-id="${navigationTarget.sourceMessageId}"]`;
    requestAnimationFrame(() => {
      document.querySelector(selector)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    openEditEditor(targetMessage);
    clearNavigationTarget(navigationTarget.requestId);
  }, [clearNavigationTarget, clueHistory.loading, historyMessages, navigationTarget, room]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    draftAttachmentRef.current = draftAttachment;
  }, [draftAttachment]);

  useEffect(() => {
    return () => {
      if (draftAttachmentRef.current) {
        URL.revokeObjectURL(draftAttachmentRef.current.previewUrl);
      }
      draftAttachmentRef.current = null;
    };
  }, []);

  const handleAttachmentPicked = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (draftAttachmentRef.current) {
      URL.revokeObjectURL(draftAttachmentRef.current.previewUrl);
    }
    const nextAttachment: ClueAttachmentDraft = {
      file,
      kind: getClueAttachmentKind(file),
      previewUrl,
    };
    draftAttachmentRef.current = nextAttachment;
    setDraftAttachment(nextAttachment);
  };

  const handleAttachmentFiles = (files: File[]) => {
    const availableFiles = files.filter(Boolean);
    if (availableFiles.length === 0) {
      toast.error("未检测到可用附件");
      return;
    }
    if (availableFiles.length > 1) {
      toast.error("一条线索只能添加 1 个附件，已取第一个");
    }
    handleAttachmentPicked(availableFiles[0]);
  };

  const clearAttachment = () => {
    if (draftAttachmentRef.current) {
      URL.revokeObjectURL(draftAttachmentRef.current.previewUrl);
    }
    draftAttachmentRef.current = null;
    setDraftAttachment(null);
  };

  const handleAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    handleAttachmentPicked(file);
  };

  const handleAttachmentPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (editorState?.mode !== "create") {
      return;
    }
    const fileItems = Array.from(event.clipboardData?.items ?? []).filter(item => item.kind === "file");
    if (fileItems.length === 0) {
      return;
    }

    const files = fileItems
      .map(item => item.getAsFile())
      .filter((file): file is File => file != null)
      .map(createNamedClipboardFile);
    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    handleAttachmentFiles(files);
  };

  const handleAttachmentDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (editorState?.mode !== "create" || !isFileDrag(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleAttachmentDrop = (event: DragEvent<HTMLDivElement>) => {
    if (editorState?.mode !== "create" || !isFileDrag(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleAttachmentFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const reorderClue = async ({ draggedMessageId, placement, targetMessageId }: ClueReorderParams) => {
    if (!room) {
      return;
    }
    const draggedMessage = historyMessages.find(({ message }) => getMessageId(message) === draggedMessageId)?.message;
    if (!draggedMessage) {
      toast.error("未找到要排序的线索");
      return;
    }
    const nextPosition = getReorderedCluePosition(historyMessages, {
      draggedMessageId,
      targetMessageId,
      placement,
    });
    if (nextPosition == null || getFinitePosition(draggedMessage) === nextPosition) {
      return;
    }

    try {
      const updatedMessage = {
        ...draggedMessage,
        position: nextPosition,
      };
      const result = await updateMessageMutation.mutateAsync(updatedMessage);
      if (!isSuccess(result)) {
        throw new Error(getErrorMessage(result, "线索排序失败"));
      }
      const nextMessage = result.data ?? updatedMessage;
      patchClueMessageUpdated(queryClient, nextMessage);
      await clueHistory.addOrUpdateMessage({ message: nextMessage });
      await invalidateClueMessageQueries(queryClient, room.roomId);
      toast.success("线索排序已更新");
    }
    catch (error) {
      console.error("[ClueFolder] reorder clue failed", error);
      toast.error(error instanceof Error ? error.message : "线索排序失败");
    }
  };

  const saveClue = async () => {
    const content = draftContent.trim();
    if (editorState?.mode === "create" && !content && !draftAttachment) {
      toast.error("线索内容不能为空");
      return;
    }
    if (editorState?.mode === "edit" && !content) {
      toast.error("线索内容不能为空");
      return;
    }

    setIsSaving(true);
    try {
      if (editorState?.mode === "edit") {
        const result = await updateMessageMutation.mutateAsync({
          ...editorState.message,
          content,
        });
        if (!isSuccess(result)) {
          throw new Error(getErrorMessage(result, "保存线索失败"));
        }
        const nextMessage = result.data ?? { ...editorState.message, content };
        patchClueMessageUpdated(queryClient, nextMessage);
        await clueHistory.addOrUpdateMessage({ message: nextMessage });
        await invalidateClueMessageQueries(queryClient, editorState.message.roomId);
        toast.success("线索已保存");
      }
      else {
        const targetRoom = await ensureClueFolderRoom(scope);
        let drafts: MessageDraft[];
        if (!draftAttachment) {
          drafts = buildMessageDraftsFromUploadedMedia({
            inputText: content,
          });
        }
        else if (draftAttachment.kind === "image") {
          const [uploadedImage, { width, height, size }] = await Promise.all([
            uploadUtils.uploadDualImage(draftAttachment.file, 1),
            getImageSize(draftAttachment.file),
          ]);
          drafts = buildMessageDraftsFromUploadedMedia({
            inputText: content,
            uploadedImages: [{
              fileId: uploadedImage.fileId,
              fileName: draftAttachment.file.name,
              height,
              mediaType: uploadedImage.mediaType,
              size,
              width,
            }],
          });
        }
        else if (draftAttachment.kind === "audio") {
          const second = await getMediaDuration(draftAttachment.file);
          if (!second) {
            throw new Error("无法读取音频时长，请换用可识别的音频文件后重试。");
          }
          const uploadedAudio = await uploadUtils.uploadAudioAsset(draftAttachment.file, 1, 30);
          drafts = buildMessageDraftsFromUploadedMedia({
            inputText: content,
            uploadedSoundMessage: {
              fileId: uploadedAudio.fileId,
              fileName: draftAttachment.file.name,
              mediaType: uploadedAudio.mediaType,
              second,
              size: draftAttachment.file.size,
            },
          });
        }
        else if (draftAttachment.kind === "video") {
          const uploadedVideo = await uploadUtils.uploadVideo(draftAttachment.file, 1);
          const second = await getMediaDuration(draftAttachment.file);
          drafts = buildMessageDraftsFromUploadedMedia({
            inputText: content,
            uploadedVideos: [{
              fileId: uploadedVideo.fileId,
              fileName: draftAttachment.file.name,
              mediaType: uploadedVideo.mediaType,
              second,
              size: uploadedVideo.size,
            }],
          });
        }
        else {
          const uploadedFile = await uploadUtils.uploadFileAsset(draftAttachment.file, 1);
          drafts = buildMessageDraftsFromUploadedMedia({
            inputText: content,
            uploadedFiles: [{
              fileId: uploadedFile.fileId,
              fileName: draftAttachment.file.name,
              mediaType: uploadedFile.mediaType,
              size: uploadedFile.size,
            }],
          });
        }

        const draft = drafts[0];
        if (!draft) {
          throw new Error("无法生成线索消息");
        }
        const request = buildChatMessageRequestFromDraft(draft, {
          roomId: targetRoom.roomId,
          customRoleName: "线索",
        });
        const result = await sendMessageMutation.mutateAsync(request);
        if (!isSuccess(result)) {
          throw new Error(getErrorMessage(result, "创建线索失败"));
        }
        if (result.data) {
          patchClueMessageCreated(queryClient, targetRoom.roomId, result.data);
          if (targetRoom.roomId === room?.roomId) {
            await clueHistory.addOrUpdateMessage({ message: result.data });
          }
        }
        await invalidateClueMessageQueries(queryClient, targetRoom.roomId);
        toast.success("线索已创建");
      }
      setEditorState(null);
      setDraftContent("");
      clearAttachment();
    }
    catch (error) {
      console.error("[ClueFolder] save clue failed", error);
      toast.error(error instanceof Error ? error.message : "保存线索失败");
    }
    finally {
      setIsSaving(false);
    }
  };

  const deleteClue = async () => {
    if (editorState?.mode !== "edit") {
      return;
    }
    const messageId = getMessageId(editorState.message);
    if (!messageId) {
      toast.error("线索不存在，无法删除");
      return;
    }
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm("确定删除这条线索吗？");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteMessageMutation.mutateAsync(messageId);
      if (!isSuccess(result)) {
        throw new Error(getErrorMessage(result, "删除线索失败"));
      }
      patchClueMessageDeleted(queryClient, editorState.message.roomId, messageId);
      if (result.data) {
        patchClueMessageUpdated(queryClient, result.data);
        await clueHistory.addOrUpdateMessage({ message: result.data });
      }
      else {
        await clueHistory.removeMessageById(messageId);
      }
      await invalidateClueMessageQueries(queryClient, editorState.message.roomId);
      toast.success("线索已删除");
      setEditorState(null);
      setDraftContent("");
    }
    catch (error) {
      console.error("[ClueFolder] delete clue failed", error);
      toast.error(error instanceof Error ? error.message : "删除线索失败");
    }
    finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-1 px-1">
        {room
          ? (
              <ClueFolderSection
                activeMessageId={navigationTarget?.sourceRoomId === room.roomId ? navigationTarget.sourceMessageId : undefined}
                isLoading={clueHistory.loading}
                messages={historyMessages}
                onEditClue={openEditEditor}
                onReorderClue={reorderClue}
                roomId={room.roomId}
              />
            )
          : (
              <div className="px-2 py-1.5 text-xs text-base-content/45">
                暂无线索
              </div>
            )}
      </div>

      {portalTarget && editorState && createPortal(
        <div className="modal modal-open z-[10000]">
          <div
            className="modal-box max-w-2xl"
            onDragOver={handleAttachmentDragOver}
            onDrop={handleAttachmentDrop}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">
                {editorState.mode === "create" ? "新建线索" : "编辑线索"}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label="关闭"
                onClick={closeEditor}
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            {editorState.mode === "create" && (
              <div className="mb-3 rounded-lg border border-base-300 bg-base-200/40 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={isSaving || isDeleting}
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    <PlusIcon className="size-4" />
                    上传附件
                  </button>
                  <span className="text-xs text-base-content/50">
                    支持点击上传、拖入文件，或在输入框里 Ctrl+V 粘贴图片
                  </span>
                </div>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,audio/*,video/*,*/*"
                  onChange={handleAttachmentInputChange}
                />

                {draftAttachment && (
                  <div className="rounded-md border border-base-300 bg-base-100 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2 text-xs text-base-content/70">
                        {draftAttachment.kind === "image" && <ImageIcon className="size-4" />}
                        {draftAttachment.kind === "audio" && <MusicNotesIcon className="size-4" />}
                        {draftAttachment.kind === "video" && <FilmSlateIcon className="size-4" />}
                        {draftAttachment.kind === "file" && <FileTextIcon className="size-4" />}
                        <span className="truncate" title={draftAttachment.file.name}>
                          {draftAttachment.file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square"
                        aria-label="移除附件"
                        onClick={clearAttachment}
                      >
                        <CloseIcon className="size-4" />
                      </button>
                    </div>
                    {draftAttachment.kind === "image" && (
                      <img
                        src={draftAttachment.previewUrl}
                        alt={draftAttachment.file.name}
                        className="max-h-64 w-auto max-w-full rounded-md object-contain"
                      />
                    )}
                    {draftAttachment.kind === "audio" && (
                      <audio controls src={draftAttachment.previewUrl} className="w-full" />
                    )}
                    {draftAttachment.kind === "video" && (
                      <video controls src={draftAttachment.previewUrl} className="max-h-64 w-full rounded-md bg-black" />
                    )}
                    {draftAttachment.kind === "file" && (
                      <div className="text-xs text-base-content/55">
                        选中的文件会作为文件线索发送
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {editorState.mode === "edit" && hasRenderableClueImage(editorState.message) && (
              <div className="mb-3 max-h-80 overflow-auto rounded-lg border border-base-300 bg-base-200/40 p-3">
                <MessageContentRenderer
                  message={{
                    ...editorState.message,
                    messageType: MessageType.IMG,
                  }}
                  cacheKeyBase={`clue-modal:${editorState.message.messageId}`}
                />
              </div>
            )}

            <textarea
              className="textarea textarea-bordered min-h-40 w-full resize-y text-sm leading-6"
              value={draftContent}
              placeholder="写下这条线索..."
              disabled={isSaving || isDeleting}
              onPaste={handleAttachmentPaste}
              onChange={event => setDraftContent(event.target.value)}
            />

            <div className="modal-action items-center justify-between">
              <div>
                {editorState.mode === "edit" && (
                  <button
                    type="button"
                    className="btn btn-error btn-outline btn-sm"
                    disabled={isSaving || isDeleting}
                    onClick={deleteClue}
                  >
                    {isDeleting
                      ? <span className="loading loading-spinner loading-xs"></span>
                      : <BaselineDeleteOutline className="size-4" />}
                    删除
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={isSaving || isDeleting}
                  onClick={closeEditor}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={isSaving || isDeleting}
                  onClick={saveClue}
                >
                  {isSaving
                    ? <span className="loading loading-spinner loading-xs"></span>
                    : <SaveIcon className="size-4" />}
                  保存
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="modal-backdrop" onClick={closeEditor}>关闭</button>
        </div>,
        portalTarget,
      )}
    </>
  );
}
