import { Link, useRouter } from "@tanstack/react-router";
import { LayoutGroup, motion, useAnimate } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import SidebarActiveCursor from "@/components/chat/shared/components/sidebarActiveCursor";
import SpaceButton from "@/components/chat/shared/components/spaceButton";
import { getChatSidebarActiveButtonClass } from "@/components/chat/shared/components/chatSidebarActiveTone";
import { type ChatSidebarActiveCursorTarget, getChatSidebarActiveCursorTarget, isChatSidebarSpaceCursorTarget, shouldSelectSpaceFromSidebar } from "@/components/chat/space/chatSpaceSidebarNavigation";
import { interactiveButtonMotionProps } from "@/components/common/motion/interactiveButtonMotion";
import PortalTooltip from "@/components/common/portalTooltip";
import { AddIcon, CompassIcon, RoomChatIcon } from "@/icons";

import type { Space } from "../../../../api";

type ChatSpaceSidebarProps = {
  isPrivateChatMode: boolean;
  isDiscoverMode?: boolean;
  spaces: Space[];
  spaceOrderIds?: number[];
  onReorderSpaceIds?: (nextSpaceIds: number[]) => void;
  activeSpaceId: number | null;
  getSpaceUnreadMessagesNumber: (spaceId: number) => number;
  privateUnreadMessagesNumber: number;
  onOpenPrivate: () => void;
  onSelectSpace: (spaceId: number, options?: { roomId?: number | null }) => void;
  getPreferredRoomIdForSpace?: (spaceId: number) => number | null;
  onCreateSpace: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;
  isLeftDrawerCollapsePreview?: boolean;
}

const MotionLink = motion.create(Link);
const sidebarIconButtonBaseClass = "w-10 btn btn-square border border-transparent transition-colors";
const collapsedButtonAnimation = {
  scale: [1, 0.9, 1.12, 0.98, 1],
  rotate: [0, -4, 4, -2, 0],
  x: [0, -1, 1, 0],
};
const collapsedButtonAnimationOptions = {
  duration: 0.42,
  ease: "easeOut",
} as const;

function isSameCursorTarget(
  left: ChatSidebarActiveCursorTarget | null,
  right: ChatSidebarActiveCursorTarget | null,
): boolean {
  if (left?.type !== right?.type) {
    return false;
  }
  if (left?.type === "space" && right?.type === "space") {
    return left.spaceId === right.spaceId;
  }
  return left != null;
}

export default function ChatSpaceSidebar({
  isPrivateChatMode,
  isDiscoverMode = false,
  spaces,
  spaceOrderIds,
  onReorderSpaceIds,
  activeSpaceId,
  getSpaceUnreadMessagesNumber,
  privateUnreadMessagesNumber,
  onOpenPrivate,
  onSelectSpace,
  getPreferredRoomIdForSpace,
  onCreateSpace,
  onToggleLeftDrawer,
  isLeftDrawerOpen,
  isLeftDrawerCollapsePreview,
}: ChatSpaceSidebarProps) {
  const router = useRouter();
  const isDraggingRef = useRef(false);
  const [draggingSpaceId, setDraggingSpaceId] = useState<number | null>(null);
  const [draftOrderIds, setDraftOrderIds] = useState<number[] | null>(null);
  const [optimisticCursorTarget, setOptimisticCursorTarget] = useState<ChatSidebarActiveCursorTarget | null>(null);
  const previousShouldShowCollapsedFeedbackRef = useRef(false);
  const [privateButtonScope, animatePrivateButton] = useAnimate<HTMLButtonElement>();
  const [discoverButtonScope, animateDiscoverButton] = useAnimate<HTMLAnchorElement>();
  const isLeftDrawerCollapsed = Boolean(onToggleLeftDrawer && isLeftDrawerOpen === false);
  const shouldShowCollapsedFeedback = Boolean(isLeftDrawerCollapsePreview);
  const shouldUseCollapsedCursorTone = isLeftDrawerCollapsed || shouldShowCollapsedFeedback;
  const activeTone = shouldUseCollapsedCursorTone ? "collapsed" : "default";
  const routeCursorTarget = getChatSidebarActiveCursorTarget({
    activeSpaceId,
    isDiscoverMode,
    isPrivateChatMode,
  });
  const activeCursorTarget = optimisticCursorTarget ?? routeCursorTarget;
  const collapseAnimationTrigger = shouldShowCollapsedFeedback ? activeCursorTarget : null;
  const runCollapseButtonAnimation = (target: ChatSidebarActiveCursorTarget) => {
    if (target.type === "private") {
      void animatePrivateButton(privateButtonScope.current, collapsedButtonAnimation, collapsedButtonAnimationOptions);
      return;
    }
    if (target.type === "discover") {
      void animateDiscoverButton(discoverButtonScope.current, collapsedButtonAnimation, collapsedButtonAnimationOptions);
    }
  };

  useEffect(() => {
    if (!optimisticCursorTarget) {
      return;
    }
    if (isSameCursorTarget(optimisticCursorTarget, routeCursorTarget)) {
      setOptimisticCursorTarget(null);
    }
  }, [optimisticCursorTarget, routeCursorTarget]);

  useEffect(() => {
    if (!optimisticCursorTarget) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setOptimisticCursorTarget(null);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [optimisticCursorTarget]);

  const preloadSpaceRoute = (spaceId?: number) => {
    if (typeof spaceId !== "number" || !Number.isFinite(spaceId)) {
      return;
    }
    const preferredRoomId = getPreferredRoomIdForSpace?.(spaceId) ?? null;
    void router.preloadRoute({
      to: "/chat/$spaceId/{-$roomId}/{-$messageId}",
      params: {
        spaceId: String(spaceId),
        ...(preferredRoomId ? { roomId: String(preferredRoomId) } : {}),
      },
    });
  };

  useEffect(() => {
    const shouldAnimateCollapse = !previousShouldShowCollapsedFeedbackRef.current && shouldShowCollapsedFeedback;
    previousShouldShowCollapsedFeedbackRef.current = shouldShowCollapsedFeedback;
    if (!shouldAnimateCollapse) {
      return;
    }
    if (activeCursorTarget?.type === "private") {
      void animatePrivateButton(privateButtonScope.current, collapsedButtonAnimation, collapsedButtonAnimationOptions);
      return;
    }
    if (activeCursorTarget?.type === "discover") {
      void animateDiscoverButton(discoverButtonScope.current, collapsedButtonAnimation, collapsedButtonAnimationOptions);
    }
  }, [activeCursorTarget?.type, animateDiscoverButton, animatePrivateButton, discoverButtonScope, privateButtonScope, shouldShowCollapsedFeedback]);

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
    setDraftOrderIds((prevDraftOrderIds) => {
      const base = prevDraftOrderIds ?? currentIds;
      const fromIndex = base.indexOf(sourceId);
      const toIndex = base.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1)
        return prevDraftOrderIds;

      const next = [...base];
      next.splice(fromIndex, 1);
      const nextToIndex = next.indexOf(targetId);
      const insertIndex = insertAfter ? nextToIndex + 1 : nextToIndex;
      next.splice(insertIndex, 0, sourceId);
      if (next.length === base.length && next.every((value, index) => value === base[index])) {
        return prevDraftOrderIds;
      }
      return next;
    });
  };

  return (
    <div
      className={`
        flex flex-col px-1 bg-base-200 h-full overflow-y-auto overflow-x-visible
        ${
        isLeftDrawerCollapsed ? `
          border-r border-base-300
          dark:border-base-300
        ` : ""
      }
      `}
    >
      <LayoutGroup id="chat-space-sidebar-active-cursor">
      <div className="flex flex-col gap-1">
        {/* 私信入口 */}
        <div className="
          rounded w-10 relative z-20
          hover:z-50
          mx-2
        ">
          <SidebarActiveCursor isActive={activeCursorTarget?.type === "private"} tone={shouldUseCollapsedCursorTone ? "collapsed" : "default"} />
          <PortalTooltip label="私信" placement="right">
            <motion.button
              className={`
                ${sidebarIconButtonBaseClass}
                ${isPrivateChatMode ? getChatSidebarActiveButtonClass(activeTone) : ""}
              `}
              ref={privateButtonScope}
              type="button"
              aria-label={isPrivateChatMode && onToggleLeftDrawer
                ? (isLeftDrawerCollapsed ? "展开左栏" : "收起左栏")
                : "私信"}
              aria-pressed={isPrivateChatMode}
              onClick={() => {
                if (isPrivateChatMode && onToggleLeftDrawer) {
                  if (!isLeftDrawerCollapsed) {
                    runCollapseButtonAnimation({ type: "private" });
                  }
                  onToggleLeftDrawer();
                  return;
                }
                setOptimisticCursorTarget({ type: "private" });
                onOpenPrivate();
              }}
              {...(isPrivateChatMode && onToggleLeftDrawer
                ? { whileHover: interactiveButtonMotionProps.whileHover, transition: interactiveButtonMotionProps.transition }
                : interactiveButtonMotionProps)}
            >
              <div className="indicator">
                {(privateUnreadMessagesNumber > 0)
                  ? (
                      <span className="indicator-item badge badge-xs bg-error">
                        {privateUnreadMessagesNumber > 99 ? "99+" : privateUnreadMessagesNumber}
                      </span>
                    )
                  : null}
                <RoomChatIcon className="size-6" />
              </div>
            </motion.button>
          </PortalTooltip>
        </div>

        {/* 发现入口 */}
        <div className="
          rounded w-10 relative z-20
          hover:z-50
          mx-2
        ">
          <SidebarActiveCursor isActive={activeCursorTarget?.type === "discover"} tone={shouldUseCollapsedCursorTone ? "collapsed" : "default"} />
          <PortalTooltip label="发现" placement="right">
            <MotionLink
              to="/chat/discover/material"
              className={`
                ${sidebarIconButtonBaseClass}
                ${isDiscoverMode ? getChatSidebarActiveButtonClass(activeTone) : ""}
              `}
              ref={discoverButtonScope}
              aria-label={isDiscoverMode && onToggleLeftDrawer
                ? (isLeftDrawerCollapsed ? "展开左栏" : "收起左栏")
                : "发现"}
              aria-current={isDiscoverMode ? "page" : undefined}
              onClick={(event) => {
                if (isDiscoverMode && onToggleLeftDrawer) {
                  event.preventDefault();
                  if (!isLeftDrawerCollapsed) {
                    runCollapseButtonAnimation({ type: "discover" });
                  }
                  onToggleLeftDrawer();
                  return;
                }
                setOptimisticCursorTarget({ type: "discover" });
              }}
              {...(isDiscoverMode && onToggleLeftDrawer
                ? { whileHover: interactiveButtonMotionProps.whileHover, transition: interactiveButtonMotionProps.transition }
                : interactiveButtonMotionProps)}
            >
              <CompassIcon className="size-6" />
            </MotionLink>
          </PortalTooltip>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="w-8 h-px bg-base-300 mx-3"></div>

      <div className="hidden-scrollbar overflow-x-visible flex flex-col p-2">
        {/* 全部空间列表 */}
        {renderSpaces.map((space) => {
          const spaceId = space.spaceId;
          const isDraggingSpace = typeof spaceId === "number" && draggingSpaceId === spaceId;
          return (
            <motion.div
              key={space.spaceId}
              data-space-id={space.spaceId}
              draggable={Boolean(onReorderSpaceIds)}
              className={onReorderSpaceIds ? `
                cursor-grab
                active:cursor-grabbing
                ${isDraggingSpace ? "opacity-60" : ""}
              ` : undefined}
              onDragStartCapture={(e) => {
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
                const rect = e.currentTarget.getBoundingClientRect();
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
                window.setTimeout(() => {
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
                window.setTimeout(() => {
                  isDraggingRef.current = false;
                }, 0);
              }}
            >
              <SpaceButton
                space={space}
                unreadMessageNumber={getSpaceUnreadMessagesNumber(space.spaceId ?? -1)}
                onclick={() => {
                  const targetSpaceId = typeof space.spaceId === "number" && Number.isFinite(space.spaceId)
                    ? space.spaceId
                    : null;
                  if (targetSpaceId == null) {
                    return;
                  }
                  const isCurrentSpace = isChatSidebarSpaceCursorTarget(activeCursorTarget, targetSpaceId);
                  if (isCurrentSpace && onToggleLeftDrawer) {
                    onToggleLeftDrawer();
                    return;
                  }
                  // 发现页会保留上次聊天的 activeSpaceId，因此这里需要允许“点回当前空间”。
                  if (!shouldSelectSpaceFromSidebar({
                    activeSpaceId,
                    targetSpaceId,
                    isDiscoverMode,
                    isDragging: isDraggingRef.current,
                  })) {
                    return;
                  }
                  setOptimisticCursorTarget({ type: "space", spaceId: targetSpaceId });
                  onSelectSpace(targetSpaceId, {
                    roomId: getPreferredRoomIdForSpace?.(targetSpaceId) ?? null,
                  });
                }}
                onPreload={() => preloadSpaceRoute(space.spaceId)}
                isActive={isChatSidebarSpaceCursorTarget(activeCursorTarget, space.spaceId)}
                activeTone={activeTone}
                isCollapseToggleClick={Boolean(
                  onToggleLeftDrawer
                  && !isLeftDrawerCollapsed
                  && isChatSidebarSpaceCursorTarget(activeCursorTarget, space.spaceId),
                )}
                collapseAnimationKey={
                  collapseAnimationTrigger?.type === "space" && collapseAnimationTrigger.spaceId === space.spaceId
                    ? `${shouldShowCollapsedFeedback}:${space.spaceId}`
                    : undefined
                }
              >
              </SpaceButton>
            </motion.div>
          );
        })}
      </div>
      </LayoutGroup>
      <PortalTooltip label="创建" placement="right">
        <motion.button
          className="
            btn btn-square btn-dash btn-info w-10 mx-2 relative z-20
            hover:z-50
          "
          type="button"
          aria-label="创建空间"
          onClick={onCreateSpace}
          {...interactiveButtonMotionProps}
        >
          <div className="avatar mask mask-squircle flex content-center">
            <AddIcon></AddIcon>
          </div>
        </motion.button>
      </PortalTooltip>
    </div>
  );
}
