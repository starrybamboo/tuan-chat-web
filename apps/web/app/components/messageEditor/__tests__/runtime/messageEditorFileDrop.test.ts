import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  getMessageEditorClipboardFiles,
  getMessageEditorMediaBlockKindForFile,
  getMessageEditorMediaBlockKindForMessage,
  isMessageEditorFileDrag,
  isMessageEditorUploadableMediaMessage,
} from "../../runtime/messageEditorFileDrop";

describe("messageEditorFileDrop", () => {
  it("detects file drag payloads", () => {
    expect(isMessageEditorFileDrag({
      types: ["Files"],
    } as unknown as DataTransfer)).toBe(true);

    expect(isMessageEditorFileDrag({
      types: ["text/plain"],
    } as unknown as DataTransfer)).toBe(false);
    expect(isMessageEditorFileDrag(null)).toBe(false);
  });

  it("extracts file items from clipboard payloads", () => {
    const imageFile = { name: "image.png", type: "image/png" } as File;

    const files = getMessageEditorClipboardFiles({
      items: [
        { kind: "string" },
        {
          getAsFile: () => imageFile,
          kind: "file",
        },
      ],
    } as unknown as DataTransfer);

    expect(files).toEqual([imageFile]);
  });

  it("detects uploadable media messages", () => {
    expect(isMessageEditorUploadableMediaMessage({ messageType: MESSAGE_TYPE.IMG })).toBe(true);
    expect(isMessageEditorUploadableMediaMessage({ messageType: MESSAGE_TYPE.FILE })).toBe(true);
    expect(isMessageEditorUploadableMediaMessage({ messageType: MESSAGE_TYPE.WEBGAL_CHOOSE })).toBe(false);
    expect(isMessageEditorUploadableMediaMessage(undefined)).toBe(false);
  });

  it("maps uploadable messages to media block kinds", () => {
    expect(getMessageEditorMediaBlockKindForMessage({ messageType: MESSAGE_TYPE.IMG })).toBe("image");
    expect(getMessageEditorMediaBlockKindForMessage({ messageType: MESSAGE_TYPE.SOUND })).toBe("audio");
    expect(getMessageEditorMediaBlockKindForMessage({ messageType: MESSAGE_TYPE.TEXT })).toBeNull();
  });

  it("classifies files into media block kinds", () => {
    expect(getMessageEditorMediaBlockKindForFile({ name: "cover.png", type: "" } as File)).toBe("image");
    expect(getMessageEditorMediaBlockKindForFile({ name: "voice", type: "audio/webm" } as File)).toBe("audio");
    expect(getMessageEditorMediaBlockKindForFile({ name: "clip.mp4", type: "" } as File)).toBe("video");
    expect(getMessageEditorMediaBlockKindForFile({ name: "note.txt", type: "text/plain" } as File)).toBe("file");
  });
});
