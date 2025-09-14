// Feed统计
export type FeedStats = {
  postId: number;
  likeCount: number;
  commentCount: number;
  collectionCount: number;
  isLiked: boolean;
  isCollected: boolean;
};

// 泛型版 FeedWithStats
export type FeedWithStats<T> = {
  type?: number;
  response?: T;
  stats?: FeedStats;
};
