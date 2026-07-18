import { describe, expect, it } from "vitest";

import { mergeSpaceDocMetas, spaceDocMetasQueryKey } from "./useSpaceDocMetaState";

describe("useSpaceDocMetaState", () => {
  it("按空间隔离文档元数据缓存", () => {
    expect(spaceDocMetasQueryKey(1)).not.toEqual(spaceDocMetasQueryKey(2));
  });

  it("合并服务端和侧栏元数据时只补齐缺失字段", () => {
    expect(mergeSpaceDocMetas(
      [{ id: "11", title: "服务端标题" }],
      [{ id: "11", title: "侧栏标题", imageFileId: 22 }, { id: "room:3", title: "房间" }],
    )).toEqual([{ id: "11", title: "服务端标题", imageFileId: 22 }]);
  });
});
