import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import React from "react";
import { Link } from "react-router";
import { useListUserPostsQuery } from "../../../../api/hooks/communityQueryHooks";

interface UserPostsListProps {
  userId: number;
  isLoading?: boolean;
  onPostClick?: (postId: number) => void;
}

/**
 * 用户帖子列表组件，每个帖子占一整行
 */
export const UserPostsList: React.FC<UserPostsListProps> = ({
  userId,
}) => {
  const currentUserId = useGlobalContext().userId ?? -1;
  const userPostsQuery = useListUserPostsQuery();

  const posts = userPostsQuery.data?.data || [];

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
              <p className="text-gray-500">这里还没有他的帖子...也许正在思考着什么...</p>
            )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div key={post.communityPostId} className="max-w-5xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {posts.map(post => (
              <Link
                key={post.communityPostId || -1}
                to={`/community/${post.communityId}/${post.communityPostId}`}
              >
                <div className=" rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-base-100 hover:border-primary">
                  <div className="p-6">
                    {/* 帖子头部 - 用户信息和发布时间 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <UserAvatarComponent
                          userId={post.userId || -1}
                          width={12}
                          isRounded={true}
                          withName={true}
                        />
                      </div>
                      <span className="text-sm text-base-500">
                        2小时前
                      </span>
                    </div>

                    {/* 帖子标题 */}
                    <h3 className="text-xl font-semibold text-base-900 mb-3 line-clamp-2">
                      {post.title || "无标题"}
                    </h3>

                    {/* 帖子内容预览 */}
                    {post.content && (
                      <div className="text-base-600 text-sm leading-relaxed mb-4">
                        <p className="line-clamp-3">
                          {post.content
                            .replace(/#+\s/g, "")
                            .replace(/\*\*(.*?)\*\*/g, "$1")
                            .replace(/\*(.*?)\*/g, "$1")
                            .replace(/`(.*?)`/g, "$1")
                            .replace(/\[(.*?)\]\(.*?\)/g, "$1")
                            .slice(0, 200) + (post.content.length > 200 ? "..." : "")}
                        </p>
                      </div>
                    )}

                    {/* 社区标签 */}
                    {post.communityId && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
                        喵
                      </div>
                    )}

                    {/* 帖子统计信息 */}
                    <div className="flex items-center justify-between text-sm text-base-500 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-4">
                        {/* 查看次数 */}
                        <div className="flex items-center space-x-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>114</span>
                        </div>

                        {/* 评论数 */}
                        <div className="flex items-center space-x-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span>514</span>
                        </div>

                        {/* 点赞数 */}
                        <div className="flex items-center space-x-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          <span>1919</span>
                        </div>
                      </div>

                      {/* 阅读全文按钮 */}
                      <div className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                        <span>阅读全文</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserPostsList;
