import { afterEach, describe, expect, it, vi } from "vitest";

import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/descriptionDocRemote";

import {
  fetchDescriptionRemoteSnapshotUpdate,
  shouldDelayRenderReady,
  shouldEnsureTcHeaderFallback,
  shouldUseRemoteFirstHydration,
  waitForRemoteHydrationSettled,
  waitForRemoteSnapshotDecision,
} from "../frame/blocksuiteEditorLifecycleHydration";

vi.mock("@/components/chat/infra/blocksuite/descriptionDocRemote", () => ({
  getRemoteSnapshot: vi.fn(),
}));

const mockedGetRemoteSnapshot = vi.mocked(getRemoteSnapshot);

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

  it("远端 hydrate 完成前不允许写 tcHeader fallback", () => {
    expect(shouldEnsureTcHeaderFallback({
      tcHeaderEnabled: true,
      hydrationState: "timed-out",
    })).toBe(false);

    expect(shouldEnsureTcHeaderFallback({
      tcHeaderEnabled: true,
      hydrationState: "error",
    })).toBe(false);

    expect(shouldEnsureTcHeaderFallback({
      tcHeaderEnabled: true,
      hydrationState: "snapshot-hit",
    })).toBe(true);

    expect(shouldEnsureTcHeaderFallback({
      tcHeaderEnabled: true,
      hydrationState: "empty",
    })).toBe(true);
  });

  it("启动期 hydrate 未落定时延后 render-ready", () => {
    expect(shouldDelayRenderReady("timed-out")).toBe(true);
    expect(shouldDelayRenderReady("error")).toBe(true);
    expect(shouldDelayRenderReady("snapshot-hit")).toBe(false);
    expect(shouldDelayRenderReady("not-applicable")).toBe(false);
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

  it("能把远端 snapshot 转成 Uint8Array", async () => {
    mockedGetRemoteSnapshot.mockResolvedValueOnce({
      v: 1,
      updateB64: "AQID",
      updatedAt: Date.now(),
    });

    await expect(fetchDescriptionRemoteSnapshotUpdate("room:12:description")).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it("远端 snapshot 在超时内返回时，决策为 completed", async () => {
    mockedGetRemoteSnapshot.mockResolvedValueOnce({
      v: 1,
      updateB64: "CQ==",
      updatedAt: Date.now(),
    });

    const controller = new AbortController();
    await expect(waitForRemoteSnapshotDecision({
      docId: "room:12:description",
      signal: controller.signal,
      timeoutMs: 200,
    })).resolves.toMatchObject({
      state: "snapshot-hit",
      update: new Uint8Array([9]),
    });
  });

  it("远端快照明确为空时，决策为 empty", async () => {
    mockedGetRemoteSnapshot.mockResolvedValueOnce(null);

    const controller = new AbortController();
    await expect(waitForRemoteSnapshotDecision({
      docId: "room:12:description",
      signal: controller.signal,
      timeoutMs: 200,
    })).resolves.toMatchObject({
      state: "empty",
      update: null,
    });
  });

  it("远端快照请求失败时，决策为 error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockedGetRemoteSnapshot.mockRejectedValueOnce(new Error("boom"));

    const controller = new AbortController();
    await expect(waitForRemoteSnapshotDecision({
      docId: "room:12:description",
      signal: controller.signal,
      timeoutMs: 200,
    })).resolves.toMatchObject({
      state: "error",
      update: null,
    });
    warnSpy.mockRestore();
  });

  it("远端 snapshot 超时后，决策为 timed-out", async () => {
    vi.useFakeTimers();
    mockedGetRemoteSnapshot.mockImplementationOnce(() => new Promise(() => {}));

    const controller = new AbortController();
    const task = waitForRemoteSnapshotDecision({
      docId: "room:12:description",
      signal: controller.signal,
      timeoutMs: 100,
    });

    await vi.advanceTimersByTimeAsync(150);
    await expect(task).resolves.toMatchObject({
      state: "timed-out",
      update: null,
    });
  });
});
