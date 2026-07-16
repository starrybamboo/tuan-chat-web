import type {
  MessageEditorPointerSelectionSessionState,
} from "../../runtime/messageEditorPointerSelectionSession";

import { MessageEditorPointerSelectionSession } from "../../runtime/messageEditorPointerSelectionSession";

function createFakeRoot() {
  const addListenerCounts = new Map<string, number>();
  const listeners = new Map<string, EventListener>();
  let animationFrame: FrameRequestCallback | null = null;
  const ownerWindow = {
    cancelAnimationFrame() {
      animationFrame = null;
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      animationFrame = callback;
      return 1;
    },
  };
  const ownerDocument = {
    addEventListener(type: string, listener: EventListener) {
      addListenerCounts.set(type, (addListenerCounts.get(type) ?? 0) + 1);
      listeners.set(type, listener);
    },
    defaultView: ownerWindow,
    removeEventListener(type: string, listener: EventListener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
  };
  const root = {
    clientHeight: 100,
    getBoundingClientRect() {
      return {
        bottom: 100,
        top: 0,
      };
    },
    ownerDocument,
    scrollHeight: 300,
    scrollTop: 0,
  };

  return {
    dispatch(type: string, event: Partial<MouseEvent> = {}) {
      listeners.get(type)?.(event as MouseEvent);
    },
    flushAnimationFrame() {
      const callback = animationFrame;
      animationFrame = null;
      callback?.(0);
    },
    getAddListenerCount(type: string) {
      return addListenerCounts.get(type) ?? 0;
    },
    hasListener(type: string) {
      return listeners.has(type);
    },
    root: root as unknown as HTMLElement,
  };
}

function createState(id: string): MessageEditorPointerSelectionSessionState {
  return {
    position: {
      x: 10,
      y: 20,
    },
    selection: {
      anchor: {
        blockId: id,
        offset: 0,
      },
      blockIds: [id],
      collapsed: false,
      end: {
        blockId: id,
        offset: 1,
      },
      focus: {
        blockId: id,
        offset: 1,
      },
      multiBlock: false,
      segments: [
        {
          blockId: id,
          end: 1,
          start: 0,
        },
      ],
      start: {
        blockId: id,
        offset: 0,
      },
    },
  };
}

describe("MessageEditorPointerSelectionSession", () => {
  it("treats a mouseup before drag threshold as a click", () => {
    const fakeRoot = createFakeRoot();
    const onClick = vi.fn();
    const onCommit = vi.fn();
    const onFinish = vi.fn();
    const session = new MessageEditorPointerSelectionSession({
      events: {
        onCancel: vi.fn(),
        onClick,
        onCommit,
        onFinish,
        onPreview: vi.fn(),
      },
      resolveSelectionState: () => createState("a"),
      root: fakeRoot.root,
      startPosition: { x: 0, y: 0 },
    });

    session.start();
    fakeRoot.dispatch("mouseup");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(fakeRoot.hasListener("mousemove")).toBe(false);
  });

  it("starts once and cannot restart after disposal", () => {
    const fakeRoot = createFakeRoot();
    const onFinish = vi.fn();
    const session = new MessageEditorPointerSelectionSession({
      events: {
        onCancel: vi.fn(),
        onClick: vi.fn(),
        onCommit: vi.fn(),
        onFinish,
        onPreview: vi.fn(),
      },
      resolveSelectionState: () => createState("a"),
      root: fakeRoot.root,
      startPosition: { x: 0, y: 0 },
    });

    session.start();
    session.start();
    expect(fakeRoot.getAddListenerCount("mousemove")).toBe(1);
    expect(fakeRoot.getAddListenerCount("mouseup")).toBe(1);

    session.dispose();
    session.start();
    expect(fakeRoot.getAddListenerCount("mousemove")).toBe(1);
    expect(fakeRoot.getAddListenerCount("mouseup")).toBe(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("previews and commits the latest dragged selection", () => {
    const fakeRoot = createFakeRoot();
    const state = createState("dragged");
    const onPreview = vi.fn();
    const onCommit = vi.fn();
    const session = new MessageEditorPointerSelectionSession({
      events: {
        onCancel: vi.fn(),
        onClick: vi.fn(),
        onCommit,
        onFinish: vi.fn(),
        onPreview,
      },
      resolveSelectionState: () => state,
      root: fakeRoot.root,
      startPosition: { x: 0, y: 0 },
    });

    session.start();
    fakeRoot.dispatch("mousemove", { buttons: 1, clientX: 10, clientY: 10 });
    fakeRoot.dispatch("mouseup");

    expect(onPreview).toHaveBeenCalledWith(state);
    expect(onCommit).toHaveBeenCalledWith(state);
  });

  it("cancels a drag when the current selection has been cleared", () => {
    const fakeRoot = createFakeRoot();
    const onCancel = vi.fn();
    const onPreview = vi.fn();
    const session = new MessageEditorPointerSelectionSession({
      events: {
        onCancel,
        onClick: vi.fn(),
        onCommit: vi.fn(),
        onFinish: vi.fn(),
        onPreview,
      },
      resolveSelectionState: () => null,
      root: fakeRoot.root,
      startPosition: { x: 0, y: 0 },
    });

    session.start();
    fakeRoot.dispatch("mousemove", { buttons: 1, clientX: 10, clientY: 10 });
    fakeRoot.dispatch("mouseup");

    expect(onPreview).toHaveBeenCalledWith(null);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("auto-scrolls near viewport edges and refreshes selection", () => {
    const fakeRoot = createFakeRoot();
    const resolveSelectionState = vi.fn(() => createState("scroll"));
    const session = new MessageEditorPointerSelectionSession({
      events: {
        onCancel: vi.fn(),
        onClick: vi.fn(),
        onCommit: vi.fn(),
        onFinish: vi.fn(),
        onPreview: vi.fn(),
      },
      resolveSelectionState,
      root: fakeRoot.root,
      startPosition: { x: 50, y: 50 },
    });

    session.start();
    fakeRoot.dispatch("mousemove", { buttons: 1, clientX: 50, clientY: 99 });
    fakeRoot.flushAnimationFrame();

    expect(fakeRoot.root.scrollTop).toBeGreaterThan(0);
    expect(resolveSelectionState).toHaveBeenCalledTimes(2);
    session.dispose();
  });
});
