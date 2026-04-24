import type { FeedbackIssueDetail, FeedbackIssueListFilters } from "@/components/feedback/feedbackTypes";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import FeedbackComposer from "@/components/feedback/feedbackComposer";
import { useFeedbackIssuesInfiniteQuery } from "@/components/feedback/feedbackHooks";
import FeedbackIssueDetailView from "@/components/feedback/feedbackIssueDetail";
import FeedbackIssueList from "@/components/feedback/feedbackIssueList";
import { useGlobalUserId } from "@/components/globalContextProvider";

function parseIssueId(rawIssueId?: string) {
  const issueId = Number(rawIssueId);
  if (Number.isNaN(issueId) || issueId <= 0) {
    return null;
  }
  return issueId;
}

export default function FeedbackPage() {
  const { issueId: rawIssueId } = useParams();
  const navigate = useNavigate();
  const userId = useGlobalUserId();
  const selectedIssueId = parseIssueId(rawIssueId);

  const [keywordInput, setKeywordInput] = useState("");
  const [filters, setFilters] = useState<FeedbackIssueListFilters>({
    archived: false,
    mineOnly: false,
    pageSize: 20,
  });
  const deferredKeyword = useDeferredValue(keywordInput);

  const queryFilters = useMemo<FeedbackIssueListFilters>(() => {
    const keyword = deferredKeyword.trim();
    return {
      ...filters,
      keyword: keyword || undefined,
    };
  }, [deferredKeyword, filters]);

  const feedbackIssuesQuery = useFeedbackIssuesInfiniteQuery(queryFilters);
  const feedbackIssues = useMemo(() => {
    return feedbackIssuesQuery.data?.pages.flatMap(page => page.list) ?? [];
  }, [feedbackIssuesQuery.data?.pages]);

  const handleFilterChange = (patch: Partial<FeedbackIssueListFilters>) => {
    setFilters(current => ({ ...current, ...patch }));
  };

  const handleSelectIssue = (nextIssueId: number) => {
    startTransition(() => {
      navigate(`/feedback/${nextIssueId}`);
    });
  };

  const handleCreated = (issue: FeedbackIssueDetail) => {
    startTransition(() => {
      navigate(`/feedback/${issue.feedbackIssueId}`);
    });
  };

  const handleBack = () => {
    startTransition(() => {
      navigate("/feedback");
    });
  };

  return (
    <div className="min-h-full bg-base-200">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {selectedIssueId
          ? (
              <FeedbackIssueDetailView
                feedbackIssueId={selectedIssueId}
                loginUserId={userId ?? -1}
                onBack={handleBack}
              />
            )
          : (
              <div className="space-y-4">
                <section className="space-y-1">
                  <div className="space-y-1">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      用户反馈
                    </div>
                    <h1 className="text-3xl font-semibold text-base-content">反馈</h1>
                  </div>
                </section>

                <FeedbackComposer onCreated={handleCreated} />

                <FeedbackIssueList
                  issues={feedbackIssues}
                  selectedIssueId={selectedIssueId}
                  filters={filters}
                  keyword={keywordInput}
                  onKeywordChange={setKeywordInput}
                  onFilterChange={handleFilterChange}
                  onSelectIssue={handleSelectIssue}
                  onRefresh={() => {
                    void feedbackIssuesQuery.refetch();
                  }}
                  onLoadMore={() => {
                    void feedbackIssuesQuery.fetchNextPage();
                  }}
                  hasNextPage={Boolean(feedbackIssuesQuery.hasNextPage)}
                  isLoading={feedbackIssuesQuery.isLoading}
                  isFetching={feedbackIssuesQuery.isFetching}
                  isFetchingNextPage={feedbackIssuesQuery.isFetchingNextPage}
                />
              </div>
            )}
      </div>
    </div>
  );
}
