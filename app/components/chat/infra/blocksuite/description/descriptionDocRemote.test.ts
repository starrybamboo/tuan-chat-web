import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getDocMock = vi.fn();
const upsertDocMock = vi.fn();
const deleteDocMock = vi.fn();
const listDocUpdatesMock = vi.fn();
const pushDocUpdateMock = vi.fn();
const compactDocUpdatesMock = vi.fn();

vi.mock("api/instance", () => ({
  tuanchat: {
    blocksuiteDocController: {
      getDoc: getDocMock,
      upsertDoc: upsertDocMock,
      deleteDoc3: deleteDocMock,
      listDocUpdates: listDocUpdatesMock,
      pushDocUpdate: pushDocUpdateMock,
      compactDocUpdates: compactDocUpdatesMock,
    },
  },
}));

vi.mock("@/components/chat/infra/blocksuite/shared/docCardShareObservability", () => ({
  recordDocCardShareObservation: vi.fn(),
}));

type DescriptionDocRemoteModule = typeof import("./descriptionDocRemote");

type CancelableDeferred<T> = {
  promise: Promise<T> & { cancel: ReturnType<typeof vi.fn> };
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
  cancel: ReturnType<typeof vi.fn>;
};

function createCancelableDeferred<T>(): CancelableDeferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const cancel = vi.fn(() => {
    reject(new Error("cancelled"));
  });
  const base = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const promise = Object.assign(base, { cancel });
  return { promise, resolve, reject, cancel };
}

function clearSharedRemoteState() {
  delete (globalThis as unknown as Record<string, unknown>).__tcDescriptionDocRemoteState_v2;
  if (typeof window !== "undefined") {
    delete (window as unknown as Window & Record<string, unknown>).__tcDescriptionDocRemoteState_v2;
  }
}

describe("descriptionDocRemote", () => {
  let descriptionDocRemote: DescriptionDocRemoteModule;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
    vi.resetModules();
    clearSharedRemoteState();
    getDocMock.mockReset();
    upsertDocMock.mockReset();
    deleteDocMock.mockReset();
    listDocUpdatesMock.mockReset();
    pushDocUpdateMock.mockReset();
    compactDocUpdatesMock.mockReset();
    descriptionDocRemote = await import("./descriptionDocRemote");
  });

  afterEach(() => {
    vi.useRealTimers();
    clearSharedRemoteState();
    vi.clearAllMocks();
  });

  it("预热到的快照在短缓存过期后仍可被后续打开直接复用", async () => {
    const snapshot = {
      v: 1 as const,
      updateB64: "AQ==",
      updatedAt: Date.now(),
    };
    const params = {
      entityType: "room" as const,
      entityId: 12,
      docType: "description" as const,
    };
    getDocMock.mockResolvedValueOnce({ data: snapshot });

    await descriptionDocRemote.prewarmRemoteSnapshot(params);
    expect(getDocMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);

    await expect(descriptionDocRemote.getRemoteSnapshot(params)).resolves.toEqual(snapshot);
    expect(getDocMock).toHaveBeenCalledTimes(1);
  });

  it("空快照不会写入热缓存，避免把后续真实内容挡住", async () => {
    const snapshot = {
      v: 1 as const,
      updateB64: "Ag==",
      updatedAt: Date.now(),
    };
    const params = {
      entityType: "room" as const,
      entityId: 34,
      docType: "description" as const,
    };
    getDocMock
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: snapshot });

    await descriptionDocRemote.prewarmRemoteSnapshot(params);
    expect(getDocMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);

    await expect(descriptionDocRemote.getRemoteSnapshot(params)).resolves.toEqual(snapshot);
    expect(getDocMock).toHaveBeenCalledTimes(2);
  });

  it("远端快照请求超时后会取消请求，且不会阻塞下一次读取", async () => {
    const params = {
      entityType: "room" as const,
      entityId: 56,
      docType: "description" as const,
    };
    const first = createCancelableDeferred<{ data: null }>();
    const snapshot = {
      v: 1 as const,
      updateB64: "Aw==",
      updatedAt: Date.now(),
    };
    getDocMock
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ data: snapshot });

    const firstTask = descriptionDocRemote.getRemoteSnapshot(params);
    const rejection = expect(firstTask).rejects.toThrow("blocksuite snapshot request timed out");
    await vi.advanceTimersByTimeAsync(8000);
    await rejection;
    expect(first.cancel).toHaveBeenCalledTimes(1);

    await expect(descriptionDocRemote.getRemoteSnapshot(params)).resolves.toEqual(snapshot);
    expect(getDocMock).toHaveBeenCalledTimes(2);
  });

  it("远端增量请求超时后会取消请求，且不会复用挂住的 inflight", async () => {
    const params = {
      entityType: "room" as const,
      entityId: 78,
      docType: "description" as const,
      afterServerTime: 0,
      limit: 2000,
    };
    const first = createCancelableDeferred<{ data: null }>();
    const updates = {
      updates: ["AQ=="],
      latestServerTime: 123,
    };
    listDocUpdatesMock
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ data: updates });

    const firstTask = descriptionDocRemote.getRemoteUpdates(params);
    const rejection = expect(firstTask).rejects.toThrow("blocksuite updates request timed out");
    await vi.advanceTimersByTimeAsync(8000);
    await rejection;
    expect(first.cancel).toHaveBeenCalledTimes(1);

    await expect(descriptionDocRemote.getRemoteUpdates(params)).resolves.toEqual(updates);
    expect(listDocUpdatesMock).toHaveBeenCalledTimes(2);
  });
});
