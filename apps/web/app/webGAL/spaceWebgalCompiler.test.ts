import { describe, expect, it } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { mediaFileUrl } from "@/utils/mediaUrl";

import type { MessageExtra, RoleAvatar, Room, UserRole } from "../../api";

import { renderWebgalPublishPackage } from "./publishRenderer";
import {
  buildConfigContent,
  buildRoomSceneCompilation,
  buildWebgalSceneName,
} from "./spaceWebgalCompiler";
import { buildSpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";

function getFileContent(files: Awaited<ReturnType<typeof renderWebgalPublishPackage>>["files"], path: string): string {
  const file = files.find(entry => entry.path === path);
  expect(file).toBeTruthy();
  return file!.content;
}

function variantGroup(baseAvatarId = 11) {
  return {
    variantId: 100,
    roleId: 1,
    name: "校服",
    baseAvatarId,
    compositionConfig: {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 12, y: 34, width: 256, height: 256 },
      output: { format: "webp" },
    },
  };
}

type AuthoredDiceExtra = MessageExtra & {
  authoredDice: {
    options?: string[];
    result: string;
  };
};

describe("spaceWebgalCompiler", () => {
  it("会统一 preview 和 publish 的房间场景名清洗规则", () => {
    expect(buildWebgalSceneName(10, " 起点 / 第一幕 ")).toBe("room_10");
  });

  it("会让共享 config 投影与最终发布包保持一致", async () => {
    const snapshot = buildSpaceWebgalInputSnapshot({
      spaceId: 42,
      spaceName: "测试空间",
      rooms: [{ roomId: 10, name: "序章", status: 0 }],
      messagesByRoomId: { 10: [] },
      gameConfig: {
        baseTemplate: "black",
        gameIconFromRoomAvatarEnabled: false,
        gameNameFromRoomNameEnabled: true,
        titleImageFileId: 1001,
        startupLogoFileId: 1002,
        typingSoundEnabled: true,
        typingSoundSeFileId: 1003,
        typingSoundSeMediaType: "audio",
      },
      rawGameConfig: "Description:旧描述;",
    });

    const projectedConfig = buildConfigContent(snapshot);
    const pkg = await renderWebgalPublishPackage(snapshot);

    expect(getFileContent(pkg.files, "game/config.txt")).toBe(projectedConfig);
    expect(projectedConfig).toContain("Game_name:测试空间_42;");
    expect(projectedConfig).toContain(`Title_img:${mediaFileUrl(1001, "image", "medium")};`);
    expect(projectedConfig).toContain(`Game_Logo:${mediaFileUrl(1002, "image", "medium")};`);
    expect(projectedConfig).toContain(`TypingSoundSe:${mediaFileUrl(1003, "audio", "low")};`);
  });

  it("会把共享静态场景编译结果和最终立绘状态一起产出", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>([[11, {
      avatarId: 11,
      roleId: 1,
      spriteFileId: 2048,
      avatarFileId: 3001,
      webgalSpritePath: "role_1/sprite_11.webp",
    } as RoleAvatar]]);

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          avatarId: 11,
          content: "你好",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
        },
      }],
      {
        startRoomIds: [],
        links: {},
        endNodeIds: [],
        endNodeIncomingRoomIds: {},
      },
      roomMap,
      roomId => buildWebgalSceneName(roomId, "序章"),
      roleMap,
      avatarMap,
    );

    expect(scene.content).toContain("changeBg:none -next;");
    expect(scene.content).toContain("changeFigure:");
    expect(scene.lastFigureSlotId).toBe("1");
    expect(scene.renderedFigures.get("1")?.fileName).toBe("role_1/sprite_11.webp");
  });

  it("同一角色连续消息使用不同 avatarId 时会切换差分立绘", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>([
      [11, {
        avatarId: 11,
        roleId: 1,
        spriteFileId: 2048,
        avatarFileId: 3001,
        webgalSpritePath: "role_1/sprite_11.webp",
      } as RoleAvatar],
      [12, {
        avatarId: 12,
        roleId: 1,
        spriteFileId: 4096,
        avatarFileId: 3002,
        webgalSpritePath: "role_1/sprite_12.webp",
      } as RoleAvatar],
    ]);

    const scene = buildRoomSceneCompilation(
      room,
      [
        {
          message: {
            messageId: 1,
            syncId: 1,
            roomId: 10,
            userId: 1,
            roleId: 1,
            avatarId: 11,
            content: "默认表情",
            status: 0,
            messageType: MESSAGE_TYPE.TEXT,
            position: 1,
            annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
          },
        },
        {
          message: {
            messageId: 2,
            syncId: 2,
            roomId: 10,
            userId: 1,
            roleId: 1,
            avatarId: 12,
            content: "笑脸差分",
            status: 0,
            messageType: MESSAGE_TYPE.TEXT,
            position: 2,
            annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
          },
        },
      ],
      {
        startRoomIds: [],
        links: {},
        endNodeIds: [],
        endNodeIncomingRoomIds: {},
      },
      roomMap,
      roomId => buildWebgalSceneName(roomId, "序章"),
      roleMap,
      avatarMap,
    );

    expect(scene.content).toContain("changeFigure:role_1/sprite_11.webp");
    expect(scene.content).toContain("changeFigure:role_1/sprite_12.webp");
    expect(scene.renderedFigures.get("1")?.fileName).toBe("role_1/sprite_12.webp");
  });

  it("静态场景编译会对有效立绘组输出 composeFigure 和 changeFigure -composite", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>([
      [11, {
        avatarId: 11,
        roleId: 1,
        variantId: 100,
        variantGroup: variantGroup(11),
        spriteFileId: 2048,
        avatarFileId: 3001,
        webgalSpritePath: "role_1/base_11_2048.webp",
      } as RoleAvatar],
      [12, {
        avatarId: 12,
        roleId: 1,
        variantId: 100,
        variantGroup: variantGroup(11),
        spriteFileId: 4096,
        avatarFileId: 3002,
        webgalAvatarLayerPath: "role_1/avatar_12_3002.webp",
        avatarCropContext: {
          sourceWidth: 1000,
          sourceHeight: 1600,
          crop: { x: 12, y: 34, width: 256, height: 256 },
        },
      } as RoleAvatar],
    ]);

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          avatarId: 12,
          content: "笑脸差分",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
        },
      }],
      {
        startRoomIds: [],
        links: {},
        endNodeIds: [],
        endNodeIncomingRoomIds: {},
      },
      roomMap,
      roomId => buildWebgalSceneName(roomId, "序章"),
      roleMap,
      avatarMap,
    );

    const composeIndex = scene.content.indexOf("composeFigure:");
    const changeIndex = scene.content.indexOf("changeFigure:");
    expect(composeIndex).toBeGreaterThanOrEqual(0);
    expect(changeIndex).toBeGreaterThan(composeIndex);
    expect(scene.content).toContain(`"src":"role_1/base_11_2048.webp"`);
    expect(scene.content).toContain(`"src":"role_1/avatar_12_3002.webp","x":12,"y":34,"width":256,"height":256`);
    expect(scene.content).toContain(" -composite -id=1 ");
    expect(scene.content).toContain("明日香: 笑脸差分 -figureId=1;");
    expect(scene.renderedFigures.get("1")?.fileName).toContain("avatar:12:3002");
  });

  it("静态场景编译缺少 spriteFileId 时会和实时追加一样使用 originFileId", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>([[11, {
      avatarId: 11,
      roleId: 1,
      avatarFileId: 3001,
      originFileId: 8192,
      webgalSpritePath: "role_1/sprite_11.webp",
    } as RoleAvatar]]);

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          avatarId: 11,
          content: "原图差分",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
        },
      }],
      {
        startRoomIds: [],
        links: {},
        endNodeIds: [],
        endNodeIncomingRoomIds: {},
      },
      roomMap,
      roomId => buildWebgalSceneName(roomId, "序章"),
      roleMap,
      avatarMap,
    );

    expect(scene.content).toContain("changeFigure:role_1/sprite_11.webp");
  });

  it("静态场景编译只有 figure.pos 但缺少消息 avatarId 时不会输出立绘", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, {
      roleId: 1,
      userId: 1,
      roleName: "明日香",
      avatarId: 11,
      avatarFileId: 3001,
      avatarMediaType: "image",
      type: 0,
    }]]);
    const avatarMap = new Map<number, RoleAvatar>([[11, {
      avatarId: 11,
      roleId: 1,
      spriteFileId: 2048,
      avatarFileId: 3001,
    } as RoleAvatar]]);

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          content: "没有消息差分",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
        },
      }],
      {
        startRoomIds: [],
        links: {},
        endNodeIds: [],
        endNodeIncomingRoomIds: {},
      },
      roomMap,
      roomId => buildWebgalSceneName(roomId, "序章"),
      roleMap,
      avatarMap,
    );

    expect(scene.content).not.toContain(`changeFigure:${mediaFileUrl(2048, "image", "medium")}`);
    expect(scene.content).not.toContain(`changeFigure:${mediaFileUrl(3001, "image", "medium")}`);
    expect(scene.content).not.toContain("-figureId=1");
    expect(scene.content).toContain("明日香: 没有消息差分;");
  });

  it("静态场景编译会把历史骰子和选项作为已创作文本导出", () => {
    const room = { roomId: 10, name: "骰子", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 0,
          content: "",
          status: 0,
          messageType: MESSAGE_TYPE.DICE,
          position: 1,
          extra: {
            authoredDice: {
              result: "神子的急救【1d100:90】",
              options: ["1 需要永琳", "2 不需要永琳"],
            },
            diceResult: { result: "神子的急救【1d100:90】" },
          } as AuthoredDiceExtra,
        },
      }],
      {
        startRoomIds: [],
        links: {},
        endNodeIds: [],
        endNodeIncomingRoomIds: {},
      },
      roomMap,
      roomId => buildWebgalSceneName(roomId, "骰子"),
      new Map(),
      new Map(),
    );

    expect(scene.content).toContain(":神子的急救【1d100：90】|1 需要永琳|2 不需要永琳;");
  });
});
