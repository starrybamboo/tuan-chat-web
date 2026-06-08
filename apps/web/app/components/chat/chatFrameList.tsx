import type { FlatIndexLocationWithAlign, VirtuosoHandle } from "react-virtuoso";

import { Check, FileArrowDown, FilmSlate, Funnel, ImageSquare, SelectionAll, ShareFat, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";

import type { MessageDisplayFilterConfig } from "@/components/chat/utils/messageDisplayFilter";

import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { describeMessageDisplayFilterStatus } from "@/components/chat/utils/messageDisplayFilter";
import {
  messageFilterToggleSweepMotionProps,
  scrollToBottomButtonMotionProps,
  unreadBadgeBounceMotionProps,
} from "@/components/common/motion/chatMessageMotion";
import { floatingListItemMotionProps, floatingPanelMotionProps } from "@/components/common/motion/floatingPanelMotion";

import type { ChatMessageResponse } from "../../../api";

import { getChatFrameItemKey } from "./chatFrameListKey";

function Header() {
  return (
    <div className="py-2">
      <div className="divider text-xs text-base-content/50 m-0">到顶</div>
    </div>
  );
}

type SelectionToolbarProps = {
  selectedCount: number;
  totalCount: number;
  isVisible: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onExportFile: () => void;
  onExportPremiere?: () => void;
  onExportImage: () => void;
  onForward: () => void;
}

const SelectionToolbar = memo(({
  selectedCount,
  totalCount,
  isVisible,
  onCancel,
  onSelectAll,
  onExportFile,
  onExportPremiere,
  onExportImage,
  onForward,
}: SelectionToolbarProps) => {
  const hasSelection = selectedCount > 0;
  const canSelectAll = totalCount > 0;
  const actions = [
    {
      key: "select-all",
      label: "全选",
      icon: SelectionAll,
      onClick: onSelectAll,
      disabled: !canSelectAll,
      className: "btn-ghost",
    },
    {
      key: "export-file",
      label: "导出成文件",
      icon: FileArrowDown,
      onClick: onExportFile,
      disabled: !hasSelection,
      className: "btn-accent",
    },
    ...(onExportPremiere
      ? [{
          key: "export-premiere",
          label: "生成 PR 文件",
          icon: FilmSlate,
          onClick: onExportPremiere,
          disabled: !hasSelection,
          className: "btn-accent",
        }]
      : []),
    {
      key: "export-image",
      label: "生成图片",
      icon: ImageSquare,
      onClick: onExportImage,
      disabled: !hasSelection,
      className: "btn-secondary",
    },
    {
      key: "forward",
      label: "转发",
      icon: ShareFat,
      onClick: onForward,
      disabled: !hasSelection,
      className: "btn-info",
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="
          pointer-events-none absolute inset-x-0 bottom-4 z-50 flex flex-col
          items-center gap-2 px-4
        ">
          <motion.div
            className="
              max-w-[calc(100%-2rem)] rounded-md border border-primary/20
              bg-base-100/92 px-3 py-1.5 text-sm text-base-content shadow-2xl
              shadow-primary/10 backdrop-blur-xl
            "
            {...floatingListItemMotionProps(0)}
          >
            按住 Ctrl 开启多选：Shift 连选，Ctrl + Shift 连选并保留已有选择。
          </motion.div>
          <motion.div
            className="
              pointer-events-auto flex max-w-[calc(100%-2rem)] items-center
              gap-2 overflow-hidden rounded-md border border-primary/20
              bg-base-100/92 p-2 text-sm text-base-content shadow-2xl
              shadow-primary/10 backdrop-blur-xl
            "
            {...floatingPanelMotionProps}
          >
            <motion.div
              className="
                flex shrink-0 items-center gap-2 border-r border-base-content/10
                px-2 pr-3
              "
              {...floatingListItemMotionProps(0)}
            >
              <span className="
                size-2 rounded-full bg-primary
                shadow-[0_0_18px_hsl(var(--p)/0.75)]
              " />
              <span className="whitespace-nowrap font-medium">{`已选择 ${selectedCount} 条`}</span>
            </motion.div>
            <div className="
              flex min-w-0 items-center gap-1 overflow-x-auto px-1
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            ">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.key}
                    type="button"
                    className={`
                      btn btn-sm h-8 min-h-0 shrink-0 gap-1.5 rounded-md px-2.5
                      ${action.className}
                    `}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={action.label}
                    aria-label={action.label}
                    {...floatingListItemMotionProps(index + 1)}
                  >
                    <Icon className="size-4" />
                    <span>{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <motion.button
              type="button"
              className="
                btn btn-ghost btn-sm btn-circle size-8 min-h-0 shrink-0
                rounded-md
              "
              onClick={onCancel}
              title="取消"
              aria-label="取消多选"
              {...floatingListItemMotionProps(actions.length + 1)}
            >
              <X className="size-4" />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

type MessageFilterControlProps = {
  isActive: boolean;
  filterConfig: MessageDisplayFilterConfig | null;
  visibleCount: number;
  totalCount: number;
  onOpen: () => void;
}

const MessageFilterControl = memo(({
  isActive,
  filterConfig,
  visibleCount,
  totalCount,
  onOpen,
}: MessageFilterControlProps) => {
  const safeVisibleCount = Math.max(0, visibleCount);
  const safeTotalCount = Math.max(0, totalCount);
  const hiddenCount = Math.max(0, safeTotalCount - safeVisibleCount);
  const statusText = isActive && filterConfig
    ? describeMessageDisplayFilterStatus(filterConfig)
    : "调整聊天室显示条件";
  const countText = isActive ? `显示 ${safeVisibleCount}/${safeTotalCount}` : "筛选";
  const hiddenText = isActive
    ? (hiddenCount > 0 ? `已隐藏 ${hiddenCount} 条` : "无隐藏")
    : null;
  const title = isActive
    ? `${statusText}，${countText}，${hiddenText}`
    : "筛选消息显示";
  const buttonAnimate = isActive
    ? { opacity: 1, scale: [1, 1.08, 1], y: 0 }
    : { opacity: 1, scale: [1, 0.94, 1], y: 0 };

  return (
    <div className="
      pointer-events-none absolute right-4 top-3 z-30 flex justify-end
    ">
      <motion.button
        key={isActive ? "filter-active" : "filter-inactive"}
        type="button"
        className={`
          btn btn-ghost btn-sm btn-circle pointer-events-auto relative size-9
          min-h-0 rounded-md border shadow-lg backdrop-blur-xl
          ${
          isActive
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-base-content/10 bg-base-100/78 text-base-content/70"
        }
        `}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={buttonAnimate}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        onClick={onOpen}
        title={title}
        aria-label={title}
        aria-pressed={isActive}
      >
        <AnimatePresence>
          {isActive && (
            <motion.span
              className="
                pointer-events-none absolute inset-0 rounded-md border
                border-primary/35
              "
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: [0.45, 0], scale: [0.9, 1.42] }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.62, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.span
              key="active-dot"
              className="
                pointer-events-none absolute right-1 top-1 size-1.5 rounded-full
                bg-primary shadow-[0_0_10px_hsl(var(--p)/0.85)]
              "
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: [0.3, 1.45, 1] }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <motion.span
          className="inline-flex"
          animate={isActive ? { rotate: [0, -10, 0] } : { rotate: [0, 8, 0] }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <Funnel className="size-4" />
        </motion.span>
      </motion.button>
    </div>
  );
});

type MessageFilterTransitionState = {
  key: string;
  tone: "active" | "inactive";
} | null;

const CHAT_COMPOSER_ROOT_SELECTOR = "[data-chat-composer-root=\"true\"]";

type UnreadIndicatorProps = {
  enabled: boolean;
  unreadMessageNumber: number;
  historyLength: number;
  isAtBottom: boolean;
  onScrollToBottom: () => void;
}

const UnreadIndicator = memo(({
  enabled,
  unreadMessageNumber,
  historyLength,
  isAtBottom,
  onScrollToBottom,
}: UnreadIndicatorProps) => {
  const show = enabled && unreadMessageNumber > 0 && historyLength > 2 && !isAtBottom;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          className="
            absolute bottom-4 right-4 z-50 cursor-pointer rounded-full
            bg-base-100/75 backdrop-blur-md px-3 py-1.5 text-xs shadow-sm
          "
          onClick={onScrollToBottom}
          {...scrollToBottomButtonMotionProps}
        >
          <motion.span
            key={unreadMessageNumber}
            {...unreadBadgeBounceMotionProps}
            className="inline-block font-medium text-info"
          >
            {unreadMessageNumber}
          </motion.span>
          <span className="ml-1 text-base-content/70">条新消息</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

type GalPatchProposalToolbarProps = {
  added: number;
  deleted: number;
  modified: number;
  moved: number;
  metadataChanged: number;
  selectedMessageCount?: number;
  totalMessageCount?: number;
  isApplying: boolean;
  onApply: () => void;
  onDiscard?: () => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

const GalPatchProposalToolbar = memo(({
  added,
  deleted,
  modified,
  moved,
  metadataChanged,
  selectedMessageCount,
  totalMessageCount,
  isApplying,
  onApply,
  onDiscard,
  onAcceptAll,
  onRejectAll,
}: GalPatchProposalToolbarProps) => {
  const total = added + deleted + modified + moved;
  const hasLineSelection = typeof selectedMessageCount === "number" && typeof totalMessageCount === "number";
  const details = [
    added > 0 ? `新增 ${added}` : "",
    modified > 0 ? `修改 ${modified}` : "",
    deleted > 0 ? `删除 ${deleted}` : "",
    moved > 0 ? `移动 ${moved}` : "",
    metadataChanged > 0 ? `元数据 ${metadataChanged}` : "",
  ].filter(Boolean).join(" / ");
  const detailText = total > 0 ? details : "没有可应用的变更";

  return (
    <div className="
      pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center
      px-3
    ">
      <div className="
        pointer-events-auto flex max-w-full flex-wrap items-center gap-3
        rounded-lg border border-base-300/70 bg-base-100/90 px-3 py-2 text-sm
        text-base-content shadow-lg backdrop-blur-md
      ">
        <div className="min-w-0">
          <div className="font-medium leading-5">改动预览</div>
          <div className="truncate text-xs text-base-content/60">
            {hasLineSelection ? `已接受 ${selectedMessageCount}/${totalMessageCount} 行` : detailText}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onAcceptAll && (
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={onAcceptAll}
              disabled={isApplying}
            >
              <Check className="size-4" />
              全部接受
            </button>
          )}
          {onRejectAll && (
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={onRejectAll}
              disabled={isApplying}
            >
              <X className="size-4" />
              全部忽略
            </button>
          )}
          {onDiscard && (
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={onDiscard}
              disabled={isApplying}
            >
              <X className="size-4" />
              取消
            </button>
          )}
          <button
            type="button"
            className="btn btn-success btn-sm gap-1 text-success-content"
            onClick={onApply}
            disabled={isApplying || total === 0}
          >
            {isApplying ? <span className="loading loading-spinner loading-xs" /> : <Check className="
              size-4
            " />}
            {hasLineSelection && selectedMessageCount !== totalMessageCount ? "应用已选" : "应用"}
          </button>
        </div>
      </div>
    </div>
  );
});

type DragHandlers = {
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

function useChatFrameListDragHandlers(roomId: number): DragHandlers {
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (isFileDrag(event.dataTransfer)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer))
      return;
    event.preventDefault();
    event.stopPropagation();
    addDroppedFilesToComposer(event.dataTransfer, roomId);
  }, [roomId]);

  return { handleDragOver, handleDrop };
}

type ChatFrameListProps = {
  historyMessages: ChatMessageResponse[];
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  scrollerRef: React.MutableRefObject<HTMLElement | null>;
  isAtBottomRef: React.MutableRefObject<boolean>;
  isAtTopRef: React.MutableRefObject<boolean>;
  setCurrentVirtuosoIndex: (index: number) => void;
  onVisibleRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
  enableUnreadIndicator: boolean;
  unreadMessageNumber: number;
  scrollToBottom: () => void;
  updateLastReadSyncId: (roomId: number) => void;
  roomId: number;
  renderMessage: (index: number, message: ChatMessageResponse) => React.ReactNode;
  onContextMenu: (e: React.MouseEvent) => void;
  selectedMessageIds: Set<number>;
  isSelectionToolbarVisible: boolean;
  onSelectAll: () => void;
  onExportFile: () => void;
  onExportPremiere?: () => void;
  onCancelSelection: () => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
  setIsForwardWindowOpen: (open: boolean) => void;
  isMessageFilterActive: boolean;
  currentMessageFilter: MessageDisplayFilterConfig | null;
  totalMessageCount: number;
  onOpenMessageFilter: () => void;
  galPatchProposalToolbar?: GalPatchProposalToolbarProps | null;
}

/**
 * 仅在列表仍停留底部时跟随新消息，避免用户刚开始上滑查看历史时被自动滚动拉回去。
 */
export function resolveChatFrameFollowOutput(isAtBottom: boolean): boolean {
  return isAtBottom;
}

/**
 * 以渲染判定线为准：选取最后一个“底部已经越过该线”的消息。
 * 如果当前还没有任何消息底部越过这条线，就回退到当前可见范围的起点。
 */
export function resolveChatFrameSeenIndexFromBounds(
  itemBounds: Array<{ bottom: number; index: number }>,
  lineBottom: number,
  fallbackIndex: number,
): number {
  const safeFallbackIndex = Number.isFinite(fallbackIndex)
    ? Math.max(0, Math.floor(fallbackIndex))
    : 0;
  if (!Number.isFinite(lineBottom) || itemBounds.length === 0) {
    return safeFallbackIndex;
  }

  let seenIndex = safeFallbackIndex;
  let hasAnyItem = false;
  for (const item of itemBounds) {
    if (!Number.isFinite(item.index) || !Number.isFinite(item.bottom)) {
      continue;
    }
    const itemIndex = Math.max(0, Math.floor(item.index));
    if (!hasAnyItem) {
      seenIndex = itemIndex;
      hasAnyItem = true;
    }
    if (item.bottom <= lineBottom + 0.5) {
      seenIndex = itemIndex;
    }
  }
  return seenIndex;
}

export function resolveChatFrameRenderLineBottom(scroller: HTMLElement): number {
  const composer = scroller
    .closest("[data-tc-doc-ref-drop-zone]")
    ?.querySelector<HTMLElement>(CHAT_COMPOSER_ROOT_SELECTOR)
    ?? document.querySelector<HTMLElement>(CHAT_COMPOSER_ROOT_SELECTOR);

  if (composer) {
    return composer.getBoundingClientRect().top;
  }
  return scroller.getBoundingClientRect().bottom;
}

export function resolveChatFrameInitialTopMostItemIndex(historyLength: number): FlatIndexLocationWithAlign | number {
  if (historyLength <= 0) {
    return 0;
  }
  return {
    align: "end",
    behavior: "auto",
    index: "LAST",
  };
}

export default function ChatFrameList({
  historyMessages,
  virtuosoRef,
  scrollerRef,
  isAtBottomRef,
  isAtTopRef,
  setCurrentVirtuosoIndex,
  onVisibleRangeChange,
  enableUnreadIndicator,
  unreadMessageNumber,
  scrollToBottom,
  updateLastReadSyncId,
  roomId,
  renderMessage,
  onContextMenu,
  selectedMessageIds,
  isSelectionToolbarVisible,
  onSelectAll,
  onExportFile,
  onExportPremiere,
  onCancelSelection,
  setIsExportImageWindowOpen,
  setIsForwardWindowOpen,
  isMessageFilterActive,
  currentMessageFilter,
  totalMessageCount,
  onOpenMessageFilter,
  galPatchProposalToolbar,
}: ChatFrameListProps) {
  const { handleDragOver, handleDrop } = useChatFrameListDragHandlers(roomId);
  const computeItemKey = useCallback((index: number, item: ChatMessageResponse) => getChatFrameItemKey(index, item), []);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [filterTransitionState, setFilterTransitionState] = useState<MessageFilterTransitionState>(null);
  const pendingAnchorSyncRef = useRef<number | null>(null);
  const previousFilterActiveRef = useRef(isMessageFilterActive);
  const filterTransitionKey = useMemo(() => {
    if (!isMessageFilterActive || !currentMessageFilter) {
      return "inactive";
    }
    return [
      currentMessageFilter.action,
      currentMessageFilter.filterOutOfCharacterSpeech ? "ooc" : "no-ooc",
      currentMessageFilter.filterStateMessages ? "state" : "no-state",
      historyMessages.length,
      totalMessageCount,
    ].join(":");
  }, [currentMessageFilter, historyMessages.length, isMessageFilterActive, totalMessageCount]);

  useEffect(() => {
    return () => {
      if (pendingAnchorSyncRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(pendingAnchorSyncRef.current);
      }
      pendingAnchorSyncRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wasActive = previousFilterActiveRef.current;
    previousFilterActiveRef.current = isMessageFilterActive;
    const switchedMode = wasActive !== isMessageFilterActive;
    const refreshedActiveFilter = isMessageFilterActive && filterTransitionKey !== "inactive";
    if (!switchedMode && !refreshedActiveFilter) {
      return;
    }

    setFilterTransitionState({
      key: `${filterTransitionKey}:${Date.now()}`,
      tone: isMessageFilterActive ? "active" : "inactive",
    });
  }, [filterTransitionKey, isMessageFilterActive]);

  const syncCurrentVirtuosoIndex = useCallback((fallbackIndex: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      setCurrentVirtuosoIndex(Math.max(0, Math.floor(fallbackIndex)));
      return;
    }

    if (pendingAnchorSyncRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(pendingAnchorSyncRef.current);
      pendingAnchorSyncRef.current = null;
    }

    const runSync = () => {
      pendingAnchorSyncRef.current = null;
      const itemList = scroller.querySelector<HTMLElement>("[data-testid=\"virtuoso-item-list\"]");
      const itemBounds = itemList
        ? Array.from(itemList.querySelectorAll<HTMLElement>("[data-index]")).map(item => ({
            index: Number(item.dataset.index),
            bottom: item.getBoundingClientRect().bottom,
          }))
        : [];
      const lineBottom = resolveChatFrameRenderLineBottom(scroller);
      setCurrentVirtuosoIndex(resolveChatFrameSeenIndexFromBounds(itemBounds, lineBottom, fallbackIndex));
    };

    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      runSync();
      return;
    }

    pendingAnchorSyncRef.current = window.requestAnimationFrame(runSync);
  }, [scrollerRef, setCurrentVirtuosoIndex]);

  return (
    <>
      <div
        className="overflow-hidden flex flex-col relative h-full"
        data-chat-frame-root="true"
        onContextMenu={onContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SelectionToolbar
          selectedCount={selectedMessageIds.size}
          totalCount={historyMessages.length}
          isVisible={isSelectionToolbarVisible}
          onCancel={onCancelSelection}
          onSelectAll={onSelectAll}
          onExportFile={onExportFile}
          onExportPremiere={onExportPremiere}
          onExportImage={() => setIsExportImageWindowOpen(true)}
          onForward={() => setIsForwardWindowOpen(true)}
        />
        <MessageFilterControl
          isActive={isMessageFilterActive}
          filterConfig={currentMessageFilter}
          visibleCount={historyMessages.length}
          totalCount={totalMessageCount}
          onOpen={onOpenMessageFilter}
        />
        <div className="relative h-full flex-1 overflow-hidden">
          <AnimatePresence>
            {filterTransitionState && (
              <motion.div
                key={filterTransitionState.key}
                className="
                  pointer-events-none absolute inset-x-0 top-0 z-20 h-full
                  overflow-hidden
                "
              >
                <motion.div
                  className={`
                    h-full w-2/3 blur-2xl
                    ${
                    filterTransitionState.tone === "active"
                      ? `
                        bg-linear-to-r from-transparent via-primary/18
                        to-transparent
                      `
                      : `
                        bg-linear-to-r from-transparent via-base-content/12
                        to-transparent
                      `
                  }
                  `}
                  onAnimationComplete={() => setFilterTransitionState(null)}
                  {...messageFilterToggleSweepMotionProps}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Virtuoso
            data={historyMessages}
            firstItemIndex={0}
            initialTopMostItemIndex={resolveChatFrameInitialTopMostItemIndex(historyMessages.length)}
            followOutput={resolveChatFrameFollowOutput}
            // 媒体消息（音频/视频）离开视区后若立即被回收，会导致播放状态丢失或重新加载。
            // 适当增加 overscan，减少短距离滚动造成的卸载重建。
            overscan={480}
            computeItemKey={computeItemKey}
            ref={virtuosoRef}
            scrollerRef={(ref) => {
              const previousScroller = scrollerRef.current;
              if (previousScroller && previousScroller !== ref) {
                delete previousScroller.dataset.chatFrameScroller;
              }
              if (ref instanceof HTMLElement) {
                ref.dataset.chatFrameScroller = "true";
                scrollerRef.current = ref;
                return;
              }
              scrollerRef.current = null;
            }}
            context={{
              isAtTopRef,
            }}
            rangeChanged={({ startIndex, endIndex }) => {
              syncCurrentVirtuosoIndex(startIndex);
              onVisibleRangeChange?.({ startIndex, endIndex });
            }}
            itemContent={(index, chatMessageResponse) => renderMessage(index, chatMessageResponse)}
            atBottomStateChange={(atBottom) => {
              if (enableUnreadIndicator) {
                if (atBottom) {
                  updateLastReadSyncId(roomId);
                }
              }
              isAtBottomRef.current = atBottom;
              setIsAtBottom(atBottom);
            }}
            atTopStateChange={(atTop) => {
              isAtTopRef.current = atTop;
            }}
            components={{
              Header,
            }}
            atTopThreshold={1200}
            atBottomThreshold={200}
          />
        </div>
        <UnreadIndicator
          enabled={enableUnreadIndicator}
          unreadMessageNumber={unreadMessageNumber}
          historyLength={historyMessages.length}
          isAtBottom={isAtBottom}
          onScrollToBottom={scrollToBottom}
        />
        {galPatchProposalToolbar && (
          <GalPatchProposalToolbar {...galPatchProposalToolbar} />
        )}
      </div>
    </>
  );
}
