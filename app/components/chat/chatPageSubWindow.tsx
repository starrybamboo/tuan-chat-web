import type { Room } from "api";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";
import type { ChatPageSubWindowTab } from "@/components/chat/hooks/useChatPageSubWindow";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
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
  setIsOpen: (next: boolean) => void;
  setWidth: (next: number) => void;
  setTab: (next: ChatPageSubWindowTab) => void;
  setRoomId: (roomId: number | null) => void;
  setDocId: (docId: string | null) => void;
}

const MIN_WIDTH = 420;
const MAX_WIDTH = 1200;
const MIN_REMAINING_WIDTH = 520;

function clampWidth(value: number) {
  const safe = Number.isFinite(value) ? value : MIN_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, safe));
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
        className="absolute right-0 top-0 h-full w-3 z-30 cursor-col-resize hover:bg-info/20 transition-colors"
        onPointerDown={handleOpenEdgePointerDown}
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
      <div className="h-full flex flex-col min-h-0 bg-base-200 border-l border-base-300">
        <div className="h-10 border-b border-base-300 px-2 flex items-center gap-2">
          <div className="tabs tabs-box tabs-xs bg-base-300/70 p-1">
            <button
              type="button"
              className={`tab ${tab === "room" ? "tab-active" : ""}`}
              onClick={() => setTab("room")}
            >
              房间
            </button>
            <button
              type="button"
              className={`tab ${tab === "doc" ? "tab-active" : ""}`}
              onClick={() => setTab("doc")}
            >
              文档
            </button>
          </div>

          {tab === "room"
            ? (
                <select
                  className="select select-bordered select-xs max-w-[18rem] flex-1"
                  value={resolvedRoomId ?? ""}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setRoomId(Number.isFinite(next) && next > 0 ? next : null);
                  }}
                >
                  {rooms.length === 0 && <option value="">无可用房间</option>}
                  {rooms.map(item => (
                    <option key={item.roomId} value={item.roomId}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )
            : (
                <select
                  className="select select-bordered select-xs max-w-[18rem] flex-1"
                  value={resolvedDocId ?? ""}
                  onChange={event => setDocId(event.target.value || null)}
                >
                  {docMetas.length === 0 && <option value="">无可用文档</option>}
                  {docMetas.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title?.trim() || item.id}
                    </option>
                  ))}
                </select>
              )}

          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs min-h-0 h-7 w-7"
            onClick={() => setIsOpen(false)}
            aria-label="关闭副窗口"
            title="关闭副窗口"
          >
            <XMarkICon className="size-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "room" && (
            resolvedRoomId
              ? (
                  <RoomWindow
                    roomId={resolvedRoomId}
                    spaceId={activeSpaceId}
                    viewMode
                    hideSecondaryPanels
                  />
                )
              : (
                  <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                    当前空间没有可用房间
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
