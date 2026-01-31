import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageResponse } from "../../../api";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import React from "react";
import { Virtuoso } from "react-virtuoso";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";

function Header() {
  return (
    <div className="py-2">
      <div className="divider text-xs text-base-content/50 m-0">到顶</div>
    </div>
  );
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
  isDocRefDragOver: boolean;
  updateDocRefDragOver: (next: boolean) => void;
  onSendDocCardFromDrop: (payload: DocRefDragPayload) => Promise<void> | void;
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
  isDocRefDragOver,
  updateDocRefDragOver,
  onSendDocCardFromDrop,
}: ChatFrameListProps) {
  return (
    <>
      {isDocRefDragOver && (
        <div className="pointer-events-none absolute inset-2 z-30 rounded-md border-2 border-primary/60 bg-primary/5 flex items-center justify-center">
          <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-sm font-medium text-primary shadow-sm">
            松开发送文档卡片
          </div>
        </div>
      )}
      <div
        className="overflow-y-auto flex flex-col relative h-full"
        onContextMenu={onContextMenu}
        onDragOver={(e) => {
          if (isDocRefDrag(e.dataTransfer)) {
            updateDocRefDragOver(true);
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            return;
          }
          updateDocRefDragOver(false);
          if (isFileDrag(e.dataTransfer)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDragLeave={() => {
          updateDocRefDragOver(false);
        }}
        onDrop={(e) => {
          updateDocRefDragOver(false);
          const docRef = getDocRefDragData(e.dataTransfer);
          if (docRef) {
            e.preventDefault();
            e.stopPropagation();
            void onSendDocCardFromDrop(docRef);
            return;
          }

          if (!isFileDrag(e.dataTransfer))
            return;
          e.preventDefault();
          e.stopPropagation();
          addDroppedFilesToComposer(e.dataTransfer);
        }}
      >
        {selectedMessageIds.size > 0 && (
          <div className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-15 flex justify-between items-center rounded">
            <span>{`已选择${selectedMessageIds.size} 条消息`}</span>
            <div className="gap-x-4 flex">
              <button
                className="btn btn-sm"
                onClick={() => updateSelectedMessageIds(new Set())}
                type="button"
              >
                取消
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setIsExportImageWindowOpen(true)}
                type="button"
              >
                生成图片
              </button>
              <button
                className="btn btn-sm btn-info"
                onClick={() => setIsForwardWindowOpen(true)}
                type="button"
              >
                转发
              </button>
              {isSpaceOwner && (
                <button
                  className="btn btn-sm btn-error"
                  onClick={() => handleBatchDelete()}
                  type="button"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        )}
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
        {(enableUnreadIndicator && unreadMessageNumber > 0 && historyMessages.length > 2 && !isAtBottomRef.current) && (
          <div
            className="absolute bottom-4 self-end z-50 cursor-pointer"
            onClick={() => {
              scrollToBottom();
            }}
          >
            <div className="btn btn-info gap-2 shadow-lg">
              <span>{unreadMessageNumber}</span>
              <span>条新消息</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
