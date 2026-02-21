import { describe, expect, it } from "vitest";

import { getRoomRefDragData, isRoomRefDrag, setRoomRefDragData } from "@/components/chat/utils/roomRef";

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

describe("roomRef drag utils", () => {
  it("支持写入并读取 roomRef payload", () => {
    const dataTransfer = createMockDataTransfer();
    setRoomRefDragData(dataTransfer, {
      roomId: 123,
      spaceId: 100,
      roomName: "测试群聊",
      categoryName: "主线",
    });

    expect(isRoomRefDrag(dataTransfer)).toBe(true);
    expect(getRoomRefDragData(dataTransfer)).toEqual({
      roomId: 123,
      spaceId: 100,
      roomName: "测试群聊",
      categoryName: "主线",
    });
  });
});
