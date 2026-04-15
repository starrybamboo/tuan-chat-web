import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Doc, applyUpdate, encodeStateAsUpdate, encodeStateVector } from "yjs";

import { deleteUpdatesByIds, listUpdateRecords } from "@/components/chat/infra/blocksuite/description/descriptionDocDb";
import { getRemoteSnapshot, getRemoteUpdates, pushRemoteUpdate, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/shared/base64";
import { encodeLoadedSpaceDocAsUpdateIfExistsForSpace } from "@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry";
import { tuanchat } from "api/instance";

import { prepareSpaceDocsForArchive } from "./prepareSpaceDocsForArchive";

vi.mock("api/instance", () => ({
  tuanchat: {
    spaceDocController: {
      listDocs2: vi.fn(),
    },
  },
}));

vi.mock("@/components/chat/infra/blocksuite/description/descriptionDocDb", () => ({
  deleteUpdatesByIds: vi.fn(),
  listUpdateRecords: vi.fn(),
}));

vi.mock("@/components/chat/infra/blocksuite/description/descriptionDocRemote", () => ({
  getRemoteSnapshot: vi.fn(),
  getRemoteUpdates: vi.fn(),
  pushRemoteUpdate: vi.fn(),
  setRemoteSnapshot: vi.fn(),
}));

vi.mock("@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry", () => ({
  encodeLoadedSpaceDocAsUpdateIfExistsForSpace: vi.fn(),
}));

const mockedListDocs = vi.mocked(tuanchat.spaceDocController.listDocs2);
const mockedListUpdateRecords = vi.mocked(listUpdateRecords);
const mockedDeleteUpdatesByIds = vi.mocked(deleteUpdatesByIds);
const mockedGetRemoteSnapshot = vi.mocked(getRemoteSnapshot);
const mockedGetRemoteUpdates = vi.mocked(getRemoteUpdates);
const mockedPushRemoteUpdate = vi.mocked(pushRemoteUpdate);
const mockedSetRemoteSnapshot = vi.mocked(setRemoteSnapshot);
const mockedEncodeLoadedSpaceDoc = vi.mocked(encodeLoadedSpaceDocAsUpdateIfExistsForSpace);

function createDocWithText(text: string): Doc {
  const doc = new Doc();
  doc.getText("content").insert(0, text);
  return doc;
}

function readTextFromUpdate(updateB64: string): string {
  const doc = new Doc();
  applyUpdate(doc, base64ToUint8Array(updateB64));
  return doc.getText("content").toString();
}

describe("prepareSpaceDocsForArchive", () => {
  beforeEach(() => {
    mockedListDocs.mockReset();
    mockedListUpdateRecords.mockReset();
    mockedDeleteUpdatesByIds.mockReset();
    mockedGetRemoteSnapshot.mockReset();
    mockedGetRemoteUpdates.mockReset();
    mockedPushRemoteUpdate.mockReset();
    mockedSetRemoteSnapshot.mockReset();
    mockedEncodeLoadedSpaceDoc.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("会把 IndexedDB backlog 合并进归档前快照，并在远端确认后清理本地 backlog", async () => {
    const remoteDoc = createDocWithText("A");
    const remoteUpdate = encodeStateAsUpdate(remoteDoc);

    const localDoc = new Doc();
    applyUpdate(localDoc, remoteUpdate);
    localDoc.getText("content").insert(1, "B");
    const localBacklog = encodeStateAsUpdate(localDoc, encodeStateVector(remoteDoc));

    mockedListDocs.mockResolvedValue({
      data: [{ docId: 11 }],
    } as any);
    mockedGetRemoteSnapshot.mockResolvedValue({
      v: 2,
      updateB64: uint8ArrayToBase64(remoteUpdate),
      updatedAt: 1000,
      snapshotServerTime: 5,
    });
    mockedGetRemoteUpdates.mockResolvedValue({
      updates: [],
      latestServerTime: 5,
    });
    mockedListUpdateRecords.mockResolvedValue([
      {
        id: 101,
        docId: "sdoc:11:description",
        data: localBacklog,
        createdAt: 2000,
      },
    ]);
    mockedEncodeLoadedSpaceDoc.mockReturnValue(null);
    mockedPushRemoteUpdate.mockResolvedValue({
      updateId: 701,
      serverTime: 7,
    });
    mockedSetRemoteSnapshot.mockResolvedValue(undefined);

    await prepareSpaceDocsForArchive(99);

    expect(mockedPushRemoteUpdate).toHaveBeenCalledTimes(1);
    expect(mockedDeleteUpdatesByIds).toHaveBeenCalledWith([101]);
    expect(mockedSetRemoteSnapshot).toHaveBeenCalledTimes(1);

    const payload = mockedSetRemoteSnapshot.mock.calls[0][0];
    const { snapshot } = payload;
    expect(snapshot.v).toBe(2);
    if (snapshot.v !== 2) {
      throw new Error("expected v2 snapshot payload");
    }
    expect(snapshot.snapshotServerTime).toBe(7);
    expect(readTextFromUpdate(snapshot.updateB64)).toBe("AB");
  });
});
