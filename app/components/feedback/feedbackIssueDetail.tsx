import type { MarkTarget } from "../../../api";
import { Link } from "react-router";
import toast from "react-hot-toast";
import CommentPanel from "@/components/common/comment/commentPanel";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import {
  FEEDBACK_ISSUE_STATUS_OPTIONS,
  FEEDBACK_ISSUE_TARGET_TYPE,
  formatFeedbackDateTime,
  getFeedbackAuthorAvatar,
  getFeedbackAuthorName,
  getFeedbackIssueStatusLabel,
  getFeedbackIssueTypeLabel,
} from "@/components/feedback/feedbackTypes";
import {
  useFeedbackIssueDetailQuery,
  useUpdateFeedbackIssueArchiveMutation,
  useUpdateFeedbackIssueStatusMutation,
} from "@/components/feedback/feedbackHooks";

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "操作失败";
}

function FeedbackStatePill({
  status,
  archived,
}: {
  status: number;
  archived: boolean;
}) {
  const label = archived ? "Archived" : status === 3 ? "Closed" : "Open";
  const className = archived
    ? "border-base-content/25 bg-base-200 text-base-content/70"
    : status === 3
      ? "border-base-content/25 bg-base-200 text-base-content"
      : "border-success/30 bg-success/15 text-success";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${className}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${archived ? "bg-base-content/40" : status === 3 ? "bg-base-content/55" : "bg-success"}`} />
      {label}
    </span>
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
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-base-300 text-xs font-semibold text-base-content/70">
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
          Loading issue...
        </div>
      </section>
    );
  }

  if (issueQuery.isError || !issueQuery.data) {
    return (
      <section className="rounded-xl border border-base-300 bg-base-100 p-8">
        <div className="space-y-3 text-center">
          <div className="text-xl font-semibold text-base-content">Issue 不存在或已无法访问</div>
          <p className="text-sm text-base-content/65">返回列表后可以重新选择。</p>
          {onBack && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onBack}>
              返回 Issues
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

  const handleStatusChange = async (status: 1 | 2 | 3) => {
    if (status === issue.status) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        feedbackIssueId: issue.feedbackIssueId,
        status,
      });
      toast.success("Issue 状态已更新");
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
      toast.success(issue.archived ? "已取消归档" : "已归档");
    }
    catch (error) {
      toast.error(readErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {onBack
          ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
                ← Back to issues
              </button>
            )
          : <div />}
        <div className="text-sm text-base-content/50">
          Feedback / Issue
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight text-base-content">
              {issue.title}
              {" "}
              <span className="font-normal text-base-content/35">
                #
                {issue.feedbackIssueId}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/65">
              <FeedbackStatePill status={issue.status} archived={issue.archived} />
              <span>
                <Link
                  to={`/profile/${issue.author?.userId ?? 0}`}
                  className="font-medium text-base-content hover:text-primary"
                >
                  {authorName}
                </Link>
                {" opened this on "}
                {formatFeedbackDateTime(issue.createTime)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <article className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/25 px-4 py-3">
              <FeedbackDetailAuthor avatar={avatar} authorName={authorName} />
              <div className="min-w-0 flex-1 text-sm text-base-content/65">
                <Link
                  to={`/profile/${issue.author?.userId ?? 0}`}
                  className="font-medium text-base-content hover:text-primary"
                >
                  {authorName}
                </Link>
                {" commented on "}
                {formatFeedbackDateTime(issue.updateTime || issue.createTime)}
              </div>
            </div>

            <div className="px-5 py-5">
              <MarkDownViewer content={issue.content} />
            </div>
          </article>

          <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <div className="border-b border-base-300 px-4 py-3">
              <div className="text-sm font-medium text-base-content">
                Discussion
                {" "}
                <span className="text-base-content/50">
                  (
                  {issue.commentCount}
                  )
                </span>
              </div>
            </div>
            <div className="p-4">
              <CommentPanel targetInfo={targetInfo} loginUserId={loginUserId > 0 ? loginUserId : -1} />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <div className="border-b border-base-300 px-4 py-3 text-sm font-medium text-base-content">
              Metadata
            </div>
            <dl className="divide-y divide-base-300 text-sm">
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-base-content/55">Type</dt>
                <dd className="text-right text-base-content">{getFeedbackIssueTypeLabel(issue.issueType)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-base-content/55">Status</dt>
                <dd className="text-right text-base-content">{getFeedbackIssueStatusLabel(issue.status)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-base-content/55">Archived</dt>
                <dd className="text-right text-base-content">{issue.archived ? "Yes" : "No"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-base-content/55">Comments</dt>
                <dd className="text-right text-base-content">{issue.commentCount}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-base-content/55">Updated</dt>
                <dd className="text-right text-base-content">{formatFeedbackDateTime(issue.updateTime)}</dd>
              </div>
            </dl>
          </section>

          {issue.canManage && (
            <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
              <div className="border-b border-base-300 px-4 py-3 text-sm font-medium text-base-content">
                Manage issue
              </div>

              <div className="space-y-4 px-4 py-4">
                <label className="form-control">
                  <span className="mb-2 text-sm text-base-content/65">Status</span>
                  <select
                    id="feedback-status-manager"
                    name="feedback-status-manager"
                    aria-label="更新 issue 状态"
                    className="select select-bordered select-sm rounded-md"
                    value={issue.status}
                    disabled={isUpdating || issue.archived}
                    onChange={event => void handleStatusChange(Number(event.target.value) as 1 | 2 | 3)}
                  >
                    {FEEDBACK_ISSUE_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn-outline btn-sm w-full"
                  disabled={isUpdating}
                  onClick={() => void handleArchiveToggle()}
                >
                  {issue.archived ? "Unarchive issue" : "Archive issue"}
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
