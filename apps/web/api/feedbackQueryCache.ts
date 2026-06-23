import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import type {
  FeedbackIssueDetail,
  FeedbackIssuePageResponse,
} from "@/components/feedback/feedbackTypes";

export const FEEDBACK_ISSUES_QUERY_KEY = ["feedbackIssues"] as const;
export const FEEDBACK_ISSUE_DETAIL_QUERY_KEY = "feedbackIssueDetail" as const;

export type FeedbackIssueListPatch = Pick<FeedbackIssueDetail, "feedbackIssueId"> & Partial<
  Pick<FeedbackIssueDetail, "status" | "archived" | "commentCount" | "updateTime">
>;

export type FeedbackIssueMutationContext = {
  detailKey: ReturnType<typeof feedbackIssueDetailQueryKey>;
  previousDetail?: FeedbackIssueDetail;
  previousIssuePages: Array<[QueryKey, InfiniteData<FeedbackIssuePageResponse> | undefined]>;
};

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

  await queryClient.cancelQueries({ queryKey: detailKey });
  await queryClient.cancelQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });

  const previousDetail = queryClient.getQueryData<FeedbackIssueDetail>(detailKey);
  const previousIssuePages = queryClient.getQueriesData<InfiniteData<FeedbackIssuePageResponse>>({
    queryKey: FEEDBACK_ISSUES_QUERY_KEY,
  });
  const definedPatch = omitUndefinedFields(patch);

  if (previousDetail) {
    queryClient.setQueryData<FeedbackIssueDetail>(detailKey, {
      ...previousDetail,
      ...definedPatch,
    });
  }

  queryClient.setQueriesData<InfiniteData<FeedbackIssuePageResponse>>(
    { queryKey: FEEDBACK_ISSUES_QUERY_KEY },
    data => patchFeedbackIssuePageData(data, definedPatch as FeedbackIssueListPatch),
  );

  return {
    detailKey,
    previousDetail,
    previousIssuePages,
  };
}

export function rollbackFeedbackIssueCaches(
  queryClient: QueryClient,
  context?: FeedbackIssueMutationContext,
): void {
  if (!context) {
    return;
  }

  queryClient.setQueryData(context.detailKey, context.previousDetail);
  context.previousIssuePages.forEach(([queryKey, previousData]) => {
    queryClient.setQueryData(queryKey, previousData);
  });
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
