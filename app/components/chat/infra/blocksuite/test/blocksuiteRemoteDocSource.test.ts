import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QueuedDescriptionUpdate } from "@/components/chat/infra/blocksuite/description/descriptionDocDb";
import type { RemoteUpdatePushResponse } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";

import {
  addUpdate,
  clearUpdates,
  deleteUpdatesByIds,
  listUpdateRecords,
  listUpdates,
} from "@/components/chat/infra/blocksuite/description/descriptionDocDb";
import { pushRemoteUpdate } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { NonRetryableBlocksuiteDocError } from "@/components/chat/infra/blocksuite/shared/blocksuiteDocError";

import { RemoteSnapshotDocSource } from "../space/runtime/remoteDocSource";

vi.mock("@/components/chat/infra/blocksuite/description/descriptionDocDb", () => ({
  addUpdate: vi.fn(),
  clearUpdates: vi.fn(),
  deleteUpdatesByIds: vi.fn(),
  listUpdateRecords: vi.fn(),
  listUpdates: vi.fn(),
}));

vi.mock("@/components/chat/infra/blocksuite/description/descriptionDocRemote", () => ({
  compactRemoteUpdates: vi.fn(),
  getRemoteSnapshot: vi.fn(),
  getRemoteUpdates: vi.fn(),
  pushRemoteUpdate: vi.fn(),
  setRemoteSnapshot: vi.fn(),
}));

vi.mock("@/components/chat/infra/blocksuite/space/runtime/blocksuiteWsClient", () => ({
  blocksuiteWsClient: {
    joinDoc: vi.fn(),
    leaveDoc: vi.fn(),
    onUpdate: vi.fn(() => () => {}),
    isOpen: vi.fn(() => false),
    tryPushUpdateIfOpen: vi.fn(() => false),
  },
}));

const mockedAddUpdate = vi.mocked(addUpdate);
const mockedClearUpdates = vi.mocked(clearUpdates);
const mockedDeleteUpdatesByIds = vi.mocked(deleteUpdatesByIds);
const mockedListUpdateRecords = vi.mocked(listUpdateRecords);
const mockedListUpdates = vi.mocked(listUpdates);
const mockedPushRemoteUpdate = vi.mocked(pushRemoteUpdate);

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createRecord(id: number, value: number, docId = "room:1:description"): QueuedDescriptionUpdate {
  return {
    id,
    docId,
    data: new Uint8Array([value]),
    createdAt: id,
  };
}

function createPushResponse(serverTime: number): RemoteUpdatePushResponse {
  return {
    updateId: serverTime,
    serverTime,
  };
}

describe("blocksuiteRemoteDocSource", () => {
  const docId = "room:1:description";
  let queue = new Map<string, QueuedDescriptionUpdate[]>();

  beforeEach(() => {
    queue = new Map();

    mockedAddUpdate.mockReset();
    mockedClearUpdates.mockReset();
    mockedDeleteUpdatesByIds.mockReset();
    mockedListUpdateRecords.mockReset();
    mockedListUpdates.mockReset();
    mockedPushRemoteUpdate.mockReset();

    mockedListUpdateRecords.mockImplementation(async targetDocId => {
      return [...(queue.get(targetDocId) ?? [])];
    });
    mockedListUpdates.mockImplementation(async targetDocId => {
      return (queue.get(targetDocId) ?? []).map(record => record.data);
    });
    mockedDeleteUpdatesByIds.mockImplementation(async ids => {
      const idSet = new Set(ids);
      for (const [targetDocId, records] of queue.entries()) {
        queue.set(targetDocId, records.filter(record => !idSet.has(record.id)));
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("上传成功时只删除当前批次，上传期间的新记录会留给下一轮", async () => {
    queue.set(docId, [createRecord(1, 1)]);
    const firstPush = createDeferred<RemoteUpdatePushResponse>();

    mockedPushRemoteUpdate
      .mockReturnValueOnce(firstPush.promise)
      .mockResolvedValueOnce(createPushResponse(2));

    const source = new RemoteSnapshotDocSource();
    const task = (source as any).flushOfflineUpdates(docId);
    await Promise.resolve();

    expect(mockedPushRemoteUpdate).toHaveBeenCalledTimes(1);

    queue.set(docId, [createRecord(1, 1), createRecord(2, 2)]);
    firstPush.resolve(createPushResponse(1));
    await task;

    expect(mockedDeleteUpdatesByIds.mock.calls).toEqual([[[1]], [[2]]]);
    expect(mockedPushRemoteUpdate).toHaveBeenCalledTimes(2);
    expect(queue.get(docId)).toEqual([]);
  });

  it("同一文档的 flush 会串行化，不会并发上传同一批次", async () => {
    queue.set(docId, [createRecord(1, 1)]);
    const firstPush = createDeferred<RemoteUpdatePushResponse>();

    mockedPushRemoteUpdate
      .mockReturnValueOnce(firstPush.promise)
      .mockResolvedValueOnce(createPushResponse(2));

    const source = new RemoteSnapshotDocSource();
    const firstTask = (source as any).flushOfflineUpdates(docId);
    await Promise.resolve();

    queue.set(docId, [createRecord(1, 1), createRecord(2, 2)]);
    const secondTask = (source as any).flushOfflineUpdates(docId);

    expect(mockedPushRemoteUpdate).toHaveBeenCalledTimes(1);

    firstPush.resolve(createPushResponse(1));
    await Promise.all([firstTask, secondTask]);

    expect(mockedPushRemoteUpdate).toHaveBeenCalledTimes(2);
    expect(mockedDeleteUpdatesByIds.mock.calls).toEqual([[[1]], [[2]]]);
  });

  it("非重试错误只丢弃当前坏批次，较晚的新记录仍会继续 flush", async () => {
    queue.set(docId, [createRecord(1, 1)]);
    const firstPush = createDeferred<RemoteUpdatePushResponse>();

    mockedPushRemoteUpdate
      .mockReturnValueOnce(firstPush.promise)
      .mockResolvedValueOnce(createPushResponse(2));

    const source = new RemoteSnapshotDocSource();
    const task = (source as any).flushOfflineUpdates(docId);
    await Promise.resolve();

    queue.set(docId, [createRecord(1, 1), createRecord(2, 2)]);
    firstPush.reject(new NonRetryableBlocksuiteDocError(new Error("gone")));
    await task;

    expect(mockedDeleteUpdatesByIds.mock.calls).toEqual([[[1]], [[2]]]);
    expect(mockedPushRemoteUpdate).toHaveBeenCalledTimes(2);
    expect(queue.get(docId)).toEqual([]);
  });

  it("可重试错误不会删除任何记录", async () => {
    queue.set(docId, [createRecord(1, 1)]);
    mockedPushRemoteUpdate.mockRejectedValueOnce(new Error("network"));

    const source = new RemoteSnapshotDocSource();
    await (source as any).flushOfflineUpdates(docId);

    expect(mockedDeleteUpdatesByIds).not.toHaveBeenCalled();
    expect(queue.get(docId)).toEqual([createRecord(1, 1)]);
  });

  it("队列为空时不会调用远端上传", async () => {
    const source = new RemoteSnapshotDocSource();
    await (source as any).flushOfflineUpdates(docId);

    expect(mockedPushRemoteUpdate).not.toHaveBeenCalled();
    expect(mockedDeleteUpdatesByIds).not.toHaveBeenCalled();
  });
});
