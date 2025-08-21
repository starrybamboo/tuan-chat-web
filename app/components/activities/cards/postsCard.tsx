import React, { useState } from "react";
import { useDeleteMomentFeedMutation } from "../../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface PostsCardProp {
  dynamic: any;
  loginUserId: number;
}

/**
 * 发布的动态预览卡片组件
 */
export const PostsCard: React.FC<PostsCardProp> = ({ dynamic, loginUserId }) => {
  const feed = dynamic?.feed ?? {};
  const stats = dynamic?.stats ?? {};
  const userId = dynamic?.feed.userId ?? -1;

  const initialIsLiked = Boolean(stats?.isLiked);
  const initialLikeCount = Number(stats?.likeCount ?? 0);

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || 0);

  // 使用API获取的数据或默认数据
  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
  };

  const deleteMutation = useDeleteMomentFeedMutation();

  const handleLike = async () => {
    const prev = isLiked;
    const delta = prev ? -1 : 1;
    setIsLiked(!prev);
    setLikeCount(p => Math.max(0, p + delta));

    try {
      // TODO: 接入 like/unlike API
      // await likeMutation.mutateAsync({ feedId: feed.feedId, isLike: !prev });
    }
    catch (err) {
      // rollback
      setIsLiked(prev);
      setLikeCount(Number(stats?.likeCount ?? initialLikeCount));
      console.error("点赞失败", err);
    }
  };

  const handleDelete = async () => {
    // TODO: 接入弹窗来提示用户是否删除

    // 优先从 feed.feedId 获取
    const feedIdNum = feed?.feedId !== undefined ? Number(feed.feedId) : Number.NaN;

    if (!Number.isFinite(feedIdNum)) {
      // TODO: 无法获取 feedId：明确提示并记录 TODO
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(feedIdNum);
    }
    catch (err) {
      // TODO: 删除失败提示
      console.error("删除失败", err);
      setIsDeleting(false);
    }
  };

  // TODO: 接入评论和分享组件
  const handleComment = () => 0;
  const handleShare = () => 0;

  // 图片数组字段名（后端示例是 imageUrls
  const images = Array.isArray(feed?.imageUrls) ? feed.imageUrls : [];
  // 时间字段 createTime
  const publishTime = feed?.createTime ?? "";

  return (
    <div
      className={`bg-base-100 rounded-xl shadow-sm border border-base-300 p-4 sm:p-6 mb-4 hover:shadow-md transition-all relative ${
        isDeleting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {isDeleting && (
        <div className="absolute inset-0 bg-base-100/80 rounded-xl flex items-center justify-center z-10">
          <div className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}

      <div className="flex items-center space-x-3 mb-4">
        {/* 发布者的信息 */}
        <div className="flex flex-row items-center gap-2">
          {userInfoLoading
            ? (
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0"></div>
              )
            : (
                <img
                  className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  src={data.avatar}
                  // TODO: 接入 UserDetail
                  // onClick={handleAvatarClick}
                  alt="用户头像"
                />
              )}

          <div className="flex flex-col justify-between min-w-0 flex-1">
            {userInfoLoading
              ? (
                  <>
                    <div className="skeleton h-6 w-24 mb-2"></div>
                    <div className="skeleton h-4 w-32"></div>
                  </>
                )
              : (
                  <>
                    <h3 className="card-title text-lg whitespace-nowrap">{data.name}</h3>
                    <p className="flex-1 text-sm text-base-content/60">{publishTime}</p>
                  </>
                )}
          </div>
        </div>

        <div className="relative">
          <button
            className="text-base-content/40 hover:text-base-content/80 transition-colors p-2 rounded-full hover:bg-base-200"
            onClick={() => setShowMenu(!showMenu)}
            type="button"
          >
            ⋯
          </button>

          {/* 每个动态的二级菜单 */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
              {loginUserId !== userId
                ? (
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors"
                      type="button"
                    >
                      删除动态
                    </button>
                  )
                : (
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full px-4 py-2 text-left text-sm text-base-content/60 hover:bg-base-200 transition-colors"
                      type="button"
                    >
                      举报
                    </button>
                  )}

            </div>
          )}
        </div>
      </div>

      {/* 动态内容 */}
      <div className="mb-4">
        <div className="text-base-content mb-3 whitespace-pre-wrap">{feed?.content ?? ""}</div>

        {images.length > 0 && (
          <div
            className={`grid gap-2 ${
              images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {images.map((img: string, idx: number) => (
              <img
                key={idx}
                src={img}
                alt={`图片 ${idx + 1}`}
                className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                // TODO: onClick 点击预览图片
              />
            ))}
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center space-x-4 sm:space-x-6 pt-3 border-t border-base-300">
        {/* TODO 替换操作栏组件 */}
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 text-sm transition-colors px-2 py-1 rounded-full ${
            isLiked ? "text-error hover:text-error/80" : "text-base-content/60 hover:text-error hover:bg-error/10"
          }`}
          type="button"
        >
          <span className="text-base">{isLiked ? "❤️" : "🤍"}</span>
          <span className="font-medium">{likeCount}</span>
        </button>

        <button
          onClick={handleComment}
          className="flex items-center space-x-1 text-sm text-base-content/60 hover:text-primary hover:bg-primary/10 transition-colors px-2 py-1 rounded-full"
          type="button"
        >
          <span className="text-base">💬</span>
          <span className="font-medium">{Number(stats?.commentCount ?? 0)}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center space-x-1 text-sm text-base-content/60 hover:text-success hover:bg-success/10 transition-colors px-2 py-1 rounded-full"
          type="button"
        >
          <span className="text-base">📤</span>
          <span className="font-medium">{Number(stats?.shareCount ?? stats?.shares ?? 0)}</span>
        </button>
      </div>
    </div>
  );
};

export default PostsCard;
