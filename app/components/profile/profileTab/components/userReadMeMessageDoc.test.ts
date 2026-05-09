import { describe, expect, it } from "vitest";

import { createBlockNoteSnapshot } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createUserReadMeNode,
  createUserReadMeSnapshot,
  decodeUserReadMeNodes,
  getUserReadMeInlineMarks,
  mergeUserReadMeNodeBackward,
  mergeUserReadMeNodeForward,
  serializeUserReadMeNodes,
  splitUserReadMeNode,
  toggleUserReadMeInlineMark,
} from "./userReadMeMessageDoc";

describe("userReadMeMessageDoc", () => {
  it("round-trips message-stream snapshots", () => {
    const nodes = [
      createUserReadMeNode({ nodeId: "a", content: "first" }),
      createUserReadMeNode({ nodeId: "b", content: "second", messageType: MESSAGE_TYPE.INTRO_TEXT }),
    ];

    const snapshot = createUserReadMeSnapshot(nodes, 123);

    expect(snapshot.v).toBe(4);
    expect(snapshot.format).toBe("message-stream");
    expect(snapshot.updatedAt).toBe(123);
    expect(decodeUserReadMeNodes(snapshot)).toEqual(nodes);
  });

  it("migrates blocknote snapshots into flat message nodes", () => {
    const snapshot = createBlockNoteSnapshot({
      blocks: [
        {
          type: "heading",
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body copy" }],
          children: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Nested text" }],
            },
          ],
        },
      ],
    });

    expect(decodeUserReadMeNodes(snapshot).map(node => node.content)).toEqual([
      "Title",
      "Body copy",
      "Nested text",
    ]);
  });

  it("splits a node at the current selection", () => {
    const nodes = [
      createUserReadMeNode({ nodeId: "a", content: "hello world" }),
    ];

    const result = splitUserReadMeNode(nodes, {
      nodeId: "a",
      selectionStart: 5,
      selectionEnd: 5,
    });

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].content).toBe("hello");
    expect(result.nodes[1].content).toBe(" world");
    expect(result.focus.nodeId).toBe(result.nodes[1].nodeId);
    expect(result.focus.caret).toBe(0);
  });

  it("splits inline marks together with content", () => {
    const nodes = [
      createUserReadMeNode({
        nodeId: "a",
        content: "hello world",
        extra: {
          inlineMarks: [
            { markId: "m1", type: "bold", start: 0, end: 5 },
            { markId: "m2", type: "italic", start: 6, end: 11 },
          ],
        },
      }),
    ];

    const result = splitUserReadMeNode(nodes, {
      nodeId: "a",
      selectionStart: 5,
      selectionEnd: 5,
    });

    expect(getUserReadMeInlineMarks(result.nodes[0])).toEqual([
      { markId: "m1", type: "bold", start: 0, end: 5 },
    ]);
    expect(getUserReadMeInlineMarks(result.nodes[1])).toEqual([
      { markId: "m2", type: "italic", start: 1, end: 6 },
    ]);
  });

  it("merges backward and preserves caret at the join point", () => {
    const nodes = [
      createUserReadMeNode({ nodeId: "a", content: "hello" }),
      createUserReadMeNode({ nodeId: "b", content: " world" }),
    ];

    const result = mergeUserReadMeNodeBackward(nodes, "b");

    expect(result).not.toBeNull();
    expect(result?.nodes).toHaveLength(1);
    expect(result?.nodes[0].content).toBe("hello world");
    expect(result?.focus).toEqual({
      nodeId: "a",
      caret: 5,
    });
  });

  it("merges backward and shifts inline marks from the removed node", () => {
    const nodes = [
      createUserReadMeNode({
        nodeId: "a",
        content: "hello",
        extra: {
          inlineMarks: [
            { markId: "m1", type: "bold", start: 0, end: 5 },
          ],
        },
      }),
      createUserReadMeNode({
        nodeId: "b",
        content: " world",
        extra: {
          inlineMarks: [
            { markId: "m2", type: "italic", start: 1, end: 6 },
          ],
        },
      }),
    ];

    const result = mergeUserReadMeNodeBackward(nodes, "b");

    expect(result).not.toBeNull();
    expect(getUserReadMeInlineMarks(result!.nodes[0])).toEqual([
      { markId: "m1", type: "bold", start: 0, end: 5 },
      { markId: "m2", type: "italic", start: 6, end: 11 },
    ]);
  });

  it("merges forward and preserves caret at the original node end", () => {
    const nodes = [
      createUserReadMeNode({ nodeId: "a", content: "hello" }),
      createUserReadMeNode({ nodeId: "b", content: " world" }),
    ];

    const result = mergeUserReadMeNodeForward(nodes, "a");

    expect(result).not.toBeNull();
    expect(result?.nodes).toHaveLength(1);
    expect(result?.nodes[0].content).toBe("hello world");
    expect(result?.focus).toEqual({
      nodeId: "a",
      caret: 5,
    });
  });

  it("serializes nodes stably for save dedupe", () => {
    const nodes = [
      createUserReadMeNode({ nodeId: "a", content: "same" }),
    ];

    expect(serializeUserReadMeNodes(nodes)).toBe(serializeUserReadMeNodes([...nodes]));
  });

  it("toggles inline marks on and off within a text selection", () => {
    const node = createUserReadMeNode({
      nodeId: "a",
      content: "hello world",
    });

    const bolded = toggleUserReadMeInlineMark(node, {
      type: "bold",
      start: 0,
      end: 5,
    });
    expect(getUserReadMeInlineMarks(bolded)).toEqual([
      expect.objectContaining({ type: "bold", start: 0, end: 5 }),
    ]);

    const unbolded = toggleUserReadMeInlineMark(bolded, {
      type: "bold",
      start: 0,
      end: 5,
    });
    expect(getUserReadMeInlineMarks(unbolded)).toEqual([]);
  });
});
