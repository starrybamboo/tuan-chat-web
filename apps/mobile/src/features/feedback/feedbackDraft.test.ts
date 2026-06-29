import { describe, expect, it } from "vitest";

import {
  buildMobileFeedbackDraftParams,
  readMobileFeedbackDraft,
} from "./feedbackDraft";

describe("mobile feedbackDraft", () => {
  it("会把反馈草稿参数原样保留", () => {
    expect(buildMobileFeedbackDraftParams({
      title: "页面报错",
      content: "已下载诊断日志",
    })).toEqual({
      title: "页面报错",
      content: "已下载诊断日志",
    });
  });

  it("会从路由参数读取反馈草稿", () => {
    expect(readMobileFeedbackDraft({
      title: ["页面报错：boom"],
      content: ["已下载诊断日志"],
    })).toEqual({
      title: "页面报错：boom",
      content: "已下载诊断日志",
    });
  });

  it("空参数会忽略", () => {
    expect(readMobileFeedbackDraft({})).toBeNull();
  });
});
