import type { MarkTarget } from "../../../api";
import type { FeedbackIssueStatus } from "@/components/feedback/feedbackTypes";
import toast from "react-hot-toast";
import { Link } from "react-router";
import {
  useFeedbackIssueDetailQuery,
  useUpdateFeedbackIssueArchiveMutation,
  useUpdateFeedbackIssueStatusMutation,
} from "@/components/feedback/feedbackHooks";
import FeedbackIssueContent from "@/components/feedback/feedbackIssueContent";
import FeedbackIssueTimeline from "@/components/feedback/feedbackIssueTimeline";
import {
  FEEDBACK_ISSUE_STATUS_COMPLETED,
  FEEDBACK_ISSUE_STATUS_OPTIONS,
  FEEDBACK_ISSUE_STATUS_PROCESSING,
  FEEDBACK_ISSUE_STATUS_REJECTED,
  FEEDBACK_ISSUE_TARGET_TYPE,
  formatFeedbackMediaSummary,
  formatFeedbackDateTime,
  getFeedbackAuthorAvatar,
  getFeedbackAuthorName,
  getFeedbackIssueStatusLabel,
  getFeedbackIssueTypeLabel,
  isFeedbackDeveloper,
} from "@/components/feedback/feedbackTypes";

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "操作失败";
}

function FeedbackStatePill({
  status,
}: {
  status: FeedbackIssueStatus;
}) {
  const label = getFeedbackIssueStatusLabel(status);
  const className = status === FEEDBACK_ISSUE_STATUS_COMPLETED
    ? "border-success/30 bg-success/15 text-success"
    : status === FEEDBACK_ISSUE_STATUS_PROCESSING
      ? "border-warning/30 bg-warning/15 text-warning"
      : status === FEEDBACK_ISSUE_STATUS_REJECTED
        ? "border-error/30 bg-error/15 text-error"
        : "border-base-content/18 bg-base-200 text-base-content";
  const dotClassName = status === FEEDBACK_ISSUE_STATUS_COMPLETED
    ? "bg-success"
    : status === FEEDBACK_ISSUE_STATUS_PROCESSING
      ? "bg-warning"
      : status === FEEDBACK_ISSUE_STATUS_REJECTED
        ? "bg-error"
        : "bg-base-content/55";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${className}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
      {label}
    </span>
  );
}

function FeedbackArchivePill({ archived }: { archived: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${archived ? "border-base-content/25 bg-base-200 text-base-content/75" : "border-base-content/15 bg-base-100 text-base-content/55"}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${archived ? "bg-base-content/45" : "bg-base-content/20"}`} />
      {archived ? "已归档" : "未归档"}
    </span>
  );
}

function getFeedbackStatusButtonClass(status: FeedbackIssueStatus, active: boolean) {
  if (!active) {
    return "btn-ghost text-base-content/50 hover:bg-base-content/5 hover:text-base-content";
  }

  if (status === FEEDBACK_ISSUE_STATUS_COMPLETED) {
    return "bg-success/20 text-success hover:bg-success/30";
  }
  if (status === FEEDBACK_ISSUE_STATUS_PROCESSING) {
    return "bg-warning/20 text-warning hover:bg-warning/30";
  }
  if (status === FEEDBACK_ISSUE_STATUS_REJECTED) {
    return "bg-error/20 text-error hover:bg-error/30";
  }
  return "bg-base-content/10 text-base-content hover:bg-base-content/15";
}

function FeedbackStatusButtons({
  status,
  disabled,
  canSetProcessingStatus,
  onChange,
}: {
  status: FeedbackIssueStatus;
  disabled: boolean;
  canSetProcessingStatus: boolean;
  onChange: (status: FeedbackIssueStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`inline-flex flex-wrap items-center gap-1 rounded-2xl border border-base-300 bg-base-100 p-1 shadow-sm ${disabled ? "opacity-65" : ""}`}>
        {FEEDBACK_ISSUE_STATUS_OPTIONS.map((option) => {
          const active = option.value === status;
          const processingLocked = option.value === FEEDBACK_ISSUE_STATUS_PROCESSING && !canSetProcessingStatus;
          const optionDisabled = disabled || processingLocked;
          return (
            <button
              key={option.value}
              type="button"
              className={`btn btn-sm h-9 min-h-0 rounded-xl border-none px-5 text-sm font-medium shadow-none transition-all ${getFeedbackStatusButtonClass(option.value, active)} ${processingLocked ? "cursor-not-allowed opacity-50" : ""}`}
              aria-pressed={active}
              disabled={optionDisabled}
              title={processingLocked ? "仅开发人员可设置为处理中" : undefined}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {!canSetProcessingStatus && (
        <p className="text-xs text-base-content/45">“处理中”状态仅开发人员可设置。</p>
      )}
    </div>
  );
}

function FeedbackArchiveToggle({
  archived,
  disabled,
  onToggle,
}: {
  archived: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn h-[44px] min-h-0 rounded-2xl border px-6 text-sm font-medium shadow-sm transition-all ${archived ? "btn-neutral border-neutral" : "border-base-300 bg-base-100 text-base-content hover:border-base-300 hover:bg-base-200/50"}`}
      disabled={disabled}
      onClick={onToggle}
    >
      {archived ? "取消归档" : "归档"}
    </button>
  );
}

function FeedbackDetailAuthor({
  avatar,
  authorName,
}: {
  avatar: string;
  authorName: string;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={authorName}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-300 text-sm font-semibold text-base-content/70">
      {authorName.slice(0, 1)}
    </div>
  );
}

export default function FeedbackIssueDetail({
  feedbackIssueId,
  loginUserId,
  onBack,
}: {
  feedbackIssueId?: number | null;
  loginUserId: number;
  onBack?: () => void;
}) {
  const issueQuery = useFeedbackIssueDetailQuery(feedbackIssueId);
  const updateStatusMutation = useUpdateFeedbackIssueStatusMutation();
  const updateArchiveMutation = useUpdateFeedbackIssueArchiveMutation();

  if (!feedbackIssueId) {
    return null;
  }

  if (issueQuery.isLoading) {
    return (
      <section className="flex min-h-[28rem] items-center justify-center rounded-xl border border-base-300 bg-base-100">
        <div className="flex flex-col items-center gap-3 text-base-content/60">
          <span className="loading loading-spinner loading-md" />
          正在加载反馈...
        </div>
      </section>
    );
  }

  if (issueQuery.isError || !issueQuery.data) {
    return (
      <section className="rounded-xl border border-base-300 bg-base-100 p-8">
        <div className="space-y-3 text-center">
          <div className="text-xl font-semibold text-base-content">反馈不存在或已无法访问</div>
          <p className="text-sm text-base-content/65">返回列表后可以重新选择。</p>
          {onBack && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onBack}>
              返回反馈列表
            </button>
          )}
        </div>
      </section>
    );
  }

  const issue = issueQuery.data;
  const targetInfo: MarkTarget = {
    targetId: issue.feedbackIssueId,
    targetType: FEEDBACK_ISSUE_TARGET_TYPE,
  };
  const authorName = getFeedbackAuthorName(issue.author);
  const avatar = getFeedbackAuthorAvatar(issue.author);
  const isUpdating = updateStatusMutation.isPending || updateArchiveMutation.isPending;
  const canSetProcessingStatus = isFeedbackDeveloper(loginUserId);
  const mediaSummary = formatFeedbackMediaSummary(issue.content);

  const handleStatusChange = async (status: FeedbackIssueStatus) => {
    if (status === issue.status) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        feedbackIssueId: issue.feedbackIssueId,
        status,
      });
      toast.success("反馈状态已更新");
    }
    catch (error) {
      toast.error(readErrorMessage(error));
    }
  };

  const handleArchiveToggle = async () => {
    try {
      await updateArchiveMutation.mutateAsync({
        feedbackIssueId: issue.feedbackIssueId,
        archived: !issue.archived,
      });
      if (issue.archived) {
        toast.success("已取消归档");
      }
      else {
        toast.success(issue.status === FEEDBACK_ISSUE_STATUS_COMPLETED ? "已归档" : "已归档，并自动设为拒绝");
      }
    }
    catch (error) {
      toast.error(readErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        {onBack && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
            ← 返回反馈列表
          </button>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-transparent"></div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-md bg-base-200/50 px-2.5 py-1 text-xs font-medium text-base-content/60">
                  <span className="uppercase tracking-wider">反馈详情</span>
                  <span className="w-1 h-1 rounded-full bg-base-300"></span>
                  <span className="font-mono">
                    #
                    {issue.feedbackIssueId}
                  </span>
                </div>
                <h1 className="break-words text-2xl sm:text-3xl font-bold leading-snug text-base-content">
                  {issue.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <FeedbackDetailAuthor avatar={avatar} authorName={authorName} />
                  <div className="flex flex-col">
                    <Link
                      to={`/profile/${issue.author?.userId ?? 0}`}
                      className="font-medium text-base-content hover:text-primary transition-colors hover:underline hover:underline-offset-2"
                    >
                      {authorName}
                    </Link>
                    <div className="text-xs text-base-content/50 mt-0.5">
                      {formatFeedbackDateTime(issue.createTime)}
                    </div>
                  </div>
                </div>

                <div className="h-8 w-px bg-base-200 hidden sm:block"></div>

                <div className="flex flex-wrap items-center gap-2">
                  <FeedbackStatePill status={issue.status} />
                  <br className="hidden" />
                  <FeedbackArchivePill archived={issue.archived} />
                  <span className="inline-flex items-center rounded-md bg-base-200/50 px-2.5 py-1 text-xs font-medium text-base-content/70">
                    {getFeedbackIssueTypeLabel(issue.issueType)}
                  </span>
                </div>
              </div>
            </div>

            {issue.canManage
              ? (
                  <div className="w-full shrink-0 xl:w-[26rem] flex flex-col gap-4 rounded-2xl bg-base-200/30 p-5 sm:p-6 border border-base-200/50">
                    <div className="text-sm font-semibold text-base-content/80">
                      反馈处理
                    </div>

                    <div className="flex flex-col gap-4">
                      <FeedbackStatusButtons
                        status={issue.status}
                        disabled={isUpdating || issue.archived}
                        canSetProcessingStatus={canSetProcessingStatus}
                        onChange={handleStatusChange}
                      />

                      <div className="h-px w-full bg-base-300/40"></div>

                      <div className="flex items-center gap-4 justify-between">
                        <div className="text-xs text-base-content/50 leading-relaxed max-w-[14rem]">
                          {issue.archived ? "该反馈已归档，可点击恢复到未归档状态。" : "归档会收起该反馈；未完成时自动转为拒绝。"}
                        </div>
                        <div className="shrink-0">
                          <FeedbackArchiveToggle
                            archived={issue.archived}
                            disabled={isUpdating}
                            onToggle={() => void handleArchiveToggle()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <article className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <div className="border-b border-base-300 bg-base-200/25 px-5 py-4">
              <div className="text-base font-medium text-base-content">反馈正文</div>
              <div className="mt-1 text-sm text-base-content/55">
                {mediaSummary}
              </div>
            </div>

            <div className="px-6 py-6">
              <FeedbackIssueContent
                content={issue.content}
              />
            </div>
          </article>

          <FeedbackIssueTimeline
            commentCount={issue.commentCount}
            targetInfo={targetInfo}
            loginUserId={loginUserId > 0 ? loginUserId : -1}
          />
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <div className="border-b border-base-300 px-5 py-4 text-base font-medium text-base-content">
              详细信息
            </div>
            <dl className="divide-y divide-base-300 text-[14px]">
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-base-content/55">类型</dt>
                <dd className="text-right text-base-content">{getFeedbackIssueTypeLabel(issue.issueType)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-base-content/55">状态</dt>
                <dd className="text-right text-base-content">{getFeedbackIssueStatusLabel(issue.status)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-base-content/55">已归档</dt>
                <dd className="text-right text-base-content">{issue.archived ? "已归档" : "未归档"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-base-content/55">评论数</dt>
                <dd className="text-right text-base-content">{issue.commentCount}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-base-content/55">更新时间</dt>
                <dd className="text-right text-base-content">{formatFeedbackDateTime(issue.updateTime)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
