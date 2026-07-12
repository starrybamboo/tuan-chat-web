import { describe, expect, it } from "vitest";

import { getPokeExtra } from "./message-extra";
import { MESSAGE_TYPE } from "./messageType";
import {
  buildDefaultPokeContent,
  buildPokeMessageRequest,
  getPokeTemplateStorageKey,
  isPokeMessageType,
  isSystemRowMessageType,
} from "./poke-message";

describe("poke-message", () => {
  it("生成带两个 mention 的默认正文", () => {
    expect(buildDefaultPokeContent(" 爱丽丝 ", "@鲍勃")).toBe("@爱丽丝 戳了戳 @鲍勃");
    expect(buildDefaultPokeContent("", "")).toBe("@发起者 戳了戳 @接受者");
  });

  it("按用户与目标角色生成设备本地缓存键", () => {
    expect(getPokeTemplateStorageKey(42, 789)).toBe("tc:chat:poke-template:42:789");
  });

  it("构造独立于正文的目标角色关系", () => {
    const request = buildPokeMessageRequest({
      roomId: 1,
      roleId: 2,
      avatarId: 3,
      content: "完全重写的正文",
      targetRoleId: 4,
    });

    expect(request).toEqual({
      roomId: 1,
      messageType: MESSAGE_TYPE.POKE,
      roleId: 2,
      avatarId: 3,
      content: "完全重写的正文",
      extra: {
        poke: {
          targetRoleId: 4,
        },
      },
    });
    expect(getPokeExtra(request.extra)?.targetRoleId).toBe(4);
  });

  it("将 POKE 识别为系统行消息", () => {
    expect(isPokeMessageType(MESSAGE_TYPE.POKE)).toBe(true);
    expect(isSystemRowMessageType(MESSAGE_TYPE.POKE)).toBe(true);
    expect(isSystemRowMessageType(MESSAGE_TYPE.STATE_EVENT)).toBe(true);
    expect(isSystemRowMessageType(MESSAGE_TYPE.TEXT)).toBe(false);
  });
});
