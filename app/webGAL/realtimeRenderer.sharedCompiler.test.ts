import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Room, UserRole } from "../../api";

import { RealtimeRenderer } from "./realtimeRenderer";

const manageGameControllerEditTextFile = vi.fn(async () => ({}));
const { fetchRoleAvatarWithCache } = vi.hoisted(() => ({
  fetchRoleAvatarWithCache: vi.fn(async (_queryClient: unknown, avatarId: number) => ({
    data: { data: { avatarId, roleId: avatarId === 22 ? 2 : 1, spriteFileId: avatarId === 22 ? 4096 : 2048 } },
  })),
}));

vi.mock("@/webGAL/index", () => ({
  checkGameExist: vi.fn(async () => true),
  getTerreApis: () => ({
    manageGameControllerEditTextFile,
  }),
}));

vi.mock("../../api/hooks/RoleAndAvatarHooks", () => ({
  fetchRoleAvatarWithCache,
}));

vi.mock("./fileOperator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fileOperator")>();
  return {
    ...actual,
    getFileExtensionFromUrl: vi.fn(() => "webp"),
    uploadFile: vi.fn(async (_url: string, _path: string, fileName?: string) => fileName ?? "uploaded.webp"),
  };
});

function room(roomId: number, name: string): Room {
  return {
    roomId,
    name,
    status: 0,
  };
}

function role(roleId: number, roleName: string): UserRole {
  return {
    roleId,
    roleName,
    userId: 1,
    type: 0,
  };
}

function message(overrides: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: overrides.messageId ?? 1,
      syncId: overrides.syncId ?? overrides.messageId ?? 1,
      roomId: overrides.roomId ?? 10,
      userId: 1,
      roleId: overrides.roleId ?? 1,
      content: overrides.content ?? "",
      status: overrides.status ?? 0,
      messageType: overrides.messageType ?? MESSAGE_TYPE.TEXT,
      position: overrides.position ?? overrides.messageId ?? 1,
      annotations: overrides.annotations,
      extra: overrides.extra,
      customRoleName: overrides.customRoleName,
      avatarId: overrides.avatarId,
      webgal: overrides.webgal,
    },
  };
}

describe("realtimeRenderer shared compiler full render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    RealtimeRenderer.destroyInstance();
  });

  it("会让纯 publishable 历史消息直接走 shared compiler 全量写场景", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        roomId: 10,
        roleId: 1,
        content: "你好",
        messageType: MESSAGE_TYPE.TEXT,
      }),
    ], 10);

    expect(manageGameControllerEditTextFile).toHaveBeenCalledTimes(1);
    expect((renderer as any).messageLineMap.size).toBe(1);
    const range = (renderer as any).messageLineMap.get("10_1");
    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(sceneText).toContain("明日香: 你好;");
    expect(sceneText.split("\n")[range.startLine - 1]).toBe("明日香: 你好;");
  });

  it("历史全量渲染第一句带消息 avatarId 和 figure.pos 时会先输出 changeFigure", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const queryClient = {
      getQueryData: vi.fn((key: unknown[]) => {
        const avatarId = Number(key[1]);
        return avatarId === 11 ? { data: { avatarId: 11, roleId: 1, spriteFileId: 2048 } } : undefined;
      }),
    };

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([{ ...role(1, "明日香"), avatarId: 11 }]);
    renderer.setQueryClient(queryClient as any);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 1,
        avatarId: 11,
        content: "第一句",
        messageType: MESSAGE_TYPE.TEXT,
        annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
      }),
    ], 10);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    const figureIndex = sceneText.indexOf("changeFigure:");
    const dialogIndex = sceneText.indexOf("明日香: 第一句 -figureId=1;");
    expect(figureIndex).toBeGreaterThanOrEqual(0);
    expect(dialogIndex).toBeGreaterThan(figureIndex);
    expect(sceneText).toContain("changeFigure:");
  });

  it("遇到 preview-only 消息时仍会回退到旧的 runtime full render", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        roomId: 10,
        roleId: 0,
        content: ".combat start",
        messageType: MESSAGE_TYPE.STATE_EVENT,
        extra: {
          stateEvent: {
            source: {
              kind: "command",
              commandName: "combat",
              parserVersion: "state-event-v1",
            },
            events: [{ type: "combatRoundStart" }],
          },
        },
      }),
    ], 10);

    expect(manageGameControllerEditTextFile).toHaveBeenCalledTimes(2);
    expect((renderer as any).messageLineMap.size).toBeGreaterThan(0);
  });

  it("实时追加同一角色不同 avatarId 时会切换差分立绘", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const queryClient = {
      getQueryData: vi.fn((key: unknown[]) => {
        const avatarId = Number(key[1]);
        if (avatarId === 11) {
          return { data: { avatarId: 11, roleId: 1, spriteFileId: 2048 } };
        }
        if (avatarId === 12) {
          return { data: { avatarId: 12, roleId: 1, spriteFileId: 4096 } };
        }
        return undefined;
      }),
    };

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([{ ...role(1, "明日香"), avatarId: 11 }]);
    renderer.setQueryClient(queryClient as any);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 1,
      avatarId: 11,
      content: "默认表情",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
    }), 10, false);
    await renderer.appendMessage(message({
      messageId: 2,
      roomId: 10,
      roleId: 1,
      avatarId: 12,
      content: "笑脸差分",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
    }), 10, false);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(sceneText).toContain("changeFigure:role_1/sprite_11.webp");
    expect(sceneText).toContain("changeFigure:role_1/sprite_12.webp");
    expect(sceneText).toContain("明日香: 笑脸差分 -figureId=1;");
  });

  it("实时追加只有 figure.pos 但缺少消息 avatarId 时不会显示立绘", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const queryClient = {
      getQueryData: vi.fn((key: unknown[]) => {
        const avatarId = Number(key[1]);
        return avatarId === 11 ? { data: { avatarId: 11, roleId: 1, spriteFileId: 2048 } } : undefined;
      }),
    };

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([{ ...role(1, "明日香"), avatarId: 11, avatarFileId: 9001, avatarMediaType: "image" }]);
    renderer.setQueryClient(queryClient as any);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 3,
      roomId: 10,
      roleId: 1,
      content: "没有消息差分",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
    }), 10, false);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(sceneText).not.toContain("changeFigure:role_1/sprite_11.webp");
    expect(sceneText).not.toContain("changeFigure:role_avatar_1.webp");
    expect(sceneText).not.toContain("-figureId=1");
    expect(sceneText).toContain("明日香: 没有消息差分;");
  });

  it("历史全量渲染会为未缓存的消息 avatarId 拉取差分并输出对应立绘", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const queryClient = {
      getQueryData: vi.fn(() => undefined),
    };

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "降星驰"), role(2, "vector")]);
    renderer.setQueryClient(queryClient as any);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 1,
        avatarId: 11,
        content: "测试说话人聚焦",
        messageType: MESSAGE_TYPE.TEXT,
        annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
      }),
      message({
        messageId: 2,
        roomId: 10,
        roleId: 2,
        avatarId: 22,
        content: "说话人聚焦，就是常见的，正在说话的人高亮",
        messageType: MESSAGE_TYPE.TEXT,
        annotations: [ANNOTATION_IDS.FIGURE_POS_RIGHT],
      }),
    ], 10);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(fetchRoleAvatarWithCache).toHaveBeenCalledWith(queryClient, 22);
    expect(sceneText).toContain("changeFigure:role_2/sprite_22.webp");
    expect(sceneText).toContain("vector: 说话人聚焦，就是常见的，正在说话的人高亮 -figureId=5;");
  });

  it("历史全量渲染会复用 getRoleAvatars 列表缓存里的消息差分", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const queryClient = {
      getQueryData: vi.fn((key: unknown[]) => {
        if (key[0] === "getRoleAvatar") {
          return undefined;
        }
        if (key[0] === "getRoleAvatars" && key[1] === 2) {
          return {
            data: [
              { avatarId: 22, roleId: 2, spriteFileId: 4096 },
            ],
          };
        }
        return undefined;
      }),
    };

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "降星驰"), role(2, "vector")]);
    renderer.setQueryClient(queryClient as any);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 2,
        avatarId: 22,
        content: "正常显示",
        messageType: MESSAGE_TYPE.TEXT,
        annotations: [ANNOTATION_IDS.FIGURE_POS_RIGHT],
      }),
    ], 10);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(fetchRoleAvatarWithCache).not.toHaveBeenCalledWith(queryClient, 22);
    expect(sceneText).toContain("changeFigure:role_2/sprite_22.webp");
    expect(sceneText).toContain("vector: 正常显示 -figureId=5;");
  });

  it("实时追加 TRPG 骰子时会生成 trpgDice 覆盖卡片", async () => {
    const renderer = RealtimeRenderer.getInstance(42);

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 3,
      roomId: 10,
      roleId: 1,
      content: "射击检定：D100=2/90 极难成功",
      messageType: MESSAGE_TYPE.DICE,
      webgal: {
        diceRender: {
          mode: "trpg",
          content: "射击检定：D100=2/90 极难成功",
        },
      },
    }), 10, false);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(sceneText).toContain("trpgDice:射击检定：D100=2/90 极难成功 -next;");
    expect(sceneText).toContain("playEffect:./game/se/nettimato-rolling-dice-1.wav -next;");
    expect(sceneText).not.toContain("dice:");
    expect(sceneText).not.toContain("pixiPerform:");
  });
});
