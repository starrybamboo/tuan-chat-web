import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  moveMessageEditorMessageToIndex,
  setMessageEditorUploadedMedia,
  splitMessageEditorMessage,
} from "./messageEditorTransforms";

describe("messageEditorTransforms", () => {
  it("splits a text block at the selected raw syntax range", () => {
    const source = createMessageEditorTextDraft({
      content: "alpha beta",
      messageType: MESSAGE_TYPE.TEXT,
    });

    const result = splitMessageEditorMessage([source], {
      blockId: source.extra?.messageEditor?.blockId as string,
      selectionStart: 5,
      selectionEnd: 6,
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe("alpha");
    expect(result.messages[1].content).toBe("beta");
  });

  it("creates atomic drafts for slash insertion", () => {
    const image = createMessageEditorBlockDraft("image");
    const choose = createMessageEditorBlockDraft("choose");

    expect(image.messageType).toBe(MESSAGE_TYPE.IMG);
    expect(image.extra?.imageMessage).toEqual({});
    expect(choose.messageType).toBe(MESSAGE_TYPE.WEBGAL_CHOOSE);
    expect(choose.extra?.webgalChoose).toEqual({ options: [] });
  });

  it("moves a block to a target index", () => {
    const first = createMessageEditorTextDraft({ content: "first" });
    const second = createMessageEditorTextDraft({ content: "second" });
    const third = createMessageEditorTextDraft({ content: "third" });

    const nextMessages = moveMessageEditorMessageToIndex([first, second, third], first.extra?.messageEditor?.blockId as string, 2);

    expect(nextMessages.map(message => message.content)).toEqual(["second", "third", "first"]);
  });

  it("writes uploaded media payloads back into atomic blocks", () => {
    const image = createMessageEditorBlockDraft("image");
    const file = createMessageEditorBlockDraft("file");

    const nextImage = setMessageEditorUploadedMedia(image, {
      fileId: 1,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 123,
      width: 320,
      height: 180,
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
  });
});
