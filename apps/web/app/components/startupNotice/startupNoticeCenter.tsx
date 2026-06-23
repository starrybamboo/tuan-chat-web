import type { ReactNode } from "react";

import { XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StartupNoticeId } from "@/components/startupNotice/startupNoticeRules";

import {
  resolveStartupNoticeIds,
  STARTUP_NOTICE_SESSION_KEYS,
} from "@/components/startupNotice/startupNoticeRules";

type StartupNoticeCenterProps = {
  isTestBuild: boolean;
  isAuthStatusLoading: boolean;
  isAnalyticsBlockedByAdBlocker: boolean;
  shouldShowBugFeedbackGuide: boolean;
};

type StartupNoticeItem = {
  id: StartupNoticeId;
  title: string;
  badge: string;
  content: ReactNode;
  tabCategory: string;
};

const NOTICE_TITLES: Record<StartupNoticeId, Pick<StartupNoticeItem, "title" | "badge" | "tabCategory">> = {
  "test-env": {
    title: "测试环境提示",
    badge: "测试环境",
    tabCategory: "环境",
  },
  "bug-feedback": {
    title: "Bug 反馈与诊断提示",
    badge: "诊断反馈",
    tabCategory: "问题",
  },
};

function readSeenNoticeIds(): Set<StartupNoticeId> {
  const seenNoticeIds = new Set<StartupNoticeId>();
  if (typeof window === "undefined") {
    return seenNoticeIds;
  }

  for (const [noticeId, storageKey] of Object.entries(STARTUP_NOTICE_SESSION_KEYS) as [StartupNoticeId, string][]) {
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        seenNoticeIds.add(noticeId);
      }
    }
    catch {
      // sessionStorage may be unavailable in private or restricted contexts.
    }
  }
  return seenNoticeIds;
}

function markNoticeSeen(noticeId: StartupNoticeId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(STARTUP_NOTICE_SESSION_KEYS[noticeId], "1");
  }
  catch {
    // ignore
  }
}

export default function StartupNoticeCenter({
  isTestBuild,
  isAuthStatusLoading,
  isAnalyticsBlockedByAdBlocker,
  shouldShowBugFeedbackGuide,
}: StartupNoticeCenterProps) {
  const [acknowledgedNoticeIds, setAcknowledgedNoticeIds] = useState<Set<StartupNoticeId>>(() => new Set());
  const [activeNoticeId, setActiveNoticeId] = useState<StartupNoticeId | null>(null);

  const noticeIds = useMemo(() => {
    const seenNoticeIds = readSeenNoticeIds();
    for (const noticeId of acknowledgedNoticeIds) {
      seenNoticeIds.add(noticeId);
    }

    return resolveStartupNoticeIds({
      isTestBuild,
      isAuthStatusLoading,
      isAnalyticsBlockedByAdBlocker,
      shouldShowBugFeedbackGuide,
      seenNoticeIds,
    });
  }, [
    acknowledgedNoticeIds,
    isAnalyticsBlockedByAdBlocker,
    isAuthStatusLoading,
    isTestBuild,
    shouldShowBugFeedbackGuide,
  ]);

  const notices = useMemo<StartupNoticeItem[]>(() => {
    return noticeIds.map((noticeId) => {
      const titleInfo = NOTICE_TITLES[noticeId];
      if (noticeId === "test-env") {
        return {
          id: noticeId,
          title: titleInfo.title,
          badge: titleInfo.badge,
          tabCategory: titleInfo.tabCategory,
          content: <TestEnvironmentNoticeContent />,
        };
      }

      return {
        id: noticeId,
        title: titleInfo.title,
        badge: titleInfo.badge,
        tabCategory: titleInfo.tabCategory,
        content: <BugFeedbackNoticeContent isAnalyticsBlockedByAdBlocker={isAnalyticsBlockedByAdBlocker} />,
      };
    });
  }, [isAnalyticsBlockedByAdBlocker, noticeIds]);

  useEffect(() => {
    if (notices.length === 0) {
      if (activeNoticeId !== null) {
        setActiveNoticeId(null);
      }
      return;
    }

    if (!activeNoticeId || !notices.some(notice => notice.id === activeNoticeId)) {
      setActiveNoticeId(notices[0].id);
    }
  }, [activeNoticeId, notices]);

  const activeNotice = notices.find(notice => notice.id === activeNoticeId) ?? null;

  const acknowledgeNoticeIds = useCallback((noticeIdsToAcknowledge: StartupNoticeId[]) => {
    if (noticeIdsToAcknowledge.length === 0) {
      return;
    }

    for (const noticeId of noticeIdsToAcknowledge) {
      markNoticeSeen(noticeId);
    }
    setAcknowledgedNoticeIds((prev) => {
      const next = new Set(prev);
      for (const noticeId of noticeIdsToAcknowledge) {
        next.add(noticeId);
      }
      return next;
    });
  }, []);

  const handleCloseActiveNotice = useCallback(() => {
    if (!activeNotice) {
      return;
    }
    acknowledgeNoticeIds([activeNotice.id]);
  }, [acknowledgeNoticeIds, activeNotice]);

  if (!activeNotice) {
    return null;
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="startup-notice-title">
      <div className="modal-box max-w-3xl p-0 overflow-hidden">
        <div className="
          flex items-center justify-between gap-3 border-b border-base-300
          bg-base-200/70 px-5 py-3
        ">
          {notices.length > 1
            ? (
                <div className="flex min-w-0 gap-4 overflow-x-auto" role="tablist" aria-label="启动提示分类">
                  {notices.map(notice => (
                    <button
                      key={notice.id}
                      type="button"
                      role="tab"
                      className={`
                        border-b-2 px-0 py-1 text-sm font-medium transition-colors
                        ${notice.id === activeNotice.id
                          ? "border-primary text-base-content"
                          : "border-transparent text-base-content/55 hover:text-base-content"}
                      `}
                      onClick={() => setActiveNoticeId(notice.id)}
                      aria-selected={notice.id === activeNotice.id}
                    >
                      <span className="whitespace-nowrap">
                        {notice.tabCategory}
                        {" / "}
                        {notice.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )
            : (
                <div className="min-w-0 text-sm font-medium text-base-content/65">
                  <span className="whitespace-nowrap">
                    {activeNotice.tabCategory}
                    {" / "}
                    {activeNotice.badge}
                  </span>
                </div>
              )}

          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={handleCloseActiveNotice}
            aria-label="关闭当前启动提示"
          >
            <XIcon className="size-4" weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-72 px-6 py-5">
          <h3 id="startup-notice-title" className="sr-only">{activeNotice.title}</h3>
          {activeNotice.content}
        </div>
      </div>
      <div className="modal-backdrop" aria-hidden="true" />
    </div>
  );
}

function TestEnvironmentNoticeContent() {
  return (
    <div className="space-y-3 leading-7">
      <p>
        您现在访问的是团剧共创测试环境。相比正式环境，测试环境会包含更多仍在验证中的功能，也更可能遇到未修复的问题。
      </p>
      <p>
        如果你不是团剧共创的深度用户，建议优先使用正式环境：
        <a className="link link-primary ml-1" href="https://tuan.chat" target="_blank" rel="noreferrer">tuan.chat</a>
      </p>
      <div className="pt-2">
        <a className="btn btn-outline" href="https://tuan.chat" target="_blank" rel="noreferrer">前往正式环境</a>
      </div>
    </div>
  );
}

function BugFeedbackNoticeContent({ isAnalyticsBlockedByAdBlocker }: { isAnalyticsBlockedByAdBlocker: boolean }) {
  return (
    <div className="space-y-3 leading-7">
      {isAnalyticsBlockedByAdBlocker && (
        <div className="
          rounded-md border border-warning/30 bg-warning/10 px-4 py-3
          text-sm leading-7 text-base-content
        ">
          <p className="font-semibold text-warning">检测到浏览器可能拦截了诊断脚本</p>
          <p className="mt-2">
            当前站点使用 Cloudflare 的 JS beacon 收集性能和错误现场，用于性能优化和 Bug 分析。
            如果你开启了广告拦截插件，建议将当前站点加入白名单，或临时关闭插件后刷新页面。
          </p>
        </div>
      )}
      <p>
        如果你在使用过程中遇到了 Bug，可以点击顶栏右侧的「Bug反馈」或 QQ 图标进入反馈群。
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li>点击「Bug反馈」会自动下载当前控制台日志</li>
        <li>在 QQ 反馈群里说明具体场景和复现步骤</li>
        <li>把日志文件、截图或录屏一起发送，方便定位问题</li>
      </ol>
      <p className="text-sm opacity-80">
        日志文件包含当前页面地址、浏览器信息和前端控制台记录，不包含账号密码。
      </p>
    </div>
  );
}
