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

function clearSharedRemoteState() {
  delete (globalThis as Record<string, unknown>).__tcDescriptionDocRemoteState_v2;
  if (typeof window !== "undefined") {
    delete (window as Window & Record<string, unknown>).__tcDescriptionDocRemoteState_v2;
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
});
