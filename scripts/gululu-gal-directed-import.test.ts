import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it, vi } from "vitest";

import {
  applyGululuGalDirectedImportPlan,
  buildGululuGalDirectedImportPlan,
  parseGululuGalDirectedImportArgs,
  type GululuGalDirectingPlan,
} from "./gululu-gal-directed-import";

function createLiveResult() {
  return {
    plan: {
      messages: [
        {
          avatarKey: "role:烈海王:image:gululu/retsu.png",
          kind: "dialog" as const,
          request: {
            content: "由作为贴主的我为角色的行动给出多个选项",
            extra: {},
            messageType: MESSAGE_TYPE.TEXT,
            roomId: 12970,
          },
          roleKey: "role:烈海王",
          source: {
            eventIndex: 1,
            floor: 1,
            imagePath: "gululu/retsu.png",
            speakerName: "烈海王",
          },
        },
        {
          kind: "dice" as const,
          request: {
            avatarId: -1,
            content: "数值大的那一方胜利，之后进行伤害判定",
            customRoleName: "骰娘",
            extra: {},
            messageType: MESSAGE_TYPE.TEXT,
            roleId: -1,
            roomId: 12970,
          },
          source: {
            eventIndex: 2,
            floor: 1,
          },
        },
        {
          kind: "dice" as const,
          request: {
            avatarId: -1,
            content: "那么烈啊，你要去往何处呢【1d13：】",
            customRoleName: "骰娘",
            extra: {
              diceResult: { result: "那么烈啊，你要去往何处呢【1d13:9】" },
              diceTurn: {
                command: "那么烈啊，你要去往何处呢【1d13：】",
                replies: [{ content: "那么烈啊，你要去往何处呢【1d13:9】", customRoleName: "骰娘" }],
              },
            },
            messageType: MESSAGE_TYPE.DICE,
            roleId: -1,
            roomId: 12970,
          },
          source: {
            eventIndex: 3,
            floor: 1,
          },
        },
      ],
      source: {
        key: "opus-88:floors:1-62",
        title: "烈海王似乎打算在幻想乡挑战强者们的样子",
      },
    },
    result: {
      avatars: [
        {
          avatarId: 2001,
          key: "role:烈海王:image:gululu/retsu.png",
          roleId: 1001,
        },
      ],
      roles: [
        {
          key: "role:烈海王",
          roleId: 1001,
        },
      ],
    },
  };
}

function createDirectingPlan(): GululuGalDirectingPlan {
  return {
    entries: [
      {
        annotations: ["figure.pos.center", "figure.anim.enter"],
        eventIndex: 1,
        messageType: "text",
        webgal: { directorNote: "开场说明由烈海王居中发言" },
      },
      {
        annotations: ["figure.clear"],
        eventIndex: 2,
        messageType: "dice",
        webgal: {
          diceRender: {
            content: "数值大的那一方胜利，之后进行伤害判定",
            mode: "anko",
            showFigure: false,
            twoStep: false,
          },
        },
      },
      {
        eventIndex: 3,
        messageType: "dice",
        webgal: {
          diceRender: {
            commandContent: "那么烈啊，你要去往何处呢【1d13：】",
            mode: "anko",
            replyContent: "那么烈啊，你要去往何处呢【1d13：9】",
            showFigure: false,
            twoStep: true,
          },
        },
      },
    ],
    schemaVersion: 1,
  };
}

describe("gululu-gal-directed-import", () => {
  it("解析 GAL directed import CLI 参数", () => {
    const args = parseGululuGalDirectedImportArgs([
      "--apply",
      "--live-result",
      "old.json",
      "--directing-plan",
      "directing.json",
      "--target-space-id",
      "10438",
      "--room-name",
      "1-62楼GAL演出版",
      "--patch-chunk-size",
      "50",
      "--base-url",
      "http://127.0.0.1:8081",
      "--auth-token",
      "token",
    ]);

    expect(args).toMatchObject({
      apply: true,
      authToken: "token",
      baseUrl: "http://127.0.0.1:8081",
      directingPlan: "directing.json",
      liveResult: "old.json",
      patchChunkSize: 50,
      roomName: "1-62楼GAL演出版",
      targetSpaceId: 10438,
    });
  });

  it("把显式导演计划编译为复用角色和头像的消息请求", () => {
    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), createDirectingPlan(), {
      roomName: "1-62楼GAL演出版",
      targetSpaceId: 10438,
    });

    expect(plan.stats).toEqual({
      diceMessages: 2,
      messages: 3,
      messagesWithAnnotations: 2,
      messagesWithWebgal: 3,
      reusedAvatars: 1,
      reusedRoles: 1,
    });
    expect(plan.reused.roles).toEqual([{ key: "role:烈海王", roleId: 1001 }]);
    expect(plan.messages[0]!.request).toMatchObject({
      annotations: ["figure.pos.center", "figure.anim.enter"],
      avatarId: 2001,
      messageType: MESSAGE_TYPE.TEXT,
      roleId: 1001,
      webgal: {
        directorNote: "开场说明由烈海王居中发言",
        source: {
          eventIndex: 1,
          kind: "gululu",
          originalAssetPath: "gululu/retsu.png",
          originalSpeaker: "烈海王",
          segmentId: "1",
        },
      },
    });
    expect(plan.messages[1]!.request).toMatchObject({
      annotations: ["figure.clear"],
      customRoleName: "骰娘",
      extra: {
        diceResult: { result: "数值大的那一方胜利，之后进行伤害判定" },
        diceTurn: {
          replies: [{ content: "数值大的那一方胜利，之后进行伤害判定", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
      roleId: -1,
      webgal: {
        diceRender: {
          content: "数值大的那一方胜利，之后进行伤害判定",
          mode: "anko",
          showFigure: false,
          twoStep: false,
        },
      },
    });
    expect(plan.messages[2]!.request).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：】",
      extra: {
        diceResult: { result: "那么烈啊，你要去往何处呢【1d13：9】" },
        diceTurn: {
          command: "那么烈啊，你要去往何处呢【1d13：】",
          replies: [{ content: "那么烈啊，你要去往何处呢【1d13：9】", customRoleName: "骰娘" }],
        },
      },
      webgal: {
        diceRender: {
          commandContent: "那么烈啊，你要去往何处呢【1d13：】",
          replyContent: "那么烈啊，你要去往何处呢【1d13：9】",
        },
      },
    });
  });

  it("导演计划未真实拆分骰子过程和结果时保留源导入拆分", () => {
    const directingPlan = createDirectingPlan();
    directingPlan.entries[2]!.webgal = {
      diceRender: {
        commandContent: "那么烈啊，你要去往何处呢【1d13:9】",
        mode: "anko",
        replyContent: "那么烈啊，你要去往何处呢【1d13:9】",
        twoStep: false,
      },
    };

    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages[2]!.request).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：】",
      extra: {
        diceResult: { result: "那么烈啊，你要去往何处呢【1d13:9】" },
        diceTurn: {
          command: "那么烈啊，你要去往何处呢【1d13：】",
          replies: [{ content: "那么烈啊，你要去往何处呢【1d13:9】", customRoleName: "骰娘" }],
        },
      },
      webgal: {
        diceRender: {
          commandContent: "那么烈啊，你要去往何处呢【1d13：】",
          replyContent: "那么烈啊，你要去往何处呢【1d13:9】",
        },
      },
    });
  });

  it("导演计划必须覆盖每条源消息", () => {
    const directingPlan = createDirectingPlan();
    directingPlan.entries.pop();

    expect(() => buildGululuGalDirectedImportPlan(createLiveResult(), directingPlan, {
      targetSpaceId: 10438,
    })).toThrow("导演计划条数不匹配");
  });

  it("apply 会创建新房间、复用角色并批量写入带 annotations/webgal 的消息", async () => {
    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), createDirectingPlan(), {
      roomName: "1-62楼GAL演出版",
      targetSpaceId: 10438,
    });
    const calls: string[] = [];
    const setSidebarTree = vi.fn(async (request: { treeJson: string }) => ({
      data: { treeJson: request.treeJson, version: 2 },
      success: true,
    }));
    const client = {
      chatController: {
        patchRoomMessages: vi.fn(async (request: { operations: any[]; roomId: number }) => {
          calls.push(`patch:${request.roomId}:${request.operations.length}`);
          return {
            data: request.operations.map((_operation, index) => ({
              messageId: 3000 + index,
              syncId: index + 1,
            })),
            success: true,
          };
        }),
      },
      roomController: {
        getUserRooms: vi.fn(async () => ({
          data: {
            rooms: [{ name: "1-62楼GAL演出版", roomId: 9001 }],
            spaceId: 10438,
          },
          success: true,
        })),
      },
      roomRoleController: {
        addRole: vi.fn(async (request: { roleIdList: number[] }) => {
          calls.push(`role.add:${request.roleIdList.join(",")}`);
          return { success: true };
        }),
        roomNpcRole: vi.fn(async () => {
          calls.push("role.list");
          return { data: [], success: true };
        }),
      },
      spaceController: {
        createRoom: vi.fn(async () => {
          calls.push("room.create");
          return { data: { name: "1-62楼GAL演出版", roomId: 9001, spaceId: 10438 }, success: true };
        }),
      },
      spaceSidebarTreeController: {
        getSidebarTree: vi.fn(async () => ({
          data: {
            treeJson: JSON.stringify({ categories: [], schemaVersion: 2 }),
            version: 1,
          },
          success: true,
        })),
        setSidebarTree,
      },
    };

    const result = await applyGululuGalDirectedImportPlan(plan, client, { patchChunkSize: 2 });

    expect(calls).toEqual(["room.create", "role.list", "role.add:1001", "patch:9001:2", "patch:9001:1"]);
    expect(result.createdRoom).toEqual({ name: "1-62楼GAL演出版", roomId: 9001, spaceId: 10438 });
    expect(result.messages).toHaveLength(3);
    expect(result.roomRoles.addedRoleIds).toEqual([1001]);
    expect(result.sidebarTree).toMatchObject({ action: "added", roomId: 9001, spaceId: 10438 });
    expect(client.chatController.patchRoomMessages.mock.calls[0]![0].operations[0].message).toMatchObject({
      annotations: ["figure.pos.center", "figure.anim.enter"],
      avatarId: 2001,
      roleId: 1001,
      webgal: {
        directorNote: "开场说明由烈海王居中发言",
      },
    });
    expect(client.chatController.patchRoomMessages.mock.calls[0]![0].operations[1].message).toMatchObject({
      messageType: MESSAGE_TYPE.DICE,
      webgal: {
        diceRender: {
          mode: "anko",
        },
      },
    });
  });
});
