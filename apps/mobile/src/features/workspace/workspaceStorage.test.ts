import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearStoredWorkspaceSelection,
  readStoredWorkspaceSelection,
  writeStoredWorkspaceSelection,
} from "./workspaceStorage";
import { sanitizeStoredWorkspaceSelection } from "./workspaceStorageUtils";

const keyValueStorageMock = vi.hoisted(() => ({
  readMobileKeyValue: vi.fn(),
  removeMobileKeyValue: vi.fn(),
  writeMobileKeyValue: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

vi.mock("../../lib/mobile-key-value-storage", () => keyValueStorageMock);

beforeEach(() => {
  keyValueStorageMock.readMobileKeyValue.mockReset();
  keyValueStorageMock.removeMobileKeyValue.mockReset();
  keyValueStorageMock.writeMobileKeyValue.mockReset();
});

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

  it("原生端通过 mobile KV 持久化空间和房间选择", async () => {
    keyValueStorageMock.readMobileKeyValue.mockResolvedValue({
      value: {
        selectedRoomId: 22,
        selectedSpaceId: 11,
      },
    });

    await expect(readStoredWorkspaceSelection()).resolves.toEqual({
      selectedRoomId: 22,
      selectedSpaceId: 11,
    });

    await writeStoredWorkspaceSelection({
      selectedRoomId: 44,
      selectedSpaceId: 33,
    });

    expect(keyValueStorageMock.writeMobileKeyValue).toHaveBeenCalledWith(
      "tuanchat.mobile.workspace.selection",
      {
        selectedRoomId: 44,
        selectedSpaceId: 33,
      },
    );

    await clearStoredWorkspaceSelection();

    expect(keyValueStorageMock.removeMobileKeyValue).toHaveBeenCalledWith("tuanchat.mobile.workspace.selection");
  });
});
