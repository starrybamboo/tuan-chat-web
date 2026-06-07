import { describe, expect, it } from "vitest";

import { getClueRefDragData, isClueRefDrag, setClueRefDragData } from "@/components/chat/utils/clueRef";

const CLUE_REF_MIME = "application/x-tc-clue-ref";

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

describe("clueRef drag utils", () => {
  it("支持写入并读取 clueRef payload", () => {
    const dataTransfer = createMockDataTransfer();

    setClueRefDragData(dataTransfer, {
      snapshot: {
        messageType: 1,
        content: "旧钥匙",
        extra: {
          imageMessage: {
            fileId: 12,
          },
        },
      },
    });

    expect(isClueRefDrag(dataTransfer)).toBe(true);
    expect(getClueRefDragData(dataTransfer)).toEqual({
      snapshot: {
        messageType: 1,
        content: "旧钥匙",
        extra: {
          imageMessage: {
            fileId: 12,
          },
        },
      },
    });
  });

  it("拒绝缺少消息类型的 clueRef payload", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData(CLUE_REF_MIME, JSON.stringify({
      snapshot: {
        content: "坏数据",
      },
    }));

    expect(getClueRefDragData(dataTransfer)).toBeNull();
  });
});
