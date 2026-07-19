import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatPageSubWindowTab } from "@/components/chat/hooks/useChatPageSubWindow";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";
import type { Room } from "api";

import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";
import { getSubWindowDragPayload } from "@/components/chat/utils/subWindowDragPayload";
import FeaturePlaceholderPage from "@/components/common/featurePlaceholderPage";
import { IconButton } from "@/components/common/IconButton";
import PortalTooltip from "@/components/common/portalTooltip";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { StateView } from "@/components/common/StateView";
import { XMarkICon } from "@/icons";

const LazyRoomWindow = React.lazy(() => import("@/components/chat/room/roomWindow"));

type ScreenSize = "sm" | "md" | "lg";

type ChatPageSubWindowProps = {
  screenSize: ScreenSize;
  activeSpaceId: number | null;
  isKPInSpace: boolean;
  isKPPermissionPending: boolean;
  rooms: Room[];
  docMetas: MinimalDocMeta[];
  isOpen: boolean;
  width: number;
  tab: ChatPageSubWindowTab;
  roomId: number | null;
  docId: string | null;
  setIsOpen: (next: boolean) => void;
  setWidth: (next: number) => void;
  setTab: (tab: ChatPageSubWindowTab) => void;
  setRoomId: (roomId: number | null) => void;
  setDocId: (docId: string | null) => void;
}

const MIN_WIDTH = 420;
const MAX_WIDTH = 1200;
const MIN_REMAINING_WIDTH = 520;
const ROOM_DRAG_MIME = "application/x-tuanchat-room-id";
const DOC_DRAG_MIME = "application/x-tuanchat-doc-id";

function clampWidth(value: number) {
  const safe = Number.isFinite(value) ? value : MIN_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, safe));
}

type DroppedTarget
  = | { tab: "room"; roomId: number }
    | { tab: "doc"; docId: string }
    | null;

function resolveAllowedDropEffect(dataTransfer: DataTransfer | null | undefined): "copy" | "move" {
  const effectAllowed = String(dataTransfer?.effectAllowed ?? "");
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

function parseDroppedTarget(dataTransfer: DataTransfer | null | undefined): DroppedTarget {
  const fallbackPayload = getSubWindowDragPayload();
  if (!dataTransfer) {
    if (fallbackPayload?.tab === "room" && fallbackPayload.roomId > 0) {
      return fallbackPayload;
    }
    if (fallbackPayload?.tab === "doc" && fallbackPayload.docId) {
      return fallbackPayload;
    }
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

  const docRef = getDocRefDragData(dataTransfer);
  if (docRef?.docId) {
    return { tab: "doc", docId: docRef.docId };
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
  if (isDocRefDrag(dataTransfer)) {
    return true;
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

function SubWindowLoadingFallback({ text }: { text: string }) {
  return (
    <div className="
      flex size-full items-center justify-center text-sm text-base-content/60
    ">
      <StateView loading title={text} className="py-0" />
    </div>
  );
}

export default function ChatPageSubWindow({
  screenSize,
  activeSpaceId,
  isKPInSpace,
  isKPPermissionPending,
  rooms,
  docMetas,
  isOpen,
  width,
  tab,
  roomId,
  docId,
  setIsOpen,
  setWidth,
  setTab,
  setRoomId,
  setDocId,
}: ChatPageSubWindowProps) {
  const isDesktop = screenSize !== "sm";
  const availableRoomId = useMemo(() => rooms[0]?.roomId ?? null, [rooms]);
  const availableDocId = useMemo(() => docMetas[0]?.id ?? null, [docMetas]);
  const resolvedRoomId = roomId ?? availableRoomId;
  const resolvedDocId = docId ?? availableDocId;
  const docTitleById = useMemo(() => {
    const map = new Map<string, {
      title: string;
      imageUrl?: string;
      imageFileId?: number;
      originalImageFileId?: number;
      imageMediaType?: string;
    }>();
    for (const item of docMetas) {
      if (!item?.id) {
        continue;
      }
      map.set(item.id, {
        title: item.title?.trim() || "文档",
        imageUrl: item.imageUrl?.trim() || undefined,
        imageFileId: typeof item.imageFileId === "number" && item.imageFileId > 0 ? item.imageFileId : undefined,
        originalImageFileId: typeof item.originalImageFileId === "number" && item.originalImageFileId > 0 ? item.originalImageFileId : undefined,
        imageMediaType: item.imageMediaType?.trim() || undefined,
      });
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

  const lastDropTargetRef = useRef<DroppedTarget>(null);
  const [isDropReplaceOverlayVisible, setIsDropReplaceOverlayVisible] = useState(false);

  const applyDroppedTarget = useCallback((target: DroppedTarget) => {
    if (!target) {
      return;
    }
    setIsOpen(true);
    if (target.tab === "room") {
      setTab("room");
      setRoomId(target.roomId);
      return;
    }
    setTab("doc");
    setDocId(target.docId);
  }, [setDocId, setIsOpen, setRoomId, setTab]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    const target = parseDroppedTarget(event.dataTransfer);
    const hasHint = hasDroppedTargetHint(event.dataTransfer);
    const hasFallbackPayload = Boolean(getSubWindowDragPayload());
    const dropEffect = resolveAllowedDropEffect(event.dataTransfer);
    if (!target && !hasHint && !hasFallbackPayload) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = dropEffect;
    if (target) {
      lastDropTargetRef.current = target;
    }
    setIsDropReplaceOverlayVisible(true);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    const target = parseDroppedTarget(event.dataTransfer) ?? lastDropTargetRef.current;
    lastDropTargetRef.current = null;
    if (!target) {
      setIsDropReplaceOverlayVisible(false);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    applyDroppedTarget(target);
    setIsDropReplaceOverlayVisible(false);
  }, [applyDroppedTarget]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncOverlayVisibility = () => {
      setIsDropReplaceOverlayVisible(Boolean(getSubWindowDragPayload()));
    };

    const handleGlobalDragStart = () => {
      // payload 在具体 draggable 的 onDragStart 里写入，放到下一帧再同步可避免时序抖动。
      window.requestAnimationFrame(syncOverlayVisibility);
    };

    const handleGlobalDragEnd = () => {
      lastDropTargetRef.current = null;
      setIsDropReplaceOverlayVisible(false);
    };
    const handleGlobalDrop = () => {
      // 让目标区域 onDrop 先执行（用于完成副窗口替换），再统一清理拖拽状态。
      window.requestAnimationFrame(() => {
        lastDropTargetRef.current = null;
        setIsDropReplaceOverlayVisible(false);
      });
    };

    window.addEventListener("dragstart", handleGlobalDragStart, true);
    window.addEventListener("dragend", handleGlobalDragEnd, true);
    window.addEventListener("drop", handleGlobalDrop);

    return () => {
      window.removeEventListener("dragstart", handleGlobalDragStart, true);
      window.removeEventListener("dragend", handleGlobalDragEnd, true);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

  if (!isDesktop || !activeSpaceId) {
    return null;
  }

  if (!isOpen) {
    return <div id="chat-page-sub-window" hidden />;
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
        id="chat-page-sub-window"
        role="region"
        aria-label="副窗口"
        className="size-full"
      >
        <div
          className="
            h-full flex flex-col min-h-0 bg-base-200 border-l border-base-300
            relative
          "
          data-sub-window-drop-zone
          onDragOverCapture={handleDragOver}
          onDropCapture={handleDrop}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDropReplaceOverlayVisible && (
            <div
              className="
                absolute inset-0 z-40 flex items-center justify-center
                bg-base-200/18 backdrop-blur-[1px]
              "
              data-sub-window-drop-zone
              onDragOverCapture={handleDragOver}
              onDropCapture={handleDrop}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="
                rounded-xl border border-info/30 bg-base-100/92 px-4 py-2
                text-sm font-semibold text-base-content shadow
              ">
                松开以替换副窗口内容
              </div>
            </div>
          )}
          {(tab === "doc" || tab === "empty" || tab === "material") && (
            <PortalTooltip label="关闭副窗口" placement="right" anchorClassName="absolute left-2 top-2 z-30">
              <IconButton
                size="xs"
                shape="square"
                className="min-h-0 size-7 bg-base-200/70 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
                label="关闭副窗口"
                title="关闭副窗口"
                icon={<XMarkICon className="size-4" />}
              />
            </PortalTooltip>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "empty" && (
            <div className="
              size-full flex items-center justify-center text-base-content/70
            ">
              <div className="max-w-sm text-center px-8">
                <div className="text-base font-semibold">副窗口为空</div>
                <div className="mt-2 text-sm text-base-content/60">
                  将左侧的群聊或文档拖入此区域即可打开
                </div>
              </div>
            </div>
          )}

          {tab === "room" && (
            resolvedRoomId
              ? (
                  <React.Suspense fallback={<SubWindowLoadingFallback text="正在加载聊天副窗口..." />}>
                    <LazyRoomWindow
                      roomId={resolvedRoomId}
                      spaceId={activeSpaceId}
                      hideSecondaryPanels
                      onCloseSubWindow={() => setIsOpen(false)}
                    />
                  </React.Suspense>
                )
              : (
                  <div className="
                    h-full flex items-center justify-center text-sm
                    text-base-content/60
                  ">
                    当前空间没有可用房间
                  </div>
                )
          )}

          {tab === "doc" && (
            (!isKPInSpace && isKPPermissionPending)
              ? (
                  <div className="
                    h-full flex items-center justify-center text-sm
                    text-base-content/60
                  ">
                    正在验证文档权限...
                  </div>
                )
              : !isKPInSpace
                  ? (
                      <div className="
                        h-full flex items-center justify-center text-sm
                        text-base-content/60
                      ">
                        仅 KP 可查看文档
                      </div>
                    )
                  : resolvedDocId
                    ? (
                        <div className="size-full overflow-hidden bg-base-100">
                          <ChatPageDocContent
                            canViewDocs={isKPInSpace}
                            docId={resolvedDocId}
                            readOnly
                            showToolbar={false}
                            spaceId={activeSpaceId}
                            tcHeaderTitle={docTitleById.get(resolvedDocId)?.title ?? "文档"}
                            tcHeaderImageUrl={docTitleById.get(resolvedDocId)?.imageUrl}
                            tcHeaderImageFileId={docTitleById.get(resolvedDocId)?.imageFileId}
                            tcHeaderOriginalImageFileId={docTitleById.get(resolvedDocId)?.originalImageFileId}
                            tcHeaderImageMediaType={docTitleById.get(resolvedDocId)?.imageMediaType}
                          />
                        </div>
                      )
                    : (
                        <div className="
                          h-full flex items-center justify-center text-sm
                          text-base-content/60
                        ">
                          当前空间没有可用文档
                        </div>
                      )
          )}

          {tab === "material" && (
            <div className="h-full overflow-hidden bg-base-100">
              <FeaturePlaceholderPage
                compact
                title="素材功能重构中"
                description="素材库将在新版体验完成后重新开放。"
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </OpenAbleDrawer>
  );
}
