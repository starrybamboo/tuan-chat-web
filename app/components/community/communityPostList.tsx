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
    <div className="space-y-4">
      <div className="bg-base-100 rounded-lg shadow p-4 ">
        <button className="btn btn-info" onClick={() => { setIsPublishWindowOpen(true); }} type="button">
          发布帖子
        </button>
      </div>
      <div className="space-y-4">
        {pageCommunityPostsQuery.isLoading && <div className="text-center py-4">加载中...</div>}
        {posts.map(post => (
          <div
            key={post.communityPostId}
            className="bg-base-100 rounded-lg shadow p-4 transition-all duration-150 hover:shadow-lg hover:-translate-y-1"
            onClick={() => { navigate(`/community/${communityId}/${post.communityPostId}`); }}
          >
            <div className="mb-2">
              <h3 className="font-medium">{post.title || "无标题"}</h3>
              <p className="text-gray-600 line-clamp-3">{post.content}</p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(post.createTime ?? "").toLocaleString()}
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                className="btn btn-error"
                onClick={() => handleDeletePost(post.communityPostId ?? -1)}
                type="button"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pagination total={totalPages} onChange={(newPageNo) => { setSearchParams({ pageNo: newPageNo.toString() }); }} initialPageNo={pageNo}></Pagination>
      <PopWindow isOpen={isPublishWindowOpen} onClose={() => { setIsPublishWindowOpen(false); }} fullScreen>
        <PostWriter onClose={() => { setIsPublishWindowOpen(false); }}></PostWriter>
      </PopWindow>
    </div>
  );
}
