import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  FeedbackIssueArchiveUpdatePayload,
  FeedbackIssueCreatePayload,
  FeedbackIssueDetail,
  FeedbackIssueListFilters,
  FeedbackIssueStatusUpdatePayload,
} from "@/components/feedback/feedbackTypes";
import {
  FEEDBACK_ISSUES_QUERY_KEY,
  feedbackIssueDetailQueryKey,
  invalidateFeedbackIssueQueries,
  optimisticPatchFeedbackIssueCaches,
  reconcileFeedbackIssueCaches,
  rollbackFeedbackIssueCaches,
} from "api/feedbackQueryCache";

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
    queryKey: feedbackIssueDetailQueryKey(feedbackIssueId ?? 0),
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
      reconcileFeedbackIssueCaches(queryClient, issue);
      await queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    },
  });
}

export function useUpdateFeedbackIssueStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackIssueStatusUpdatePayload) => updateFeedbackIssueStatus(payload),
    onMutate: payload => optimisticPatchFeedbackIssueCaches(queryClient, {
        feedbackIssueId: payload.feedbackIssueId,
        status: payload.status,
    }),
    onError: (_error, _payload, context) => {
      rollbackFeedbackIssueCaches(queryClient, context);
    },
    onSuccess: (issue) => {
      reconcileFeedbackIssueCaches(queryClient, issue);
    },
    onSettled: (_issue, _error, payload) => {
      void invalidateFeedbackIssueQueries(queryClient, payload.feedbackIssueId);
    },
  });
}

export function useUpdateFeedbackIssueArchiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackIssueArchiveUpdatePayload) => updateFeedbackIssueArchive(payload),
    onMutate: async (payload) => {
      const previousDetail = queryClient.getQueryData<FeedbackIssueDetail>(feedbackIssueDetailQueryKey(payload.feedbackIssueId));
      const nextStatus = previousDetail
        ? getFeedbackIssueStatusAfterArchive(previousDetail.status, payload.archived)
        : undefined;

      return optimisticPatchFeedbackIssueCaches(queryClient, {
        feedbackIssueId: payload.feedbackIssueId,
        archived: payload.archived,
        status: nextStatus,
      });
    },
    onError: (_error, _payload, context) => {
      rollbackFeedbackIssueCaches(queryClient, context);
    },
    onSuccess: (issue) => {
      reconcileFeedbackIssueCaches(queryClient, issue);
    },
    onSettled: (_issue, _error, payload) => {
      void invalidateFeedbackIssueQueries(queryClient, payload.feedbackIssueId);
    },
  });
}
