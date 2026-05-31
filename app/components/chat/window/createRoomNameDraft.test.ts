import { describe, expect, it } from "vitest";

import { createRoomNameDraftFromInput, resolveCreateRoomNameInputState } from "./createRoomNameDraft";

describe("createRoomNameDraft", () => {
  it("uses the default room name before the user edits the field", () => {
    expect(resolveCreateRoomNameInputState("测试用户的房间", null)).toEqual({
      canSubmitRoomName: true,
      roomName: "测试用户的房间",
    });
  });

  it("keeps an intentionally cleared room name empty", () => {
    const draft = createRoomNameDraftFromInput("");

    expect(resolveCreateRoomNameInputState("测试用户的房间", draft)).toEqual({
      canSubmitRoomName: false,
      roomName: "",
    });
  });

  it("rejects whitespace-only room names", () => {
    const draft = createRoomNameDraftFromInput("   ");

    expect(resolveCreateRoomNameInputState("测试用户的房间", draft)).toEqual({
      canSubmitRoomName: false,
      roomName: "   ",
    });
  });
});
