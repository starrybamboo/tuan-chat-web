import Pagination from "@/components/common/form/pagination";
import { PopWindow } from "@/components/common/popWindow";
import { CommunityContext } from "@/components/community/communityContext";
import PostWriter from "@/components/community/postWriter";
import { use, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import {
  useDeletePostMutation,
  usePageCommunityPostsQuery,
} from "../../../api/hooks/communityQueryHooks";

const PAGE_SIZE = 10;

export default function CommunityPostList() {
  const communityContext = use(CommunityContext);
  const communityId = communityContext.communityId ?? -1;

  const [searchParams, setSearchParams] = useSearchParams();
  const pageNo = Number.parseInt(searchParams.get("pageNo") || "1");

  const navigate = useNavigate();

  const [isPublishWindowOpen, setIsPublishWindowOpen] = useState(false);

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
        toast("帖子删除成功");
      },
    });
  };
  return (
    <div className="space-y-6">
      {/* Publish Post Button */}
      <div className="bg-base-100 rounded-box shadow p-4 flex justify-end">
        <button
          className="btn btn-primary gap-2"
          onClick={() => setIsPublishWindowOpen(true)}
          type="button"
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
          发布帖子
        </button>
      </div>

      {/* Loading State */}
      {pageCommunityPostsQuery.isLoading && (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map(post => (
          <div
            key={post.communityPostId}
            className="bg-base-100 rounded-box shadow hover:shadow-lg p-6 transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
            onClick={() => navigate(`/community/${communityId}/${post.communityPostId}`)}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                {post.title || "无标题"}
              </h3>
              <p className="text-base-content/80 mt-2 line-clamp-3">
                {post.content}
              </p>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-base-content/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 inline mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {new Date(post.createTime ?? "").toLocaleString()}
              </div>

              <button
                className="btn btn-sm btn-error btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePost(post.communityPostId ?? -1);
                }}
                type="button"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <Pagination
          total={totalPages}
          onChange={newPageNo => setSearchParams({ pageNo: newPageNo.toString() })}
          initialPageNo={pageNo}
        />
      </div>

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
