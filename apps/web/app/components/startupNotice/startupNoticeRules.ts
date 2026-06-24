export type StartupNoticeId = "test-env" | "dev-env" | "bug-feedback";

export const STARTUP_NOTICE_SESSION_KEYS: Record<StartupNoticeId, string> = {
  "test-env": "tc:test-env-splash:2026-02-20",
  "dev-env": "tc:dev-env-splash:2026-06-23",
  "bug-feedback": "tc:bug-feedback-splash:2026-05-20",
};

export type ResolveStartupNoticeIdsParams = {
  isTestBuild: boolean;
  isDevBuild: boolean;
  isAuthStatusLoading: boolean;
  isAnalyticsBlockedByAdBlocker: boolean;
  shouldShowBugFeedbackGuide: boolean;
  seenNoticeIds: ReadonlySet<StartupNoticeId>;
};

export function resolveStartupNoticeIds({
  isTestBuild,
  isDevBuild,
  isAuthStatusLoading,
  isAnalyticsBlockedByAdBlocker,
  shouldShowBugFeedbackGuide,
  seenNoticeIds,
}: ResolveStartupNoticeIdsParams): StartupNoticeId[] {
  const noticeIds: StartupNoticeId[] = [];

  if (isTestBuild && !seenNoticeIds.has("test-env")) {
    noticeIds.push("test-env");
  }

  if (isDevBuild && !seenNoticeIds.has("dev-env")) {
    noticeIds.push("dev-env");
  }

  const canShowBugFeedbackGuide = isAnalyticsBlockedByAdBlocker
    || (!isAuthStatusLoading && shouldShowBugFeedbackGuide);
  if (canShowBugFeedbackGuide && !seenNoticeIds.has("bug-feedback")) {
    noticeIds.push("bug-feedback");
  }

  return noticeIds;
}
