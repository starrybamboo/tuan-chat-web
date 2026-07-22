import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, vi } from "vitest";

import { MessageEditorAtomicBlock } from "../../components/MessageEditorAtomicBlock";
import { createMessageEditorBlockDraft, setMessageEditorUploadedMedia, updateMessageEditorMediaSize } from "../../model/messageEditorTransforms";

vi.mock("@/components/chat/message/media/CachedVideoMessage", () => ({
  DEFAULT_CACHED_VIDEO_ASPECT_RATIO: 16 / 9,
  default: ({ aspectRatio, className, onError, url }: { aspectRatio?: number; className?: string; onError?: () => void; url: string }) => {
    return createElement("video", {
      "data-video-aspect-ratio": aspectRatio,
      className,
      "data-has-error-handler": Boolean(onError),
      src: url,
    });
  },
}));

vi.mock("@/components/chat/message/messageContentRenderer", () => ({
  default: ({
    message,
    onMediaError,
  }: {
    message: { extra?: { fileMessage?: { fileName?: string } } };
    onMediaError?: () => void;
  }) => {
    return createElement("div", {
      "data-has-media-error-handler": Boolean(onMediaError),
    }, message.extra?.fileMessage?.fileName);
  },
}));

vi.mock("@/components/common/mediaImage", () => ({
  MediaImage: ({ alt, className, decoding, loading, onError, src }: {
    alt?: string;
    className?: string;
    decoding?: "async" | "auto" | "sync";
    loading?: "eager" | "lazy";
    onError?: () => void;
    src?: string;
  }) => {
    return createElement("img", {
      alt,
      className,
      decoding,
      "data-has-error-handler": Boolean(onError),
      loading,
      src,
    });
  },
}));

describe("messageEditorAtomicBlock", () => {
  function renderBlock(
    message = createMessageEditorBlockDraft("image"),
    options: { localFile?: File; uploadError?: string; uploading?: boolean } = {},
  ) {
    return renderToStaticMarkup(createElement(MessageEditorAtomicBlock, {
      active: false,
      blockId: "block-1",
      ...options,
      message,
      onDelete: () => {},
      onFocus: () => {},
      onResize: () => {},
      onUpload: async () => {},
    }));
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an upload placeholder when the image block has no media yet", () => {
    const html = renderBlock();

    expect(html).toContain("点击上传图片");
    expect(html).toContain("删除");
    expect(html).not.toContain("<img");
  });

  it("renders an upload status instead of a local image preview while the upload is in progress", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pending-image");
    const file = new File(["image"], "preview.png", { type: "image/png" });

    const html = renderBlock(createMessageEditorBlockDraft("image"), {
      localFile: file,
      uploading: true,
    });

    expect(html).toContain("正在上传 preview.png...");
    expect(html).not.toContain("点击上传图片");
    expect(html).not.toContain('src="blob:pending-image"');
  });

  it("keeps a local file card and retry state after upload failure", () => {
    const file = new File(["document"], "notes.pdf", { type: "application/pdf" });

    const html = renderBlock(createMessageEditorBlockDraft("file"), {
      localFile: file,
      uploadError: "上传失败，请重试",
    });

    expect(html).toContain("notes.pdf");
    expect(html).toContain("重新上传");
    expect(html).toContain("上传失败，请重试");
    expect(html).not.toContain("点击上传文件");
  });

  it("uses the same centered upload placeholder for empty audio and video blocks", () => {
    const audioHtml = renderBlock(createMessageEditorBlockDraft("audio"));
    const videoHtml = renderBlock(createMessageEditorBlockDraft("video"));

    expect(audioHtml).toContain("点击上传音频");
    expect(audioHtml).toContain("删除");
    expect(videoHtml).toContain("点击上传视频");
    expect(videoHtml).toContain("删除");
    expect(videoHtml).toContain("w-2/3");
  });

  it("renders an uploaded image with replace, delete, and resize actions", () => {
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
    expect(html).toContain("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('data-has-error-handler="true"');
  });

  it("renders an uploaded video with replace, delete, and resize actions", () => {
    const videoMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("video"), {
      fileId: 47,
      fileName: "clip.webm",
      mediaType: "video",
      size: 4096,
      width: 1920,
      height: 1080,
    });

    const html = renderBlock(videoMessage);

    expect(html).toContain("更换视频");
    expect(html).toContain("删除");
    expect(html).toContain("拖拽缩放视频");
    expect(html).toContain("https://media.tuan.chat/media/v1/files/047/47/video/low.webm");
    expect(html).toContain('data-has-error-handler="true"');
    expect(html).toContain('data-video-aspect-ratio="1.7777777777777777"');
    expect(html).toContain("w-2/3");
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
    expect(videoHtml).not.toContain("w-2/3");
    expect(videoHtml).toContain('data-video-aspect-ratio="1.7777777777777777"');
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
    expect(audioHtml).toContain('data-has-media-error-handler="true"');
    expect(audioHtml).not.toContain("更换音频");
  });

  it("renders a delete action for uploaded file blocks", () => {
    const fileMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("file"), {
      fileId: 50,
      fileName: "notes.pdf",
      mediaType: "application/pdf",
      size: 2048,
    });

    const html = renderBlock(fileMessage);

    expect(html).toContain("notes.pdf");
    expect(html).toContain("删除文件块");
    expect(html).not.toContain("更换文件");
  });
});
