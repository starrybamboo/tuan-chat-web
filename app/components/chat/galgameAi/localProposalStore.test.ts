import { describe, expect, it } from "vitest";

import type { GalPatchProposal } from "./authoringTypes";

import { MemoryGalPatchProposalStore, normalizePersistedGalPatchProposal } from "./localProposalStore";

function createProposal(overrides: Partial<GalPatchProposal> = {}): GalPatchProposal {
  return {
    proposalId: "p1",
    spaceId: "5",
    roomId: "10",
    source: "ai",
    status: "draft",
    baseFingerprint: {
      messageIds: ["1"],
      signature: "[]",
    },
    baseSnapshot: [],
    patch: {
      operations: [],
    },
    projectedSnapshot: [],
    diff: {
      items: [],
    },
    summary: {
      added: 0,
      deleted: 0,
      modified: 0,
      moved: 0,
      metadataChanged: 0,
    },
    validationErrors: [],
    createTime: "2026-05-06T00:00:00.000Z",
    updateTime: "2026-05-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("localProposalStore", () => {
  it("读取历史 proposal 时过滤旧客户端业务校验错误", () => {
    const proposal = createProposal({
      validationErrors: [
        { code: "unknown_avatar", message: "avatarId 不属于该角色" },
        { code: "unknown_role", message: "角色不属于当前房间" },
        { code: "unknown_annotation", message: "annotation 不存在" },
        { code: "message_not_found", message: "messageId 不存在" },
      ],
    });

    expect(normalizePersistedGalPatchProposal(proposal).validationErrors).toEqual([
      { code: "message_not_found", message: "messageId 不存在" },
    ]);
  });

  it("内存 store 也返回过滤后的历史 proposal", async () => {
    const store = new MemoryGalPatchProposalStore();
    await store.save(createProposal({
      validationErrors: [
        { code: "unknown_avatar", message: "avatarId 不属于该角色" },
      ],
    }));

    await expect(store.get("p1")).resolves.toMatchObject({
      validationErrors: [],
    });
  });
});
