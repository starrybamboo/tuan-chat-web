import { afterEach, describe, expect, it, vi } from "vitest";

import {
  shouldUseRemoteFirstHydration,
  waitForRemoteHydrationSettled,
} from "../blocksuiteEditorLifecycleHydration";

describe("blocksuiteEditorLifecycleHydration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("description 文档走远端优先 hydrate", () => {
    expect(shouldUseRemoteFirstHydration("room:12:description")).toBe(true);
    expect(shouldUseRemoteFirstHydration("space:5:readme")).toBe(true);
    expect(shouldUseRemoteFirstHydration("independent:123")).toBe(false);
  });

  it("远端 hydrate 在超时内完成时返回 completed", async () => {
    vi.useFakeTimers();
    const doc = { _remoteHydrationCompleted: false };
    const workspace = {
      getDoc: vi.fn(() => doc),
    };
    const controller = new AbortController();

    const task = waitForRemoteHydrationSettled({
      workspace,
      docId: "room:12:description",
      signal: controller.signal,
      timeoutMs: 200,
      pollIntervalMs: 25,
    });

    setTimeout(() => {
      doc._remoteHydrationCompleted = true;
    }, 75);

    await vi.advanceTimersByTimeAsync(100);
    await expect(task).resolves.toBe("completed");
  });

  it("远端 hydrate 超时后返回 timed-out", async () => {
    vi.useFakeTimers();
    const workspace = {
      getDoc: vi.fn(() => ({ _remoteHydrationCompleted: false })),
    };
    const controller = new AbortController();

    const task = waitForRemoteHydrationSettled({
      workspace,
      docId: "room:12:description",
      signal: controller.signal,
      timeoutMs: 100,
      pollIntervalMs: 25,
    });

    await vi.advanceTimersByTimeAsync(150);
    await expect(task).resolves.toBe("timed-out");
  });

  it("非 description 文档不会等待远端 hydrate", async () => {
    const workspace = {
      getDoc: vi.fn(() => null),
    };
    const controller = new AbortController();

    await expect(waitForRemoteHydrationSettled({
      workspace,
      docId: "independent:123",
      signal: controller.signal,
    })).resolves.toBe("not-applicable");
  });
});
