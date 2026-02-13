import type { Room } from "api";
import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatPageSubWindowTab } from "@/components/chat/hooks/useChatPageSubWindow";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import ChatFrame from "@/components/chat/chatFrame";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useChatHistory } from "@/components/chat/infra/indexedDB/useChatHistory";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { getSubWindowDragPayload } from "@/components/chat/utils/subWindowDragPayload";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { XMarkICon } from "@/icons";

type ScreenSize = "sm" | "md" | "lg";

interface ChatPageSubWindowProps {
  screenSize: ScreenSize;
  activeSpaceId: number | null;
  isKPInSpace: boolean;
  rooms: Room[];
  docMetas: MinimalDocMeta[];
  isOpen: boolean;
  width: number;
  tab: ChatPageSubWindowTab;
  roomId: number | null;
  docId: string | null;
  threadRootMessageId: number | null;
  setIsOpen: (next: boolean) => void;
  setWidth: (next: number) => void;
  setRoomId: (roomId: number | null) => void;
  setDocId: (docId: string | null) => void;
  setThreadRootMessageId: (messageId: number | null) => void;
}

const MIN_WIDTH = 420;
const MAX_WIDTH = 1200;
const MIN_REMAINING_WIDTH = 520;
const ROOM_DRAG_MIME = "application/x-tuanchat-room-id";
const DOC_DRAG_MIME = "application/x-tuanchat-doc-id";
const SUB_WINDOW_DND_DEBUG = true;

function clampWidth(value: number) {
  const safe = Number.isFinite(value) ? value : MIN_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, safe));
}

type DroppedTarget = { tab: "room"; roomId: number } | { tab: "doc"; docId: string } | null;

function resolveAllowedDropEffect(dataTransfer: DataTransfer | null | undefined): "copy" | "move" {
  const effectAllowed = dataTransfer?.effectAllowed ?? "";
  const canCopy = (
    effectAllowed === "all"
    || effectAllowed === "copy"
    || effectAllowed === "copyMove"
    || effectAllowed === "copyLink"
    || effectAllowed === "uninitialized"
  );
  if (canCopy) {
    return "copy";
  }
  const canMove = (
    effectAllowed === "all"
    || effectAllowed === "move"
    || effectAllowed === "copyMove"
    || effectAllowed === "linkMove"
    || effectAllowed === "uninitialized"
  );
  if (canMove) {
    return "move";
  }
  return "copy";
}

function getDragDebugPayload(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer) {
    return null;
  }
  return {
    types: Array.from(dataTransfer.types ?? []),
    roomMime: dataTransfer.getData(ROOM_DRAG_MIME),
    docMime: dataTransfer.getData(DOC_DRAG_MIME),
    plainText: dataTransfer.getData("text/plain"),
    memoryPayload: getSubWindowDragPayload(),
  };
}

function logSubWindowDnd(eventName: string, payload: unknown) {
  if (!SUB_WINDOW_DND_DEBUG) {
    return;
  }
  console.warn(`[SubWindowDnd][${eventName}]`, payload);
}

function parseDroppedTarget(dataTransfer: DataTransfer | null | undefined): DroppedTarget {
  if (!dataTransfer) {
    return null;
  }

  const roomIdByMime = Number(dataTransfer.getData(ROOM_DRAG_MIME));
  if (Number.isFinite(roomIdByMime) && roomIdByMime > 0) {
    return { tab: "room", roomId: roomIdByMime };
  }

  const docIdByMime = dataTransfer.getData(DOC_DRAG_MIME)?.trim();
  if (docIdByMime) {
    return { tab: "doc", docId: docIdByMime };
  }

  const plainText = dataTransfer.getData("text/plain")?.trim() ?? "";

  if (plainText.startsWith("room:")) {
    const roomId = Number(plainText.slice("room:".length));
    if (Number.isFinite(roomId) && roomId > 0) {
      return { tab: "room", roomId };
    }
  }

  if (plainText.startsWith("doc:")) {
    const docId = plainText.slice("doc:".length).trim();
    if (docId) {
      return { tab: "doc", docId };
    }
  }

  const fallbackPayload = getSubWindowDragPayload();
  if (fallbackPayload?.tab === "room" && fallbackPayload.roomId > 0) {
    return fallbackPayload;
  }
  if (fallbackPayload?.tab === "doc" && fallbackPayload.docId) {
    return fallbackPayload;
  }

  return null;
}

function hasDroppedTargetHint(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }
  const types = Array.from(dataTransfer.types ?? []);
  if (types.includes(ROOM_DRAG_MIME) || types.includes(DOC_DRAG_MIME)) {
    return true;
  }
  if (types.includes("text/plain") && !types.includes("Files")) {
    return true;
  }
  return false;
}

function SubWindowThreadView({
  roomId,
  spaceId,
  threadRootMessageId,
}: {
  roomId: number;
  spaceId: number;
  threadRootMessageId: number;
}) {
  const chatHistory = useChatHistory(roomId);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const threadMessages = useMemo(() => {
    const allMessages = chatHistory?.messages ?? [];
    return allMessages.filter(message => message.message.threadId === threadRootMessageId);
  }, [chatHistory?.messages, threadRootMessageId]);

  const roomContext = useMemo(() => ({
    roomId,
    spaceId,
    roomMembers: [],
    roomRolesThatUserOwn: [],
    chatHistory,
  }), [chatHistory, roomId, spaceId]);

  return (
    <RoomContext value={roomContext}>
      <div className="h-full min-h-0">
        <ChatFrame
          virtuosoRef={virtuosoRef}
          messagesOverride={threadMessages}
          enableEffects={false}
          enableUnreadIndicator={false}
          isMessageMovable={() => false}
        />
      </div>
    </RoomContext>
  );
}

export default function ChatPageSubWindow({
  screenSize,
  activeSpaceId,
  isKPInSpace,
  rooms,
  docMetas,
  isOpen,
  width,
  tab,
  roomId,
  docId,
  threadRootMessageId,
  setIsOpen,
  setWidth,
  setRoomId,
  setDocId,
  setThreadRootMessageId,
}: ChatPageSubWindowProps) {
  const isDesktop = screenSize !== "sm";
  const availableRoomId = useMemo(() => rooms[0]?.roomId ?? null, [rooms]);
  const availableDocId = useMemo(() => docMetas[0]?.id ?? null, [docMetas]);
  const resolvedRoomId = roomId ?? availableRoomId;
  const resolvedDocId = docId ?? availableDocId;
  const docTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of docMetas) {
      if (!item?.id) {
        continue;
      }
      map.set(item.id, item.title?.trim() || "文档");
    }
    return map;
  }, [docMetas]);

  useEffect(() => {
    if (!isDesktop || !activeSpaceId) {
      return;
    }
    if (!isOpen) {
      return;
    }
    if (tab === "room" && roomId == null && resolvedRoomId != null) {
      setRoomId(resolvedRoomId);
      return;
    }
    if (tab === "thread" && roomId == null && resolvedRoomId != null) {
      setRoomId(resolvedRoomId);
      return;
    }
    if (tab === "doc" && docId == null && resolvedDocId) {
      setDocId(resolvedDocId);
    }
  }, [
    activeSpaceId,
    docId,
    isDesktop,
    isOpen,
    resolvedDocId,
    resolvedRoomId,
    roomId,
    setDocId,
    setRoomId,
    tab,
  ]);

  const dragStartXRef = useRef(0);
  const draggedRef = useRef(false);

  const applyDroppedTarget = useCallback((target: DroppedTarget) => {
    if (!target) {
      return;
    }
    setIsOpen(true);
    if (target.tab === "room") {
      setRoomId(target.roomId);
      return;
    }
    setDocId(target.docId);
  }, [setDocId, setIsOpen, setRoomId]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const target = parseDroppedTarget(event.dataTransfer);
    const hasHint = hasDroppedTargetHint(event.dataTransfer);
    const dropEffect = resolveAllowedDropEffect(event.dataTransfer);
    logSubWindowDnd("DragOver", {
      isOpen,
      target,
      hasHint,
      dropEffect,
      drag: getDragDebugPayload(event.dataTransfer),
    });
    if (!target && !hasHint) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = dropEffect;
  }, [isOpen]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const target = parseDroppedTarget(event.dataTransfer);
    const hasHint = hasDroppedTargetHint(event.dataTransfer);
    logSubWindowDnd("Drop", {
      isOpen,
      target,
      hasHint,
      drag: getDragDebugPayload(event.dataTransfer),
    });
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    applyDroppedTarget(target);
  }, [applyDroppedTarget, isOpen]);

  const handleOpenEdgePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeSpaceId || !isDesktop) {
      return;
    }
    dragStartXRef.current = e.clientX;
    draggedRef.current = false;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (ev: PointerEvent) => {
      const delta = dragStartXRef.current - ev.clientX;
      if (delta <= 0) {
        return;
      }
      draggedRef.current = true;
      if (!isOpen) {
        setIsOpen(true);
      }
      setWidth(clampWidth(delta));
    };

    const onPointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (!draggedRef.current && !isOpen) {
        setIsOpen(true);
      }
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [activeSpaceId, isDesktop, isOpen, setIsOpen, setWidth]);

  if (!isDesktop || !activeSpaceId) {
    return null;
  }

  if (!isOpen) {
    return (
      <div
        className="absolute right-0 top-0 h-full w-10 z-30 cursor-col-resize hover:bg-info/20 transition-colors"
        data-sub-window-drop-zone
        onPointerDown={handleOpenEdgePointerDown}
        onDragOverCapture={handleDragOver}
        onDropCapture={handleDrop}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ touchAction: "none" }}
        title="向左拖拽打开副窗口"
      >
        <div className="absolute right-0 top-0 h-full w-px bg-base-300" />
      </div>
    );
  }

  return (
    <OpenAbleDrawer
      isOpen
      className="h-full shrink-0"
      width={clampWidth(width)}
      initialWidth={clampWidth(width)}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      minRemainingWidth={MIN_REMAINING_WIDTH}
      onWidthChange={next => setWidth(clampWidth(next))}
      handlePosition="left"
    >
      <div
        className="h-full flex flex-col min-h-0 bg-base-200 border-l border-base-300 relative"
        data-sub-window-drop-zone
        onDragOverCapture={handleDragOver}
        onDropCapture={handleDrop}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {tab !== "room" && (
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-0 h-7 absolute left-2 top-2 z-30 bg-base-200/70 backdrop-blur-sm"
            onClick={() => {
              if (resolvedRoomId) {
                setRoomId(resolvedRoomId);
              }
            }}
          >
            返回房间
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7 absolute right-2 top-2 z-30 bg-base-200/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-label="关闭副窗口"
          title="关闭副窗口"
        >
          <XMarkICon className="size-4" />
        </button>
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "room" && (
            resolvedRoomId
              ? (
                  <RoomWindow
                    roomId={resolvedRoomId}
                    spaceId={activeSpaceId}
                    hideSecondaryPanels
                    onOpenThread={(rootId) => {
                      setRoomId(resolvedRoomId);
                      setThreadRootMessageId(rootId);
                    }}
                  />
                )
              : (
                  <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                    当前空间没有可用房间
                  </div>
                )
          )}

          {tab === "thread" && (
            (resolvedRoomId && threadRootMessageId)
              ? (
                  <SubWindowThreadView
                    roomId={resolvedRoomId}
                    spaceId={activeSpaceId}
                    threadRootMessageId={threadRootMessageId}
                  />
                )
              : (
                  <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                    点击子区后在右侧打开消息
                  </div>
                )
          )}

          {tab === "doc" && (
            !isKPInSpace
              ? (
                  <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                    仅 KP 可查看文档
                  </div>
                )
              : resolvedDocId
                ? (
                    <div className="w-full h-full overflow-hidden bg-base-100">
                      <BlocksuiteDescriptionEditor
                        workspaceId={`space:${activeSpaceId}`}
                        spaceId={activeSpaceId}
                        docId={resolvedDocId}
                        variant="full"
                        tcHeader={{ enabled: true, fallbackTitle: docTitleById.get(resolvedDocId) ?? "文档" }}
                        allowModeSwitch
                        fullscreenEdgeless
                      />
                    </div>
                  )
                : (
                    <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                      当前空间没有可用文档
                    </div>
                  )
          )}
        </div>
      </div>
    </OpenAbleDrawer>
  );
}
