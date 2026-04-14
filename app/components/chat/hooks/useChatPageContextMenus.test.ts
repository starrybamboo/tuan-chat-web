import { describe, expect, it } from "vitest";

import { resolveRoomIdFromContextMenuEvent } from "./useChatPageContextMenus";

function createElementLike(attrs: Record<string, string> = {}, closestResult?: { value: ElementLike | null }) {
  return {
    closest: (_selector: string) => closestResult?.value ?? null,
    getAttribute: (name: string) => attrs[name] ?? null,
  };
}

type ElementLike = {
  closest?: (selector: string) => ElementLike | null;
  getAttribute?: (name: string) => string | null;
};

describe("resolveRoomIdFromContextMenuEvent", () => {
  it("优先从 target.closest 的房间节点解析 roomId", () => {
    const matchedRoomElement = createElementLike({ "data-room-id": "42" });
    const target = createElementLike({}, { value: matchedRoomElement });
    const currentTarget = createElementLike({ "data-room-id": "7" });

    const roomId = resolveRoomIdFromContextMenuEvent({
      target,
      currentTarget,
    });

    expect(roomId).toBe(42);
  });

  it("当 target 无法解析时，回退到 currentTarget 的 roomId", () => {
    const target = { closest: () => null };
    const currentTarget = createElementLike({ "data-room-id": "7" });

    const roomId = resolveRoomIdFromContextMenuEvent({
      target,
      currentTarget,
    });

    expect(roomId).toBe(7);
  });

  it("当 target 不是可调用 closest 的元素时，仍可回退到 currentTarget", () => {
    const currentTarget = createElementLike({ "data-room-id": "19" });

    const roomId = resolveRoomIdFromContextMenuEvent({
      target: null,
      currentTarget,
    });

    expect(roomId).toBe(19);
  });

  it("无法解析出合法 roomId 时返回 null", () => {
    const target = createElementLike({}, { value: createElementLike({ "data-room-id": "not-a-number" }) });
    const currentTarget = createElementLike();

    const roomId = resolveRoomIdFromContextMenuEvent({
      target,
      currentTarget,
    });

    expect(roomId).toBeNull();
  });
});
