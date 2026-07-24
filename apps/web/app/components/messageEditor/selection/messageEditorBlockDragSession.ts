import { resolveMessageEditorPointerAutoScrollDelta } from "./messageEditorPointerSelectionSession";

export type MessageEditorBlockDragPosition = {
  x: number;
  y: number;
};

type MessageEditorBlockDragSessionOptions = {
  edgeSize?: number;
  maxDelta?: number;
  onAutoScroll: (position: MessageEditorBlockDragPosition, eventTarget: Element | null) => void;
  onFinish: () => void;
  root: HTMLElement;
  scrollBy: (top: number) => void;
};

/** Owns one block-drag auto-scroll loop and its global finish listeners. */
export class MessageEditorBlockDragSession {
  private autoScrollDelta = 0;
  private autoScrollFrame: number | null = null;
  private disposed = false;
  private lastPointerPosition: MessageEditorBlockDragPosition = { x: 0, y: 0 };
  private readonly ownerWindow: Window;
  private started = false;

  constructor(private readonly options: MessageEditorBlockDragSessionOptions) {
    this.ownerWindow = options.root.ownerDocument.defaultView ?? window;
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stopAutoScroll();
    this.ownerWindow.removeEventListener("dragend", this.handleWindowFinish);
    this.ownerWindow.removeEventListener("drop", this.handleWindowFinish);
  }

  start() {
    if (this.disposed || this.started) {
      return;
    }
    this.started = true;
    this.ownerWindow.addEventListener("dragend", this.handleWindowFinish);
    this.ownerWindow.addEventListener("drop", this.handleWindowFinish);
  }

  updatePointer(clientX: number, clientY: number) {
    if (this.disposed) {
      return;
    }

    const bounds = this.options.root.getBoundingClientRect();
    this.lastPointerPosition = { x: clientX, y: clientY };
    this.autoScrollDelta = resolveMessageEditorPointerAutoScrollDelta({
      clientY,
      edgeSize: this.options.edgeSize,
      maxDelta: this.options.maxDelta,
      viewportBottom: bounds.bottom,
      viewportTop: bounds.top,
    });
    if (this.autoScrollDelta === 0) {
      this.stopAutoScroll();
      return;
    }
    this.scheduleAutoScroll();
  }

  private readonly handleWindowFinish = () => {
    this.dispose();
    this.options.onFinish();
  };

  private scheduleAutoScroll() {
    if (this.autoScrollFrame != null) {
      return;
    }
    this.autoScrollFrame = this.ownerWindow.requestAnimationFrame(this.tickAutoScroll);
  }

  private stopAutoScroll() {
    this.autoScrollDelta = 0;
    if (this.autoScrollFrame == null) {
      return;
    }
    this.ownerWindow.cancelAnimationFrame(this.autoScrollFrame);
    this.autoScrollFrame = null;
  }

  private readonly tickAutoScroll = () => {
    this.autoScrollFrame = null;
    if (this.disposed || this.autoScrollDelta === 0) {
      return;
    }

    this.options.scrollBy(this.autoScrollDelta);
    const pointer = this.lastPointerPosition;
    const eventTarget = this.options.root.ownerDocument.elementFromPoint(pointer.x, pointer.y);
    this.options.onAutoScroll(pointer, eventTarget);
    this.autoScrollFrame = this.ownerWindow.requestAnimationFrame(this.tickAutoScroll);
  };
}
