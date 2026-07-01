import { describe, expect, it, vi } from "vitest";

import {
  appendFeedbackAttachmentTokens,
  formatFeedbackAttachmentSize,
  uploadFeedbackAttachments,
} from "@/components/feedback/feedbackAttachments";

describe("feedbackAttachments", () => {
  it("会把已上传附件追加为文件 token", () => {
    const content = appendFeedbackAttachmentTokens("复现说明", [{
      fileId: 1003,
      fileName: "tuanchat-console.json",
      mediaType: "other",
    }]);

    expect(content).toBe("复现说明\n\n{{file:tc-media://other/1003|tuanchat-console.json}}");
  });

  it("会按顺序上传反馈附件", async () => {
    const files = [
      new File(["a"], "a.json", { type: "application/json" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ];
    const uploadFileAsset = vi.fn()
      .mockResolvedValueOnce({
        fileId: 1,
        fileName: "a.json",
        mediaType: "other",
        originalUrl: "/a",
        size: 1,
        uploadRequired: true,
        url: "/a",
      })
      .mockResolvedValueOnce({
        fileId: 2,
        fileName: "b.txt",
        mediaType: "document",
        originalUrl: "/b",
        size: 1,
        uploadRequired: true,
        url: "/b",
      });

    const uploaded = await uploadFeedbackAttachments([
      { id: "a", file: files[0]! },
      { id: "b", file: files[1]! },
    ], { uploadFileAsset });

    expect(uploadFileAsset).toHaveBeenNthCalledWith(1, files[0]);
    expect(uploadFileAsset).toHaveBeenNthCalledWith(2, files[1]);
    expect(uploaded.map(asset => asset.fileId)).toEqual([1, 2]);
  });

  it("会格式化附件大小", () => {
    expect(formatFeedbackAttachmentSize(0)).toBe("0 B");
    expect(formatFeedbackAttachmentSize(512)).toBe("512 B");
    expect(formatFeedbackAttachmentSize(1536)).toBe("1.5 KB");
    expect(formatFeedbackAttachmentSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
