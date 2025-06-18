import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import Pagination from "@/components/common/form/pagination";
import IllegalURLPage from "@/components/common/illegalURLPage";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";
import { CommunityContext } from "@/components/community/communityContext";
import PostWriter from "@/components/community/postWriter";
import { use } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  useDeletePostMutation,
  usePageCommunityPostsQuery,
} from "../../../api/hooks/communityQueryHooks";

const PAGE_SIZE = 10;

export default function CommunityPostList() {
  const communityContext = use(CommunityContext);

  const communityId = communityContext.communityId ?? -1;

  const [pageNoStr, setPageNo] = useSearchParamsState<number>("pageNo", 1);
  const pageNo = Number(pageNoStr);

  const navigate = useNavigate();

  const [isPublishWindowOpen, setIsPublishWindowOpen] = useSearchParamsState<boolean>("editPop", false);

  // 获取帖子列表
  const pageCommunityPostsQuery = usePageCommunityPostsQuery(
    { communityId, pageNo, pageSize: PAGE_SIZE },
  );
  const posts = pageCommunityPostsQuery.data?.data?.list ?? [];
  const totalPages = Math.ceil((pageCommunityPostsQuery.data?.data?.totalRecords ?? 0) / PAGE_SIZE);

  // 删除帖子mutation
  const deletePostMutation = useDeletePostMutation();

  // 处理删除帖子
  const handleDeletePost = (postId: number) => {
    deletePostMutation.mutate(postId, {
      onSuccess: () => {
        toast.success("帖子删除成功", {
          icon: "🗑️",
        });
        pageCommunityPostsQuery.refetch();
      },
    });
  };

  if (Number.isNaN(communityId)) {
    return (<IllegalURLPage info="您所找的社区不存在" />);
  }

  return (
    <div className="space-y-8">
      {/* Header with publish button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-base-content">社区帖子</h2>
        <button
          className="btn btn-primary gap-2 shadow-lg hover:shadow-primary/30"
          onClick={() => setIsPublishWindowOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          发布新帖
        </button>
      </div>

      {/* Loading State */}
      {pageCommunityPostsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-base-content/60">正在加载帖子...</p>
        </div>
      )}

      {/* Posts List */}
      {posts.length === 0 && !pageCommunityPostsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-base-300 rounded-box">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-base-content/30 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl text-base-content/50 mb-2">暂无帖子</h3>
          <p className="text-base-content/40 mb-4">成为第一个在此社区发帖的人</p>
          <button className="btn btn-primary btn-sm" onClick={() => setIsPublishWindowOpen(true)}>
            发布帖子
          </button>
        </div>
      )}

      {posts.length > 0 && (
        <div className="space-y-5">
          {posts.map(post => (
            <div
              key={post.communityPostId}
              className="bg-base-100 rounded-2xl border border-base-200 shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <UserAvatarComponent userId={post.userId ?? -1} width={12} isRounded={true}></UserAvatarComponent>
                <div className="flex-1" onClick={() => navigate(`/community/${communityId}/${post.communityPostId}`)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                        {post.title || "无标题帖子"}
                      </h3>
                      <p className="text-base-content/80 mt-2 line-clamp-3 break-all lg:break-normal">
                        {post.content}
                      </p>
                    </div>

                    <button
                      className="btn btn-circle btn-sm btn-ghost text-error/60 hover:text-error group-hover:opacity-100 opacity-0 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost(post.communityPostId ?? -1);
                      }}
                      aria-label="删除帖子"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-base-200/80">
                    <div className="flex items-center gap-3 text-sm text-base-content/50">
                      <span className="inline-flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {new Date(post.createTime ?? "").toLocaleDateString()}
                      </span>

                      <span className="inline-flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </span>
                    </div>

                    <div className="badge badge-outline badge-sm flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                        />
                      </svg>
                      <span>
                        999回复
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            total={totalPages}
            onChange={newPageNo => setPageNo(newPageNo)}
            initialPageNo={pageNo}
          />
        </div>
      )}

      {/* Publish Window */}
      <PopWindow
        isOpen={isPublishWindowOpen}
        onClose={() => setIsPublishWindowOpen(false)}
        fullScreen
      >
        <PostWriter onClose={() => setIsPublishWindowOpen(false)} />
      </PopWindow>
    </div>
  );
}
