import { describe, expect, it } from "vitest";

import type { RepositorySpaceCandidate } from "./repositoryDetail.helpers";

import {
  findRecoverableRepositorySpace,
  listRepositorySpaceCandidates,

  resolvePreviewRoomId,
  resolveRepositoryPrimaryAction,
} from "./repositoryDetail.helpers";

function space(overrides: Partial<RepositorySpaceCandidate>): RepositorySpaceCandidate {
  return {
    spaceId: 1,
    repositoryId: 10,
    status: 0,
    updateTime: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("repositoryDetail helpers", () => {
  it("按仓库过滤空间并按更新时间倒序排列", () => {
    const result = listRepositorySpaceCandidates([
      space({ spaceId: 1, repositoryId: 10, updateTime: "2026-01-01T00:00:00.000Z" }),
      space({ spaceId: 2, repositoryId: 11, updateTime: "2026-03-01T00:00:00.000Z" }),
      space({ spaceId: 3, repositoryId: 10, updateTime: "2026-02-01T00:00:00.000Z" }),
      { repositoryId: 10, updateTime: "2026-04-01T00:00:00.000Z" },
    ], 10);

    expect(result.map(item => item.spaceId)).toEqual([3, 1]);
  });

  it("恢复空间优先匹配仓库 head commit，匹配不到则回退最新归档空间", () => {
    const olderArchived = space({ spaceId: 1, status: 2, parentCommitId: 101 });
    const latestArchived = space({ spaceId: 2, status: 2, parentCommitId: 102 });
    const active = space({ spaceId: 3, status: 0, parentCommitId: 103 });

    expect(findRecoverableRepositorySpace([latestArchived, olderArchived, active], 101)?.spaceId).toBe(1);
    expect(findRecoverableRepositorySpace([latestArchived, olderArchived, active], 999)?.spaceId).toBe(2);
  });

  it("主操作根据现有空间状态切换为进入编辑、恢复编辑或创建副本", () => {
    const active = space({ spaceId: 1, status: 0 });
    const archived = space({ spaceId: 2, status: 2 });

    expect(resolveRepositoryPrimaryAction({ linkedSpace: active, recoverableSpace: archived }).kind).toBe("continue");
    expect(resolveRepositoryPrimaryAction({ linkedSpace: archived, recoverableSpace: archived }).kind).toBe("recover");
    expect(resolveRepositoryPrimaryAction({ linkedSpace: null, recoverableSpace: null }).kind).toBe("clone");
  });

  it("预览房间保留仍有效的选择，否则回退到第一个可用房间", () => {
    const rooms = [
      { roomId: 11, name: "默认房间" },
      { roomId: 12, name: "第二房间" },
    ];

    expect(resolvePreviewRoomId(rooms, 12)).toBe(12);
    expect(resolvePreviewRoomId(rooms, 99)).toBe(11);
    expect(resolvePreviewRoomId([], 12)).toBeNull();
  });
});
