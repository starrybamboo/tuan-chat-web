import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { MessageType } from "../../../../api/wsModels";

import { getGalAuthoringContext } from "./galAuthoringService";
import { MemoryGalPatchProposalStore } from "./localProposalStore";
import { createGalPatchProposal } from "./storyPatch";
import { GAL_NARRATOR } from "./authoringProjection";

function createMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 10,
    userId: 99,
    roleId: 7,
    content: "你好",
    status: 0,
    messageType: MessageType.TEXT,
    position: 1,
    ...overrides,
  };
}

describe("getGalAuthoringContext", () => {
  it("聚合空间、房间、消息、房间角色和角色差分", async () => {
    const client = {
      spaceController: {
        getSpaceInfo: async () => ({
          data: {
            spaceId: 5,
            name: "测试工程",
            roomMap: { start: ["10"] },
          },
        }),
      },
      roomController: {
        getRoomInfo: async () => ({
          data: {
            spaceId: 5,
            roomId: 10,
            name: "雨夜",
            description: "两人在雨夜重逢。",
          },
        }),
        getUserRooms: async () => ({
          data: {
            rooms: [
              { spaceId: 5, roomId: 10, name: "雨夜", description: "两人在雨夜重逢。" },
              { spaceId: 5, roomId: 11, name: "清晨" },
            ],
          },
        }),
      },
      chatController: {
        getAllMessage: async () => ({
          data: [
            { message: createMessage({ messageId: 2, position: 2, roleId: 0, content: "旁白" }) },
            { message: createMessage({ messageId: 1, position: 1, roleId: 7, content: "对白" }) },
          ],
        }),
      },
      roomRoleController: {
        roomRole: async () => ({
          data: [
            {
              userId: 1,
              roleId: 7,
              roleName: "千夏",
              description: "克制。",
              avatarId: 70,
              type: 1,
            },
          ],
        }),
        roomNpcRole: async () => ({ data: [] }),
      },
      avatarController: {
        getRoleAvatars: async () => ({
          data: [
            {
              roleId: 7,
              avatarId: 71,
              avatarTitle: { zh: "微笑" },
              category: "表情",
            },
          ],
        }),
      },
    } as any;

    const context = await getGalAuthoringContext({
      spaceId: 5,
      roomId: 10,
      includeFlow: true,
      client,
    });

    expect(context.space).toMatchObject({
      spaceId: "5",
      name: "测试工程",
      roomMap: { start: ["10"] },
    });
    expect(context.room).toMatchObject({
      roomId: "10",
      description: "两人在雨夜重逢。",
    });
    expect(context.messages.map(message => message.content)).toEqual(["对白", "旁白"]);
    expect(context.messages[1]).toMatchObject({
      roleId: "narrator",
      roleName: "旁白",
      purpose: "narration",
    });
    expect(context.roles.roomRoles[0]).toMatchObject({
      roleId: "7",
      avatarVariants: [
        {
          avatarId: "71",
          avatarTitle: { zh: "微笑" },
        },
      ],
    });
    expect(context.annotations.some(annotation => annotation.id === "sys:bgm")).toBe(true);
  });

  it("返回当前房间的活跃 proposal 摘要", async () => {
    const proposalStore = new MemoryGalPatchProposalStore();
    const proposal = createGalPatchProposal({
      proposalId: "p1",
      spaceId: "5",
      roomId: "10",
      baseSnapshot: [
        {
          messageId: "1",
          position: 1,
          roomId: "10",
          messageType: MessageType.TEXT,
          purpose: "dialogue",
          roleId: "7",
          content: "旧",
          annotations: [],
        },
      ],
      patch: {
        operations: [
          {
            op: "replace_content",
            messageId: "1",
            content: "新",
          },
        ],
      },
      context: {
        roomId: "10",
        narrator: GAL_NARRATOR,
        roles: [{ roleId: "7", avatarVariants: [] }],
        annotations: [],
      },
      now: new Date("2026-04-28T00:00:00.000Z"),
    });
    await proposalStore.save(proposal);
    await proposalStore.setActive("10", "p1");

    const context = await getGalAuthoringContext({
      spaceId: 5,
      roomId: 10,
      client: {
        spaceController: { getSpaceInfo: async () => ({ data: { spaceId: 5 } }) },
        roomController: {
          getRoomInfo: async () => ({ data: { spaceId: 5, roomId: 10 } }),
          getUserRooms: async () => ({ data: { rooms: [] } }),
        },
        chatController: { getAllMessage: async () => ({ data: [] }) },
        roomRoleController: {
          roomRole: async () => ({ data: [] }),
          roomNpcRole: async () => ({ data: [] }),
        },
        avatarController: { getRoleAvatars: async () => ({ data: [] }) },
      } as any,
      proposalStore,
    });

    expect(context.activeProposal).toMatchObject({
      proposalId: "p1",
      status: "draft",
      modified: 1,
    });
  });
});
