import { describe, expect, it } from "vitest";

import { createMessageEditorSnapshot, decodeMessageEditorMessages } from "./messageEditorCodec";
import { createMessageEditorBlockDraft, setMessageEditorUploadedMedia, updateMessageEditorMediaSize } from "./messageEditorTransforms";

describe("messageEditorCodec", () => {
  it("keeps resized media width through snapshot round-trips", () => {
    const resizedImage = updateMessageEditorMediaSize(setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
      fileId: 10,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 1024,
      width: 1600,
      height: 900,
    }), {
      width: 640,
      height: 360,
    });
    const resizedVideo = updateMessageEditorMediaSize(setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 11,
      fileName: "clip.webm",
      mediaType: "video",
      size: 2048,
      width: 1920,
      height: 1080,
    }), {
      width: 720,
      height: 405,
    });

    const snapshot = createMessageEditorSnapshot([resizedImage, resizedVideo], 123);
    const [decodedImage, decodedVideo] = decodeMessageEditorMessages(snapshot);
    const decodedImagePayload = decodedImage.extra?.imageMessage as { editorWidth?: number } | undefined;
    const decodedVideoPayload = decodedVideo.extra?.videoMessage as { editorWidth?: number } | undefined;

    expect(decodedImagePayload?.editorWidth).toBe(640);
    expect((decodedImage.extra?.imageMessage as { editorHeight?: number } | undefined)?.editorHeight).toBe(360);
    expect(decodedVideoPayload?.editorWidth).toBe(720);
    expect((decodedVideo.extra?.videoMessage as { editorHeight?: number } | undefined)?.editorHeight).toBe(405);
  });
});
