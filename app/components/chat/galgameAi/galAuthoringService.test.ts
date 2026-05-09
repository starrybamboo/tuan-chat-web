import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { roleAvatarsQueryKey } from "../../../../api/hooks/RoleAndAvatarHooks";
import { MessageType } from "../../../../api/wsModels";
import { GAL_NARRATOR } from "./authoringProjection";
import { getGalAuthoringContext } from "./galAuthoringService";
import { MemoryGalPatchProposalStore } from "./localProposalStore";
import { createGalPatchProposal } from "./storyPatch";

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
  it("优先复用本地快照，避免重复请求已加载的上下文", async () => {
    const failRequest = async () => {
      throw new Error("不应请求远端上下文");
    };

    const context = await getGalAuthoringContext({
      spaceId: 5,
      roomId: 10,
      client: {
        spaceController: { getSpaceInfo: failRequest },
        roomController: {
          getRoomInfo: failRequest,
          getUserRooms: failRequest,
        },
        chatController: { getAllMessage: failRequest },
        roomRoleController: {
          roomRole: failRequest,
          roomNpcRole: failRequest,
        },
        avatarController: { getRoleAvatars: failRequest },
      } as any,
      localSnapshot: {
        space: { spaceId: 5, name: "本地工程" },
        room: { spaceId: 5, roomId: 10, name: "本地房间" },
        rooms: [{ spaceId: 5, roomId: 10, name: "本地房间" }],
        messages: [createMessage({ messageId: 9, position: 1, roleId: 7, content: "本地缓存消息" })],
        roomRoles: [{ userId: 1, roleId: 7, roleName: "千夏", avatarId: 70, type: 1 }],
        roleAvatarsByRoleId: new Map([
          [7, [{ roleId: 7, avatarId: 71, category: "表情" } as any]],
        ]),
      },
    });

    expect(context.space.name).toBe("本地工程");
    expect(context.room.name).toBe("本地房间");
    expect(context.messages.map(message => message.content)).toEqual(["本地缓存消息"]);
    expect(context.roles.roomRoles[0].avatarVariants).toEqual([
      expect.objectContaining({ avatarId: "71", category: "表情" }),
    ]);
  });

  it("复用 React Query 中已有的角色差分缓存", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(roleAvatarsQueryKey(7), {
      data: [
        {
          roleId: 7,
          avatarId: 71,
          avatarTitle: { zh: "微笑" },
          category: "表情",
        },
      ],
    });

    const context = await getGalAuthoringContext({
      spaceId: 5,
      roomId: 10,
      queryClient,
      client: {
        spaceController: { getSpaceInfo: async () => ({ data: { spaceId: 5 } }) },
        roomController: {
          getRoomInfo: async () => ({ data: { spaceId: 5, roomId: 10 } }),
          getUserRooms: async () => ({ data: { rooms: [{ spaceId: 5, roomId: 10 }] } }),
        },
        chatController: { getAllMessage: async () => ({ data: [] }) },
        roomRoleController: {
          roomRole: async () => ({ data: [{ userId: 1, roleId: 7, roleName: "千夏", type: 1 }] }),
          roomNpcRole: async () => ({ data: [] }),
        },
        avatarController: {
          getRoleAvatars: async () => {
            throw new Error("已有缓存时不应请求角色差分");
          },
        },
      } as any,
    });

    expect(context.roles.roomRoles[0].avatarVariants).toEqual([
      expect.objectContaining({ avatarId: "71", avatarTitle: { zh: "微笑" } }),
    ]);
  });

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

  it("解析参考房间为只读 referenceRooms", async () => {
    const context = await getGalAuthoringContext({
      spaceId: 5,
      roomId: 10,
      referenceRoomIds: [11],
      client: {
        spaceController: { getSpaceInfo: async () => ({ data: { spaceId: 5 } }) },
        roomController: {
          getRoomInfo: async (roomId: number) => ({
            data: {
              spaceId: 5,
              roomId,
              name: roomId === 11 ? "雨夜前奏" : "当前房间",
            },
          }),
          getUserRooms: async () => ({
            data: {
              rooms: [
                { spaceId: 5, roomId: 10, name: "当前房间" },
                { spaceId: 5, roomId: 11, name: "雨夜前奏" },
              ],
            },
          }),
        },
        chatController: {
          getAllMessage: async (roomId: number) => ({
            data: roomId === 11
              ? [
                  { message: createMessage({ roomId: 11, messageId: 21, position: 1, roleId: 0, content: "雨声压低了脚步。" }) },
                ]
              : [
                  { message: createMessage({ roomId: 10, messageId: 1, position: 1, roleId: 7, content: "当前对白" }) },
                ],
          }),
        },
        roomRoleController: {
          roomRole: async (roomId: number) => ({
            data: roomId === 11 ? [] : [{ userId: 1, roleId: 7, roleName: "千夏", type: 1 }],
          }),
          roomNpcRole: async () => ({ data: [] }),
        },
        avatarController: { getRoleAvatars: async () => ({ data: [] }) },
      } as any,
    });

    expect(context.referenceRooms).toHaveLength(1);
    expect(context.referenceRooms?.[0]).toMatchObject({
      refId: "room:11",
      room: {
        roomId: "11",
        name: "雨夜前奏",
      },
      messages: [
        {
          messageId: "21",
          roleId: "narrator",
          content: "雨声压低了脚步。",
        },
      ],
    });
  });
});
