import { describe, expect, it } from "vitest";

import {
  buildImageMarkdown,
  buildMediaContentPreview,
  buildVideoToken,
  composeMediaContent,
  formatMediaContentSummary,
  hasMeaningfulMediaContent,
  measureMediaContentLength,
} from "@/components/common/content/mediaContent";

describe("mediaContent", () => {
  it("会将旧的文本、图片和视频片段拼成统一 content 字符串", () => {
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
      buildImageMarkdown("https://img.example.com/repro.webp", "截图"),
      buildVideoToken("https://video.example.com/repro.webm"),
    ].join("\n\n");

    expect(hasMeaningfulMediaContent(content)).toBe(true);
    expect(hasMeaningfulMediaContent(" \n\t ")).toBe(false);
  });

  it("预览会优先提取文本，否则回退到媒体摘要", () => {
    expect(buildMediaContentPreview("复现步骤\n\n{{video:https://video.example.com/repro.webm}}", 80, "空")).toBe("复现步骤");
    expect(buildMediaContentPreview("{{video:https://video.example.com/repro.webm}}", 80, "空")).toBe("含视频");
    expect(buildMediaContentPreview("![截图](https://img.example.com/repro.webp)", 80, "空")).toBe("含图片");
  });

  it("媒体长度统计按语义占位而不是完整 URL 计算", () => {
    const content = [
      "补充说明",
      buildImageMarkdown("https://img.example.com/very-long-path/with-query?token=abcdefg", "截图"),
      buildVideoToken("https://video.example.com/very-long-path/with-query?token=abcdefg"),
    ].join("\n\n");

    expect(measureMediaContentLength(content)).toBe("补充说明\n\n[图片]\n\n[视频]".trim().length);
  });

  it("媒体摘要会分别统计图片和视频数量", () => {
    const content = composeMediaContent({
      images: ["https://img.example.com/a.webp", "https://img.example.com/b.webp"],
      videos: ["https://video.example.com/demo.webm"],
    });

    expect(formatMediaContentSummary(content)).toBe("共 2 张图片 · 1 个视频");
    expect(formatMediaContentSummary("")).toBe("未附带媒体");
  });
});
