import type { Feed, FeedPageRequest } from "api";
import type { WheelEvent } from "react";
import FeedDetail from "@/components/feed/feedDetail";
import FeedPreview from "@/components/feed/feedPreview";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const [feedRef, feedEntry] = useIntersectionObserver();
  const { feedId } = useParams();
  const navigate = useNavigate();
  const [isDetailView, setIsDetailView] = useState(false);

  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: ["pageFeed"],
    queryFn: async ({ pageParam }) => {
      return tuanchat.feedController.pageFeed(pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data === undefined || lastPage.data?.isLast) {
        return undefined;
      }
      else {
        const params: FeedPageRequest = { pageSize: PAGE_SIZE, cursor: lastPage.data?.cursor };
        return params;
      }
    },
    initialPageParam: { pageSize: PAGE_SIZE, cursor: null } as unknown as FeedPageRequest,
    refetchOnWindowFocus: false,
  });

  // 触发feed流加载
  useEffect(() => {
    if (feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching) {
      feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting]);

  // 合并所有分页消息
  const feeds: Feed[] = useMemo(() => {
    return (feedInfiniteQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? []);
  }, [feedInfiniteQuery.data?.pages]);

  // 处理详情视图切换
  useEffect(() => {
    setIsDetailView(!!feedId);
  }, [feedId]);

  // 处理键盘上下键导航
  useEffect(() => {
    if (!isDetailView)
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (feeds.length === 0)
        return;

      const currentIndex = feeds.findIndex(f => f.feedId === feedId);
      if (currentIndex === -1)
        return;

      if (e.key === "ArrowDown" && currentIndex < feeds.length - 1) {
        navigate(`/feed/${feeds[currentIndex + 1].feedId}`);
      }
      else if (e.key === "ArrowUp" && currentIndex > 0) {
        navigate(`/feed/${feeds[currentIndex - 1].feedId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedId, feeds, isDetailView, navigate]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (feeds.length === 0)
      return;
    e.preventDefault();

    const currentIndex = feeds.findIndex(f => f.feedId === Number(feedId));
    if (currentIndex === -1)
      return;

    if (e.deltaY > 0 && currentIndex < feeds.length - 1) {
      navigate(`/feed/${feeds[currentIndex + 1].feedId}`);
    }
    else if (e.deltaY < 0 && currentIndex > 0) {
      navigate(`/feed/${feeds[currentIndex - 1].feedId}`);
    }
  };

  if (isDetailView) {
    return (
      <div className="fixed inset-0 bg-base-100 z-50 overflow-hidden" onWheel={e => handleWheel(e)}>
        {/* 返回按钮 */}
        <button
          className="absolute top-4 left-4 z-50 btn btn-info bg-opacity-30 rounded-full p-2"
          onClick={() => navigate("/feed")}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        {/* 详情内容 */}
        <div className="h-full w-full flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <FeedDetail feedId={Number(feedId)}></FeedDetail>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[70vw] mx-auto overflow-y-auto flex flex-col h-[95vh]">
      {feeds.map((feed, index) => (
        <div
          ref={index === feeds.length - 2 ? feedRef : null}
          key={feed.feedId}
          onClick={() => navigate(`/feed/${feed.feedId}`)}
          className="cursor-pointer"
        >
          <FeedPreview feed={feed} />
        </div>
      ))}
    </div>
  );
}
