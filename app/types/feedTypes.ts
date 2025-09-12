// CommunityPostFeed
export type CommunityPostFeed = {
  communityPostId: number;
  communityId: number;
  userId: number;
  title: string;
  description: string;
};

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
export type FeedWithStats<T = CommunityPostFeed> = {
  type?: number;
  response?: T;
  stats?: FeedStats;
};
