import { PopWindow } from "@/components/common/popWindow";
import { CommunityContext } from "@/components/community/communityContext";
import PostWriter from "@/components/community/postWriter";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  useDeletePostMutation,
  usePageCommunityPostsInfiniteQuery,
} from "../../../api/hooks/communityQueryHooks";

export default function CommunityPostList() {
  const communityContext = use(CommunityContext);
  const communityId = communityContext.communityId ?? -1;

  const navigate = useNavigate();

  const [isPublishWindowOpen, setIsPublishWindowOpen] = useState(false);

  // 获取帖子列表
  const {
    data: postsData,
    isLoading: isPostsLoading,
    // fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePageCommunityPostsInfiniteQuery({
    communityId,
    pageSize: 10,
  });

  // 删除帖子mutation
  const deletePostMutation = useDeletePostMutation();

  // 无限滚动触发
  // const { ref: loadMoreRef, inView } = useInView();

  // useEffect(() => {
  //   if (inView && hasNextPage && !isFetchingNextPage) {
  //     fetchNextPage();
  //   }
  // }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 扁平化分页数据
  const posts = useMemo(() => {
    return postsData?.pages.flatMap(page => page.data?.list || []) || [];
  }, [postsData]);

  // 处理删除帖子
  const handleDeletePost = (postId: number) => {
    deletePostMutation.mutate(postId, {
      onSuccess: () => {
        toast("帖子删除成功");
      },
    });
  };
  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <button className="btn btn-info" onClick={() => { setIsPublishWindowOpen(true); }} type="button">
          发布帖子
        </button>
      </div>
      {/* 帖子列表 - 修改为Tailwind样式 */}
      <div className="space-y-4">
        {isPostsLoading && <div className="text-center py-4">加载中...</div>}
        {posts.map(post => (
          <div
            key={post.communityPostId}
            className="bg-white rounded-lg shadow p-4"
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
      {/* 无限滚动加载更多 - 修改为Tailwind样式 */}
      <div className="text-center py-4 text-gray-500">
        {isFetchingNextPage ? "加载中..." : hasNextPage ? "上拉加载更多" : "没有更多了"}
      </div>
      <PopWindow isOpen={isPublishWindowOpen} onClose={() => { setIsPublishWindowOpen(false); }}>
        <PostWriter></PostWriter>
      </PopWindow>
    </div>
  );
}
