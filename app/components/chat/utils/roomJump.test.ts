import { describe, expect, it } from "vitest";

import { extractRoomJumpPayload, isRoomJumpCommandText, parseRoomJumpCommand } from "@/components/chat/utils/roomJump";

describe("roomJump utils", () => {
  it("识别 /roomjump 与 /jumproom 指令前缀", () => {
    expect(isRoomJumpCommandText("/roomjump 1")).toBe(true);
    expect(isRoomJumpCommandText("/jumproom 1")).toBe(true);
    expect(isRoomJumpCommandText("/var set a=1")).toBe(false);
  });

  it("解析单参数指令（当前空间）", () => {
    expect(parseRoomJumpCommand("/roomjump 123 目标群聊")).toEqual({
      roomId: 123,
      label: "目标群聊",
    });
  });

  it("解析双参数指令（显式空间）", () => {
    expect(parseRoomJumpCommand("/jumproom 45 123 跨空间群聊")).toEqual({
      spaceId: 45,
      roomId: 123,
      label: "跨空间群聊",
    });
  });

  it("无效指令返回 null", () => {
    expect(parseRoomJumpCommand("/roomjump")).toBeNull();
    expect(parseRoomJumpCommand("/roomjump abc")).toBeNull();
  });

  it("提取 roomJump payload", () => {
    expect(extractRoomJumpPayload({
      roomJump: {
        roomId: 100,
        spaceId: 200,
        label: "前往大厅",
      },
    })).toEqual({
      roomId: 100,
      spaceId: 200,
      label: "前往大厅",
    });
  });
});
