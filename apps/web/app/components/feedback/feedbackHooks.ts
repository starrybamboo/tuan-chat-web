import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  FeedbackIssueArchiveUpdatePayload,
  FeedbackIssueCreatePayload,
  FeedbackIssueDetail,
  FeedbackIssueListFilters,
  FeedbackIssuePageResponse,
  FeedbackIssueStatusUpdatePayload,
} from "@/components/feedback/feedbackTypes";

import {
  createFeedbackIssue,
  getFeedbackIssueDetail,
  pageFeedbackIssues,
  updateFeedbackIssueArchive,
  updateFeedbackIssueStatus,
} from "@/components/feedback/feedbackApi";
import {
  getFeedbackIssueStatusAfterArchive,
} from "@/components/feedback/feedbackTypes";

const FEEDBACK_ISSUES_QUERY_KEY = ["feedbackIssues"] as const;
const FEEDBACK_ISSUE_DETAIL_QUERY_KEY = "feedbackIssueDetail";

type FeedbackIssueListPatch = Pick<FeedbackIssueDetail, "feedbackIssueId"> & Partial<Pick<FeedbackIssueDetail, "status" | "archived" | "commentCount" | "updateTime">>;

type FeedbackIssueMutationContext = {
  detailKey: readonly [typeof FEEDBACK_ISSUE_DETAIL_QUERY_KEY, number];
  previousDetail?: FeedbackIssueDetail;
  previousIssuePages: Array<[QueryKey, InfiniteData<FeedbackIssuePageResponse> | undefined]>;
};

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
      return {
        ...issue,
        ...patch,
      };
    });

    return pageChanged ? { ...page, list } : page;
  });

  return hasChanges ? { ...data, pages } : data;
}

function patchFeedbackIssueCaches(queryClient: QueryClient, patch: FeedbackIssueListPatch) {
  queryClient.setQueriesData<InfiniteData<FeedbackIssuePageResponse>>(
    { queryKey: FEEDBACK_ISSUES_QUERY_KEY },
    data => patchFeedbackIssuePageData(data, patch),
  );
}

function restoreFeedbackIssueCaches(queryClient: QueryClient, context?: FeedbackIssueMutationContext) {
  if (!context) {
    return;
  }

  queryClient.setQueryData(context.detailKey, context.previousDetail);
  context.previousIssuePages.forEach(([queryKey, previousData]) => {
    queryClient.setQueryData(queryKey, previousData);
  });
}

export function useFeedbackIssuesInfiniteQuery(filters: FeedbackIssueListFilters) {
  return useInfiniteQuery({
    queryKey: [...FEEDBACK_ISSUES_QUERY_KEY, filters],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => pageFeedbackIssues({ ...filters, cursor: pageParam }),
    getNextPageParam: lastPage => (lastPage.isLast ? undefined : (lastPage.cursor ?? undefined)),
    refetchOnWindowFocus: false,
  });
}

export function useFeedbackIssueDetailQuery(feedbackIssueId?: number | null) {
  return useQuery({
    queryKey: [FEEDBACK_ISSUE_DETAIL_QUERY_KEY, feedbackIssueId],
    queryFn: () => getFeedbackIssueDetail(feedbackIssueId!),
    enabled: Number(feedbackIssueId) > 0,
    refetchOnWindowFocus: false,
  });
}

export function useCreateFeedbackIssueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackIssueCreatePayload) => createFeedbackIssue(payload),
    onSuccess: async (issue) => {
      queryClient.setQueryData([FEEDBACK_ISSUE_DETAIL_QUERY_KEY, issue.feedbackIssueId], issue);
      await queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    },
  });
}

export function useUpdateFeedbackIssueStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackIssueStatusUpdatePayload) => updateFeedbackIssueStatus(payload),
    onMutate: async (payload): Promise<FeedbackIssueMutationContext> => {
      const detailKey = [FEEDBACK_ISSUE_DETAIL_QUERY_KEY, payload.feedbackIssueId] as const;

      await queryClient.cancelQueries({ queryKey: detailKey });
      await queryClient.cancelQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });

      const previousDetail = queryClient.getQueryData<FeedbackIssueDetail>(detailKey);
      const previousIssuePages = queryClient.getQueriesData<InfiniteData<FeedbackIssuePageResponse>>({
        queryKey: FEEDBACK_ISSUES_QUERY_KEY,
      });

      if (previousDetail) {
        queryClient.setQueryData<FeedbackIssueDetail>(detailKey, {
          ...previousDetail,
          status: payload.status,
        });
      }

      patchFeedbackIssueCaches(queryClient, {
        feedbackIssueId: payload.feedbackIssueId,
        status: payload.status,
      });

      return {
        detailKey,
        previousDetail,
        previousIssuePages,
      };
    },
    onError: (_error, _payload, context) => {
      restoreFeedbackIssueCaches(queryClient, context);
    },
    onSuccess: async (issue) => {
      queryClient.setQueryData([FEEDBACK_ISSUE_DETAIL_QUERY_KEY, issue.feedbackIssueId], issue);
      patchFeedbackIssueCaches(queryClient, {
        feedbackIssueId: issue.feedbackIssueId,
        status: issue.status,
        archived: issue.archived,
        commentCount: issue.commentCount,
        updateTime: issue.updateTime,
      });
      await queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    },
  });
}

export function useUpdateFeedbackIssueArchiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackIssueArchiveUpdatePayload) => updateFeedbackIssueArchive(payload),
    onMutate: async (payload): Promise<FeedbackIssueMutationContext> => {
      const detailKey = [FEEDBACK_ISSUE_DETAIL_QUERY_KEY, payload.feedbackIssueId] as const;

      await queryClient.cancelQueries({ queryKey: detailKey });
      await queryClient.cancelQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });

      const previousDetail = queryClient.getQueryData<FeedbackIssueDetail>(detailKey);
      const previousIssuePages = queryClient.getQueriesData<InfiniteData<FeedbackIssuePageResponse>>({
        queryKey: FEEDBACK_ISSUES_QUERY_KEY,
      });

      const nextStatus = previousDetail
        ? getFeedbackIssueStatusAfterArchive(previousDetail.status, payload.archived)
        : undefined;

      if (previousDetail) {
        queryClient.setQueryData<FeedbackIssueDetail>(detailKey, {
          ...previousDetail,
          archived: payload.archived,
          status: nextStatus ?? previousDetail.status,
        });
      }

      patchFeedbackIssueCaches(queryClient, {
        feedbackIssueId: payload.feedbackIssueId,
        archived: payload.archived,
        status: nextStatus,
      });

      return {
        detailKey,
        previousDetail,
        previousIssuePages,
      };
    },
    onError: (_error, _payload, context) => {
      restoreFeedbackIssueCaches(queryClient, context);
    },
    onSuccess: async (issue) => {
      queryClient.setQueryData([FEEDBACK_ISSUE_DETAIL_QUERY_KEY, issue.feedbackIssueId], issue);
      patchFeedbackIssueCaches(queryClient, {
        feedbackIssueId: issue.feedbackIssueId,
        status: issue.status,
        archived: issue.archived,
        commentCount: issue.commentCount,
        updateTime: issue.updateTime,
      });
      await queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    },
  });
}
