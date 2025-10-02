import type { PostListWithStatsResponse } from "api";
import type { PagePostRequest } from "api/models/PagePostRequest";
import CommunityPostCard from "@/components/community/communityPostCard";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ContentIcon } from "@/icons";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import React, { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { usePageUserPostsInfiniteQuery } from "../../../../api/hooks/communityQueryHooks";

const PAGE_SIZE = 10;

interface UserPostsListProps {
  userId: number;
  onPostClick?: (postId: number) => void;
}

/**
 * 用户帖子列表组件 - 使用卡片布局
 */
export const PostsList: React.FC<UserPostsListProps> = ({
  userId,
  onPostClick,
}) => {
  const currentUserId = useGlobalContext().userId ?? -1;
  // 无限滚动相关
  const [, postEntry] = useIntersectionObserver();

  // 构建请求参数
  const pageRequest: PagePostRequest = {
    userId,
    pageSize: PAGE_SIZE,
  };

  // 获取用户帖子列表
  const userPostsQuery = usePageUserPostsInfiniteQuery(pageRequest);

  // 将分页数据 flatten
  const posts: PostListWithStatsResponse[] = useMemo(() => {
    return userPostsQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? [];
  }, [userPostsQuery.data?.pages]);

  // 无限滚动逻辑
  useEffect(() => {
    if (postEntry?.isIntersecting && !userPostsQuery.isFetching && userPostsQuery.hasNextPage) {
      void userPostsQuery.fetchNextPage();
    }
  }, [postEntry?.isIntersecting, userPostsQuery.isFetching, userPostsQuery.hasNextPage, userPostsQuery]);

  // 错误处理
  if (userPostsQuery.isError) {
    return (
      <div className="text-center py-10 rounded-lg">
        <div className="text-error text-lg mb-2">加载失败</div>
        <div className="text-base-content/60 text-sm mb-4">请稍后再试</div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => userPostsQuery.refetch()}
        >
          重新加载
        </button>
      </div>
    );
  }

  // Loading State
  if (userPostsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg mb-4"></span>
        <p className="text-base-content/60">正在加载帖子...</p>
      </div>
    );
  }

  // Empty State
  if (posts.length === 0) {
    return (
      <div className="text-center py-10 rounded-lg">
        {currentUserId === userId
          ? (
              <div className="w-full flex flex-col items-center justify-center text-gray-500 gap-2 mt-8">
                <Link
                  to="/community"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-500 hover:bg-green-200 transition-colors duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </Link>
                <p className="text-center leading-snug text-sm mt-2">
                  还没有发布过帖子呢…
                  <br />
                  分享一些有趣的想法吧！
                </p>
              </div>
            )
          : (
              <div className="flex flex-col items-center justify-center py-8">
                <ContentIcon className="w-16 h-16 md:w-20 md:h-20 opacity-50 pb-4" />
                <p className="text-base-content/50">这里还没有他的帖子...也许正在思考着什么...</p>
              </div>
            )}
      </div>
    );
  }

  // Posts List
  return (
    <div className="space-y-8 max-w-2xl mx-auto w-full lg:max-w-3xl">
      <div className="space-y-5">
        {posts.map((post, index) => (
          <CommunityPostCard
            key={post?.postListItem?.communityPostId}
            post={post}
            index={index}
            onPostClick={onPostClick}
            communityId={post?.postListItem?.communityId || -1}
          />
        ))}

        {/* Loading indicator for infinite scroll */}
        {userPostsQuery.isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <span className="loading loading-dots loading-lg text-primary"></span>
          </div>
        )}

        {/* End of posts indicator */}
        {!userPostsQuery.hasNextPage && posts.length > 0 && (
          <p className="text-center text-base-content/50 py-4 text-sm">
            已显示该用户的所有帖子
          </p>
        )}
      </div>
    </div>
  );
};

export default PostsList;
