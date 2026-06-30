import { describe, expect, it } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { mediaFileUrl } from "@/utils/media/mediaUrl";

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

function externalImage(url: string) {
  return {
    source: { kind: "external", url },
    background: false,
    width: 1280,
    height: 720,
    fileName: "image.webp",
  };
}

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

  it("语音消息（SOUND voice）会编译为带配音的角色台词", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>();

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          content: "我来了",
          status: 0,
          messageType: MESSAGE_TYPE.SOUND,
          position: 1,
          annotations: [],
          extra: { soundMessage: { fileId: 5001 } } as unknown as MessageExtra,
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

    expect(scene.content).toContain(`明日香: 我来了 -vocal=${mediaFileUrl(5001, "audio", "low")};`);
  });

  it("语音消息（SOUND voice）无配音时仍编译台词且不挂 -vocal", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>();

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          content: "我来了",
          status: 0,
          messageType: MESSAGE_TYPE.SOUND,
          position: 1,
          annotations: [],
          extra: { soundMessage: {} } as unknown as MessageExtra,
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

    expect(scene.content).toContain("明日香: 我来了;");
    expect(scene.content).not.toContain("-vocal=");
  });

  it("BGM 用途的 SOUND 消息仍编译为 bgm 行而非台词", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
    const roomMap = new Map([[10, room]]);
    const roleMap = new Map<number, UserRole>([[1, { roleId: 1, userId: 1, roleName: "明日香", avatarId: 11, type: 0 }]]);
    const avatarMap = new Map<number, RoleAvatar>();

    const scene = buildRoomSceneCompilation(
      room,
      [{
        message: {
          messageId: 1,
          syncId: 1,
          roomId: 10,
          userId: 1,
          roleId: 1,
          content: "不应作为台词",
          status: 0,
          messageType: MESSAGE_TYPE.SOUND,
          position: 1,
          annotations: [],
          extra: { soundMessage: { fileId: 5002, purpose: "bgm" } } as unknown as MessageExtra,
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

    expect(scene.content).toContain(`bgm:${mediaFileUrl(5002, "audio", "low")}`);
    expect(scene.content).not.toContain("不应作为台词");
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

  it("静态场景编译会把立绘进出场标注紧跟 changeFigure 输出为 setTransition", () => {
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
          content: "带进出场",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [
            ANNOTATION_IDS.FIGURE_POS_LEFT,
            ANNOTATION_IDS.FIGURE_ANIM_BA_ENTER_FROM_LEFT,
            ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_RIGHT,
            ANNOTATION_IDS.FIGURE_ANIM_BA_SHAKE,
          ],
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

    const lines = scene.content.trim().split("\n");
    const changeIndex = lines.findIndex(line => line.startsWith("changeFigure:role_1/sprite_11.webp"));
    expect(changeIndex).toBeGreaterThanOrEqual(0);
    expect(lines[changeIndex]).toContain("-enterDuration=120 -exitDuration=120 -next;");
    expect(lines[changeIndex + 1]).toBe(
      "setTransition: -target=1 -enter=position/ba-enter-from-left -exit=position/ba-exit-to-right -keepOffset -next;",
    );
    expect(lines[changeIndex + 2]).toBe("setAnimation:action/BA-shake -target=1 -keepOffset -restoreTransform -next;");
    expect(scene.content).not.toContain("setAnimation:position/");
  });

  it("静态场景编译会把 message.webgal.transform.alpha 写入立绘 transform", () => {
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
          content: "半透明登场",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
          webgal: { transform: { alpha: 0.6 } },
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

    expect(scene.content).toContain("\"alpha\":0.6");
    expect(scene.content).toContain("-enterDuration=120 -exitDuration=120 -next;");
    expect(scene.content).not.toContain("\"rgl\"");
  });

  it("静态场景编译会在清除立绘前应用出场 transition", () => {
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
      [
        {
          message: {
            messageId: 1,
            syncId: 1,
            roomId: 10,
            userId: 1,
            roleId: 1,
            avatarId: 11,
            content: "登场",
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
            content: "退场",
            status: 0,
            messageType: MESSAGE_TYPE.TEXT,
            position: 2,
            annotations: [
              ANNOTATION_IDS.FIGURE_CLEAR,
              ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_RIGHT,
            ],
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

    const lines = scene.content.trim().split("\n");
    const transitionIndex = lines.findIndex(line =>
      line === "setTransition: -target=1 -exit=position/ba-exit-to-right -keepOffset -next;"
    );
    expect(transitionIndex).toBeGreaterThanOrEqual(0);
    expect(lines[transitionIndex + 1]).toBe("changeFigure:none -id=1 -next;");
  });

  it("静态场景编译会把背景进出场和速度标注写入 changeBg", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
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
          messageType: MESSAGE_TYPE.IMG,
          position: 1,
          annotations: [
            ANNOTATION_IDS.BACKGROUND_ANIM_BLUR_IN,
            ANNOTATION_IDS.BACKGROUND_ANIM_EXIT_TO_LEFT,
            ANNOTATION_IDS.BACKGROUND_SPEED_SLOW,
          ],
          extra: {
            imageMessage: {
              ...externalImage("https://cdn.example.com/bg.webp"),
              background: true,
            },
          } as MessageExtra,
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
      new Map(),
      new Map(),
    );

    expect(scene.content).toContain(
      "changeBg:https://cdn.example.com/bg.webp -enter=background/blur-in-slow -exit=background/exit-to-left-slow -duration=1200 -enterDuration=1200 -exitDuration=1200 -next;",
    );
  });

  it("静态场景编译会把清背景出场和速度标注写入 changeBg:none", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
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
          content: "切到黑场",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [
            ANNOTATION_IDS.BACKGROUND_CLEAR,
            ANNOTATION_IDS.BACKGROUND_ANIM_EXIT_TO_RIGHT,
            ANNOTATION_IDS.BACKGROUND_SPEED_FAST,
          ],
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
      new Map(),
      new Map(),
    );

    const lines = scene.content.trim().split("\n");
    const clearIndex = lines.indexOf("changeBg:none -exit=background/exit-to-right-fast -duration=300 -exitDuration=300 -next;");
    expect(clearIndex).toBeGreaterThanOrEqual(0);
    expect(lines[clearIndex + 1]).toBe(":切到黑场;");
  });

  it("静态场景编译会在消息脚本前输出文本框和电影模式控制", () => {
    const room = { roomId: 10, name: "序章", status: 0 } as Room;
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
          content: "旁白",
          status: 0,
          messageType: MESSAGE_TYPE.TEXT,
          position: 1,
          annotations: [
            ANNOTATION_IDS.SCENE_TEXTBOX_HIDE,
            ANNOTATION_IDS.SCENE_FILM_ON,
          ],
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
      new Map(),
      new Map(),
    );

    expect(scene.content.trim().split("\n")).toEqual([
      "changeBg:none -next;",
      "setTextbox:hide -next;",
      "filmMode:on;",
      ":旁白;",
    ]);
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
    expect(scene.content).toContain("-base=role_1/base_11_2048.webp");
    expect(scene.content).toContain("-layer=role_1/avatar_12_3002.webp,12,34,256,256");
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
