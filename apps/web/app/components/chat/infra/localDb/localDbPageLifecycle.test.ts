import { describe, expect, it } from "vitest";

import { waitForVisibleDocument } from "./localDbPageLifecycle";

class FakeVisibilityDocument {
  visibilityState: DocumentVisibilityState = "hidden";
  private readonly listeners = new Set<() => void>();

  addEventListener(_type: "visibilitychange", listener: () => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "visibilitychange", listener: () => void): void {
    this.listeners.delete(listener);
  }

  show(): void {
    this.visibilityState = "visible";
    for (const listener of this.listeners) {
      listener();
    }
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

describe("waitForVisibleDocument", () => {
  it("页面已可见时立即继续", async () => {
    const target = new FakeVisibilityDocument();
    target.show();

    await expect(waitForVisibleDocument(target, new AbortController().signal)).resolves.toBeUndefined();
    expect(target.listenerCount).toBe(0);
  });

  it("页面隐藏时等待到重新可见", async () => {
    const target = new FakeVisibilityDocument();
    let resumed = false;
    const waiting = waitForVisibleDocument(target, new AbortController().signal).then(() => {
      resumed = true;
    });

    await Promise.resolve();
    expect(resumed).toBe(false);

    target.show();
    await waiting;
    expect(resumed).toBe(true);
    expect(target.listenerCount).toBe(0);
  });

  it("页面销毁时取消可见性等待", async () => {
    const target = new FakeVisibilityDocument();
    const abortController = new AbortController();
    const waiting = waitForVisibleDocument(target, abortController.signal);

    abortController.abort();

    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    expect(target.listenerCount).toBe(0);
  });
});
