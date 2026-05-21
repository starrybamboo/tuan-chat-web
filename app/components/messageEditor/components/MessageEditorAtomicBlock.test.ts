import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createMessageEditorBlockDraft, setMessageEditorUploadedMedia } from "../model/messageEditorTransforms";
import { MessageEditorAtomicBlock } from "./MessageEditorAtomicBlock";

describe("messageEditorAtomicBlock", () => {
  function renderImageBlock(message = createMessageEditorBlockDraft("image")) {
    return renderToStaticMarkup(createElement(MessageEditorAtomicBlock, {
      active: false,
      blockId: "block-1",
      message,
      onDelete: () => {},
      onFocus: () => {},
      onUpload: async () => {},
    }));
  }

  it("renders an upload placeholder when the image block has no media yet", () => {
    const html = renderImageBlock();

    expect(html).toContain("点击上传图片");
    expect(html).not.toContain("<img");
  });

  it("renders a full-width uploaded image with replace and delete actions", () => {
    const imageMessage = setMessageEditorUploadedMedia(createMessageEditorBlockDraft("image"), {
      fileId: 45,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 1024,
      width: 1600,
      height: 900,
    });

    const html = renderImageBlock(imageMessage);

    expect(html).toContain("更换图片");
    expect(html).toContain("删除");
    expect(html).toContain("https://tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(html).toContain("class=\"block h-auto w-full max-w-full object-contain\"");
  });
});
