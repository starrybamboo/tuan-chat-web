import type {
  FeedbackIssueArchiveUpdatePayload,
  FeedbackIssueCreatePayload,
  FeedbackIssueListFilters,
  FeedbackIssueStatusUpdatePayload,
} from "@/components/feedback/feedbackTypes";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFeedbackIssue,
  getFeedbackIssueDetail,
  pageFeedbackIssues,
  updateFeedbackIssueArchive,
  updateFeedbackIssueStatus,
} from "@/components/feedback/feedbackApi";

const FEEDBACK_ISSUES_QUERY_KEY = ["feedbackIssues"] as const;
const FEEDBACK_ISSUE_DETAIL_QUERY_KEY = "feedbackIssueDetail";

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
    onSuccess: async (issue) => {
      queryClient.setQueryData([FEEDBACK_ISSUE_DETAIL_QUERY_KEY, issue.feedbackIssueId], issue);
      await queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    },
  });
}

export function useUpdateFeedbackIssueArchiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackIssueArchiveUpdatePayload) => updateFeedbackIssueArchive(payload),
    onSuccess: async (issue) => {
      queryClient.setQueryData([FEEDBACK_ISSUE_DETAIL_QUERY_KEY, issue.feedbackIssueId], issue);
      await queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    },
  });
}
