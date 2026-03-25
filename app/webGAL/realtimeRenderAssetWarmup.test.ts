import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import type { ChatMessageResponse, UserRole } from "../../api";

import {
  collectMessageAssetWarmupPlan,
  collectMissingAvatarIdsFromMessages,
  collectMissingAvatarIdsFromRoles,
  runWithConcurrencyLimit,
} from "./realtimeRenderAssetWarmup";

function createRole(roleId: number, avatarId: number): UserRole {
  return {
    roleId,
    avatarId,
  } as UserRole;
}

function createMessageResponse(overrides: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: 1,
      roomId: 1,
      roleId: 1,
      avatarId: 0,
      messageType: 1,
      content: "hello",
      annotations: [],
      status: 0,
      extra: {},
      webgal: undefined,
      ...overrides,
    } as ChatMessageResponse["message"],
  } as ChatMessageResponse;
}

describe("realtimeRenderAssetWarmup", () => {
  it("按角色收集缺失头像并去重", () => {
    const roles = [
      createRole(1, 11),
      createRole(2, 22),
      createRole(3, 11),
      createRole(4, 0),
    ];

    const missing = collectMissingAvatarIdsFromRoles(roles, avatarId => avatarId === 22);

    expect(missing).toEqual([11]);
  });

  it("按消息内容收集 sprite 与 annotation 小头像预热目标", () => {
    const roleLookup = new Map<number, UserRole>([
      [1, createRole(1, 11)],
      [2, createRole(2, 22)],
    ]);
    const messages = [
      createMessageResponse({
        roleId: 1,
        avatarId: 101,
        messageType: 1,
        annotations: [ANNOTATION_IDS.FIGURE_MINI_AVATAR],
      }),
      createMessageResponse({
        messageId: 2,
        roleId: 2,
        avatarId: 0,
        messageType: 1,
        annotations: [],
      }),
      createMessageResponse({
        messageId: 3,
        roleId: 1,
        avatarId: 101,
        messageType: 9,
        annotations: [ANNOTATION_IDS.FIGURE_MINI_AVATAR],
      }),
      createMessageResponse({
        messageId: 4,
        roleId: 0,
        avatarId: 303,
        messageType: 1,
      }),
    ];

    const plan = collectMessageAssetWarmupPlan(messages, roleLookup, {
      autoFigureEnabled: false,
      miniAvatarEnabled: false,
    });

    expect(plan.avatarIds).toEqual([101, 22]);
    expect(plan.spriteTargets).toEqual([]);
    expect(plan.miniAvatarTargets).toEqual([{ roleId: 1, avatarId: 101 }]);
  });

  it("收集消息缺失头像时会回退到角色默认头像并过滤缓存项", () => {
    const roleLookup = new Map<number, UserRole>([
      [1, createRole(1, 11)],
      [2, createRole(2, 22)],
    ]);
    const messages = [
      createMessageResponse({ roleId: 1, avatarId: 0, messageId: 1 }),
      createMessageResponse({ roleId: 2, avatarId: 202, messageId: 2 }),
      createMessageResponse({ roleId: 2, avatarId: 0, messageId: 3, status: 1 }),
    ];

    const missing = collectMissingAvatarIdsFromMessages(messages, roleLookup, avatarId => avatarId === 11);

    expect(missing).toEqual([202]);
  });

  it("并发限制执行器不会突破上限", async () => {
    let activeCount = 0;
    let maxActiveCount = 0;

    await runWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async () => {
      activeCount += 1;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      await new Promise(resolve => setTimeout(resolve, 10));
      activeCount -= 1;
    });

    expect(maxActiveCount).toBeLessThanOrEqual(2);
  });
});
