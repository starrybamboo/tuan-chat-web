import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageResponse } from "../../../api";
import React, { memo, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";

function Header() {
  return (
    <div className="py-2">
      <div className="divider text-xs text-base-content/50 m-0">到顶</div>
    </div>
  );
}

interface SelectionToolbarProps {
  selectedCount: number;
  isSpaceOwner: boolean;
  onCancel: () => void;
  onExportImage: () => void;
  onForward: () => void;
  onBatchDelete: () => void;
}

const SelectionToolbar = memo(({
  selectedCount,
  isSpaceOwner,
  onCancel,
  onExportImage,
  onForward,
  onBatchDelete,
}: SelectionToolbarProps) => {
  if (selectedCount <= 0)
    return null;

  return (
    <div className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-15 flex justify-between items-center rounded">
      <span>{`已选择${selectedCount} 条消息`}</span>
      <div className="gap-x-4 flex">
        <button className="btn btn-sm" onClick={onCancel} type="button">
          取消
        </button>
        <button className="btn btn-sm btn-secondary" onClick={onExportImage} type="button">
          生成图片
        </button>
        <button className="btn btn-sm btn-info" onClick={onForward} type="button">
          转发
        </button>
        {isSpaceOwner && (
          <button className="btn btn-sm btn-error" onClick={onBatchDelete} type="button">
            删除
          </button>
        )}
      </div>
    </div>
  );
});

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
  if (!enabled || unreadMessageNumber <= 0 || historyLength <= 2 || isAtBottom)
    return null;

  return (
    <div className="absolute bottom-4 self-end z-50 cursor-pointer" onClick={onScrollToBottom}>
      <div className="btn btn-info gap-2 shadow-lg">
        <span>{unreadMessageNumber}</span>
        <span>条新消息</span>
      </div>
    </div>
  );
});

interface DragHandlers {
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

function useChatFrameListDragHandlers(): DragHandlers {
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
    addDroppedFilesToComposer(event.dataTransfer);
  }, []);

  return { handleDragOver, handleDrop };
}

interface ChatFrameListProps {
  historyMessages: ChatMessageResponse[];
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  scrollerRef: React.MutableRefObject<HTMLElement | null>;
  isAtBottomRef: React.MutableRefObject<boolean>;
  isAtTopRef: React.MutableRefObject<boolean>;
  setCurrentVirtuosoIndex: (index: number) => void;
  enableUnreadIndicator: boolean;
  unreadMessageNumber: number;
  scrollToBottom: () => void;
  updateLastReadSyncId: (roomId: number) => void;
  roomId: number;
  renderMessage: (index: number, message: ChatMessageResponse) => React.ReactNode;
  onContextMenu: (e: React.MouseEvent) => void;
  selectedMessageIds: Set<number>;
  updateSelectedMessageIds: (next: Set<number>) => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
  setIsForwardWindowOpen: (open: boolean) => void;
  handleBatchDelete: () => void;
  isSpaceOwner: boolean;
}

export default function ChatFrameList({
  historyMessages,
  virtuosoRef,
  scrollerRef,
  isAtBottomRef,
  isAtTopRef,
  setCurrentVirtuosoIndex,
  enableUnreadIndicator,
  unreadMessageNumber,
  scrollToBottom,
  updateLastReadSyncId,
  roomId,
  renderMessage,
  onContextMenu,
  selectedMessageIds,
  updateSelectedMessageIds,
  setIsExportImageWindowOpen,
  setIsForwardWindowOpen,
  handleBatchDelete,
  isSpaceOwner,
}: ChatFrameListProps) {
  const { handleDragOver, handleDrop } = useChatFrameListDragHandlers();

  return (
    <>
      <div
        className="overflow-y-auto flex flex-col relative h-full"
        onContextMenu={onContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SelectionToolbar
          selectedCount={selectedMessageIds.size}
          isSpaceOwner={isSpaceOwner}
          onCancel={() => updateSelectedMessageIds(new Set())}
          onExportImage={() => setIsExportImageWindowOpen(true)}
          onForward={() => setIsForwardWindowOpen(true)}
          onBatchDelete={handleBatchDelete}
        />
        <div className="h-full flex-1">
          <Virtuoso
            data={historyMessages}
            firstItemIndex={0}
            initialTopMostItemIndex={historyMessages.length - 1}
            followOutput={true}
            overscan={10}
            ref={virtuosoRef}
            scrollerRef={(ref) => {
              scrollerRef.current = ref instanceof HTMLElement ? ref : null;
            }}
            context={{
              isAtTopRef,
            }}
            rangeChanged={({ endIndex }) => {
              setCurrentVirtuosoIndex(endIndex);
            }}
            itemContent={(index, chatMessageResponse) => renderMessage(index, chatMessageResponse)}
            atBottomStateChange={(atBottom) => {
              if (enableUnreadIndicator) {
                atBottom && updateLastReadSyncId(roomId);
              }
              isAtBottomRef.current = atBottom;
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
          isAtBottom={isAtBottomRef.current}
          onScrollToBottom={scrollToBottom}
        />
      </div>
    </>
  );
}
