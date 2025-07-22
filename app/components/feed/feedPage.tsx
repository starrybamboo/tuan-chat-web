import type { FeedPageRequest, FeedWithStatsResponse } from "api";
import FeedDetail from "@/components/feed/feedDetail";
import FeedPreview from "@/components/feed/feedPreview";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { tuanchat } from "api/instance";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const [feedRef, feedEntry] = useIntersectionObserver();
  const { feedId } = useParams();
  const navigate = useNavigate();
  const [isDetailView, setIsDetailView] = useState(false);

  // 还剩多少个的时候触发加载
  const FETCH_ON_REMAIN = 2;
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

  // 合并所有分页消息
  const feeds: FeedWithStatsResponse[] = useMemo(() => {
    return (feedInfiniteQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? []);
  }, [feedInfiniteQuery.data?.pages]);
  const currentIndex = feeds.findIndex(f => f?.feed?.feedId === Number(feedId));

  // 触发feed流加载
  useEffect(() => {
    if ((feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching) || currentIndex >= feeds.length - FETCH_ON_REMAIN) {
      feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting, currentIndex, feedInfiniteQuery, feeds.length]);

  // 处理详情视图切换
  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setIsDetailView(!!feedId);
  }, [feedId]);

  // 键盘导航
  useEffect(() => {
    if (!isDetailView)
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (feeds.length === 0)
        return;

      const currentIndex = feeds.findIndex(f => f?.feed?.feedId === feedId);
      if (currentIndex === -1)
        return;

      if (e.key === "ArrowDown" && currentIndex < feeds.length - 1) {
        navigate(`/feed/${feeds[currentIndex + 1]?.feed?.feedId}`);
      }
      else if (e.key === "ArrowUp" && currentIndex > 0) {
        navigate(`/feed/${feeds[currentIndex - 1]?.feed?.feedId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedId, feeds, isDetailView, navigate]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (feeds.length === 0)
      return;
    e.preventDefault();
  };

  if (isDetailView) {
    return (
      <div className="fixed inset-0 bg-base-100 z-50 overflow-hidden">
        {/* 返回按钮 */}
        <button
          className="absolute top-4 left-4 z-50 btn btn-info bg-opacity-30 rounded-full p-2"
          onClick={() => navigate("/feed")}
          type="button"
        >
          返 回
        </button>
        <div className="h-full w-full relative flex items-center justify-center">
          {/* 左侧按钮 */}
          <button
            className="absolute left-4 z-50 btn btn-info bg-opacity-30 rounded-full p-2"
            onClick={() => {
              const currentIndex = feeds.findIndex(f => f.feed?.feedId === Number(feedId));
              if (currentIndex > 0) {
                navigate(`/feed/${feeds[currentIndex - 1]?.feed?.feedId}`);
              }
            }}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          {/* 中间 Feed 内容 */}
          <div className="max-w-2xl w-full shadow-2xl">
            <FeedDetail feedId={Number(feedId)} handleWheel={handleWheel} />
          </div>

          {/* 右侧按钮 */}
          <button
            className="absolute right-4 z-50 btn btn-info bg-opacity-30 rounded-full p-2"
            onClick={() => {
              const currentIndex = feeds.findIndex(f => f.feed?.feedId === Number(feedId));
              if (currentIndex < feeds.length - 1) {
                navigate(`/feed/${feeds[currentIndex + 1]?.feed?.feedId}`);
              }
            }}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-10 flex gap-8" style={{ height: "calc(100vh - 64px)" }}>
      {/* 左侧按钮 */}
      <div className="flex flex-col justify-between w-32 pt-10" style={{ height: "calc(100vh - 64px)" }}>
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-primary w-full">个性推荐</button>
          <button type="button" className="btn btn-primary w-full">关注的人</button>

          <button type="button" className="btn btn-primary w-full">我的发布</button>
        </div>
        <div className="justify-center space-x-10 pb-4">
          <button
            type="button"
            className="btn btn-circle bg-amber-50 dark:bg-slate-700 text-black dark:text-white shadow-xl flex-1
             transform transition duration-700 ease-in-out hover:scale-110 hover:brightness-90 dark:hover:brightness-110"
            onClick={() => {
              // 打开发布面板
            }}
          >
            <span
              className="absolute inset-0 flex items-center justify-center transform transition duration-700 ease-in-out hover:rotate-[90deg] will-change-transform"
            >
              ＋
            </span>
          </button>
          <button
            type="button"
            className={`btn btn-circle bg-amber-50 dark:bg-slate-700 text-black dark:text-white shadow-xl flex-1
  transform transition duration-300 ease-in-out
  hover:rotate-[9deg] hover:scale-110 hover:brightness-90 dark:hover:brightness-110`}

            onClick={() => feedInfiniteQuery.refetch()}
          >
            ↻
          </button>
        </div>
      </div>

      {/* 中间分隔线 */}
      <div className="w-0.5 bg-base-300"></div>

      {/* 右侧内容 */}
      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-20 pl-8 pt-20 pr-20" style={{ height: "calc(100vh - 64px)" }}>
        {feeds.map((feed, index) => (
          <div
            ref={index === feeds.length - FETCH_ON_REMAIN ? feedRef : null}
            key={feed?.feed?.feedId}
            onClick={() => navigate(`/feed/${feed.feed?.feedId}`)}
            className="cursor-pointer"
          >
            {feed.feed ? <FeedPreview feed={feed.feed!} /> : <div>加载失败或数据为空</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
