import type { ChatMessageResponse, Room, UserRole } from "../../api";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

const manageGameControllerEditTextFile = vi.fn(async () => ({}));

vi.mock("@/webGAL/index", () => ({
  checkGameExist: vi.fn(async () => true),
  getTerreApis: () => ({
    manageGameControllerEditTextFile,
  }),
}));

import { RealtimeRenderer } from "./realtimeRenderer";

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

describe("RealtimeRenderer shared compiler full render", () => {
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
    expect((renderer as any).messageLineMap.size).toBe(0);
    expect((renderer as any).sceneContextMap.get(10)?.text).toContain("明日香: 你好;");
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
});
