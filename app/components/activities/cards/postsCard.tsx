import ImagePreview from "@/components/activities/ImagePreview";
import MomentDetailView from "@/components/activities/MomentDetailView";
import CommentPanel from "@/components/common/comment/commentPanel";
import LikeIconButton from "@/components/common/likeIconButton";
import UserAvatarComponent from "@/components/common/userAvatar";
import { CommentOutline } from "@/icons";
import React, { useCallback, useState } from "react";
import { useDeleteMomentFeedMutation } from "../../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface PostsCardProp {
  dynamic: any;
  loginUserId: number;
}

/**
 * 发布的动态，Feed，帖子预览卡片组件
 */
export const PostsCard: React.FC<PostsCardProp> = ({ dynamic, loginUserId }) => {
  const res = dynamic?.response ?? {};
  const userId = res?.userId ?? -1;
  const feedId = res?.feedId ?? -1;

  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMomentDetailOpen, setIsMomentDetailOpen] = useState(false);
  const [isCommentMenuOpen, setIsCommentMenuOpen] = useState(false);

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || -1);

  // 使用API获取的数据或默认数据
  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
  };

  const deleteMutation = useDeleteMomentFeedMutation();

  const closeMomentDetail = useCallback(() => {
    setIsMomentDetailOpen(false);
  }, []);

  const handleDelete = async () => {
    // TODO: 接入弹窗来提示用户是否删除

    // 优先从 res.feedId 获取
    const feedIdNum = res?.feedId !== undefined ? Number(res.feedId) : Number.NaN;

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

  // TODO: 接入分享组件
  const handleComment = () => {
    setIsCommentMenuOpen(!isCommentMenuOpen);
  };

  const handleShare = () => 0;

  const handleContentClick = useCallback(() => {
    if (feedId > 0) {
      setIsMomentDetailOpen(true);
    }
  }, [feedId]);

  // 图片数组字段名（后端示例是 imageUrls
  const images = Array.isArray(res?.imageUrls) ? res.imageUrls : [];
  // 时间字段 createTime
  const publishTime = res?.createTime ?? "";

  // 截取内容预览（如果内容过长）
  const contentPreview = res?.content ?? "";
  const isContentLong = contentPreview.length > 200;
  const displayContent = isContentLong ? `${contentPreview.slice(0, 200)}...` : contentPreview;

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
                <UserAvatarComponent userId={userId} width={12} isRounded={true} />
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

            {/* 每个二级菜单 */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                {loginUserId === userId
                  ? (
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors"
                        type="button"
                      >
                        删除
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

        {/* 内容 - 可点击区域 */}
        <div className="mb-4">
          <div
            className="text-base-content whitespace-pre-wrap cursor-pointer pl-18 hover:text-primary transition-colors rounded-lg p-2 -m-2"
            onClick={handleContentClick}
          >
            {displayContent}
            {isContentLong && (
              <span className="text-primary text-sm ml-2 font-medium">查看全文</span>
            )}
          </div>

          {/* 图片预览组件 */}
          {images.length > 0 && (
            <div className="mt-4 pl-16">
              <ImagePreview images={images} maxPreview={9} />
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <div className="flex items-center space-x-4 sm:space-x-6 pt-3 border-t border-base-300">
          <button
            className="flex items-center space-x-1 text-sm transition-colors px-2 py-1 rounded-full hover:text-error hover:bg-error/10"
            type="button"
          >
            {/* 点赞组件 */}
            <LikeIconButton
              targetInfo={{ targetId: res?.feedId ?? -1, targetType: "4" }}
              className="w-9 h-6"
              direction="row"
            />
          </button>

          <button
            onClick={handleComment}
            className="flex items-center space-x-1 text-sm hover:text-primary hover:bg-primary/10 transition-colors px-2 py-1 rounded-full"
            type="button"
          >
            <CommentOutline className="h-6 w-5" />
            <span className="font-medium">0</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center space-x-1 text-sm text-base-content/60 hover:text-success hover:bg-success/10 transition-colors px-2 py-1 rounded-full"
            type="button"
          >
          </button>
        </div>
        {isCommentMenuOpen && (
          <div className="mt-6 p-6 bg-base-200 rounded-lg">
            <CommentPanel
              targetInfo={{ targetId: res?.feedId ?? -1, targetType: "4" }}
            />
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
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
