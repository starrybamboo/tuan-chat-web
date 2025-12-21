import type { Space } from "../../../../api";

import SpaceButton from "@/components/chat/shared/components/spaceButton";
import { AddIcon } from "@/icons";
import React, { useMemo, useRef, useState } from "react";

export interface ChatSpaceSidebarProps {
  isPrivateChatMode: boolean;
  spaces: Space[];
  spaceOrderIds?: number[];
  onReorderSpaceIds?: (nextSpaceIds: number[]) => void;
  activeSpaceId: number | null;
  getSpaceUnreadMessagesNumber: (spaceId: number) => number;
  privateUnreadMessagesNumber: number;
  onOpenPrivate: () => void;
  onSelectSpace: (spaceId: number) => void;
  onCreateSpace: () => void;
  onSpaceContextMenu: (e: React.MouseEvent) => void;
}

export default function ChatSpaceSidebar({
  isPrivateChatMode,
  spaces,
  spaceOrderIds,
  onReorderSpaceIds,
  activeSpaceId,
  getSpaceUnreadMessagesNumber,
  privateUnreadMessagesNumber,
  onOpenPrivate,
  onSelectSpace,
  onCreateSpace,
  onSpaceContextMenu,
}: ChatSpaceSidebarProps) {
  const isDraggingRef = useRef(false);
  const [draggingSpaceId, setDraggingSpaceId] = useState<number | null>(null);
  const [draftOrderIds, setDraftOrderIds] = useState<number[] | null>(null);

  const currentIds = useMemo(() => {
    if (Array.isArray(spaceOrderIds) && spaceOrderIds.length > 0) {
      return spaceOrderIds;
    }
    return spaces
      .map(s => s.spaceId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [spaceOrderIds, spaces]);

  const renderSpaces = useMemo(() => {
    const ids = draftOrderIds ?? currentIds;
    if (!ids.length)
      return spaces;

    const byId = new Map<number, Space>();
    for (const s of spaces) {
      if (typeof s.spaceId === "number") {
        byId.set(s.spaceId, s);
      }
    }

    const ordered: Space[] = [];
    for (const id of ids) {
      const found = byId.get(id);
      if (found)
        ordered.push(found);
    }

    // 兜底：把任何未出现在 ids 的 space 追加在末尾
    for (const s of spaces) {
      const id = s.spaceId;
      if (typeof id === "number" && !ids.includes(id)) {
        ordered.push(s);
      }
    }

    return ordered;
  }, [currentIds, draftOrderIds, spaces]);

  const reorderDraft = (sourceId: number, targetId: number, insertAfter: boolean) => {
    if (sourceId === targetId)
      return;
    const base = draftOrderIds ?? currentIds;
    const fromIndex = base.indexOf(sourceId);
    const toIndex = base.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1)
      return;

    const next = [...base];
    next.splice(fromIndex, 1);
    const nextToIndex = next.indexOf(targetId);
    const insertIndex = insertAfter ? nextToIndex + 1 : nextToIndex;
    next.splice(insertIndex, 0, sourceId);
    setDraftOrderIds(next);
  };

  return (
    <div className="flex flex-col py-2 bg-base-300/40 h-full overflow-y-auto">
      {/* 私信入口 */}
      <div className="rounded w-10 relative mx-2">
        <div
          className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${isPrivateChatMode ? "scale-y-100" : "scale-y-0"
          }`}
        />
        <button
          className="tooltip tooltip-bottom w-10 btn btn-square"
          data-tip="私信"
          type="button"
          aria-label="私信"
          onClick={onOpenPrivate}
        >
          <div className="indicator">
            {(privateUnreadMessagesNumber > 0)
              ? (
                  <span className="indicator-item badge badge-xs bg-error">
                    {privateUnreadMessagesNumber > 99 ? "99+" : privateUnreadMessagesNumber}
                  </span>
                )
              : null}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
        </button>
      </div>

      {/* 分隔线 */}
      <div className="w-8 h-px bg-base-300 mx-3"></div>

      <div className="hidden-scrollbar overflow-x-hidden flex flex-col py-2 px-2" onContextMenu={onSpaceContextMenu}>
        {/* 全部空间列表 */}
        {renderSpaces.map(space => (
          <div
            key={space.spaceId}
            data-space-id={space.spaceId}
            draggable={Boolean(onReorderSpaceIds)}
            className={onReorderSpaceIds ? "cursor-grab active:cursor-grabbing" : undefined}
            onDragStart={(e) => {
              if (!onReorderSpaceIds)
                return;
              const sid = space.spaceId;
              if (typeof sid !== "number")
                return;

              isDraggingRef.current = true;
              setDraggingSpaceId(sid);
              setDraftOrderIds(currentIds);

              e.dataTransfer.effectAllowed = "move";
              try {
                e.dataTransfer.setData("text/plain", String(sid));
              }
              catch {
                // ignore
              }
            }}
            onDragOver={(e) => {
              if (!onReorderSpaceIds)
                return;
              if (draggingSpaceId == null)
                return;
              const tid = space.spaceId;
              if (typeof tid !== "number")
                return;
              if (tid === draggingSpaceId)
                return;

              e.preventDefault();
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const insertAfter = e.clientY > rect.top + rect.height / 2;
              reorderDraft(draggingSpaceId, tid, insertAfter);
            }}
            onDrop={(e) => {
              if (!onReorderSpaceIds)
                return;
              e.preventDefault();
              if (draftOrderIds && draftOrderIds.length > 0) {
                onReorderSpaceIds(draftOrderIds);
              }
              setDraggingSpaceId(null);
              setDraftOrderIds(null);
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 0);
            }}
            onDragEnd={() => {
              if (!onReorderSpaceIds)
                return;
              if (draftOrderIds && draftOrderIds.length > 0) {
                onReorderSpaceIds(draftOrderIds);
              }
              setDraggingSpaceId(null);
              setDraftOrderIds(null);
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 0);
            }}
          >
            <SpaceButton
              space={space}
              unreadMessageNumber={getSpaceUnreadMessagesNumber(space.spaceId ?? -1)}
              onclick={() => {
                if (isDraggingRef.current) {
                  return;
                }
                if (activeSpaceId !== space.spaceId) {
                  onSelectSpace(space.spaceId ?? -1);
                }
              }}
              isActive={activeSpaceId === space.spaceId}
            >
            </SpaceButton>
          </div>
        ))}
      </div>
      <button
        className="tooltip tooltip-top btn btn-square btn-dash btn-info w-10 mx-2"
        type="button"
        data-tip="创建"
        aria-label="创建空间"
        onClick={onCreateSpace}
      >
        <div className="avatar mask mask-squircle flex content-center">
          <AddIcon></AddIcon>
        </div>
      </button>
    </div>
  );
}
