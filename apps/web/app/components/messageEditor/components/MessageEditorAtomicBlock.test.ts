import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import { createMessageEditorBlockDraft, setMessageEditorUploadedMedia, updateMessageEditorMediaSize } from "../model/messageEditorTransforms";
import { MessageEditorAtomicBlock } from "./MessageEditorAtomicBlock";

vi.mock("@/components/chat/message/media/CachedVideoMessage", () => ({
  default: ({ className, url }: { className?: string; url: string }) => {
    return createElement("video", {
      className,
      src: url,
    });
  },
}));

vi.mock("@/components/common/mediaImage", () => ({
  MediaImage: ({ alt, className, src }: { alt?: string; className?: string; src?: string }) => {
    return createElement("img", {
      alt,
      className,
      src,
    });
  },
}));

describe("messageEditorAtomicBlock", () => {
  function normalizeMarkup(markup: string) {
    return markup.replaceAll(/\s+/g, " ");
  }

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
    expect(html).toContain("min-h-24");
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
    const normalizedHtml = normalizeMarkup(html);

    expect(html).toContain("更换图片");
    expect(html).toContain("删除");
    expect(html).toContain("拖拽缩放图片");
    expect(html).toContain("cursor-ew-resize");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("group-hover/media:pointer-events-auto");
    expect(html).toContain("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(normalizedHtml).toContain("class=\" block h-auto w-full max-w-full object-contain \"");
  });

  it("renders a full-width uploaded video with replace, delete, and resize actions", () => {
    const videoMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 47,
      fileName: "clip.webm",
      mediaType: "video",
      size: 4096,
      width: 1920,
      height: 1080,
    });

    const html = renderBlock(videoMessage);
    const normalizedHtml = normalizeMarkup(html);

    expect(html).toContain("更换视频");
    expect(html).toContain("删除");
    expect(html).toContain("拖拽缩放视频");
    expect(html).toContain("https://media.tuan.chat/media/v1/files/047/47/video/low.webm");
    expect(normalizedHtml).toContain("class=\" block h-auto w-full max-w-full bg-black object-contain \"");
  });

  it("restores the persisted resized width for image and video blocks", () => {
    const resizedImage = updateMessageEditorMediaSize(setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
      fileId: 48,
      fileName: "wide.png",
      mediaType: "image/png",
      size: 2048,
      width: 1600,
      height: 900,
    }), {
      width: 640,
      height: 360,
    });
    const resizedVideo = updateMessageEditorMediaSize(setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 49,
      fileName: "wide.webm",
      mediaType: "video",
      size: 4096,
      width: 1920,
      height: 1080,
    }), {
      width: 720,
      height: 405,
    });

    const imageHtml = renderBlock(resizedImage);
    const videoHtml = renderBlock(resizedVideo);

    expect(imageHtml).toContain("width:640px");
    expect(videoHtml).toContain("width:720px");
  });

  it("renders a tail delete action for uploaded audio blocks", () => {
    const audioMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("audio"), {
      fileId: 46,
      fileName: "voice.webm",
      mediaType: "audio",
      size: 2048,
      second: 9,
    });

    const audioHtml = renderBlock(audioMessage);

    expect(audioHtml).toContain("删除音频块");
    expect(audioHtml).toContain("0:00 / 0:09");
    expect(audioHtml).toContain("tc-audio-message");
    expect(audioHtml).not.toContain("更换音频");
  });

  it("renders a hover delete icon at the tail of uploaded file blocks", () => {
    const fileMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("file"), {
      fileId: 50,
      fileName: "notes.pdf",
      mediaType: "application/pdf",
      size: 2048,
    });

    const html = renderBlock(fileMessage);

    expect(html).toContain("notes.pdf");
    expect(html).toContain("删除文件块");
    expect(html).toContain("group-hover/media:pointer-events-auto");
    expect(html).not.toContain("更换文件");
  });
});
