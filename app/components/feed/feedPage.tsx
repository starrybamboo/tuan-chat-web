import type { Feed, FeedPageRequest } from "api";
import FeedPost from "@/components/feed/feedPost";
import { useInfiniteQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useMemo } from "react";

export default function FeedPage() {
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
        const params: FeedPageRequest = { pageSize: 5, cursor: lastPage.data?.cursor };
        return params;
      }
    },
    initialPageParam: { pageSize: 5, cursor: null } as unknown as FeedPageRequest,
    refetchOnWindowFocus: false,
  });

  // 合并所有分页消息 同时更新重复的消息
  const feeds: Feed[] = useMemo(() => {
    return (feedInfiniteQuery.data?.pages.reverse().flatMap(p => p.data?.list ?? []) ?? []);
  }, [feedInfiniteQuery.data?.pages]);

  return (
    <div className="w-[70vw] mx-auto ">
      {
        feeds.map((feed) => {
          return (
            <FeedPost feed={feed} key={feed.feedId} />
          );
        })
      }
    </div>

  );
}
