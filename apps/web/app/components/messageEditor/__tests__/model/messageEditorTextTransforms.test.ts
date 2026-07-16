import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  insertMessageEditorBlockAtPoint,
  insertMessageEditorBlockAtSelection,
  mergeMessageEditorMessageBackward,
  mergeMessageEditorMessageForward,
  replaceMessageEditorSelectionText,
  replaceMessageEditorSelectionTextAsBlocks,
  splitMessageEditorMessage,
  transformMessageEditorSelectionText,
} from "../../model/messageEditorTextTransforms";
import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  normalizeMessageEditorDraft,
} from "../../model/messageEditorTransforms";

describe("messageEditorTextTransforms", () => {
  it("splits a text block at the selected raw syntax range", () => {
    const source = createMessageEditorTextDraft({
      content: "alpha beta",
      messageType: MESSAGE_TYPE.TEXT,
    });

    const result = splitMessageEditorMessage([source], {
      blockId: getMessageEditorBlockId(source),
      selectionStart: 5,
      selectionEnd: 6,
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe("alpha");
    expect(result.messages[1].content).toBe("beta");
  });

  it("resets speaker metadata on the new block after pressing enter", () => {
    const source = normalizeMessageEditorDraft({
      messageType: MESSAGE_TYPE.TEXT,
      content: "alpha beta",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    })!;

    const result = splitMessageEditorMessage([source], {
      blockId: getMessageEditorBlockId(source),
      selectionStart: 5,
      selectionEnd: 6,
    });

    expect(result.messages[0]).toMatchObject({
      content: "alpha",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    });
    expect(result.messages[1]).toMatchObject({ content: "beta" });
    expect(result.messages[1].roleId).toBeUndefined();
    expect(result.messages[1].avatarId).toBeUndefined();
    expect(result.messages[1].customRoleName).toBeUndefined();
  });

  it("inserts a narrator block before the current speaker when pressing enter at block start", () => {
    const source = normalizeMessageEditorDraft({
      messageType: MESSAGE_TYPE.TEXT,
      content: "我回来了",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    })!;

    const result = splitMessageEditorMessage([source], {
      blockId: getMessageEditorBlockId(source),
      selectionStart: 0,
      selectionEnd: 0,
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toMatchObject({ content: "" });
    expect(result.messages[0].roleId).toBeUndefined();
    expect(result.messages[0].avatarId).toBeUndefined();
    expect(result.messages[0].customRoleName).toBeUndefined();
    expect(result.messages[1]).toMatchObject({
      content: "我回来了",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    });
    expect(result.focus).toEqual({
      blockId: getMessageEditorBlockId(result.messages[1]),
      caret: 0,
    });
  });

  it("removes the previous empty narrator block without clearing current speaker metadata", () => {
    const narrator = createMessageEditorTextDraft();
    const speaker = normalizeMessageEditorDraft({
      messageType: MESSAGE_TYPE.TEXT,
      content: "我回来了",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    })!;

    const result = mergeMessageEditorMessageBackward([narrator, speaker], getMessageEditorBlockId(speaker));

    expect(result?.messages).toHaveLength(1);
    expect(result?.messages[0]).toMatchObject({
      content: "我回来了",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    });
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[0]),
      caret: 0,
    });
  });

  it("removes the current empty narrator block without clearing next speaker metadata", () => {
    const narrator = createMessageEditorTextDraft();
    const speaker = normalizeMessageEditorDraft({
      messageType: MESSAGE_TYPE.TEXT,
      content: "测试动作",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    })!;

    const result = mergeMessageEditorMessageForward([narrator, speaker], getMessageEditorBlockId(narrator));

    expect(result?.messages).toHaveLength(1);
    expect(result?.messages[0]).toMatchObject({
      content: "测试动作",
      roleId: 12,
      avatarId: 34,
      customRoleName: "绯月",
    });
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[0]),
      caret: 0,
    });
  });

  it("splits pasted multiline text into separate message blocks", () => {
    const source = createMessageEditorTextDraft({ content: "" });
    const blockId = getMessageEditorBlockId(source);

    const result = replaceMessageEditorSelectionTextAsBlocks([source], {
      start: {
        blockId,
        offset: 0,
      },
      end: {
        blockId,
        offset: 0,
      },
      segments: [],
    }, "又见面了？\n嗯，又见面了呢。");

    expect(result?.messages.map(message => message.content)).toEqual([
      "又见面了？",
      "嗯，又见面了呢。",
    ]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[1]),
      caret: "嗯，又见面了呢。".length,
    });
  });

  it("keeps middle blank pasted lines but ignores a single trailing newline", () => {
    const source = createMessageEditorTextDraft({ content: "开头" });
    const blockId = getMessageEditorBlockId(source);

    const result = replaceMessageEditorSelectionTextAsBlocks([source], {
      start: {
        blockId,
        offset: 2,
      },
      end: {
        blockId,
        offset: 2,
      },
      segments: [],
    }, "A\n\nB\n");

    expect(result?.messages.map(message => message.content)).toEqual([
      "开头A",
      "",
      "B",
    ]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[2]),
      caret: 1,
    });
  });

  it("inserts an atomic block at a text caret and keeps a trailing text block", () => {
    const source = createMessageEditorTextDraft({ content: "alphaomega" });

    const result = insertMessageEditorBlockAtPoint([source], {
      blockId: getMessageEditorBlockId(source),
      kind: "image",
      offset: 5,
    });

    expect(result?.messages.map(message => message.messageType)).toEqual([
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.IMG,
      MESSAGE_TYPE.TEXT,
    ]);
    expect(result?.messages.map(message => message.content)).toEqual(["alpha", "", "omega"]);
    expect(result?.insertedBlockId).toBe(getMessageEditorBlockId(result!.messages[1]));
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[2]),
      caret: 0,
    });
  });

  it("replaces a selected text range with an atomic block", () => {
    const source = createMessageEditorTextDraft({ content: "alphaomega" });

    const result = insertMessageEditorBlockAtSelection([source], {
      start: {
        blockId: getMessageEditorBlockId(source),
        offset: 2,
      },
      end: {
        blockId: getMessageEditorBlockId(source),
        offset: 7,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(source),
          start: 2,
          end: 7,
        },
      ],
    }, "file");

    expect(result?.messages.map(message => message.messageType)).toEqual([
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.FILE,
      MESSAGE_TYPE.TEXT,
    ]);
    expect(result?.messages.map(message => message.content)).toEqual(["al", "", "ega"]);
  });

  it("replaces a cross-block text selection and merges the boundary blocks", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const second = createMessageEditorTextDraft({ content: "beta" });

    const result = replaceMessageEditorSelectionText([first, second], {
      start: {
        blockId: getMessageEditorBlockId(first),
        offset: 2,
      },
      end: {
        blockId: getMessageEditorBlockId(second),
        offset: 2,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(first),
          start: 2,
          end: 5,
        },
        {
          blockId: getMessageEditorBlockId(second),
          start: 0,
          end: 2,
        },
      ],
    }, "X");

    expect(result?.messages.map(message => message.content)).toEqual(["alXta"]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[0]),
      caret: 3,
    });
    expect(result?.selection).toEqual({
      start: {
        blockId: getMessageEditorBlockId(result!.messages[0]),
        offset: 2,
      },
      end: {
        blockId: getMessageEditorBlockId(result!.messages[0]),
        offset: 3,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(result!.messages[0]),
          start: 2,
          end: 3,
        },
      ],
    });
  });

  it("replaces a selection across text and atomic blocks by removing the atomic block", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const image = createMessageEditorBlockDraft("image");
    const third = createMessageEditorTextDraft({ content: "omega" });

    const result = replaceMessageEditorSelectionText([first, image, third], {
      start: {
        blockId: getMessageEditorBlockId(first),
        offset: 2,
      },
      end: {
        blockId: getMessageEditorBlockId(third),
        offset: 2,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(first),
          start: 2,
          end: 5,
        },
        {
          blockId: getMessageEditorBlockId(image),
          start: 0,
          end: 1,
        },
        {
          blockId: getMessageEditorBlockId(third),
          start: 0,
          end: 2,
        },
      ],
    }, "X");

    expect(result?.messages).toHaveLength(1);
    expect(result?.messages[0].messageType).toBe(MESSAGE_TYPE.TEXT);
    expect(result?.messages[0].content).toBe("alXega");
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[0]),
      caret: 3,
    });
  });

  it("removes a selected atomic block without replacing adjacent text", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const image = createMessageEditorBlockDraft("image");
    const third = createMessageEditorTextDraft({ content: "omega" });

    const result = replaceMessageEditorSelectionText([first, image, third], {
      start: {
        blockId: getMessageEditorBlockId(image),
        offset: 0,
      },
      end: {
        blockId: getMessageEditorBlockId(image),
        offset: 1,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(image),
          start: 0,
          end: 1,
        },
      ],
    }, "");

    expect(result?.messages.map(message => message.content)).toEqual(["alpha", "omega"]);
    expect(result?.messages.map(message => message.messageType)).toEqual([MESSAGE_TYPE.TEXT, MESSAGE_TYPE.TEXT]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(result!.messages[1]),
      caret: "omega".length,
    });
  });

  it("transforms each selected text segment without merging blocks", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const second = createMessageEditorTextDraft({ content: "beta" });

    const result = transformMessageEditorSelectionText([first, second], {
      start: {
        blockId: getMessageEditorBlockId(first),
        offset: 1,
      },
      end: {
        blockId: getMessageEditorBlockId(second),
        offset: 3,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(first),
          start: 1,
          end: 5,
        },
        {
          blockId: getMessageEditorBlockId(second),
          start: 0,
          end: 3,
        },
      ],
    }, selectedText => `[${selectedText}](style=color:#FF0000)`);

    expect(result?.messages.map(message => message.content)).toEqual([
      "a[lpha](style=color:#FF0000)",
      "[bet](style=color:#FF0000)a",
    ]);
    expect(result?.selection).toEqual({
      start: {
        blockId: getMessageEditorBlockId(result!.messages[0]),
        offset: 1,
      },
      end: {
        blockId: getMessageEditorBlockId(result!.messages[1]),
        offset: "[bet](style=color:#FF0000)".length,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(result!.messages[0]),
          start: 1,
          end: 1 + "[lpha](style=color:#FF0000)".length,
        },
        {
          blockId: getMessageEditorBlockId(result!.messages[1]),
          start: 0,
          end: "[bet](style=color:#FF0000)".length,
        },
      ],
    });
  });
});
