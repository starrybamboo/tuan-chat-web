import { describe, expect, it } from "vitest";

import {
  addCopilotContextRef,
  getReferenceRoomIdsFromCopilotContextRefs,
  normalizeCopilotContextRefs,
  removeCopilotContextRef,
  toGalReferencesFromCopilotContextRefs,
} from "./copilotContextRefs";

describe("copilotContextRefs", () => {
  it("归一化并去重拖入的上下文引用", () => {
    const refs = normalizeCopilotContextRefs([
      {
        kind: "room",
        roomId: 12,
        label: " 雨夜前奏 ",
        source: "drag",
      },
      {
        kind: "room",
        roomId: "12",
        label: "重复",
        source: "drag",
      },
      {
        kind: "message",
        sourceRoomId: 10,
        messageIds: [101, "102", 101],
        label: "修改两条",
        mode: "target",
        source: "drag",
      },
    ]);

    expect(refs).toEqual([
      {
        kind: "room",
        roomId: "12",
        label: "雨夜前奏",
        source: "drag",
        persistence: "persistent",
      },
      {
        kind: "message",
        sourceRoomId: "10",
        messageIds: ["101", "102"],
        label: "修改两条",
        mode: "target",
        source: "drag",
        persistence: "turn",
      },
    ]);
  });

  it("限制参考房间数量", () => {
    const base = normalizeCopilotContextRefs([
      { kind: "room", roomId: 1, label: "A", source: "drag" },
      { kind: "room", roomId: 2, label: "B", source: "drag" },
      { kind: "room", roomId: 3, label: "C", source: "drag" },
    ]);

    const result = addCopilotContextRef(base, {
      kind: "room",
      roomId: "4",
      label: "D",
      source: "drag",
      persistence: "persistent",
    });

    expect(result.status).toBe("room_limit");
    expect(result.refs).toHaveLength(3);
  });

  it("删除指定上下文引用", () => {
    const refs = normalizeCopilotContextRefs([
      { kind: "role", roleId: 7, label: "千夏", source: "drag" },
      { kind: "doc", docId: "doc-1", title: "设定", label: "设定", source: "drag" },
    ]);

    expect(removeCopilotContextRef(refs, refs[0])).toEqual([refs[1]]);
  });

  it("转换为 GalAuthoringContext 的 attachmentRefs", () => {
    const refs = normalizeCopilotContextRefs([
      { kind: "message", sourceRoomId: 10, messageIds: [101, 102], label: "两条消息", source: "drag" },
      { kind: "role", roleId: 7, label: "千夏", source: "drag" },
      { kind: "doc", docId: "doc-1", title: "皇城设定", excerpt: "禁止夜行。", label: "皇城设定", source: "drag" },
    ]);

    expect(toGalReferencesFromCopilotContextRefs(refs)).toEqual([
      { kind: "message", messageId: "101", mode: "target", label: "两条消息" },
      { kind: "message", messageId: "102", mode: "target", label: "两条消息" },
      { kind: "role", roleId: "7", label: "千夏" },
      {
        kind: "doc",
        docId: "doc-1",
        label: "皇城设定",
        title: "皇城设定",
        excerpt: "禁止夜行。",
      },
    ]);
  });

  it("提取非当前房间的 referenceRoomIds", () => {
    const refs = normalizeCopilotContextRefs([
      { kind: "room", roomId: 10, label: "当前", source: "drag" },
      { kind: "room", roomId: 11, label: "参考", source: "drag" },
      { kind: "doc", docId: "doc-1", label: "设定", source: "drag" },
    ]);

    expect(getReferenceRoomIdsFromCopilotContextRefs(refs, 10)).toEqual([11]);
  });
});
