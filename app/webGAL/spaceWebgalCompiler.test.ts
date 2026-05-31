import { describe, expect, it } from "vitest";

import type { RoleAvatar, Room, UserRole } from "../../api";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { mediaFileUrl } from "@/utils/mediaUrl";

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

describe("spaceWebgalCompiler", () => {
  it("会统一 preview 和 publish 的房间场景名清洗规则", () => {
    expect(buildWebgalSceneName(10, " 起点 / 第一幕 ")).toBe("起点___第一幕_10");
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
        titleImageUrl: "https://legacy.example/title.webp",
        startupLogoFileId: 1002,
        startupLogoUrl: "https://legacy.example/logo.webp",
        typingSoundEnabled: true,
        typingSoundSeFileId: 1003,
        typingSoundSeMediaType: "audio",
        typingSoundSeUrl: "https://legacy.example/typing.webm",
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
    expect(scene.renderedFigures.get("1")?.fileName).toBe(mediaFileUrl(2048, "image", "medium"));
  });
});
