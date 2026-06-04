import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it, vi } from "vitest";

import {
  applyGululuLiveImportPlan,
  buildGululuLiveImportPlan,
  ensureRoomInSidebarTree,
  parseLiveImportArgs,
  runGululuAuthoringLiveImport,
} from "./gululu-authoring-live-import";

function createImportPackage() {
  return {
    messages: [
      {
        content: "用消力化解！",
        floor: 1,
        imagePath: "gululu/retsu.png",
        kind: "dialog" as const,
        roleName: "烈海王",
        sourceTime: "2022-01-22 20:38",
        speakerName: "烈",
      },
      {
        content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
        floor: 1,
        kind: "dice" as const,
      },
      {
        content: "【1d100:90】",
        diceDescription: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
        floor: 1,
        kind: "dice" as const,
      },
      {
        bgmName: "远野幻想物语",
        content: "BGM：远野幻想物语",
        floor: 1,
        kind: "bgm" as const,
      },
    ],
    roles: [
      {
        aliases: [{ count: 1, name: "烈" }],
        avatarImages: [{ count: 1, firstFloor: 1, imagePath: "gululu/retsu.png" }],
        defaultAvatarPath: "gululu/retsu.png",
        name: "烈海王",
      },
    ],
    source: {
      floorCount: 1,
      fromFloor: 1,
      title: "烈海王似乎打算在幻想乡挑战强者们的样子",
      toFloor: 1,
    },
  };
}

describe("gululu-authoring-live-import", () => {
  it("解析 live import CLI 参数", () => {
    const args = parseLiveImportArgs([
      "--apply",
      "--skip-avatar-upload",
      "--input",
      "import.json",
      "--target-room-id",
      "62",
      "--target-space-id",
      "88",
      "--dicer-role-id",
      "2",
      "--dicer-avatar-id",
      "3",
      "--base-url",
      "http://localhost:8081",
      "--auth-token",
      "token",
    ]);

    expect(args).toMatchObject({
      apply: true,
      authToken: "token",
      baseUrl: "http://localhost:8081",
      dicerAvatarId: 3,
      dicerRoleId: 2,
      input: "import.json",
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 88,
    });
  });

  it("会生成复用通用原语的真实导入计划", () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      opusId: 88,
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });

    expect(plan.source).toMatchObject({
      key: "opus-88:floors:1-1",
      workId: "opus-88",
    });
    expect(plan.roles).toEqual([
      expect.objectContaining({
        createRoleRequest: expect.objectContaining({
          roleName: "烈海王",
          spaceId: 8801,
          type: 2,
        }),
        key: "role:烈海王",
      }),
    ]);
    expect(plan.avatars).toEqual([
      expect.objectContaining({
        avatarTitle: { label: "默认" },
        imagePath: "gululu/retsu.png",
        key: "role:烈海王:image:gululu/retsu.png",
        upload: false,
      }),
    ]);

    const dialog = plan.messages[0]!;
    expect(dialog).toMatchObject({
      avatarKey: "role:烈海王:image:gululu/retsu.png",
      kind: "dialog",
      roleKey: "role:烈海王",
      request: {
        content: "用消力化解！",
        customRoleName: "烈",
        messageType: MESSAGE_TYPE.TEXT,
        roomId: 62,
      },
    });

    const descriptionOnlyDice = plan.messages[1]!;
    expect(descriptionOnlyDice.request).toMatchObject({
      content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
      customRoleName: "骰娘",
      messageType: MESSAGE_TYPE.TEXT,
      roleId: -1,
    });

    const dice = plan.messages[2]!;
    expect(dice.request).toMatchObject({
      content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避\n【1d100:90】",
      customRoleName: "骰娘",
      extra: {
        diceResult: { result: "【1d100:90】" },
        diceTurn: {
          replies: [{ content: "【1d100:90】", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });

    expect(plan.messages[3]!.request).toMatchObject({
      content: "[BGM] 远野幻想物语",
      customRoleName: "BGM",
      messageType: MESSAGE_TYPE.TEXT,
    });
    expect(plan.warnings).toEqual(["BGM 暂以文本事件保留：远野幻想物语"]);
  });

  it("dry-run 只写计划文件，不调用 live client", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-live-import-"));
    try {
      const inputPath = path.join(tempDir, "opus-88-floors-1-1.tuanchat-replay-import.json");
      const outputPath = path.join(tempDir, "plan.json");
      await writeFile(inputPath, `${JSON.stringify(createImportPackage(), null, 2)}\n`, "utf8");

      const result = await runGululuAuthoringLiveImport([
        "--input",
        inputPath,
        "--out",
        outputPath,
        "--target-room-id",
        "62",
        "--target-space-id",
        "8801",
        "--skip-avatar-upload",
        "--opus-id",
        "88",
      ]);

      const written = JSON.parse(await readFile(outputPath, "utf8"));
      expect(result.outputPath).toBe(path.resolve(outputPath));
      expect(result.result).toBeUndefined();
      expect(written.stats).toMatchObject({
        avatars: 1,
        messages: 4,
        roles: 1,
      });
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });

  it("apply 会按角色、房间角色、头像、消息的通用 API 顺序执行", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: false,
      sourceRoot: "D:/fixture",
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const calls: string[] = [];
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn(async (request) => {
          calls.push(`avatar.create:${request.roleId}`);
          return { data: 2001, success: true };
        }),
        updateRoleAvatar: vi.fn(async (request) => {
          calls.push(`avatar.update:${request.avatarId}:${request.avatarFileId ?? "no-media"}`);
          return { data: request, success: true };
        }),
      },
      chatController: {
        sendMessage1: vi.fn(async (request) => {
          calls.push(`message:${request.messageType}:${request.roleId ?? "none"}:${request.avatarId ?? "none"}`);
          return { data: { messageId: calls.length + 1000 }, success: true };
        }),
      },
      roleController: {
        createRole: vi.fn(async (request) => {
          calls.push(`role.create:${request.roleName}`);
          return { data: 1001, success: true };
        }),
      },
      roomRoleController: {
        addRole: vi.fn(async (request) => {
          calls.push(`roomRole.add:${request.roleIdList.join(",")}`);
          return { success: true };
        }),
        roomNpcRole: vi.fn(async () => {
          calls.push("roomRole.list");
          return { data: [], success: true };
        }),
      },
    };

    const result = await applyGululuLiveImportPlan(plan, client, {
      uploadAvatarImage: vi.fn(async ({ filePath }) => {
        calls.push(`media.upload:${filePath}`);
        return 3001;
      }),
    });

    expect(calls).toEqual([
      "roomRole.list",
      "role.create:烈海王",
      "roomRole.add:1001",
      "avatar.create:1001",
      "avatar.update:2001:no-media",
      "message:1:1001:2001",
      "message:1:-1:-1",
      "message:6:-1:-1",
      "message:1:-1:-1",
    ]);
    expect(result.roles).toEqual([{ action: "created", key: "role:烈海王", roleId: 1001 }]);
    expect(client.chatController.sendMessage1).toHaveBeenCalledTimes(4);
    expect(client.chatController.sendMessage1.mock.calls[2]![0]).toMatchObject({
      content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避\n【1d100:90】",
      extra: {
        diceTurn: {
          replies: [{ content: "【1d100:90】", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });
  });

  it("apply 会复用同名 NPC 角色并避免重复拉入房间", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn(async (_request: unknown) => ({ data: 2001, success: true })),
        updateRoleAvatar: vi.fn(async request => ({ data: request, success: true })),
      },
      chatController: {
        sendMessage1: vi.fn(async (_request: unknown) => ({ data: { messageId: 1 }, success: true })),
      },
      roleController: {
        createRole: vi.fn(async (_request: unknown) => ({ data: 0, success: true })),
      },
      roomRoleController: {
        addRole: vi.fn(async (_request: unknown) => ({ success: true })),
        roomNpcRole: vi.fn(async () => ({
          data: [{ roleId: 1001, roleName: "烈海王", type: 2, userId: 7 }],
          success: true,
        })),
      },
    };

    const result = await applyGululuLiveImportPlan(plan, client);

    expect(result.roles).toEqual([{ action: "reused", key: "role:烈海王", roleId: 1001 }]);
    expect(client.roleController.createRole).not.toHaveBeenCalled();
    expect(client.roomRoleController.addRole).not.toHaveBeenCalled();
    expect(client.chatController.sendMessage1.mock.calls[0]![0]).toMatchObject({
      avatarId: 2001,
      roleId: 1001,
    });
  });

  it("ensureRoomInSidebarTree 会把导入房间追加到频道分类", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const setSidebarTree = vi.fn(async (request: { treeJson: string }) => ({
      data: { treeJson: request.treeJson, version: 8 },
      success: true,
    }));
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn(),
        updateRoleAvatar: vi.fn(),
      },
      chatController: {
        sendMessage1: vi.fn(),
      },
      roleController: {
        createRole: vi.fn(),
      },
      roomController: {
        getUserRooms: vi.fn(async () => ({
          data: {
            rooms: [
              { name: "旧房间", roomId: 1 },
              { name: "1-62楼复刻导入", roomId: 62 },
            ],
            spaceId: 8801,
          },
          success: true,
        })),
      },
      roomRoleController: {
        addRole: vi.fn(),
        roomNpcRole: vi.fn(),
      },
      spaceSidebarTreeController: {
        getSidebarTree: vi.fn(async () => ({
          data: {
            treeJson: JSON.stringify({
              categories: [{
                categoryId: "cat:channels",
                items: [{ fallbackTitle: "旧房间", nodeId: "room:1", targetId: 1, type: "room" }],
                name: "频道",
              }],
              schemaVersion: 2,
            }),
            version: 7,
          },
          success: true,
        })),
        setSidebarTree,
      },
    };

    const result = await ensureRoomInSidebarTree(plan, client);

    expect(result).toEqual({
      action: "added",
      roomId: 62,
      spaceId: 8801,
      version: 8,
    });
    expect(setSidebarTree).toHaveBeenCalledWith(expect.objectContaining({
      expectedVersion: 7,
      spaceId: 8801,
    }));
    const writtenTree = JSON.parse(setSidebarTree.mock.calls[0]![0].treeJson);
    expect(writtenTree.categories[0].items).toEqual([
      { fallbackTitle: "旧房间", nodeId: "room:1", targetId: 1, type: "room" },
      { fallbackTitle: "1-62楼复刻导入", nodeId: "room:62", targetId: 62, type: "room" },
    ]);
  });

  it("ensureRoomInSidebarTree 已存在导入房间时不会重复写侧边栏", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn(),
        updateRoleAvatar: vi.fn(),
      },
      chatController: {
        sendMessage1: vi.fn(),
      },
      roleController: {
        createRole: vi.fn(),
      },
      roomRoleController: {
        addRole: vi.fn(),
        roomNpcRole: vi.fn(),
      },
      spaceSidebarTreeController: {
        getSidebarTree: vi.fn(async () => ({
          data: {
            treeJson: JSON.stringify({
              categories: [{
                categoryId: "cat:channels",
                items: [{ fallbackTitle: "1-62楼复刻导入", nodeId: "room:62", targetId: 62, type: "room" }],
                name: "频道",
              }],
              schemaVersion: 2,
            }),
            version: 9,
          },
          success: true,
        })),
        setSidebarTree: vi.fn(),
      },
    };

    const result = await ensureRoomInSidebarTree(plan, client);

    expect(result).toEqual({
      action: "already-present",
      roomId: 62,
      spaceId: 8801,
      version: 9,
    });
    expect(client.spaceSidebarTreeController.setSidebarTree).not.toHaveBeenCalled();
  });
});
