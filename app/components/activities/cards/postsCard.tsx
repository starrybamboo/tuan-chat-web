import MomentDetailView from "@/components/activities/MomentDetailView";
import LikeIconButton from "@/components/common/likeIconButton";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";
import React, { useCallback, useState } from "react";
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
  const feedId = feed?.feedId ?? -1;

  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserDetailCardOpen, setIsUserDetailCardOpen] = useState(false);
  const [isMomentDetailOpen, setIsMomentDetailOpen] = useState(false);

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || 0);

  // 使用API获取的数据或默认数据
  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
  };

  const deleteMutation = useDeleteMomentFeedMutation();

  const closeUserCard = useCallback(() => {
    setIsUserDetailCardOpen(false);
  }, []);

  const closeMomentDetail = useCallback(() => {
    setIsMomentDetailOpen(false);
  }, []);

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

  const handleAvatarClick = useCallback(() => {
    if (userId) {
      setIsUserDetailCardOpen(true);
    }
  }, [userId]);

  const handleContentClick = useCallback(() => {
    if (feedId > 0) {
      setIsMomentDetailOpen(true);
    }
  }, [feedId]);

  // 图片数组字段名（后端示例是 imageUrls
  const images = Array.isArray(feed?.imageUrls) ? feed.imageUrls : [];
  // 时间字段 createTime
  const publishTime = feed?.createTime ?? "";

  // 截取内容预览（如果内容过长）
  const contentPreview = feed?.content ?? "";
  const isContentLong = contentPreview.length > 200;
  const displayContent = isContentLong ? `${contentPreview.slice(0, 200)}...` : contentPreview;

  const MAX_PREVIEW = 9; // <= 改成你想要的阈值

  return (
    <>
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

        <div className="flex flex-row items-center gap-2 mb-2">
          {userInfoLoading
            ? (
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0"></div>
              )
            : (
                <img
                  className="w-12 h-12 rounded-full object-cover cursor-pointer mr-2 hover:opacity-80 transition-opacity flex-shrink-0"
                  src={data.avatar}
                  onClick={handleAvatarClick}
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
                    <h3 className="card-title text-xl whitespace-nowrap">{data.name}</h3>
                    <p className="flex-1 text-xs text-base-content/60">{publishTime}</p>
                  </>
                )}
          </div>

          <div className="relative ml-auto">
            <button
              className="text-base-content/40 hover:text-base-content/80 transition-colors p-2 rounded-2xl hover:bg-base-200"
              onClick={() => setShowMenu(!showMenu)}
              type="button"
            >
              ⋯
            </button>

            {/* 每个动态的二级菜单 */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                {loginUserId === userId
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

        {/* 动态内容 - 可点击区域 */}
        <div className="mb-4">
          <div
            className="text-base-content whitespace-pre-wrap pl-16 cursor-pointer hover:text-primary transition-colors rounded-lg p-2 -m-2"
            onClick={handleContentClick}
          >
            {displayContent}
            {isContentLong && (
              <span className="text-primary text-sm ml-2 font-medium">查看全文</span>
            )}
          </div>

          {/* ---------- 改动区：图片预览网格（B 站风格，最多预览 MAX_PREVIEW 张） ---------- */}
          {images.length > 0 && (
            <div className="mt-4 pl-16">
              {/* grid 布局：1 张 / 2 张 / >=3 张 使用不同列数（视觉与 B 站 类似） */}
              <div
                className={`grid gap-2 ${
                  images.length === 1 ? "grid-cols-1 max-w-xs" : images.length === 2 ? "grid-cols-2 max-w-md" : "grid-cols-3 max-w-lg"
                }`}
              >
                {images.slice(0, MAX_PREVIEW).map((img: string, idx: number) => (
                  <div key={idx} className="relative">
                    <img
                      src={img}
                      alt={`图片 ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={handleContentClick}
                    />
                    {/* 如果是最后一个预览格并且总数超过 MAX_PREVIEW，显示灰色覆盖和 +N */}
                    {idx === MAX_PREVIEW - 1 && images.length > MAX_PREVIEW && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">
                          +
                          {images.length - MAX_PREVIEW}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 如果总数超过 MAX_PREVIEW，给一个额外的说明行（可选） */}
              {images.length > MAX_PREVIEW && (
                <p
                  className="text-xs text-base-content/60 mt-2 pl-1 cursor-pointer hover:text-primary transition-colors"
                >
                  点击查看全部
                  {" "}
                  {images.length}
                  {" "}
                  张图片
                </p>
              )}
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <div className="flex items-center space-x-4 sm:space-x-6 pt-3 border-t border-base-300">
          {/* TODO 替换操作栏组件 */}
          <button
            className="flex items-center space-x-1 text-sm transition-colors px-2 py-1 rounded-full hover:text-error hover:bg-error/10"
            type="button"
          >
            {/* 点赞组件 */}
            <LikeIconButton
              targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "4" }}
              className="w-9 h-6"
              direction="row"
            />
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

        {/* UserDetail 弹窗 */}
        <PopWindow isOpen={isUserDetailCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} />
        </PopWindow>
      </div>

      {/* 动态详情弹窗 */}
      <MomentDetailView
        feedId={feedId}
        loginUserId={loginUserId}
        isOpen={isMomentDetailOpen}
        onClose={closeMomentDetail}
      />
    </>
  );
};

export default PostsCard;
