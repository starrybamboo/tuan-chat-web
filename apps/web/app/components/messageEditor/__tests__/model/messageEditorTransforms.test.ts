import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  mergeMessageEditorMediaLayouts,
  parseMessageEditorMarkdownPreview,
  previewVisibleOffsetToMessageEditorRawOffset,
  setMessageEditorSpeakerMetadata,
  setMessageEditorUploadedMedia,
  setMessageEditorWebgalChooseOptions,
  updateMessageEditorMediaSize,
} from "../../model/messageEditorTransforms";

describe("messageEditorTransforms", () => {
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
      source: { kind: "internal", fileId: 1 },
      fileName: "cover.png",
      size: 123,
      width: 320,
      height: 180,
    });
    expect(nextVideo.extra?.videoMessage).toEqual({
      source: { kind: "internal", fileId: 3 },
      fileName: "clip.mp4",
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
      source: { kind: "internal", fileId: 1 },
    });
    expect(merged[1].extra?.videoMessage).toMatchObject({
      editorHeight: 169,
      editorWidth: 300,
      source: { kind: "internal", fileId: 2 },
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

});
