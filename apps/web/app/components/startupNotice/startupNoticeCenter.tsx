import type { ReactNode } from "react";

import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StartupNoticeId } from "@/components/startupNotice/startupNoticeRules";

import {
  resolveStartupNoticeIds,
  STARTUP_NOTICE_SESSION_KEYS,
} from "@/components/startupNotice/startupNoticeRules";

type StartupNoticeCenterProps = {
  isTestBuild: boolean;
  isDevBuild: boolean;
  isAuthStatusLoading: boolean;
  isAnalyticsBlockedByAdBlocker: boolean;
  shouldShowBugFeedbackGuide: boolean;
};

type StartupNoticeItem = {
  id: StartupNoticeId;
  title: string;
  content: ReactNode;
};

const NOTICE_TITLES: Record<StartupNoticeId, Pick<StartupNoticeItem, "title">> = {
  "test-env": {
    title: "测试环境提示",
  },
  "dev-env": {
    title: "开发环境提示",
  },
  "bug-feedback": {
    title: "Bug 反馈与诊断提示",
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
  isDevBuild,
  isAuthStatusLoading,
  isAnalyticsBlockedByAdBlocker,
  shouldShowBugFeedbackGuide,
}: StartupNoticeCenterProps) {
  const [acknowledgedNoticeIds, setAcknowledgedNoticeIds] = useState<Set<StartupNoticeId>>(() => new Set());
  const shouldReduceMotion = useReducedMotion();

  const noticeIds = useMemo(() => {
    const seenNoticeIds = readSeenNoticeIds();
    for (const noticeId of acknowledgedNoticeIds) {
      seenNoticeIds.add(noticeId);
    }

    return resolveStartupNoticeIds({
      isTestBuild,
      isDevBuild,
      isAuthStatusLoading,
      isAnalyticsBlockedByAdBlocker,
      shouldShowBugFeedbackGuide,
      seenNoticeIds,
    });
  }, [
    acknowledgedNoticeIds,
    isAnalyticsBlockedByAdBlocker,
    isAuthStatusLoading,
    isDevBuild,
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
          content: <TestEnvironmentNoticeContent />,
        };
      }

      if (noticeId === "dev-env") {
        return {
          id: noticeId,
          title: titleInfo.title,
          content: <DevEnvironmentNoticeContent />,
        };
      }

      return {
        id: noticeId,
        title: titleInfo.title,
        content: <BugFeedbackNoticeContent isAnalyticsBlockedByAdBlocker={isAnalyticsBlockedByAdBlocker} />,
      };
    });
  }, [isAnalyticsBlockedByAdBlocker, noticeIds]);

  const isOpen = notices.length > 0;

  // 缓存最后一次展示的内容，退出动画期间 notices 已清空，靠快照继续渲染
  const lastShownRef = useRef<StartupNoticeItem[]>([]);
  if (notices.length > 0) {
    lastShownRef.current = notices;
  }
  const displayedNotices = lastShownRef.current;

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

  // 关闭即把当前展示的每个区块按各自的 session key 记为已读
  const handleCloseAll = useCallback(() => {
    acknowledgeNoticeIds(notices.map(notice => notice.id));
  }, [acknowledgeNoticeIds, notices]);

  // 打开时支持 Esc 关闭
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseAll, isOpen]);

  // 打开时锁定背景滚动，关闭/卸载时还原
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (displayedNotices.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="startup-notice-title">
          <motion.div
            className="modal-box max-w-3xl p-0 overflow-hidden"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                className="btn btn-ghost btn-square btn-sm"
                onClick={handleCloseAll}
                aria-label="关闭启动提示"
              >
                <XIcon className="size-4" weight="regular" aria-hidden="true" />
              </button>
            </div>

            <h2 id="startup-notice-title" className="sr-only">启动提示</h2>
            <div className="max-h-[70vh] divide-y divide-base-300/60 overflow-y-auto">
              {displayedNotices.map(notice => (
                <section key={notice.id} className="px-6 py-6 first:pt-2">
                  <h3 className="mb-3 text-base font-semibold text-base-content">{notice.title}</h3>
                  {notice.content}
                </section>
              ))}
            </div>
          </motion.div>
          <motion.button
            type="button"
            aria-label="关闭启动提示"
            className="modal-backdrop"
            onClick={handleCloseAll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "linear" }}
          />
        </div>
      )}
    </AnimatePresence>
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
        <a className="link link-primary ml-1" href="https://tuan.chat" target="_blank" rel="noopener noreferrer">tuan.chat</a>
      </p>
    </div>
  );
}

function DevEnvironmentNoticeContent() {
  return (
    <div className="space-y-3 leading-7">
      <p>
        您现在访问的是团剧共创本地开发环境。这里运行的是未发布的开发构建，会包含更多仍在调试中的功能，也更可能遇到未修复的问题。
      </p>
      <p>
        如果你不是团剧共创的开发者，建议优先使用正式环境：
        <a className="link link-primary ml-1" href="https://tuan.chat" target="_blank" rel="noopener noreferrer">tuan.chat</a>
      </p>
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
    </div>
  );
}
