export type StartupNoticeId = "test-env" | "bug-feedback";

export const STARTUP_NOTICE_SESSION_KEYS: Record<StartupNoticeId, string> = {
  "test-env": "tc:test-env-splash:2026-02-20",
  "bug-feedback": "tc:bug-feedback-splash:2026-05-20",
};

export type ResolveStartupNoticeIdsParams = {
  isTestBuild: boolean;
  isAuthStatusLoading: boolean;
  isAnalyticsBlockedByAdBlocker: boolean;
  shouldShowBugFeedbackGuide: boolean;
  seenNoticeIds: ReadonlySet<StartupNoticeId>;
};

export function resolveStartupNoticeIds({
  isTestBuild,
  isAuthStatusLoading,
  isAnalyticsBlockedByAdBlocker,
  shouldShowBugFeedbackGuide,
  seenNoticeIds,
}: ResolveStartupNoticeIdsParams): StartupNoticeId[] {
  const noticeIds: StartupNoticeId[] = [];

  if (isTestBuild && !seenNoticeIds.has("test-env")) {
    noticeIds.push("test-env");
  }

  const canShowBugFeedbackGuide = isAnalyticsBlockedByAdBlocker
    || (!isAuthStatusLoading && shouldShowBugFeedbackGuide);
  if (canShowBugFeedbackGuide && !seenNoticeIds.has("bug-feedback")) {
    noticeIds.push("bug-feedback");
  }

  return noticeIds;
}
