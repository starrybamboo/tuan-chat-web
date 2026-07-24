import type {
  CompositionEventHandler,
  DragEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";
import type { FlatScrollIntoViewLocation, ListRange, VirtuosoHandle } from "react-virtuoso";

import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Virtuoso } from "react-virtuoso";

import type { MessageEditorVirtualBlock } from "./messageEditorVirtualizationPolicy";

import {
  MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX,
  MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT,
  MESSAGE_EDITOR_VIRTUALIZATION_OVERSCAN_PX,
  MESSAGE_EDITOR_VIRTUALIZATION_VIEWPORT_INCREASE_PX,
  normalizeMessageEditorVirtualBlockHeight,
  resolveMessageEditorVirtualAnchorBlockId,
} from "./messageEditorVirtualizationPolicy";

export type MessageEditorVirtualizedBlockListHandle = {
  getVisibleRange: () => ListRange | null;
  isBlockRendered: (blockId: string) => boolean;
  scrollBlockIntoView: (
    blockId: string,
    options?: Pick<FlatScrollIntoViewLocation, "align" | "behavior">,
  ) => boolean;
  scrollBy: (top: number) => void;
};

type MessageEditorVirtualizedBlockListProps<TBlock extends MessageEditorVirtualBlock> = {
  blocks: TBlock[];
  className: string;
  emptyPlaceholder?: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  onCompositionEndCapture?: CompositionEventHandler<HTMLDivElement>;
  onCompositionStartCapture?: CompositionEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onKeyDownCapture?: KeyboardEventHandler<HTMLDivElement>;
  onMouseDownCapture?: MouseEventHandler<HTMLDivElement>;
  onSurfaceMouseDown?: MouseEventHandler<HTMLDivElement>;
  onVisibleRangeChange?: (range: ListRange) => void;
  registerBlockSlotRef: (blockId: string, node: HTMLDivElement | null) => void;
  registerScrollRoot: (node: HTMLDivElement | null) => void;
  renderBlock: (block: TBlock, index: number) => ReactNode;
};

type MessageEditorVirtualizedBlockListContext = {
  emptyPlaceholder?: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
};

type MessageEditorViewportAnchor = {
  blockId: string;
  topOffset: number;
};

const MESSAGE_EDITOR_VIRTUOSO_COMPONENTS = {
  EmptyPlaceholder({ context }: { context: MessageEditorVirtualizedBlockListContext }) {
    return context.emptyPlaceholder ?? null;
  },
  Footer({ context }: { context: MessageEditorVirtualizedBlockListContext }) {
    return context.footer ?? null;
  },
  Header({ context }: { context: MessageEditorVirtualizedBlockListContext }) {
    return context.header ?? null;
  },
};

export function getMessageEditorVirtualBlockKey(
  index: number,
  block: MessageEditorVirtualBlock | undefined,
) {
  return block?.blockId ?? `missing-block-${index}`;
}

const MessageEditorVirtualizedBlockSlot = memo(function MessageEditorVirtualizedBlockSlot({
  blockId,
  children,
  onMouseDown,
  registerBlockSlotRef,
}: {
  blockId: string;
  children: ReactNode;
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  registerBlockSlotRef: (blockId: string, node: HTMLDivElement | null) => void;
}) {
  const setSlotRef = useCallback((node: HTMLDivElement | null) => {
    registerBlockSlotRef(blockId, node);
  }, [blockId, registerBlockSlotRef]);

  return (
    <div
      ref={setSlotRef}
      data-me-block-hit={blockId}
      data-me-editor-surface="true"
      data-me-virtual-block-id={blockId}
      data-me-virtualization-mounted="true"
      className="flow-root w-full"
      style={{ overflowAnchor: "none" }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
});

function didMessageEditorVirtualBlockOrderChange(
  previousBlockIds: readonly string[],
  nextBlockIds: readonly string[],
) {
  const sharedLength = Math.min(previousBlockIds.length, nextBlockIds.length);
  return previousBlockIds.slice(0, sharedLength).some((blockId, index) => blockId !== nextBlockIds[index]);
}

/**
 * MessageEditor 专用 Virtuoso 适配层。业务交互仍由 orchestrator 显式传入，
 * 这里只管理连续视口窗口、DOM 注册和结构变更时的滚动锚点。
 */
function MessageEditorVirtualizedBlockListComponent<TBlock extends MessageEditorVirtualBlock>({
  blocks,
  className,
  emptyPlaceholder,
  footer,
  header,
  onCompositionEndCapture,
  onCompositionStartCapture,
  onDragOver,
  onDrop,
  onKeyDownCapture,
  onMouseDownCapture,
  onSurfaceMouseDown,
  onVisibleRangeChange,
  registerBlockSlotRef,
  registerScrollRoot,
  renderBlock,
}: MessageEditorVirtualizedBlockListProps<TBlock>, forwardedRef: React.ForwardedRef<MessageEditorVirtualizedBlockListHandle>) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const blockSlotNodesRef = useRef(new Map<string, HTMLDivElement>());
  const visibleRangeRef = useRef<ListRange | null>(null);
  const latestAnchorRef = useRef<MessageEditorViewportAnchor | null>(null);
  const pendingAnchorRef = useRef<MessageEditorViewportAnchor | null>(null);
  const previousBlockIdsRef = useRef<string[]>([]);
  const anchorFrameRef = useRef<number | null>(null);
  const anchorWorkRef = useRef<(() => void) | null>(null);

  const blockIndexById = useMemo(() => {
    return new Map(blocks.map((block, index) => [block.blockId, index] as const));
  }, [blocks]);
  const heightEstimates = useMemo(() => {
    return blocks.map(block => normalizeMessageEditorVirtualBlockHeight(block.estimatedHeight));
  }, [blocks]);
  const context = useMemo<MessageEditorVirtualizedBlockListContext>(() => ({
    emptyPlaceholder,
    footer,
    header,
  }), [emptyPlaceholder, footer, header]);

  const updateMountedBlockCount = useCallback(() => {
    scrollerRef.current?.setAttribute(
      "data-me-mounted-block-count",
      String(blockSlotNodesRef.current.size),
    );
  }, []);

  const captureViewportAnchor = useCallback(() => {
    if (pendingAnchorRef.current) {
      return;
    }
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollTop <= 1) {
      latestAnchorRef.current = null;
      return;
    }

    const viewportTop = scroller.getBoundingClientRect().top;
    let firstVisible: { blockId: string; top: number } | null = null;
    for (const [blockId, node] of blockSlotNodesRef.current) {
      const rect = node.getBoundingClientRect();
      if (rect.bottom <= viewportTop) {
        continue;
      }
      if (!firstVisible || rect.top < firstVisible.top) {
        firstVisible = { blockId, top: rect.top };
      }
    }

    latestAnchorRef.current = firstVisible
      ? {
          blockId: firstVisible.blockId,
          topOffset: firstVisible.top - viewportTop,
        }
      : null;
  }, []);

  const finishPendingAnchorRestore = useCallback(() => {
    const pending = pendingAnchorRef.current;
    const scroller = scrollerRef.current;
    const node = pending ? blockSlotNodesRef.current.get(pending.blockId) : null;
    if (!pending || !scroller || !node) {
      return;
    }

    const currentTopOffset = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    const delta = currentTopOffset - pending.topOffset;
    pendingAnchorRef.current = null;
    if (Math.abs(delta) >= 0.5) {
      virtuosoRef.current?.scrollBy({ behavior: "auto", top: delta });
    }
    latestAnchorRef.current = pending;
  }, []);

  const scheduleAnchorWork = useCallback((work: () => void) => {
    const view = scrollerRef.current?.ownerDocument.defaultView;
    if (!view) {
      return;
    }
    anchorWorkRef.current = work;
    if (anchorFrameRef.current != null) {
      return;
    }
    anchorFrameRef.current = view.requestAnimationFrame(() => {
      anchorFrameRef.current = null;
      const pendingWork = anchorWorkRef.current;
      anchorWorkRef.current = null;
      pendingWork?.();
    });
  }, []);

  const scheduleAnchorCapture = useCallback(() => {
    scheduleAnchorWork(captureViewportAnchor);
  }, [captureViewportAnchor, scheduleAnchorWork]);

  const scheduleAnchorRestore = useCallback(() => {
    scheduleAnchorWork(finishPendingAnchorRestore);
  }, [finishPendingAnchorRestore, scheduleAnchorWork]);

  const setBlockSlotRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockSlotNodesRef.current.set(blockId, node);
    }
    else {
      blockSlotNodesRef.current.delete(blockId);
    }
    registerBlockSlotRef(blockId, node);
    updateMountedBlockCount();
    if (node && pendingAnchorRef.current?.blockId === blockId) {
      scheduleAnchorRestore();
    }
  }, [registerBlockSlotRef, scheduleAnchorRestore, updateMountedBlockCount]);

  const setScrollerRef = useCallback((node: HTMLElement | Window | null) => {
    const previousScroller = scrollerRef.current;
    if (previousScroller) {
      previousScroller.removeEventListener("scroll", scheduleAnchorCapture);
    }
    const nextScroller = node instanceof HTMLElement ? node as HTMLDivElement : null;
    scrollerRef.current = nextScroller;
    registerScrollRoot(nextScroller);
    if (nextScroller) {
      nextScroller.addEventListener("scroll", scheduleAnchorCapture, { passive: true });
      updateMountedBlockCount();
    }
  }, [registerScrollRoot, scheduleAnchorCapture, updateMountedBlockCount]);

  const scrollBlockIntoView = useCallback<MessageEditorVirtualizedBlockListHandle["scrollBlockIntoView"]>((blockId, options = {}) => {
    const index = blockIndexById.get(blockId);
    if (index == null) {
      return false;
    }
    virtuosoRef.current?.scrollIntoView({
      index,
      ...options,
    });
    return true;
  }, [blockIndexById]);

  useImperativeHandle(forwardedRef, () => ({
    getVisibleRange: () => visibleRangeRef.current,
    isBlockRendered: blockId => blockSlotNodesRef.current.has(blockId),
    scrollBlockIntoView,
    scrollBy(top) {
      virtuosoRef.current?.scrollBy({ behavior: "auto", top });
    },
  }), [scrollBlockIntoView]);

  useLayoutEffect(() => {
    const previousBlockIds = previousBlockIdsRef.current;
    const nextBlockIds = blocks.map(block => block.blockId);
    previousBlockIdsRef.current = nextBlockIds;
    if (
      previousBlockIds.length === 0
      || !didMessageEditorVirtualBlockOrderChange(previousBlockIds, nextBlockIds)
      || scrollerRef.current?.scrollTop === 0
    ) {
      return;
    }

    const capturedAnchor = latestAnchorRef.current;
    const anchorBlockId = capturedAnchor && resolveMessageEditorVirtualAnchorBlockId({
      anchorBlockId: capturedAnchor.blockId,
      nextBlockIndexById: blockIndexById,
      previousBlockIds,
    });
    const anchorIndex = anchorBlockId ? blockIndexById.get(anchorBlockId) : undefined;
    if (!capturedAnchor || !anchorBlockId || anchorIndex == null) {
      return;
    }

    pendingAnchorRef.current = {
      blockId: anchorBlockId,
      topOffset: capturedAnchor.topOffset,
    };
    // 已挂载的锚点可直接按偏移补偿。先跳到块顶再恢复会在保存回写时造成可见闪烁。
    if (!blockSlotNodesRef.current.has(anchorBlockId)) {
      virtuosoRef.current?.scrollToIndex({
        align: "start",
        behavior: "auto",
        index: anchorIndex,
      });
    }
    scheduleAnchorRestore();
  }, [blockIndexById, blocks, scheduleAnchorRestore]);

  useLayoutEffect(() => {
    return () => {
      const view = scrollerRef.current?.ownerDocument.defaultView;
      if (view && anchorFrameRef.current != null) {
        view.cancelAnimationFrame(anchorFrameRef.current);
      }
      anchorWorkRef.current = null;
      scrollerRef.current?.removeEventListener("scroll", scheduleAnchorCapture);
      registerScrollRoot(null);
    };
  }, [registerScrollRoot, scheduleAnchorCapture]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      className={className}
      data={blocks}
      data-me-mounted-block-count={Math.min(blocks.length, MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT)}
      data-me-virtualization-enabled="true"
      data-me-virtualized-block-list="true"
      defaultItemHeight={MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX}
      heightEstimates={heightEstimates}
      initialItemCount={Math.min(blocks.length, MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT)}
      increaseViewportBy={MESSAGE_EDITOR_VIRTUALIZATION_VIEWPORT_INCREASE_PX}
      overscan={MESSAGE_EDITOR_VIRTUALIZATION_OVERSCAN_PX}
      components={MESSAGE_EDITOR_VIRTUOSO_COMPONENTS}
      computeItemKey={(index, block) => getMessageEditorVirtualBlockKey(index, block)}
      context={context}
      itemContent={(index, block) => {
        // Virtuoso can briefly retain a stale index while its data window is resetting.
        if (!block) {
          return null;
        }
        return (
          <MessageEditorVirtualizedBlockSlot
            blockId={block.blockId}
            onMouseDown={onSurfaceMouseDown}
            registerBlockSlotRef={setBlockSlotRef}
          >
            {renderBlock(block, index)}
          </MessageEditorVirtualizedBlockSlot>
        );
      }}
      rangeChanged={(range) => {
        visibleRangeRef.current = range;
        onVisibleRangeChange?.(range);
        if (pendingAnchorRef.current) {
          scheduleAnchorRestore();
        }
        else {
          scheduleAnchorCapture();
        }
      }}
      scrollerRef={setScrollerRef}
      onCompositionEndCapture={onCompositionEndCapture}
      onCompositionStartCapture={onCompositionStartCapture}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDownCapture={onKeyDownCapture}
      onMouseDownCapture={onMouseDownCapture}
    />
  );
}

export const MessageEditorVirtualizedBlockList = forwardRef(
  MessageEditorVirtualizedBlockListComponent,
) as <TBlock extends MessageEditorVirtualBlock>(
  props: MessageEditorVirtualizedBlockListProps<TBlock> & React.RefAttributes<MessageEditorVirtualizedBlockListHandle>,
) => React.ReactElement;
