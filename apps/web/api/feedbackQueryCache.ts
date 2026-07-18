import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { OptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

import type {
  FeedbackIssueDetail,
  FeedbackIssuePageResponse,
} from "@/components/feedback/feedbackTypes";

export const FEEDBACK_ISSUES_QUERY_KEY = ["feedbackIssues"] as const;
export const FEEDBACK_ISSUE_DETAIL_QUERY_KEY = "feedbackIssueDetail" as const;

export type FeedbackIssueListPatch = Pick<FeedbackIssueDetail, "feedbackIssueId"> & Partial<
  Pick<FeedbackIssueDetail, "status" | "archived" | "commentCount" | "updateTime">
>;

export type FeedbackIssueMutationContext = OptimisticQueryTransaction;

function omitUndefinedFields<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function feedbackIssueDetailQueryKey(feedbackIssueId: number) {
  return [FEEDBACK_ISSUE_DETAIL_QUERY_KEY, feedbackIssueId] as const;
}

export function patchFeedbackIssuePageData(
  data: InfiniteData<FeedbackIssuePageResponse> | undefined,
  patch: FeedbackIssueListPatch,
) {
  if (!data) {
    return data;
  }

  let hasChanges = false;
  const pages = data.pages.map((page) => {
    let pageChanged = false;
    const list = page.list.map((issue) => {
      if (issue.feedbackIssueId !== patch.feedbackIssueId) {
        return issue;
      }

      pageChanged = true;
      hasChanges = true;
      const definedPatch = omitUndefinedFields(patch);
      return {
        ...issue,
        ...definedPatch,
      };
    });

    return pageChanged ? { ...page, list } : page;
  });

  return hasChanges ? { ...data, pages } : data;
}

export async function optimisticPatchFeedbackIssueCaches(
  queryClient: QueryClient,
  patch: FeedbackIssueListPatch,
): Promise<FeedbackIssueMutationContext> {
  const detailKey = feedbackIssueDetailQueryKey(patch.feedbackIssueId);
  const definedPatch = omitUndefinedFields(patch);
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<FeedbackIssueDetail>({
      queryKey: detailKey,
      update: current => current ? { ...current, ...definedPatch } : current,
    }),
    optimisticQueryPatch<InfiniteData<FeedbackIssuePageResponse>>({
      queryKey: FEEDBACK_ISSUES_QUERY_KEY,
      exact: false,
      update: current => patchFeedbackIssuePageData(current, definedPatch as FeedbackIssueListPatch),
    }),
  ]);
}

export function rollbackFeedbackIssueCaches(
  queryClient: QueryClient,
  context?: FeedbackIssueMutationContext,
): void {
  if (!context) {
    return;
  }

  rollbackOptimisticQueryTransaction(queryClient, context);
}

export function reconcileFeedbackIssueCaches(queryClient: QueryClient, issue: FeedbackIssueDetail): void {
  queryClient.setQueryData(feedbackIssueDetailQueryKey(issue.feedbackIssueId), issue);
  queryClient.setQueriesData<InfiniteData<FeedbackIssuePageResponse>>(
    { queryKey: FEEDBACK_ISSUES_QUERY_KEY },
    data => patchFeedbackIssuePageData(data, {
      feedbackIssueId: issue.feedbackIssueId,
      status: issue.status,
      archived: issue.archived,
      commentCount: issue.commentCount,
      updateTime: issue.updateTime,
    }),
  );
}

export async function invalidateFeedbackIssueQueries(
  queryClient: QueryClient,
  feedbackIssueId?: number | null,
): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY }),
  ];

  if (typeof feedbackIssueId === "number" && Number.isFinite(feedbackIssueId) && feedbackIssueId > 0) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: feedbackIssueDetailQueryKey(feedbackIssueId) }));
  }

  await Promise.all(invalidations);
}
