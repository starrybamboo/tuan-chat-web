import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { getCachedDocSnapshot } from "@/components/chat/infra/blocksuite/document/docSnapshotCache";
import { tuanchat } from "api/instance";

import { prepareSpaceDocsForArchive } from "./prepareSpaceDocsForArchive";

vi.mock("api/instance", () => ({
  tuanchat: {
    spaceDocController: {
      listDocs2: vi.fn(),
    },
  },
}));

vi.mock("@/components/chat/infra/blocksuite/document/docSnapshotCache", () => ({
  getCachedDocSnapshot: vi.fn(),
}));

vi.mock("@/components/chat/infra/blocksuite/description/descriptionDocRemote", () => ({
  getRemoteSnapshot: vi.fn(),
  setRemoteSnapshot: vi.fn(),
}));

const mockedListDocs = vi.mocked(tuanchat.spaceDocController.listDocs2);
const mockedGetCachedDocSnapshot = vi.mocked(getCachedDocSnapshot);
const mockedGetRemoteSnapshot = vi.mocked(getRemoteSnapshot);
const mockedSetRemoteSnapshot = vi.mocked(setRemoteSnapshot);

describe("prepareSpaceDocsForArchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListDocs.mockReset();
    mockedGetCachedDocSnapshot.mockReset();
    mockedGetRemoteSnapshot.mockReset();
    mockedSetRemoteSnapshot.mockReset();
  });

  it("会优先回刷本地缓存的 blocknote 快照", async () => {
    mockedListDocs.mockResolvedValue({
      data: [{ docId: 11 }],
    } as any);
    mockedGetCachedDocSnapshot.mockReturnValue({
      v: 3,
      format: "blocknote",
      updateB64: "cached-update",
      updatedAt: 1000,
      excerpt: "缓存摘要",
    } as any);

    await prepareSpaceDocsForArchive(99);

    expect(mockedGetCachedDocSnapshot).toHaveBeenCalledWith("sdoc:11:description");
    expect(mockedGetRemoteSnapshot).not.toHaveBeenCalled();
    expect(mockedSetRemoteSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "space_doc",
      entityId: 11,
      docType: "description",
      snapshot: expect.objectContaining({
        v: 3,
        format: "blocknote",
        updateB64: "cached-update",
        excerpt: "缓存摘要",
        updatedAt: expect.any(Number),
      }),
    }));
  });

  it("本地没有缓存时会回刷远端 blocknote 快照", async () => {
    mockedListDocs.mockResolvedValue({
      data: [{ docId: 22 }],
    } as any);
    mockedGetCachedDocSnapshot.mockReturnValue(null);
    mockedGetRemoteSnapshot.mockResolvedValue({
      v: 3,
      format: "blocknote",
      updateB64: "remote-update",
      updatedAt: 2000,
      excerpt: "远端摘要",
    } as any);

    await prepareSpaceDocsForArchive(99);

    expect(mockedGetRemoteSnapshot).toHaveBeenCalledWith({
      entityType: "space_doc",
      entityId: 22,
      docType: "description",
    });
    expect(mockedSetRemoteSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "space_doc",
      entityId: 22,
      docType: "description",
      snapshot: expect.objectContaining({
        v: 3,
        format: "blocknote",
        updateB64: "remote-update",
        excerpt: "远端摘要",
        updatedAt: expect.any(Number),
      }),
    }));
  });
});
