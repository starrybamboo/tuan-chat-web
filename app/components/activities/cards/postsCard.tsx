import ImagePreview from "@/components/activities/ImagePreview";
import MomentDetailView from "@/components/activities/MomentDetailView";
import CollectionIconButton from "@/components/common/collection/collectionIconButton";
import CommentPanel from "@/components/common/comment/commentPanel";
import DislikeIconButton from "@/components/common/dislikeIconButton";
import LikeIconButton from "@/components/common/likeIconButton";
import ShareIconButton from "@/components/common/share/shareIconButton";
import UserAvatarComponent from "@/components/common/userAvatar";
import SlidableChatPreview from "@/components/community/slidableChatPreview";
import { CommentOutline } from "@/icons";
import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useDeleteMomentFeedMutation } from "../../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface PostsCardProps {
  data?: any;
  stats?: any;
  loginUserId?: number;
  onDislike?: () => void;
  // 组件类型标识
  type?: "default" | "feed";
}

/**
 * 发布的动态，Feed，帖子预览卡片组件（统一版）
 */
export const PostsCard: React.FC<PostsCardProps> = ({
  data,
  stats,
  loginUserId,
  onDislike,
  type = "default",
}) => {
  const navigate = useNavigate();
  const isFeed = type === "feed";

  // 统一的数据提取
  const userId = data?.userId ?? -1;
  const postId = isFeed ? data?.communityPostId : data?.feedId;
  const targetType = isFeed ? "2" : "4";
  const resourceType = isFeed ? "2" : "4";

  // 状态管理
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMomentDetailOpen, setIsMomentDetailOpen] = useState(false);
  const [isCommentMenuOpen, setIsCommentMenuOpen] = useState(false);

  // Feed 特殊状态
  const [isRemoving, setIsRemoving] = useState(false);

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || -1);

  const userData = userInfoData?.data;
  const userDisplayData = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
  };

  const deleteMutation = useDeleteMomentFeedMutation();

  const closeMomentDetail = useCallback(() => {
    setIsMomentDetailOpen(false);
  }, []);

  const handleDelete = async () => {
    if (isFeed)
      return; // Feed 不支持删除

    const feedIdNum = data?.feedId !== undefined ? Number(data.feedId) : Number.NaN;

    if (!Number.isFinite(feedIdNum)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(feedIdNum);
    }
    catch (err) {
      console.error("删除失败", err);
      setIsDeleting(false);
    }
  };

  const handleComment = () => {
    setIsCommentMenuOpen(!isCommentMenuOpen);
  };

  const handleContentClick = useCallback(() => {
    if (!isFeed && postId > 0) {
      setIsMomentDetailOpen(true);
    }
    else if (isFeed) {
      navigate(`/community/${data?.communityId}/${postId}`);
    }
  }, [postId, isFeed, data?.communityId, navigate]);

  // Feed 专用不感兴趣处理
  const handleDislikeClick = () => {
    if (!isFeed || !onDislike)
      return;

    setIsRemoving(true);
    setTimeout(() => {
      onDislike();
    }, 500);
  };

  // 统一的内容处理
  const images = Array.isArray(data?.imageUrls) ? data.imageUrls : [];
  const publishTime = data?.createTime ?? "";
  const content = data?.content ?? "";
  const title = data?.title ?? "";
  const description = data?.description ?? "";

  const isContentLong = content.length > 200;
  const displayContent = isContentLong ? `${content.slice(0, 200)}...` : content;

  // 渲染
  const postRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <article
        ref={postRef}
        className={`bg-base-100 rounded-xl shadow-sm border border-base-300 p-4 sm:p-6 mb-4 hover:shadow-md transition-all relative ${
          isDeleting ? "opacity-50 pointer-events-none" : ""
        } ${isRemoving ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"}`}
      >
        {isDeleting && (
          <div className="absolute inset-0 bg-base-100/80 rounded-xl flex items-center justify-center z-10">
            <div className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {/* 头部 */}
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
                    <h3 className="card-title text-xl whitespace-nowrap">{userDisplayData.name}</h3>
                    {publishTime && <p className="flex-1 text-xs text-base-content/60">{publishTime}</p>}
                  </>
                )}
          </div>

          {/* 更多操作菜单 */}
          <div className="relative ml-auto">
            <button
              className="text-base-content/40 hover:text-base-content/80 transition-colors p-2 rounded-2xl hover:bg-base-200"
              onClick={() => setShowMenu(!showMenu)}
              type="button"
            >
              ⋯
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                {!isFeed && loginUserId === userId
                  ? (
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors"
                        type="button"
                      >
                        删除
                      </button>
                    )
                  : !isFeed
                      ? (
                          <button
                            onClick={() => setShowMenu(false)}
                            className="w-full px-4 py-2 text-left text-sm text-base-content/60 hover:bg-base-200 transition-colors"
                            type="button"
                          >
                            举报
                          </button>
                        )
                      : (
                          <DislikeIconButton
                            className="w-full justify-start px-3 py-2 hover:bg-base-200 transition-colors"
                            onDislike={handleDislikeClick}
                          />
                        )}
              </div>
            )}
          </div>
        </div>

        {/* 可点击区域：内容 */}
        <div className="mb-4">
          <div
            className="cursor-pointer group space-y-2"
            onClick={handleContentClick}
            tabIndex={0}
            role="button"
          >
            {/* 标题（Feed 专用） */}
            {isFeed && title && (
              <h2 className="font-extrabold leading-snug text-base-content/90 text-base line-clamp-2 group-hover:underline">
                {title}
              </h2>
            )}

            {/* 内容或描述 */}
            {!isFeed && content
              ? (
                  <div className="text-base-content whitespace-pre-wrap hover:text-primary transition-colors rounded-lg p-2 -m-2">
                    {displayContent}
                    {isContentLong && (
                      <span className="text-primary text-sm ml-2 font-medium">查看全文</span>
                    )}
                  </div>
                )
              : isFeed && description
                ? (
                    <p className="text-sm text-base-content/85 whitespace-pre-line leading-relaxed group-hover:text-primary transition-colors">
                      {description}
                    </p>
                  )
                : null}
          </div>
          {/* Feed 专用：消息内容容器 */}
          {isFeed && data?.message && (
            <div className="mt-4">
              <SlidableChatPreview
                messageResponse={data.message}
                maxHeight="160px"
                showAvatars={true}
                beFull={true}
              />
            </div>
          )}
          {/* 图片预览（非 Feed） */}
          {!isFeed && images.length > 0 && (
            <div className="mt-4 pl-16">
              <ImagePreview images={images} maxPreview={9} />
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <div className="flex items-center space-x-4 sm:space-x-6 pt-3 border-t border-base-300">
          <div className="flex items-center space-x-1 text-sm transition-colors px-2 py-1 cursor-pointer hover:text-error hover:bg-error/10 rounded-full">
            <LikeIconButton
              targetInfo={{ targetId: postId ?? -1, targetType }}
              className="w-9 h-6 cursor-pointer"
              direction="row"
            />
          </div>

          <div
            onClick={handleComment}
            className="flex items-center space-x-1 text-sm hover:text-primary cursor-pointer hover:bg-primary/10 transition-colors px-2 py-1 rounded-full"
          >
            <CommentOutline className="h-6 w-5" />
            <span className="font-medium">
              {stats?.commentCount || 0}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-sm hover:text-warning cursor-pointer hover:bg-warning/10 transition-colors px-2 py-1 rounded-full">
            <CollectionIconButton
              targetInfo={{ resourceId: postId ?? -1, resourceType }}
              className="w-9 h-6 cursor-pointer"
            />
          </div>
          <div className="flex items-center space-x-1 text-sm cursor-pointer hover:bg-blue-500/10 transition-colors px-2 py-1 rounded-full">
            <ShareIconButton targetRef={postRef as React.RefObject<HTMLDivElement>} qrLink={window.location.href} searchKey={`feedShowSharePop${postId}`} />
          </div>
        </div>
        {isCommentMenuOpen && (
          <div className="mt-6 p-6 bg-base-200 rounded-lg">
            <CommentPanel
              targetInfo={{ targetId: postId ?? -1, targetType }}
            />
          </div>
        )}
      </article>

      {/* 详情弹窗（非 Feed） */}
      {!isFeed && (
        <MomentDetailView
          feedId={postId ?? -1}
          loginUserId={loginUserId || -1}
          isOpen={isMomentDetailOpen}
          onClose={closeMomentDetail}
        />
      )}
    </>
  );
};

export default PostsCard;
