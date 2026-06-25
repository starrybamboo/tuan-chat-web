import { describe, expect, it } from "vitest";

import { resolveStartupNoticeIds } from "@/components/startupNotice/startupNoticeRules";

describe("resolveStartupNoticeIds", () => {
  it("测试环境和已登录 Bug 反馈提示会进入统一启动弹窗", () => {
    expect(resolveStartupNoticeIds({
      isTestBuild: true,
      isDevBuild: false,
      isAuthStatusLoading: false,
      isAnalyticsBlockedByAdBlocker: false,
      shouldShowBugFeedbackGuide: true,
      seenNoticeIds: new Set(),
    })).toEqual(["test-env", "bug-feedback"]);
  });

  it("开发环境会展示开发环境提示", () => {
    expect(resolveStartupNoticeIds({
      isTestBuild: false,
      isDevBuild: true,
      isAuthStatusLoading: false,
      isAnalyticsBlockedByAdBlocker: false,
      shouldShowBugFeedbackGuide: false,
      seenNoticeIds: new Set(),
    })).toEqual(["dev-env"]);
  });

  it("已读提示不会再次进入启动弹窗", () => {
    expect(resolveStartupNoticeIds({
      isTestBuild: true,
      isDevBuild: false,
      isAuthStatusLoading: false,
      isAnalyticsBlockedByAdBlocker: true,
      shouldShowBugFeedbackGuide: true,
      seenNoticeIds: new Set(["test-env", "bug-feedback"]),
    })).toEqual([]);
  });

  it("诊断脚本被拦截时即使登录态还在加载也展示 Bug 反馈提示", () => {
    expect(resolveStartupNoticeIds({
      isTestBuild: false,
      isDevBuild: false,
      isAuthStatusLoading: true,
      isAnalyticsBlockedByAdBlocker: true,
      shouldShowBugFeedbackGuide: false,
      seenNoticeIds: new Set(),
    })).toEqual(["bug-feedback"]);
  });

  it("非测试环境、未登录且诊断正常时不展示启动提示", () => {
    expect(resolveStartupNoticeIds({
      isTestBuild: false,
      isDevBuild: false,
      isAuthStatusLoading: false,
      isAnalyticsBlockedByAdBlocker: false,
      shouldShowBugFeedbackGuide: false,
      seenNoticeIds: new Set(),
    })).toEqual([]);
  });
});
