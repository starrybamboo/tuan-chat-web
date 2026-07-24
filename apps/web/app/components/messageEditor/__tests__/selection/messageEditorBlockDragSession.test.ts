import { vi } from "vitest";

import { MessageEditorBlockDragSession } from "../../selection/messageEditorBlockDragSession";

function createDragEnvironment() {
  let animationFrame: FrameRequestCallback | null = null;
  const listeners = new Map<string, EventListener>();
  const eventTarget = {} as Element;
  const ownerWindow = {
    addEventListener(type: string, listener: EventListener) {
      listeners.set(type, listener);
    },
    cancelAnimationFrame() {
      animationFrame = null;
    },
    removeEventListener(type: string, listener: EventListener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      animationFrame = callback;
      return 1;
    },
  };
  const root = {
    getBoundingClientRect: () => ({ bottom: 100, top: 0 }),
    ownerDocument: {
      defaultView: ownerWindow,
      elementFromPoint: () => eventTarget,
    },
  } as unknown as HTMLElement;

  return {
    dispatch(type: string) {
      listeners.get(type)?.(new Event(type));
    },
    eventTarget,
    flushAnimationFrame() {
      const callback = animationFrame;
      animationFrame = null;
      callback?.(0);
    },
    hasListener(type: string) {
      return listeners.has(type);
    },
    root,
  };
}

describe("MessageEditorBlockDragSession", () => {
  it("owns edge auto-scroll and refreshes the drag target", () => {
    const environment = createDragEnvironment();
    const onAutoScroll = vi.fn();
    const scrollBy = vi.fn();
    const session = new MessageEditorBlockDragSession({
      edgeSize: 40,
      maxDelta: 20,
      onAutoScroll,
      onFinish: vi.fn(),
      root: environment.root,
      scrollBy,
    });

    session.start();
    session.updatePointer(25, 99);
    environment.flushAnimationFrame();

    expect(scrollBy).toHaveBeenCalledWith(20);
    expect(onAutoScroll).toHaveBeenCalledWith({ x: 25, y: 99 }, environment.eventTarget);
    session.dispose();
  });

  it("finishes once and removes global drag listeners", () => {
    const environment = createDragEnvironment();
    const onFinish = vi.fn();
    const session = new MessageEditorBlockDragSession({
      onAutoScroll: vi.fn(),
      onFinish,
      root: environment.root,
      scrollBy: vi.fn(),
    });

    session.start();
    expect(environment.hasListener("dragend")).toBe(true);
    expect(environment.hasListener("drop")).toBe(true);
    environment.dispatch("dragend");

    expect(onFinish).toHaveBeenCalledOnce();
    expect(environment.hasListener("dragend")).toBe(false);
    expect(environment.hasListener("drop")).toBe(false);
  });
});
