import { describe, expect, it } from "vitest";

import { composeMediaContent } from "@/components/common/content/mediaContent";
import {
  FEEDBACK_ISSUE_STATUS_COMPLETED,
  FEEDBACK_ISSUE_STATUS_PENDING,
  FEEDBACK_ISSUE_STATUS_PROCESSING,
  FEEDBACK_ISSUE_STATUS_REJECTED,
  formatFeedbackMediaSummary,
  getFeedbackAuthorAvatar,
  getFeedbackIssueStatusAfterArchive,
  getFeedbackIssueStatusLabel,
  isFeedbackDeveloper,
} from "@/components/feedback/feedbackTypes";

describe("feedbackTypes", () => {
  it("作者头像优先使用 avatar 字段，避免历史缩略图覆盖当前头像", () => {
    expect(getFeedbackAuthorAvatar({
      userId: 7,
      username: "tester",
      avatar: "https://img.example.com/current.webp",
      avatarThumbUrl: "https://img.example.com/legacy-thumb.webp",
    })).toBe("https://img.example.com/current.webp");
  });

  it("缺少 avatar 时回退到 avatarThumbUrl", () => {
    expect(getFeedbackAuthorAvatar({
      userId: 8,
      username: "tester",
      avatar: "",
      avatarThumbUrl: "https://img.example.com/thumb-only.webp",
    })).toBe("https://img.example.com/thumb-only.webp");
  });

  it("状态标签与新流程一致", () => {
    expect(getFeedbackIssueStatusLabel(FEEDBACK_ISSUE_STATUS_COMPLETED)).toBe("完成");
    expect(getFeedbackIssueStatusLabel(FEEDBACK_ISSUE_STATUS_PROCESSING)).toBe("处理中");
    expect(getFeedbackIssueStatusLabel(FEEDBACK_ISSUE_STATUS_REJECTED)).toBe("拒绝");
  });

  it("归档未完成反馈时会自动转成拒绝", () => {
    expect(getFeedbackIssueStatusAfterArchive(FEEDBACK_ISSUE_STATUS_PENDING, true)).toBe(FEEDBACK_ISSUE_STATUS_REJECTED);
    expect(getFeedbackIssueStatusAfterArchive(FEEDBACK_ISSUE_STATUS_COMPLETED, true)).toBe(FEEDBACK_ISSUE_STATUS_COMPLETED);
  });

  it("只有白名单开发 UID 会被识别为反馈开发人员", () => {
    expect(isFeedbackDeveloper(10001)).toBe(true);
    expect(isFeedbackDeveloper(10003)).toBe(true);
    expect(isFeedbackDeveloper(7)).toBe(false);
    expect(isFeedbackDeveloper(null)).toBe(false);
  });

  it("媒体摘要会同时覆盖图片和视频数量", () => {
    expect(formatFeedbackMediaSummary(composeMediaContent({
      images: ["https://img.example.com/a.webp", "https://img.example.com/b.webp"],
      videos: ["https://video.example.com/demo.webm"],
    }))).toBe("共 2 张图片 · 1 个视频");
    expect(formatFeedbackMediaSummary(composeMediaContent({
      videos: ["https://video.example.com/demo.webm", "https://video.example.com/demo-2.webm", "https://video.example.com/demo-3.webm"],
    }))).toBe("共 3 个视频");
    expect(formatFeedbackMediaSummary("")).toBe("未附带媒体");
  });
});
