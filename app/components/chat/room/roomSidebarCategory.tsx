import type { DragEvent, MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarCategoryNode, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import { FileTextIcon } from "@phosphor-icons/react";
import RoomButton from "@/components/chat/shared/components/roomButton";
import { setDocRefDragData } from "@/components/chat/utils/docRef";
import { AddIcon, ChevronDown } from "@/icons";

interface RoomSidebarCategoryProps {
  cat: SidebarCategoryNode;
  categoryIndex: number;
  canEdit: boolean;
  isSpaceOwner: boolean;
  expandedByCategoryId: Record<string, boolean> | null;
  addPanelCategoryId: string | null;
  setAddPanelCategoryId: (next: string | null) => void;
  docCopyDropCategoryId: string | null;
  handleDocCopyCategoryDragOver: (e: DragEvent, categoryId: string) => void;
  handleDocCopyCategoryDragLeave: (categoryId: string) => void;
  handleDocCopyCategoryDrop: (e: DragEvent, categoryId: string) => void;
  dragging: DraggingItem | null;
  dropTarget: DropTarget | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  toggleCategoryExpanded: (categoryId: string) => void;
  onOpenCreateInCategory: (categoryId: string) => void;
  setContextMenu: (next: SidebarTreeContextMenuState) => void;
  onContextMenu: (e: MouseEvent) => void;
  docHeaderOverrides: Record<string, { title?: string; imageUrl?: string }>;
  docMetaMap: Map<string, MinimalDocMeta>;
  roomById: Map<number, Room>;
  activeSpaceId: number | null;
  activeRoomId: number | null;
  activeDocId?: string | null;
  unreadMessagesNumber: Record<number, number>;
  onSelectRoom: (roomId: number) => void;
  onSelectDoc?: (docId: string) => void;
  onCloseLeftDrawer: () => void;
  existingRoomIdsInTree: Set<number>;
  existingDocIdsInTree: Set<string>;
  pendingAddRoomId: number | null;
  setPendingAddRoomId: (next: number | null) => void;
  pendingAddDocId: string;
  setPendingAddDocId: (next: string) => void;
  addNode: (categoryId: string, node: SidebarLeafNode) => void;
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
}

export default function RoomSidebarCategory({
  cat,
  categoryIndex,
  canEdit,
  isSpaceOwner,
  expandedByCategoryId,
  addPanelCategoryId,
  setAddPanelCategoryId,
  docCopyDropCategoryId,
  handleDocCopyCategoryDragOver,
  handleDocCopyCategoryDragLeave,
  handleDocCopyCategoryDrop,
  dragging,
  dropTarget,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  toggleCategoryExpanded,
  onOpenCreateInCategory,
  setContextMenu,
  onContextMenu,
  docHeaderOverrides,
  docMetaMap,
  roomById,
  activeSpaceId,
  activeRoomId,
  activeDocId,
  unreadMessagesNumber,
  onSelectRoom,
  onSelectDoc,
  onCloseLeftDrawer,
  existingRoomIdsInTree,
  existingDocIdsInTree,
  pendingAddRoomId,
  setPendingAddRoomId,
  pendingAddDocId,
  setPendingAddDocId,
  addNode,
  fallbackTextRooms,
  visibleDocMetas,
}: RoomSidebarCategoryProps) {
  const items = Array.isArray(cat.items) ? cat.items : [];
  // 榛樿鎶樺彔锛氬鏋滄湰鍦拌繕娌″姞杞藉畬锛屽垯鍏堟姌鍙狅紱灞曞紑鐘舵€佷互 IndexedDB 涓哄噯銆?
  const isExpanded = Boolean(expandedByCategoryId?.[cat.categoryId]);
  const isCollapsed = !isExpanded;
  const isAddPanelOpen = canEdit && addPanelCategoryId === cat.categoryId;

  const showCategoryInsertLine = canEdit
    && dragging?.kind === "category"
    && dropTarget?.kind === "category"
    && dropTarget.insertIndex === categoryIndex;

  return (
    <div
      data-tc-sidebar-category={cat.categoryId}
      className={`px-1 relative ${docCopyDropCategoryId === cat.categoryId ? "outline outline-2 outline-primary/50 rounded-lg" : ""}`}
      onDragOver={e => handleDocCopyCategoryDragOver(e, cat.categoryId)}
      onDragLeave={() => handleDocCopyCategoryDragLeave(cat.categoryId)}
      onDrop={e => handleDocCopyCategoryDrop(e, cat.categoryId)}
    >
      {showCategoryInsertLine && (
        <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
      )}

      {docCopyDropCategoryId === cat.categoryId && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-primary/60 bg-primary/5 flex items-center justify-center">
          <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-xs font-medium text-primary shadow-sm">
            {isSpaceOwner ? "松开复制到侧边栏" : "仅KP可复制到侧边栏"}
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-2 px-2 py-1 text-xs font-medium opacity-80 select-none rounded-lg hover:bg-base-300/40"
        draggable={canEdit}
        onDragStart={(e) => {
          if (!canEdit)
            return;
          // 閬垮厤浠庤緭鍏ユ帶浠惰Е鍙戞嫋鎷?
          const el = e.target as HTMLElement | null;
          if (el && (el.closest("input") || el.closest("select") || el.closest("textarea") || el.closest("button"))) {
            e.preventDefault();
            return;
          }
          resetDropHandled();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `category:${cat.categoryId}`);
          setDragging({ kind: "category", fromIndex: categoryIndex, categoryId: cat.categoryId });
          setDropTarget(null);
        }}
        onDragEnd={() => {
          setDragging(null);
          setDropTarget(null);
        }}
        onContextMenu={(e) => {
          // 鍒嗙被鎿嶄綔锛氱敤鍙抽敭鏇夸唬鍘熸潵鐨勪笅鎷夎彍鍗?
          if (!canEdit)
            return;
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            kind: "category",
            x: e.clientX,
            y: e.clientY,
            categoryId: cat.categoryId,
          });
        }}
        onDragOver={(e) => {
          if (!canEdit)
            return;
          if (!dragging)
            return;
          e.preventDefault();
          e.stopPropagation();

          if (dragging.kind === "category") {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const isBefore = (e.clientY - rect.top) < rect.height / 2;
            const insertIndex = isBefore ? categoryIndex : categoryIndex + 1;
            setDropTarget({ kind: "category", insertIndex });
            return;
          }

          // node: drop 鍒板垎绫诲ご閮?-> 杩藉姞鍒版湯灏?
          setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: items.length });
        }}
        onDrop={(e) => {
          if (!canEdit)
            return;
          e.preventDefault();
          e.stopPropagation();
          handleDrop();
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => {
            toggleCategoryExpanded(cat.categoryId);
          }}
          title={isCollapsed ? "灞曞紑" : "鎶樺彔"}
        >
          <ChevronDown className={`size-4 opacity-80 ${isCollapsed ? "-rotate-90" : ""}`} />
        </button>

        <span className="flex-1 truncate">{cat.name}</span>

        {canEdit && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title="创建…"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenCreateInCategory(cat.categoryId);
            }}
          >
            <AddIcon />
          </button>
        )}

        {/* 鍒嗙被鐨勫脊鍑烘搷浣滆彍鍗曞凡鏀逛负鍙抽敭瑙﹀彂 */}
      </div>

      {!isCollapsed && (
        <div
          className={`rounded-lg border ${canEdit ? "border-base-300" : "border-transparent"} px-1 py-1 relative`}
          onDragOver={(e) => {
            if (!canEdit)
              return;
            if (!dragging)
              return;
            if (dragging.kind !== "node")
              return;
            e.preventDefault();
            e.stopPropagation();
            setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: items.length });
          }}
          onDrop={(e) => {
            if (!canEdit)
              return;
            e.preventDefault();
            e.stopPropagation();
            handleDrop();
          }}
        >
          {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === cat.categoryId && dropTarget.insertIndex === 0 && (
            <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
          )}

          {items
            .filter((node) => {
              // 闈?KP锛氶殣钘?doc 鑺傜偣锛堢洰鍓?doc 璺敱涔熶細 gate锛?
              if (!isSpaceOwner && node.type === "doc")
                return false;
              return true;
            })
            .map((node, index) => {
              const isRoom = node.type === "room";
              const docId = isRoom ? "" : String((node as any).targetId);
              const docOverride = !isRoom ? docHeaderOverrides[docId] : undefined;
              const docOverrideTitle = typeof docOverride?.title === "string" ? docOverride.title.trim() : "";
              const docOverrideImageUrl = typeof docOverride?.imageUrl === "string" ? docOverride.imageUrl.trim() : "";
              const docFallbackImageUrl = !isRoom && typeof (node as any)?.fallbackImageUrl === "string"
                ? String((node as any).fallbackImageUrl).trim()
                : "";

              const title = isRoom
                ? (roomById.get(Number((node as any).targetId))?.name ?? (node as any)?.fallbackTitle ?? String((node as any).targetId))
                : (docOverrideTitle || (docMetaMap.get(docId)?.title ?? (node as any)?.fallbackTitle ?? docId));

              const coverUrl = !isRoom ? (docOverrideImageUrl || docFallbackImageUrl) : "";

              const showInsertBefore = canEdit
                && dragging?.kind === "node"
                && dropTarget?.kind === "node"
                && dropTarget.toCategoryId === cat.categoryId
                && dropTarget.insertIndex === index;

              return (
                <div key={(node as any).nodeId} className="relative">
                  {showInsertBefore && (
                    <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
                  )}

                  {node.type === "room"
                    ? (() => {
                        const rid = Number((node as any).targetId);
                        const room = roomById.get(rid);
                        if (!room)
                          return null;

                        return (
                          <div
                            className={`flex items-center gap-1 group w-full ${canEdit ? "" : ""}`}
                            data-room-id={rid}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // 鎴块棿鍙抽敭鑿滃崟锛氱粺涓€浣跨敤 ChatPageContextMenu
                              onContextMenu(e);
                            }}
                            draggable={canEdit}
                            onDragStart={(e) => {
                              if (!canEdit)
                                return;
                              const el = e.target as HTMLElement | null;
                              if (el && (el.closest("input") || el.closest("select") || el.closest("textarea"))) {
                                e.preventDefault();
                                return;
                              }
                              resetDropHandled();
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", String(node.nodeId));
                              setDragging({
                                kind: "node",
                                nodeId: String(node.nodeId),
                                type: "room",
                                fromCategoryId: cat.categoryId,
                                fromIndex: index,
                              });
                              setDropTarget(null);
                            }}
                            onDragEnd={() => {
                              setDragging(null);
                              setDropTarget(null);
                            }}
                            onDragOver={(e) => {
                              if (!canEdit)
                                return;
                              if (!dragging || dragging.kind !== "node")
                                return;
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                              const isBefore = (e.clientY - rect.top) < rect.height / 2;
                              setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: isBefore ? index : index + 1 });
                            }}
                            onDrop={(e) => {
                              if (!canEdit)
                                return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleDrop();
                            }}
                          >
                            <RoomButton
                              room={room}
                              unreadMessageNumber={unreadMessagesNumber[rid]}
                              onclick={() => {
                                onSelectRoom(rid);
                                onCloseLeftDrawer();
                              }}
                              isActive={activeRoomId === rid}
                            >
                              {/* 鎴块棿鐨勫脊鍑烘搷浣滆彍鍗曞凡鏀逛负鍙抽敭瑙﹀彂 */}
                            </RoomButton>
                          </div>
                        );
                      })()
                    : (
                        <div
                          className={`group relative font-bold text-sm rounded-lg p-1 pr-10 flex justify-start items-center gap-2 w-full min-w-0 ${activeDocId === String((node as any).targetId) ? "bg-info-content/10" : "hover:bg-base-300"}`}
                          role="button"
                          tabIndex={0}
                          aria-pressed={activeDocId === String((node as any).targetId)}
                          onContextMenu={(e) => {
                            if (!canEdit)
                              return;
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({ kind: "doc", x: e.clientX, y: e.clientY, categoryId: cat.categoryId, index, docId: String(node.targetId) });
                          }}
                          onClick={() => {
                            const docId = String(node.targetId);
                            onSelectDoc?.(docId);
                            onCloseLeftDrawer();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const docId = String(node.targetId);
                              onSelectDoc?.(docId);
                              onCloseLeftDrawer();
                            }
                          }}
                          onDragOver={(e) => {
                            if (!canEdit)
                              return;
                            if (!dragging || dragging.kind !== "node")
                              return;
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const isBefore = (e.clientY - rect.top) < rect.height / 2;
                            setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: isBefore ? index : index + 1 });
                          }}
                          onDrop={(e) => {
                            if (!canEdit)
                              return;
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop();
                          }}
                          draggable={canEdit}
                          onDragStart={(e) => {
                            if (!canEdit)
                              return;
                            const el = e.target as HTMLElement | null;
                            if (el && (el.closest("input") || el.closest("select") || el.closest("textarea"))) {
                              e.preventDefault();
                              return;
                            }
                            resetDropHandled();
                            e.dataTransfer.effectAllowed = "copyMove";
                            e.dataTransfer.setData("text/plain", String(node.nodeId));
                            setDocRefDragData(e.dataTransfer, {
                              docId: String(node.targetId),
                              ...(typeof activeSpaceId === "number" && activeSpaceId > 0 ? { spaceId: activeSpaceId } : {}),
                              ...(title ? { title } : {}),
                              ...(coverUrl ? { imageUrl: coverUrl } : {}),
                            });
                            setDragging({
                              kind: "node",
                              nodeId: String(node.nodeId),
                              type: "doc",
                              fromCategoryId: cat.categoryId,
                              fromIndex: index,
                            });
                            setDropTarget(null);
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setDropTarget(null);
                          }}
                        >
                          <div className="mask mask-squircle size-8 bg-base-100 border border-base-300/60 flex items-center justify-center relative overflow-hidden">
                            {coverUrl
                              ? (
                                  <>
                                    <img
                                      src={coverUrl}
                                      alt={title || "doc"}
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-0.5 right-0.5 size-4 rounded bg-base-100/80 flex items-center justify-center border border-base-300/60">
                                      <FileTextIcon className="size-3 opacity-70" />
                                    </span>
                                  </>
                                )
                              : (
                                  <FileTextIcon className="size-4 opacity-70" />
                                )}
                          </div>
                          <span className="flex-1 min-w-0 truncate text-left">{title}</span>
                        </div>
                      )}
                </div>
              );
            })}

          {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === cat.categoryId && dropTarget.insertIndex === items.length && (
            <div className="pointer-events-none absolute left-3 right-3 bottom-0 translate-y-1/2 h-0.5 bg-primary/60 rounded" />
          )}

          {isAddPanelOpen && (
            <div className="mt-1 px-2 py-2 border-t border-base-300">
              <div className="flex items-center gap-2">
                <select
                  className="select select-bordered select-xs flex-1"
                  aria-label="娣诲姞鎴块棿"
                  value={pendingAddRoomId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPendingAddRoomId(v ? Number(v) : null);
                  }}
                >
                  <option value="">添加房间…</option>
                  {fallbackTextRooms
                    .filter(r => typeof r.roomId === "number" && Number.isFinite(r.roomId))
                    .filter(r => !existingRoomIdsInTree.has(r.roomId as number))
                    .map(r => (
                      <option key={r.roomId} value={r.roomId}>
                        {r.name ?? String(r.roomId)}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    if (!pendingAddRoomId)
                      return;
                    addNode(cat.categoryId, { nodeId: `room:${pendingAddRoomId}`, type: "room", targetId: pendingAddRoomId });
                    setPendingAddRoomId(null);
                  }}
                  disabled={!pendingAddRoomId}
                >
                  娣诲姞
                </button>
              </div>

              {isSpaceOwner && (
                <div className="flex items-center gap-2 mt-2">
                  <select
                    className="select select-bordered select-xs flex-1"
                    aria-label="娣诲姞鏂囨。"
                    value={pendingAddDocId}
                    onChange={(e) => {
                      setPendingAddDocId(e.target.value);
                    }}
                  >
                    <option value="">添加文档…</option>
                    {visibleDocMetas
                      .filter(m => typeof m?.id === "string" && m.id.length > 0)
                      .filter(m => !existingDocIdsInTree.has(m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title ?? m.id}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      if (!pendingAddDocId)
                        return;
                      addNode(cat.categoryId, { nodeId: `doc:${pendingAddDocId}`, type: "doc", targetId: pendingAddDocId });
                      setPendingAddDocId("");
                    }}
                    disabled={!pendingAddDocId}
                  >
                    娣诲姞
                  </button>
                </div>
              )}

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setAddPanelCategoryId(null);
                    setPendingAddRoomId(null);
                    setPendingAddDocId("");
                  }}
                >
                  鍏抽棴
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
