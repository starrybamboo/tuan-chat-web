import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Room, UserRole } from "../../api";

import { RealtimeRenderer } from "./realtimeRenderer";
import { hashString } from "./realtimeRendererFileNames";

const manageGameControllerEditTextFile = vi.fn(async () => ({}));
const { fetchRoleAvatarWithCache, fetchRoleAvatarsWithCache } = vi.hoisted(() => ({
  fetchRoleAvatarWithCache: vi.fn(async (_queryClient: unknown, avatarId: number) => ({
    data: { data: { avatarId, roleId: avatarId === 22 ? 2 : 1, spriteFileId: avatarId === 22 ? 4096 : 2048 } },
  })),
  fetchRoleAvatarsWithCache: vi.fn(async () => ({
    data: [],
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
  fetchRoleAvatarsWithCache,
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
    vi.unstubAllGlobals();
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

  it("点击历史消息跳转时会发送该消息自己的 WebGAL sentence", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 1,
        content: "第一句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
      message({
        messageId: 2,
        roomId: 10,
        roleId: 1,
        content: "第二句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
    ], 10);

    const send = vi.fn();
    const close = vi.fn();
    vi.stubGlobal("WebSocket", { OPEN: 1 });
    (renderer as any).isConnected = true;
    (renderer as any).syncSocket = { readyState: 1, send, close };

    expect(renderer.jumpToMessage(2, 10)).toBe(true);
    const payload = JSON.parse(send.mock.calls[0]?.[0] ?? "{}");
    const range = (renderer as any).messageLineMap.get("10_2");
    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    const sentence = payload.data.sceneMsg.sentence;

    expect(sentence).toBe(range.startLine);
    expect(sentence).toBeGreaterThan(1);
    expect(sceneText.split("\n")[sentence - 1]).toBe("明日香: 第二句;");
  });

  it("局部更新为多行文本后仍会跳转到该消息自己的 WebGAL sentence", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 1,
        content: "第一句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
      message({
        messageId: 2,
        roomId: 10,
        roleId: 1,
        content: "第二句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
    ], 10);

    const send = vi.fn();
    const close = vi.fn();
    vi.stubGlobal("WebSocket", { OPEN: 1 });
    (renderer as any).isConnected = true;
    (renderer as any).syncSocket = { readyState: 1, send, close };

    await expect(renderer.updateAndRerenderMessage(message({
      messageId: 2,
      roomId: 10,
      roleId: 1,
      content: "第二句\n补充一行",
      messageType: MESSAGE_TYPE.TEXT,
    }), 10)).resolves.toBe(true);

    const range = (renderer as any).messageLineMap.get("10_2");
    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    const sceneLines = sceneText.split("\n");
    const payload = JSON.parse(send.mock.calls.at(-1)?.[0] ?? "{}");
    const sentence = payload.data.sceneMsg.sentence;

    expect(payload.data.message).toBe("Sync");
    expect(sentence).toBe(range.startLine);
    expect(range.endLine).toBe(range.startLine);
    expect(sceneLines[sentence - 1]).toBe("明日香: 第二句|补充一行;");
    expect(sceneText).not.toContain("明日香: 第二句\n补充一行;");
  });

  it("局部更新为空文本后会移除该消息跳转映射", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 1,
        content: "第一句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
      message({
        messageId: 2,
        roomId: 10,
        roleId: 1,
        content: "第二句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
    ], 10);

    vi.stubGlobal("WebSocket", { OPEN: 1 });
    (renderer as any).isConnected = true;
    (renderer as any).syncSocket = { readyState: 1, send: vi.fn(), close: vi.fn() };

    await expect(renderer.updateAndRerenderMessage(message({
      messageId: 2,
      roomId: 10,
      roleId: 1,
      content: "",
      messageType: MESSAGE_TYPE.TEXT,
    }), 10)).resolves.toBe(true);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect((renderer as any).messageLineMap.has("10_2")).toBe(false);
    expect(renderer.jumpToMessage(2, 10)).toBe(false);
    expect(sceneText).not.toContain("明日香: 第二句;");
  });

  it("WebSocket 暂未连接时会保留最后一次跳转请求", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.renderHistory([
      message({
        messageId: 1,
        roomId: 10,
        roleId: 1,
        content: "第一句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
      message({
        messageId: 2,
        roomId: 10,
        roleId: 1,
        content: "第二句",
        messageType: MESSAGE_TYPE.TEXT,
      }),
    ], 10);

    vi.stubGlobal("WebSocket", { OPEN: 1 });
    (renderer as any).isConnected = false;
    (renderer as any).syncSocket = null;

    expect(renderer.jumpToMessage(1, 10)).toBe(true);
    expect(renderer.jumpToMessage(2, 10)).toBe(true);

    const queuedMessages = (renderer as any).messageQueue as string[];
    expect(queuedMessages).toHaveLength(1);
    const payload = JSON.parse(queuedMessages[0] ?? "{}");
    expect(payload.data.sceneMsg.sentence).toBe((renderer as any).messageLineMap.get("10_2").startLine);
  });

  it("脚本片段包含真实换行时会按物理行数维护场景行号", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });
    (renderer as any).sceneContextMap.set(10, { lineNumber: 0, text: "" });

    await (renderer as any).appendLine(10, "changeBg:none -next;\nsetTextbox:hide;", false);

    const context = (renderer as any).sceneContextMap.get(10);
    expect(context.lineNumber).toBe(2);
    expect(context.text.split("\n")).toEqual(["changeBg:none -next;", "setTextbox:hide;"]);
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

  it("非战斗轮连续地图更新会显示覆盖下一条可视消息再关闭", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 0,
      content: ".combat map-move",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: { kind: "ui", parserVersion: "state-event-v1" },
          events: [{ type: "mapTokenUpsert", roleId: 1, rowIndex: 6, colIndex: 3 }],
        },
      },
    }), 10, false);

    await renderer.appendMessage(message({
      messageId: 2,
      roomId: 10,
      roleId: 0,
      content: ".combat map-move-again",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: { kind: "ui", parserVersion: "state-event-v1" },
          events: [{ type: "mapTokenUpsert", roleId: 1, rowIndex: 7, colIndex: 4 }],
        },
      },
    }), 10, false);

    await renderer.appendMessage(message({
      messageId: 3,
      roomId: 10,
      roleId: 1,
      content: "移动一下位置",
      messageType: MESSAGE_TYPE.TEXT,
    }), 10, false);

    const lines = String((renderer as any).sceneContextMap.get(10)?.text ?? "").trim().split("\n");
    const openIndices = lines
      .map((line, index) => line === "tuanChatMap:show;" ? index : -1)
      .filter(index => index >= 0);
    const closeIndices = lines
      .map((line, index) => line === "tuanChatMap:hide;" ? index : -1)
      .filter(index => index >= 0);
    const closeIndicesAfterOpen = closeIndices.filter(index => index > openIndices[0]);
    const closeIndex = closeIndicesAfterOpen[0] ?? -1;
    const dialogIndex = lines.indexOf("明日香: 移动一下位置;");
    expect(openIndices).toHaveLength(2);
    expect(closeIndicesAfterOpen).toHaveLength(1);
    expect(closeIndex).toBeGreaterThan(openIndices[openIndices.length - 1] ?? -1);
    expect(closeIndex).toBeGreaterThan(dialogIndex);
  });

  it("地图 token 增量更新会携带对应角色头像资源", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });
    await renderer.initRoomScene(10);

    renderer.setRoleCache([{
      ...role(14562, "调查员"),
      avatarFileId: 31586,
      avatarMediaType: "image",
    }]);

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 0,
      content: ".combat map-move",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: { kind: "ui", parserVersion: "state-event-v1" },
          events: [{ type: "mapTokenUpsert", roleId: 14562, rowIndex: 6, colIndex: 2 }],
        },
      },
    }), 10, false);

    const lines = String((renderer as any).sceneContextMap.get(10)?.text ?? "").trim().split("\n");
    const tokenLine = "tuanChatMap:token -roleId=14562 -row=6 -col=2 -avatar=token_role_14562.webp;";
    const tokenIndex = lines.indexOf(tokenLine);
    const showIndex = lines.indexOf("tuanChatMap:show;");
    expect(lines).toContain("setVar:tuanchat.roleIds=\"\";");
    expect(lines.filter(line => line === tokenLine)).toHaveLength(1);
    expect(showIndex).toBeGreaterThan(tokenIndex);
    expect(lines.some(line => line.startsWith("setVar:tuanchat.role.14562.avatarUrl="))).toBe(false);
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
    expect(sceneText).toMatch(/changeFigure:role_1\/sprite_11\.webp .* -next;/);
    expect(sceneText).toMatch(/changeFigure:role_1\/sprite_12\.webp .* -next;/);
    expect(sceneText).not.toContain("-enterDuration=");
    expect(sceneText).not.toContain("-exitDuration=");
    expect(sceneText).toContain("明日香: 笑脸差分 -figureId=1;");
  });

  it("实时追加立绘进出场标注时会紧跟 changeFigure 输出 setTransition", async () => {
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

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 1,
      avatarId: 11,
      content: "带进出场",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [
        ANNOTATION_IDS.FIGURE_POS_LEFT,
        ANNOTATION_IDS.FIGURE_ANIM_BA_ENTER_FROM_LEFT,
        ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_RIGHT,
        ANNOTATION_IDS.FIGURE_ANIM_BA_SHAKE,
      ],
    }), 10, false);

    const sceneText = String((renderer as any).sceneContextMap.get(10)?.text ?? "");
    const lines = sceneText.trim().split("\n");
    const changeIndex = lines.findIndex(line => line.startsWith("changeFigure:role_1/sprite_11.webp"));
    expect(changeIndex).toBeGreaterThanOrEqual(0);
    expect(lines[changeIndex]).toContain("-next;");
    expect(lines[changeIndex]).not.toContain("-enterDuration=");
    expect(lines[changeIndex]).not.toContain("-exitDuration=");
    expect(lines[changeIndex + 1]).toBe(
      "setTransition: -target=1 -enter=position/ba-enter-from-left -exit=position/ba-exit-to-right -keepOffset -next;",
    );
    expect(lines[changeIndex + 2]).toBe("setAnimation:action/BA-shake -target=1 -keepOffset -restoreTransform -next;");
    expect(sceneText).not.toContain("setAnimation:position/");
  });

  it("实时清除立绘带出场标注时会先设置 exit transition 再清除", async () => {
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

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 1,
      avatarId: 11,
      content: "登场",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
    }), 10, false);

    await renderer.appendMessage(message({
      messageId: 2,
      roomId: 10,
      roleId: 1,
      content: "退场",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [
        ANNOTATION_IDS.FIGURE_CLEAR,
        ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_RIGHT,
      ],
    }), 10, false);

    const sceneText = String((renderer as any).sceneContextMap.get(10)?.text ?? "");
    const lines = sceneText.trim().split("\n");
    const transitionIndex = lines.findIndex(line =>
      line === "setTransition: -target=1 -exit=position/ba-exit-to-right -keepOffset -next;"
    );
    expect(transitionIndex).toBeGreaterThanOrEqual(0);
    expect(lines[transitionIndex + 1]).toBe("changeFigure:none -id=1 -next;");
  });

  it("实时场景樱花特效会输出 WebGAL 预制 cherryBlossoms 名称", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 0,
      content: "",
      messageType: MESSAGE_TYPE.EFFECT,
      annotations: [ANNOTATION_IDS.SCENE_EFFECT_SAKURA],
    }), 10, false);

    const sceneText = String((renderer as any).sceneContextMap.get(10)?.text ?? "");
    expect(sceneText).toContain("pixiPerform:cherryBlossoms -next;");
    expect(sceneText).not.toContain("pixiPerform:sakura");
  });

  it("实时追加背景图片时会带上背景进出场和速度参数", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 0,
      messageType: MESSAGE_TYPE.IMG,
      annotations: [
        ANNOTATION_IDS.BACKGROUND_ANIM_ENTER_FROM_LEFT,
        ANNOTATION_IDS.BACKGROUND_ANIM_EXIT_TO_RIGHT,
        ANNOTATION_IDS.BACKGROUND_SPEED_FAST,
      ],
      extra: {
        imageMessage: {
          source: { kind: "external", url: "https://cdn.example.com/bg.webp" },
          background: true,
          width: 1280,
          height: 720,
          fileName: "bg.webp",
        },
      },
    }), 10, false);

    const sceneText = String((renderer as any).sceneContextMap.get(10)?.text ?? "");
    expect(sceneText).toMatch(
      /changeBg:[^\s]+ -enter=background\/enter-from-left-fast -exit=background\/exit-to-right-fast -duration=300 -enterDuration=300 -exitDuration=300 -next;/,
    );
  });

  it("实时追加 image.show 时会忽略通用 fileName 并生成唯一 WebP 展示图资源", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    const firstUrl = "https://media.tuan.chat/media/v1/files/001/1001/image/medium.webp";
    const secondUrl = "https://media.tuan.chat/media/v1/files/002/2002/image/medium.webp";
    const firstFileName = `img_${hashString(firstUrl)}.webp`;
    const secondFileName = `img_${hashString(secondUrl)}.webp`;

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      messageType: MESSAGE_TYPE.IMG,
      annotations: [ANNOTATION_IDS.IMAGE_SHOW],
      extra: {
        imageMessage: {
          source: { kind: "internal", fileId: 1001 },
          fileName: "image.png",
          width: 800,
          height: 600,
          size: 1234,
          background: false,
        },
      },
    }), 10, false);
    await renderer.appendMessage(message({
      messageId: 2,
      roomId: 10,
      messageType: MESSAGE_TYPE.IMG,
      annotations: [ANNOTATION_IDS.IMAGE_SHOW],
      extra: {
        imageMessage: {
          source: { kind: "internal", fileId: 2002 },
          fileName: "image.png",
          width: 640,
          height: 900,
          size: 2345,
          background: false,
        },
      },
    }), 10, false);

    const sceneText = String((renderer as any).sceneContextMap.get(10)?.text ?? "");
    expect(firstFileName).not.toBe(secondFileName);
    expect(sceneText).toContain(`changeFigure:${firstFileName} -id=image_message`);
    expect(sceneText).toContain(`changeFigure:${secondFileName} -id=image_message`);
    expect(sceneText).not.toContain("changeFigure:image.png");
  });

  it("实时追加场景控制标注时会先输出文本框和电影模式命令", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 0,
      content: "旁白",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [
        ANNOTATION_IDS.SCENE_TEXTBOX_SHOW,
        ANNOTATION_IDS.SCENE_FILM_OFF,
      ],
    }), 10, false);

    const lines = String((renderer as any).sceneContextMap.get(10)?.text ?? "").trim().split("\n");
    expect(lines).toContain("setTextbox:on -next;");
    expect(lines).toContain("filmMode:none;");
    expect(lines.indexOf("setTextbox:on -next;")).toBeLessThan(lines.indexOf(":旁白;"));
    expect(lines.indexOf("filmMode:none;")).toBeLessThan(lines.indexOf(":旁白;"));
  });

  it("实时追加 BGM 时会先 unlockBgm 再播放", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 0,
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          source: { kind: "external", url: "https://cdn.example.com/battle.ogg" },
          fileName: "Battle Theme.ogg",
          purpose: "bgm",
          second: 120,
          volume: 55,
        },
      },
    }), 10, false);

    const lines = String((renderer as any).sceneContextMap.get(10)?.text ?? "").trim().split("\n");
    const unlockIndex = lines.indexOf("unlockBgm:uploaded.webp -name=Battle_Theme;");
    const bgmIndex = lines.indexOf("bgm:uploaded.webp -volume=55 -next;");
    expect(unlockIndex).toBeGreaterThanOrEqual(0);
    expect(bgmIndex).toBeGreaterThan(unlockIndex);
  });

  it("实时追加语音消息时会把配音挂到台词上并使用唯一 vocal 文件名", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    const vocalUrl = "https://cdn.example.com/voices/low.webm";

    await renderer.appendMessage(message({
      messageId: 1,
      roomId: 10,
      roleId: 1,
      content: "我来了",
      messageType: MESSAGE_TYPE.SOUND,
      extra: {
        soundMessage: {
          source: { kind: "external", url: vocalUrl },
          purpose: "voice",
          second: 1,
        },
      },
    }), 10, false);

    const expectedVocalFileName = `vocal_${hashString(vocalUrl)}.webm`;
    const lines = String((renderer as any).sceneContextMap.get(10)?.text ?? "").trim().split("\n");
    expect(lines).toContain(`明日香: 我来了 -vocal=./game/vocal/${expectedVocalFileName};`);
  });

  it("实时追加有效立绘组时会先合成再显示 composite 立绘", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const avatars = [
      {
        avatarId: 11,
        roleId: 1,
        variantId: 100,
        variantGroup: variantGroup(11),
        spriteFileId: 2048,
        avatarFileId: 3001,
        avatarCropContext: {
          sourceWidth: 1000,
          sourceHeight: 1600,
          crop: { x: 10, y: 20, width: 300, height: 300 },
        },
      },
      {
        avatarId: 12,
        roleId: 1,
        variantId: 100,
        variantGroup: variantGroup(11),
        spriteFileId: 4096,
        avatarFileId: 3002,
        avatarCropContext: {
          sourceWidth: 1000,
          sourceHeight: 1600,
          crop: { x: 12, y: 34, width: 256, height: 256 },
        },
      },
    ];
    const queryClient = {
      getQueryData: vi.fn((key: unknown[]) => {
        if (key[0] === "getRoleAvatar") {
          return undefined;
        }
        if (key[0] === "getRoleAvatars" && key[1] === 1) {
          return { data: avatars };
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
      avatarId: 12,
      content: "笑脸差分",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
    }), 10, false);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    const composeIndex = sceneText.indexOf("composeFigure:");
    const changeIndex = sceneText.indexOf("changeFigure:role_1_variant");
    expect(composeIndex).toBeGreaterThanOrEqual(0);
    expect(changeIndex).toBeGreaterThan(composeIndex);
    expect(sceneText).toContain("-base=role_1/base_11_2048.webp");
    expect(sceneText).toContain("-layer=role_1/avatar_12_3002_");
    expect(sceneText).toContain(",12,34,256,256");
    expect(sceneText).toContain(" -composite -id=1 ");
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

  it("实时追加会把 message.webgal.transform.alpha 编译成立绘透明度", async () => {
    const renderer = RealtimeRenderer.getInstance(42);
    const queryClient = {
      getQueryData: vi.fn(() => undefined),
    };

    renderer.setRooms([room(10, "序章")]);
    renderer.setRoleCache([role(1, "明日香")]);
    renderer.setQueryClient(queryClient as any);
    renderer.setAutoFigureEnabled(false);
    renderer.setMiniAvatarEnabled(false);
    renderer.setTTSConfig({ enabled: false });

    await renderer.appendMessage(message({
      messageId: 3,
      roomId: 10,
      roleId: 1,
      avatarId: 11,
      content: "半透明登场",
      messageType: MESSAGE_TYPE.TEXT,
      annotations: [ANNOTATION_IDS.FIGURE_POS_LEFT],
      webgal: { transform: { alpha: 0.6 } },
    }), 10, false);

    const sceneText = (renderer as any).sceneContextMap.get(10)?.text ?? "";
    expect(sceneText).toContain("\"alpha\":0.6");
    expect(sceneText).toContain("changeFigure:role_1/sprite_11.webp");
    expect(sceneText).not.toContain("-enterDuration=");
    expect(sceneText).not.toContain("-exitDuration=");
    expect(sceneText).not.toContain("\"rgl\"");
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
