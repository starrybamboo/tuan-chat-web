import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createMessageEditorBlockDraft, setMessageEditorUploadedMedia } from "../model/messageEditorTransforms";
import { MessageEditorAtomicBlock } from "./MessageEditorAtomicBlock";

describe("messageEditorAtomicBlock", () => {
  function renderBlock(message = createMessageEditorBlockDraft("image")) {
    return renderToStaticMarkup(createElement(MessageEditorAtomicBlock, {
      active: false,
      blockId: "block-1",
      message,
      onDelete: () => {},
      onFocus: () => {},
      onResize: () => {},
      onUpload: async () => {},
    }));
  }

  it("renders an upload placeholder when the image block has no media yet", () => {
    const html = renderBlock();

    expect(html).toContain("点击上传图片");
    expect(html).toContain("删除");
    expect(html).not.toContain("<img");
  });

  it("uses the same centered upload placeholder for empty audio and video blocks", () => {
    const audioHtml = renderBlock(createMessageEditorBlockDraft("audio"));
    const videoHtml = renderBlock(createMessageEditorBlockDraft("video"));

    expect(audioHtml).toContain("点击上传音频");
    expect(audioHtml).toContain("删除");
    expect(videoHtml).toContain("点击上传视频");
    expect(videoHtml).toContain("删除");
  });

  it("renders a full-width uploaded image with replace, delete, and resize actions", () => {
    const imageMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
      fileId: 45,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 1024,
      width: 1600,
      height: 900,
    });

    const html = renderBlock(imageMessage);

    expect(html).toContain("更换图片");
    expect(html).toContain("删除");
    expect(html).toContain("拖拽缩放图片");
    expect(html).toContain("cursor-ew-resize");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("group-hover/image:pointer-events-auto");
    expect(html).toContain("https://tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(html).toContain("class=\"block h-auto w-full max-w-full object-contain\"");
  });

  it("reuses hover replace and delete actions for uploaded audio and video blocks", () => {
    const audioMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("audio"), {
      fileId: 46,
      fileName: "voice.webm",
      mediaType: "audio",
      size: 2048,
    });
    const videoMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 47,
      fileName: "clip.webm",
      mediaType: "video",
      size: 4096,
    });

    const audioHtml = renderBlock(audioMessage);
    const videoHtml = renderBlock(videoMessage);

    expect(audioHtml).toContain("更换音频");
    expect(audioHtml).toContain("group-hover/media:pointer-events-auto");
    expect(videoHtml).toContain("更换视频");
    expect(videoHtml).toContain("group-hover/media:pointer-events-auto");
  });
});
