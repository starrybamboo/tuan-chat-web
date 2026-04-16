import { describe, expect, it } from "vitest";

import { sanitizeStoredWorkspaceSelection } from "./workspaceStorageUtils";

describe("workspaceStorage", () => {
  it("会保留合法的空间和房间选择", () => {
    expect(sanitizeStoredWorkspaceSelection({
      selectedRoomId: 22,
      selectedSpaceId: 11,
    })).toEqual({
      selectedRoomId: 22,
      selectedSpaceId: 11,
    });
  });

  it("没有合法空间 ID 时会直接丢弃整份缓存", () => {
    expect(sanitizeStoredWorkspaceSelection({
      selectedRoomId: 22,
      selectedSpaceId: 0,
    })).toBeNull();
    expect(sanitizeStoredWorkspaceSelection({
      selectedRoomId: 22,
    })).toBeNull();
  });

  it("房间 ID 只有在空间 ID 合法时才会保留", () => {
    expect(sanitizeStoredWorkspaceSelection({
      selectedRoomId: 0,
      selectedSpaceId: 11,
    })).toEqual({
      selectedRoomId: undefined,
      selectedSpaceId: 11,
    });
  });

  it("脏数据和非对象输入都会被丢弃", () => {
    expect(sanitizeStoredWorkspaceSelection(null)).toBeNull();
    expect(sanitizeStoredWorkspaceSelection("11")).toBeNull();
    expect(sanitizeStoredWorkspaceSelection({
      selectedRoomId: "22",
      selectedSpaceId: "11",
    })).toBeNull();
  });
});
