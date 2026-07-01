import { describe, expect, it } from "vitest";

import {
  buildFileToken,
  buildImageMarkdown,
  buildMediaContentPreview,
  buildMediaReferenceToken,
  buildVideoToken,
  composeMediaContent,
  formatMediaContentSummary,
  hasMeaningfulMediaContent,
  measureMediaContentLength,
} from "@/components/common/content/mediaContent";

describe("mediaContent", () => {
  it("会将文本、图片和视频片段拼成统一 content 字符串", () => {
    expect(composeMediaContent({
      text: "第一步\n第二步",
      images: ["https://img.example.com/repro.webp"],
      videos: ["https://video.example.com/repro.webm"],
    })).toBe([
      "第一步\n第二步",
      "![反馈图片 1](https://img.example.com/repro.webp)",
      "{{video:https://video.example.com/repro.webm}}",
    ].join("\n\n"));
  });

  it("正文为空但只有媒体时仍视为有效内容", () => {
    const content = [
      buildImageMarkdown(buildMediaReferenceToken(1001, "image"), "截图"),
      buildVideoToken(buildMediaReferenceToken(1002, "video")),
      buildFileToken(1003, "other", "tuanchat-console.json"),
    ].join("\n\n");

    expect(hasMeaningfulMediaContent(content)).toBe(true);
    expect(hasMeaningfulMediaContent(" \n\t ")).toBe(false);
  });

  it("预览会优先提取文本，否则回退到媒体摘要", () => {
    expect(buildMediaContentPreview("复现步骤\n\n{{video:https://video.example.com/repro.webm}}", 80, "空")).toBe("复现步骤");
    expect(buildMediaContentPreview("{{video:https://video.example.com/repro.webm}}", 80, "空")).toBe("含视频");
    expect(buildMediaContentPreview("![截图](https://img.example.com/repro.webp)", 80, "空")).toBe("含图片");
    expect(buildMediaContentPreview(buildFileToken(1003, "other", "log.json"), 80, "空")).toBe("含附件");
  });

  it("媒体长度统计按语义占位而不是完整 URL 计算", () => {
    const content = [
      "补充说明",
      buildImageMarkdown("https://img.example.com/very-long-path/with-query?token=abcdefg", "截图"),
      buildVideoToken("https://video.example.com/very-long-path/with-query?token=abcdefg"),
      buildFileToken(1003, "other", "tuanchat-console.json"),
    ].join("\n\n");

    expect(measureMediaContentLength(content)).toBe("补充说明\n\n[图片]\n\n[视频]\n\n[附件]".trim().length);
  });

  it("媒体摘要会分别统计图片和视频数量", () => {
    const content = composeMediaContent({
      images: ["https://img.example.com/a.webp", "https://img.example.com/b.webp"],
      videos: ["https://video.example.com/demo.webm"],
    });

    expect(formatMediaContentSummary(`${content}\n\n${buildFileToken(1003, "other", "log.json")}`)).toBe("共 2 张图片 · 1 个视频 · 1 个附件");
    expect(formatMediaContentSummary("")).toBe("未附带媒体");
  });

  it("会清理附件 token 展示文件名中的分隔符", () => {
    expect(buildFileToken(1003, "other", "bad|name}\n.json")).toBe("{{file:tc-media://other/1003|bad name .json}}");
  });
});
