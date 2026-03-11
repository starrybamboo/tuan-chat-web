import type { FeedbackIssueListFilters, FeedbackIssueListItem } from "@/components/feedback/feedbackTypes";
import { Link } from "react-router";
import {
  formatFeedbackDateTime,
  fromArchiveFilterValue,
  getFeedbackAuthorAvatar,
  getFeedbackAuthorName,
  getFeedbackIssueStatusLabel,
  getFeedbackIssueTypeLabel,
  toArchiveFilterValue,
} from "@/components/feedback/feedbackTypes";

function FeedbackStateDot({
  status,
  archived,
}: {
  status: number;
  archived: boolean;
}) {
  const colorClass = archived
    ? "border-base-content/35 bg-base-content/35"
    : status === 3
      ? "border-base-content/45 bg-base-content/45"
      : "border-success bg-success";

  return (
    <span className={`mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border ${colorClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-base-100" />
    </span>
  );
}

function FeedbackAuthorAvatar({ issue }: { issue: FeedbackIssueListItem }) {
  const avatar = getFeedbackAuthorAvatar(issue.author);
  const authorName = getFeedbackAuthorName(issue.author);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={authorName}
        className="h-6 w-6 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-base-300 text-[10px] font-semibold text-base-content/70">
      {authorName.slice(0, 1)}
    </div>
  );
}

function getStateText(issue: FeedbackIssueListItem) {
  if (issue.archived) {
    return "Archived";
  }
  if (issue.status === 3) {
    return "Closed";
  }
  return "Open";
}

export default function FeedbackIssueList({
  issues,
  filters,
  keyword,
  onKeywordChange,
  onFilterChange,
  onSelectIssue,
  onRefresh,
  onLoadMore,
  hasNextPage,
  isLoading,
  isFetching,
  isFetchingNextPage,
}: {
  issues: FeedbackIssueListItem[];
  selectedIssueId?: number | null;
  filters: FeedbackIssueListFilters;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onFilterChange: (patch: Partial<FeedbackIssueListFilters>) => void;
  onSelectIssue: (feedbackIssueId: number) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
}) {
  const openCount = issues.filter(issue => !issue.archived && issue.status !== 3).length;
  const closedCount = issues.filter(issue => !issue.archived && issue.status === 3).length;

  return (
    <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5 text-sm font-medium">
            <div className="flex items-center gap-2 text-base-content">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
              Open
              <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/70">
                {openCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-base-content/65">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-base-content/40" />
              Closed
              <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/70">
                {closedCount}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`btn btn-ghost btn-sm ${isFetching ? "loading" : ""}`}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="border-b border-base-300 bg-base-200/25 px-4 py-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_170px_auto]">
          <input
            type="search"
            id="feedback-search"
            name="feedback-search"
            aria-label="搜索 issue"
            className="input input-bordered input-sm w-full rounded-md"
            value={keyword}
            onChange={event => onKeywordChange(event.target.value)}
            placeholder="Search issues"
          />

          <select
            id="feedback-type-filter"
            name="feedback-type-filter"
            aria-label="按类型筛选"
            className="select select-bordered select-sm rounded-md"
            value={filters.issueType ?? ""}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              onFilterChange({
                issueType: Number.isNaN(nextValue) || nextValue <= 0 ? undefined : nextValue as 1 | 2,
              });
            }}
          >
            <option value="">All types</option>
            <option value="1">Bug反馈</option>
            <option value="2">Prompt Request</option>
          </select>

          <select
            id="feedback-status-filter"
            name="feedback-status-filter"
            aria-label="按状态筛选"
            className="select select-bordered select-sm rounded-md"
            value={filters.status ?? ""}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              onFilterChange({
                status: Number.isNaN(nextValue) || nextValue <= 0 ? undefined : nextValue as 1 | 2 | 3,
              });
            }}
          >
            <option value="">All status</option>
            <option value="1">待处理</option>
            <option value="2">处理中</option>
            <option value="3">已关闭</option>
          </select>

          <select
            id="feedback-archive-filter"
            name="feedback-archive-filter"
            aria-label="按归档状态筛选"
            className="select select-bordered select-sm rounded-md"
            value={toArchiveFilterValue(filters.archived)}
            onChange={event => onFilterChange({ archived: fromArchiveFilterValue(event.target.value) })}
          >
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
            <option value="all">All</option>
          </select>

          <label className="flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm">
            <input
              type="checkbox"
              id="feedback-mine-only"
              name="feedback-mine-only"
              aria-label="仅看我提出的反馈"
              className="checkbox checkbox-sm rounded-[4px]"
              checked={Boolean(filters.mineOnly)}
              onChange={event => onFilterChange({ mineOnly: event.target.checked })}
            />
            Mine only
          </label>
        </div>
      </div>

      {isLoading
        ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-base-content/60">
              <span className="loading loading-spinner loading-md" />
              Loading issues...
            </div>
          )
        : issues.length === 0
          ? (
              <div className="px-5 py-16 text-center">
                <div className="text-lg font-medium text-base-content">No issues found</div>
                <p className="mt-2 text-sm text-base-content/60">
                  试试调整筛选条件，或者直接新建一个反馈。
                </p>
              </div>
            )
          : (
              <div className="divide-y divide-base-300">
                {issues.map(issue => (
                  <div
                    key={issue.feedbackIssueId}
                    role="button"
                    tabIndex={0}
                    aria-label={`打开反馈 ${issue.title}`}
                    className="cursor-pointer px-4 py-4 transition hover:bg-base-200/35 focus:bg-base-200/35 focus:outline-none"
                    onClick={() => onSelectIssue(issue.feedbackIssueId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectIssue(issue.feedbackIssueId);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <FeedbackStateDot status={issue.status} archived={issue.archived} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[15px] font-semibold text-base-content">
                            {issue.title}
                          </div>
                          <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/75">
                            {getFeedbackIssueTypeLabel(issue.issueType)}
                          </span>
                          <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/65">
                            {getFeedbackIssueStatusLabel(issue.status)}
                          </span>
                          {issue.archived && (
                            <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/65">
                              Archived
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-base-content/60">
                          #
                          {issue.feedbackIssueId}
                          {" · "}
                          {getStateText(issue)}
                          {" · "}
                          <Link
                            to={`/profile/${issue.author?.userId ?? 0}`}
                            className="hover:text-primary"
                            onClick={event => event.stopPropagation()}
                          >
                            {getFeedbackAuthorName(issue.author)}
                          </Link>
                          {" opened on "}
                          {formatFeedbackDateTime(issue.createTime)}
                        </div>

                        {issue.contentPreview && (
                          <div className="mt-2 line-clamp-1 text-sm text-base-content/65">
                            {issue.contentPreview}
                          </div>
                        )}
                      </div>

                      <div className="hidden shrink-0 items-start gap-3 sm:flex">
                        <div className="mt-1 text-xs text-base-content/55">
                          {issue.commentCount > 0 ? `${issue.commentCount} comments` : ""}
                        </div>
                        <FeedbackAuthorAvatar issue={issue} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

      {issues.length > 0 && (
        <div className="border-t border-base-300 px-4 py-3">
          {hasNextPage
            ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={isFetchingNextPage}
                  onClick={onLoadMore}
                >
                  {isFetchingNextPage ? "加载中..." : "Load more issues"}
                </button>
              )
            : (
                <div className="text-sm text-base-content/50">
                  已加载当前条件下的全部 issue。
                </div>
              )}
        </div>
      )}
    </section>
  );
}
