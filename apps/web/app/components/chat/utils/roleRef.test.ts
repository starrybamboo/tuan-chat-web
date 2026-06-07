import { describe, expect, it } from "vitest";

import { getRoleRefDragData, isRoleRefDrag, setRoleRefDragData } from "@/components/chat/utils/roleRef";

const ROLE_REF_MIME = "application/x-tc-role-ref";

function createMockDataTransfer() {
  const store = new Map<string, string>();
  const dataTransfer: any = {
    effectAllowed: "all",
    dropEffect: "none",
    types: [] as string[],
    setData(type: string, value: string) {
      store.set(type, value);
      dataTransfer.types = Array.from(store.keys());
    },
    getData(type: string) {
      return store.get(type) ?? "";
    },
  };
  return dataTransfer as DataTransfer;
}

describe("roleRef drag utils", () => {
  it("支持写入并读取 roleRef payload", () => {
    const dataTransfer = createMockDataTransfer();

    setRoleRefDragData(dataTransfer, {
      roleId: 7,
      roomId: 10,
      roleName: "千夏",
    });

    expect(isRoleRefDrag(dataTransfer)).toBe(true);
    expect(getRoleRefDragData(dataTransfer)).toEqual({
      roleId: 7,
      roomId: 10,
      roleName: "千夏",
    });
  });

  it("拒绝无效 roleId", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData(ROLE_REF_MIME, JSON.stringify({
      roleId: 0,
      roleName: "坏数据",
    }));

    expect(getRoleRefDragData(dataTransfer)).toBeNull();
  });

  it("支持 uri-list 兜底读取 roleId", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData("text/uri-list", "tc-role-ref:42");

    expect(isRoleRefDrag(dataTransfer)).toBe(true);
    expect(getRoleRefDragData(dataTransfer)).toEqual({ roleId: 42 });
  });
});
