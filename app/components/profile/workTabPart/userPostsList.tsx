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

  // if (userPostsQuery.isError) {
  //   return (
  //     <div className="text-center py-10 rounded-lg">
  //       <div className="text-error text-lg mb-2">加载失败</div>
  //       <div className="text-base-content/60 text-sm mb-4">请稍后再试</div>
  //       <button
  //         type="button"
  //         className="btn btn-primary btn-sm"
  //         onClick={() => userPostsQuery.refetch()}
  //       >
  //         重新加载
  //       </button>
  //     </div>
  //   );
  // }

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
                <p>帖子功能正在制作中！</p>
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
      帖子功能制作中....
    </div>
  );
};

export default UserPostsList;
