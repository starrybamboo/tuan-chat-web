import type { MessageEditorSelection } from "./messageEditorSelection";

export type MessageEditorPointerSelectionPosition = {
  x: number;
  y: number;
}

export type MessageEditorPointerSelectionSessionState = {
  position: MessageEditorPointerSelectionPosition;
  selection: MessageEditorSelection;
}

export function resolveMessageEditorPointerAutoScrollDelta(params: {
  clientY: number;
  edgeSize?: number;
  maxDelta?: number;
  viewportBottom: number;
  viewportTop: number;
}) {
  const viewportHeight = params.viewportBottom - params.viewportTop;
  if (viewportHeight <= 0) {
    return 0;
  }

  const edgeSize = Math.max(1, Math.min(params.edgeSize ?? 72, viewportHeight / 2));
  const maxDelta = Math.max(1, params.maxDelta ?? 28);
  const topDistance = params.clientY - params.viewportTop;
  if (topDistance < edgeSize) {
    const intensity = Math.min(1, Math.max(0, (edgeSize - topDistance) / edgeSize));
    return -Math.ceil(intensity * maxDelta);
  }

  const bottomDistance = params.viewportBottom - params.clientY;
  if (bottomDistance < edgeSize) {
    const intensity = Math.min(1, Math.max(0, (edgeSize - bottomDistance) / edgeSize));
    return Math.ceil(intensity * maxDelta);
  }

  return 0;
}

/**
 * 管理一次拖拽生成跨块选区的 DOM 会话。
 *
 * 该类只持有 pointer lifecycle、mousemove/mouseup listener 和 auto-scroll 私有状态；
 * React state 提交仍通过 events 回到 MessageEditor orchestrator。
 */
export class MessageEditorPointerSelectionSession {
  private autoScrollFrame: number | null = null;
  private currentState: MessageEditorPointerSelectionSessionState | null = null;
  private didDrag = false;
  private disposed = false;
  private lastPointerPosition: MessageEditorPointerSelectionPosition;
  private readonly ownerWindow: Window;
  private started = false;

  constructor(private readonly options: {
    dragThreshold?: number;
    events: {
      onCancel: () => void;
      onClick: () => void;
      onCommit: (state: MessageEditorPointerSelectionSessionState) => void;
      onFinish: () => void;
      onPreview: (state: MessageEditorPointerSelectionSessionState | null) => void;
    };
    resolveSelectionState: (
      clientX: number,
      clientY: number,
    ) => MessageEditorPointerSelectionSessionState | null | undefined;
    root: HTMLElement;
    startPosition: MessageEditorPointerSelectionPosition;
  }) {
    this.lastPointerPosition = options.startPosition;
    this.ownerWindow = options.root.ownerDocument.defaultView ?? window;
  }

  start() {
    if (this.disposed || this.started) {
      return;
    }

    this.started = true;
    const documentRef = this.options.root.ownerDocument;
    documentRef.addEventListener("mousemove", this.handleDocumentMouseMove);
    documentRef.addEventListener("mouseup", this.handleDocumentMouseUp, { once: true });
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.stopAutoScroll();
    const documentRef = this.options.root.ownerDocument;
    documentRef.removeEventListener("mousemove", this.handleDocumentMouseMove);
    documentRef.removeEventListener("mouseup", this.handleDocumentMouseUp);
    this.options.events.onFinish();
  }

  private readonly handleDocumentMouseMove = (event: MouseEvent) => {
    if ((event.buttons & 1) === 0) {
      return;
    }

    this.lastPointerPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    if (!this.didDrag) {
      const threshold = this.options.dragThreshold ?? 3;
      this.didDrag = Math.abs(event.clientX - this.options.startPosition.x) > threshold
        || Math.abs(event.clientY - this.options.startPosition.y) > threshold;
    }
    if (!this.didDrag) {
      return;
    }

    this.updatePointerSelection(event.clientX, event.clientY);
    this.scheduleAutoScroll();
  };

  private readonly handleDocumentMouseUp = () => {
    const nextState = this.currentState;
    const shouldClick = !this.didDrag;
    this.dispose();

    if (nextState) {
      this.options.events.onCommit(nextState);
      return;
    }
    if (shouldClick) {
      this.options.events.onClick();
      return;
    }
    this.options.events.onCancel();
  };

  private scheduleAutoScroll() {
    if (this.autoScrollFrame != null) {
      return;
    }
    this.autoScrollFrame = this.ownerWindow.requestAnimationFrame(this.tickAutoScroll);
  }

  private stopAutoScroll() {
    if (this.autoScrollFrame == null) {
      return;
    }
    this.ownerWindow.cancelAnimationFrame(this.autoScrollFrame);
    this.autoScrollFrame = null;
  }

  private readonly tickAutoScroll = () => {
    this.autoScrollFrame = null;
    if (!this.didDrag) {
      return;
    }

    const root = this.options.root;
    const viewport = root.getBoundingClientRect();
    const delta = resolveMessageEditorPointerAutoScrollDelta({
      clientY: this.lastPointerPosition.y,
      viewportBottom: viewport.bottom,
      viewportTop: viewport.top,
    });
    if (delta === 0) {
      return;
    }

    const previousScrollTop = root.scrollTop;
    const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
    root.scrollTop = Math.max(0, Math.min(previousScrollTop + delta, maxScrollTop));
    if (root.scrollTop !== previousScrollTop) {
      this.updatePointerSelection(this.lastPointerPosition.x, this.lastPointerPosition.y);
    }
    this.autoScrollFrame = this.ownerWindow.requestAnimationFrame(this.tickAutoScroll);
  };

  private updatePointerSelection(clientX: number, clientY: number) {
    const nextState = this.options.resolveSelectionState(clientX, clientY);
    if (nextState === undefined) {
      return;
    }

    this.currentState = nextState;
    this.options.events.onPreview(nextState);
  }
}
