import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  mergeMessageEditorMediaLayouts,
  moveMessageEditorMessageToIndex,
  parseMessageEditorMarkdownPreview,
  previewVisibleOffsetToMessageEditorRawOffset,
  replaceMessageEditorSelectionText,
  setMessageEditorUploadedMedia,
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
    const sound = createMessageEditorBlockDraft("audio");
    const video = createMessageEditorBlockDraft("video");
    const file = createMessageEditorBlockDraft("file");

    const nextImage = setMessageEditorUploadedMedia(image, {
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
    });
    const nextSound = setMessageEditorUploadedMedia(sound, {
      fileId: 3,
      fileName: "voice.webm",
      mediaType: "audio",
      size: 456,
      second: 8,
    });
    const nextVideo = setMessageEditorUploadedMedia(video, {
      fileId: 4,
      fileName: "clip.webm",
      mediaType: "video",
      size: 789,
      second: 12,
      width: 1920,
      height: 1080,
    });
    const nextFile = setMessageEditorUploadedMedia(file, {
      fileId: 2,
      fileName: "note.txt",
      mediaType: "text/plain",
      size: 45,
    });

    expect(nextImage.extra?.imageMessage).toEqual({
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
    });
    expect(nextFile.extra?.fileMessage).toEqual({
      fileId: 2,
      fileName: "note.txt",
      mediaType: "text/plain",
      size: 45,
    });
    expect(nextSound.extra?.soundMessage).toEqual({
      fileId: 3,
      fileName: "voice.webm",
      mediaType: "audio",
      size: 456,
      second: 8,
    });
    expect(nextVideo.extra?.videoMessage).toEqual({
      fileId: 4,
      fileName: "clip.webm",
      mediaType: "video",
      size: 789,
      second: 12,
      width: 1920,
      height: 1080,
    });
  });

  it("updates image and video block dimensions while preserving uploaded media payload", () => {
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
      fileName: "clip.webm",
      mediaType: "video",
      size: 456,
      width: 1280,
      height: 720,
    });

    const resizedImage = updateMessageEditorMediaSize(image, { width: 480.4, height: 270.2 });
    const resizedVideo = updateMessageEditorMediaSize(video, { width: 640.2, height: 360.4 });

    expect(resizedImage.extra?.imageMessage).toEqual({
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      editorWidth: 480,
      editorHeight: 270,
      size: 123,
      width: 320,
      height: 180,
    });
    expect(resizedVideo.extra?.videoMessage).toEqual({
      fileId: 2,
      fileName: "clip.webm",
      mediaType: "video",
      editorWidth: 640,
      editorHeight: 360,
      size: 456,
      width: 1280,
      height: 720,
    });
  });

  it("merges persisted media editor layout back into fresh room messages", () => {
    const freshImage = {
      ...setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
        fileId: 1,
        fileName: "cover.png",
        mediaType: "image/png",
        size: 123,
        width: 320,
        height: 180,
      }),
      messageId: 100,
    };
    const freshVideo = {
      ...setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
        fileId: 2,
        fileName: "clip.webm",
        mediaType: "video",
        size: 456,
        width: 1280,
        height: 720,
      }),
      messageId: 200,
    };
    const layoutImage = updateMessageEditorMediaSize(freshImage, { width: 480, height: 270 });
    const layoutVideo = updateMessageEditorMediaSize(freshVideo, { width: 640, height: 360 });
    const serverVideo = {
      ...freshVideo,
      extra: {
        videoMessage: {
          fileId: 2,
          fileName: "clip.webm",
          mediaType: "video",
          size: 456,
        },
      },
    };

    const merged = mergeMessageEditorMediaLayouts([freshImage, serverVideo], [layoutImage, layoutVideo]);

    expect(merged[0].extra?.imageMessage).toMatchObject({
      fileId: 1,
      width: 320,
      height: 180,
      editorWidth: 480,
      editorHeight: 270,
    });
    expect(merged[1].extra?.videoMessage).toMatchObject({
      fileId: 2,
      editorWidth: 640,
      editorHeight: 360,
    });
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
