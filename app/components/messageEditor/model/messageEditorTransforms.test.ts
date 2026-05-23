import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  insertMessageEditorBlockAtPoint,
  insertMessageEditorBlockAtSelection,
  mergeMessageEditorMessageBackward,
  mergeMessageEditorMessageForward,
  mergeMessageEditorMediaLayouts,
  moveMessageEditorMessageToIndex,
  normalizeMessageEditorDraft,
  parseMessageEditorMarkdownPreview,
  previewVisibleOffsetToMessageEditorRawOffset,
  replaceMessageEditorSelectionText,
  setMessageEditorSpeakerMetadata,
  setMessageEditorUploadedMedia,
  setMessageEditorWebgalChooseOptions,
  splitMessageEditorMessage,
  transformMessageEditorSelectionText,
  updateMessageEditorMediaSize,
} from "./messageEditorTransforms";

describe("messageEditorTransforms", () => {
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

  it("creates atomic drafts for slash insertion", () => {
    const heading = createMessageEditorBlockDraft("heading2");
    const bullet = createMessageEditorBlockDraft("bulletedList");
    const image = createMessageEditorBlockDraft("image");
    const choose = createMessageEditorBlockDraft("choose");

    expect(heading.messageType).toBe(MESSAGE_TYPE.TEXT);
    expect(heading.content).toBe("## ");
    expect(heading.extra).toBeUndefined();
    expect(bullet.messageType).toBe(MESSAGE_TYPE.TEXT);
    expect(bullet.content).toBe("- ");
    expect(image.messageType).toBe(MESSAGE_TYPE.IMG);
    expect(image.extra?.imageMessage).toEqual({});
    expect(choose.messageType).toBe(MESSAGE_TYPE.WEBGAL_CHOOSE);
    expect(choose.extra?.webgalChoose).toEqual({ options: [] });
  });

  it("parses markdown heading syntax without changing message payload", () => {
    const preview = parseMessageEditorMarkdownPreview("## [红字](style=color:#FF0000)");

    expect(preview).toEqual({
      content: "[红字](style=color:#FF0000)",
      kind: "heading2",
      rawPrefixLength: 3,
    });
    expect(previewVisibleOffsetToMessageEditorRawOffset("## hello", 1)).toBe(4);
    expect(parseMessageEditorMarkdownPreview("- item").kind).toBe("bulletedList");
    expect(parseMessageEditorMarkdownPreview("3. item")).toMatchObject({
      content: "item",
      kind: "numberedList",
      orderedNumber: 3,
      rawPrefixLength: 3,
    });
    expect(parseMessageEditorMarkdownPreview("> quote")).toMatchObject({
      content: "quote",
      kind: "quote",
      rawPrefixLength: 2,
    });
  });

  it("moves a block to a target index", () => {
    const first = createMessageEditorTextDraft({ content: "first" });
    const second = createMessageEditorTextDraft({ content: "second" });
    const third = createMessageEditorTextDraft({ content: "third" });

    const nextMessages = moveMessageEditorMessageToIndex([first, second, third], getMessageEditorBlockId(first), 2);

    expect(nextMessages.map(message => message.content)).toEqual(["second", "third", "first"]);
  });

  it("writes uploaded media payloads back into atomic blocks", () => {
    const image = createMessageEditorBlockDraft("image");
    const video = createMessageEditorBlockDraft("video");
    const file = createMessageEditorBlockDraft("file");
    const choose = createMessageEditorBlockDraft("choose");

    const nextImage = setMessageEditorUploadedMedia(image, {
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
    });
    const nextVideo = setMessageEditorUploadedMedia(video, {
      fileId: 3,
      fileName: "clip.mp4",
      mediaType: "video/mp4",
      size: 456,
      second: 12,
      width: 640,
      height: 360,
    });
    const nextFile = setMessageEditorUploadedMedia(file, {
      fileId: 2,
      fileName: "note.txt",
      mediaType: "text/plain",
      size: 45,
    });
    const nextChoose = setMessageEditorWebgalChooseOptions(choose, [
      { text: "前往结局", code: "jump:ending" },
      { text: "留在原地" },
    ]);

    expect(nextImage.extra?.imageMessage).toEqual({
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
    });
    expect(nextVideo.extra?.videoMessage).toEqual({
      fileId: 3,
      fileName: "clip.mp4",
      mediaType: "video/mp4",
      size: 456,
      second: 12,
      width: 640,
      height: 360,
    });
    expect(nextFile.extra?.fileMessage).toEqual({
      fileId: 2,
      fileName: "note.txt",
      mediaType: "text/plain",
      size: 45,
    });
    expect(nextChoose.extra?.webgalChoose).toEqual({
      options: [
        { text: "前往结局", code: "jump:ending" },
        { text: "留在原地" },
      ],
    });
  });

  it("writes editor-only media layout back into image and video blocks", () => {
    const image = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
    });
    const video = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 2,
      fileName: "clip.mp4",
      mediaType: "video/mp4",
      size: 456,
      second: 12,
      width: 640,
      height: 360,
    });

    expect(updateMessageEditorMediaSize(image, { width: 280, height: 158 })).toMatchObject({
      extra: {
        imageMessage: {
          editorHeight: 158,
          editorWidth: 280,
        },
      },
    });
    expect(updateMessageEditorMediaSize(video, { width: 300, height: 169 })).toMatchObject({
      extra: {
        videoMessage: {
          editorHeight: 169,
          editorWidth: 300,
        },
      },
    });
  });

  it("merges editor media layouts by runtime id, media identity and fallback index", () => {
    const sourceImage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
    });
    const sourceVideo = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 2,
      fileName: "clip.mp4",
      mediaType: "video/mp4",
      size: 456,
      second: 12,
      width: 640,
      height: 360,
    });
    const sourceImageWithLayout = updateMessageEditorMediaSize(sourceImage, { width: 280, height: 158 });
    const sourceVideoWithLayout = updateMessageEditorMediaSize(sourceVideo, { width: 300, height: 169 });
    const merged = mergeMessageEditorMediaLayouts([
      setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
        fileId: 1,
        fileName: "cover.png",
        mediaType: "image/png",
        size: 123,
        width: 320,
        height: 180,
      }),
      setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
        fileId: 2,
        fileName: "clip.mp4",
        mediaType: "video/mp4",
        size: 456,
        second: 12,
        width: 640,
        height: 360,
      }),
    ], [sourceImageWithLayout, sourceVideoWithLayout]);

    expect(merged[0].extra?.imageMessage).toMatchObject({
      editorHeight: 158,
      editorWidth: 280,
      fileId: 1,
    });
    expect(merged[1].extra?.videoMessage).toMatchObject({
      editorHeight: 169,
      editorWidth: 300,
      fileId: 2,
    });
  });

  it("writes speaker metadata without changing text content", () => {
    const source = createMessageEditorTextDraft({ content: "继续向前。" });

    const next = setMessageEditorSpeakerMetadata(source, {
      avatarId: 34,
      roleId: 12,
    });

    expect(next).toMatchObject({
      avatarId: 34,
      content: "继续向前。",
      roleId: 12,
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
