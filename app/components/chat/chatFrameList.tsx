import type { FlatIndexLocationWithAlign, VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageResponse } from "../../../api";
import { Check, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { scrollToBottomButtonMotionProps, unreadBadgeBounceMotionProps } from "@/components/common/motion/chatMessageMotion";
import { getChatFrameItemKey } from "./chatFrameListKey";

function Header() {
  return (
    <div className="py-2">
      <div className="divider text-xs text-base-content/50 m-0">到顶</div>
    </div>
  );
}

/** 多选模式下仅允许对单条已选消息进入回复态。 */
export function canReplyToSelection(selectedCount: number): boolean {
  return selectedCount === 1;
}

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  isSelecting: boolean;
  isSpaceOwner: boolean;
  onCancel: () => void;
  onReply: () => void;
  onSelectAll: () => void;
  onRegexFilter: () => void;
  onExportFile: () => void;
  onExportPremiere?: () => void;
  onExportImage: () => void;
  onForward: () => void;
  onBatchDelete: () => void;
}

const SelectionToolbar = memo(({
  selectedCount,
  totalCount,
  isSelecting,
  isSpaceOwner,
  onCancel,
  onReply,
  onSelectAll,
  onRegexFilter,
  onExportFile,
  onExportPremiere,
  onExportImage,
  onForward,
  onBatchDelete,
}: SelectionToolbarProps) => {
  if (!isSelecting)
    return null;
  const hasSelection = selectedCount > 0;
  const canReply = canReplyToSelection(selectedCount);
  const canSelectAll = totalCount > 0;

  return (
    <div className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-15 flex justify-between items-center rounded">
      <span>{`已选择${selectedCount} 条消息`}</span>
      <div className="gap-2 flex flex-wrap justify-end">
        <button className="btn btn-sm btn-primary" onClick={onReply} type="button" disabled={!canReply}>
          回复
        </button>
        <button className="btn btn-sm" onClick={onSelectAll} type="button" disabled={!canSelectAll}>
          全选
        </button>
        <button className="btn btn-sm" onClick={onRegexFilter} type="button" disabled={!canSelectAll}>
          筛选
        </button>
        <button className="btn btn-sm" onClick={onCancel} type="button">
          取消
        </button>
        <button className="btn btn-sm btn-accent" onClick={onExportFile} type="button" disabled={!hasSelection}>
          导出成文件
        </button>
        {onExportPremiere && (
          <button className="btn btn-sm btn-accent" onClick={onExportPremiere} type="button" disabled={!hasSelection}>
            生成 PR 文件
          </button>
        )}
        <button className="btn btn-sm btn-secondary" onClick={onExportImage} type="button" disabled={!hasSelection}>
          生成图片
        </button>
        <button className="btn btn-sm btn-info" onClick={onForward} type="button" disabled={!hasSelection}>
          转发
        </button>
        {isSpaceOwner && (
          <button className="btn btn-sm btn-error" onClick={onBatchDelete} type="button" disabled={!hasSelection}>
            删除
          </button>
        )}
      </div>
    </div>
  );
});

const CHAT_COMPOSER_ROOT_SELECTOR = "[data-chat-composer-root=\"true\"]";

interface UnreadIndicatorProps {
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
          className="absolute bottom-4 right-4 z-50 cursor-pointer rounded-full bg-base-100/75 backdrop-blur-md px-3 py-1.5 text-xs shadow-sm"
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

interface GalPatchProposalToolbarProps {
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
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-lg border border-base-300/70 bg-base-100/90 px-3 py-2 text-sm text-base-content shadow-lg backdrop-blur-md">
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
            {isApplying ? <span className="loading loading-spinner loading-xs" /> : <Check className="size-4" />}
            {hasLineSelection && selectedMessageCount !== totalMessageCount ? "应用已选" : "应用"}
          </button>
        </div>
      </div>
    </div>
  );
});

interface DragHandlers {
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

interface ChatFrameListProps {
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
  isSelecting: boolean;
  onReplySelection: () => void;
  onSelectAll: () => void;
  onRegexFilter: () => void;
  onExportFile: () => void;
  onExportPremiere?: () => void;
  onCancelSelection: () => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
  setIsForwardWindowOpen: (open: boolean) => void;
  handleBatchDelete: () => void;
  isSpaceOwner: boolean;
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
  isSelecting,
  onReplySelection,
  onSelectAll,
  onRegexFilter,
  onExportFile,
  onExportPremiere,
  onCancelSelection,
  setIsExportImageWindowOpen,
  setIsForwardWindowOpen,
  handleBatchDelete,
  isSpaceOwner,
  galPatchProposalToolbar,
}: ChatFrameListProps) {
  const { handleDragOver, handleDrop } = useChatFrameListDragHandlers(roomId);
  const computeItemKey = useCallback((index: number, item: ChatMessageResponse) => getChatFrameItemKey(index, item), []);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pendingAnchorSyncRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pendingAnchorSyncRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(pendingAnchorSyncRef.current);
      }
      pendingAnchorSyncRef.current = null;
    };
  }, []);

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
        onContextMenu={onContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SelectionToolbar
          selectedCount={selectedMessageIds.size}
          totalCount={historyMessages.length}
          isSelecting={isSelecting}
          isSpaceOwner={isSpaceOwner}
          onCancel={onCancelSelection}
          onReply={onReplySelection}
          onSelectAll={onSelectAll}
          onRegexFilter={onRegexFilter}
          onExportFile={onExportFile}
          onExportPremiere={onExportPremiere}
          onExportImage={() => setIsExportImageWindowOpen(true)}
          onForward={() => setIsForwardWindowOpen(true)}
          onBatchDelete={handleBatchDelete}
        />
        <div className="h-full flex-1">
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
              scrollerRef.current = ref instanceof HTMLElement ? ref : null;
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
