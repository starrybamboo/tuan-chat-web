// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { SpaceMember, UserRole } from "api";

import {
  buildBlocksuiteMentionCandidates,
  filterBlocksuiteMentionCandidates,
} from "./blocksuiteMention";

describe("blocksuiteMention", () => {
  it("会同时构建角色和空间成员候选项", () => {
    const candidates = buildBlocksuiteMentionCandidates({
      roles: [{
        roleId: 11,
        roleName: "艾莉丝",
        userId: 7,
        type: 0,
      }] as UserRole[],
      spaceMembers: [{
        userId: 8,
        username: "团长",
        memberType: 1,
      }] as SpaceMember[],
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        key: "role:11",
        kind: "role",
        label: "艾莉丝",
        group: "角色",
      }),
      expect.objectContaining({
        key: "member:8",
        kind: "member",
        label: "团长",
        subtext: "空间成员 · 主持",
      }),
    ]);
  });

  it("会按关键字过滤角色和空间成员", () => {
    const candidates = buildBlocksuiteMentionCandidates({
      roles: [{
        roleId: 11,
        roleName: "艾莉丝",
        userId: 7,
        type: 0,
      }] as UserRole[],
      spaceMembers: [{
        userId: 8,
        username: "团长",
        memberType: 1,
      }] as SpaceMember[],
    });

    expect(filterBlocksuiteMentionCandidates(candidates, "艾莉").map(item => item.kind)).toEqual(["role"]);
    expect(filterBlocksuiteMentionCandidates(candidates, "主持").map(item => item.kind)).toEqual(["member"]);
  });

  it("会对重复角色和成员去重", () => {
    const candidates = buildBlocksuiteMentionCandidates({
      roles: [
        {
          roleId: 11,
          roleName: "艾莉丝",
          userId: 7,
          type: 0,
        },
        {
          roleId: 11,
          roleName: "艾莉丝",
          userId: 7,
          type: 0,
        },
      ] as UserRole[],
      spaceMembers: [
        {
          userId: 8,
          username: "团长",
          memberType: 1,
        },
        {
          userId: 8,
          username: "团长",
          memberType: 1,
        },
      ] as SpaceMember[],
    });

    expect(candidates.map(item => item.key)).toEqual(["role:11", "member:8"]);
  });
});
