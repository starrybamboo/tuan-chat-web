import ImagePreview from "@/components/activities/ImagePreview";
import MomentDetailView from "@/components/activities/MomentDetailView";
import { parseEventType } from "@/components/common/acticityAndFeedPostsCard/eventTypes";
import ModuleContentCard from "@/components/common/acticityAndFeedPostsCard/postsCardComponents/ModuleContentCard";
import PostContentCard from "@/components/common/acticityAndFeedPostsCard/postsCardComponents/PostContentCard";
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
  res?: any;
  stats?: any;
  loginUserId?: number;
  onDislike?: () => void;
  displayType?: "default" | "feed";
  contentTypeNumber?: number;
}

/**
 * 发布的动态，Feed，帖子预览卡片组件（统一版）
 */
export const PostsCard: React.FC<PostsCardProps> = ({
  res,
  stats,
  loginUserId,
  onDislike,
  displayType = "default",
  contentTypeNumber,
}) => {
  const navigate = useNavigate();
  const isFeed = displayType === "feed";

  // 统一的数据提取
  const userId = res?.userId ?? -1;
  const postId = isFeed ? res?.communityPostId : res?.feedId;

  // 根据实际内容类型确定targetType和resourceType
  const hasPostData = res?.postId || res?.communityPostId;
  const hasModuleData = res?.moduleId;

  let targetType: string;

  if (hasPostData || isFeed) {
    // 有帖子ID，是帖子类型
    // 是Feed但没有特殊内容，使用Feed类型
    targetType = "2";
  }
  else if (hasModuleData) {
    // 有模组ID，是模组类型
    targetType = "3";
  }
  else {
    // 是activity但没有特殊内容，使用activity类型
    targetType = "4";
  }

  const contentType = parseEventType(contentTypeNumber || 0);

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

    const feedIdNum = res?.feedId !== undefined ? Number(res.feedId) : Number.NaN;

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
      navigate(`/community/${res?.communityId}/${postId}`);
    }
  }, [postId, isFeed, res?.communityId, navigate]);

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
  const images = [
    ...(Array.isArray(res?.imageUrls) ? res.imageUrls : []),
    ...(res?.coverImage ? [res.coverImage] : []),
  ];
  const publishTime = res?.createTime ?? "";
  const content = res?.content ?? "";
  const title = res?.title ?? "";
  const description = res?.description ?? "";

  const isContentLong = content.length > 200;
  const displayContent = isContentLong ? `${content.slice(0, 200)}...` : content;

  // 渲染
  const postRef = useRef<HTMLDivElement>(null);

  // 判断内容类型并渲染相应的卡片 - 无论是activity还是feed都适用
  const renderSpecialContent = () => {
    // 帖子类型判断 - 优先检查数据字段，再检查contentType
    const isPostType = contentType === "发送了帖子" || contentType.includes("帖子");

    if (hasPostData || isPostType) {
      // 统一处理帖子ID和社区ID，兼容activity和feed的字段差异
      const actualPostId = res?.postId || res?.communityPostId || postId;
      const actualCommunityId = res?.communityId;

      return (
        <PostContentCard
          title={title}
          description={description}
          coverImage={images[0]} // 使用第一张图片作为封面
          communityId={actualCommunityId}
          postId={actualPostId}
          onClick={() => {
            if (actualCommunityId && actualPostId) {
              navigate(`/community/${actualCommunityId}/${actualPostId}`);
            }
          }}
        />
      );
    }

    // 模组类型判断 - 优先检查数据字段，再检查contentType
    const isModuleType = contentType.includes("模组") || contentType.includes("模块");

    if (hasModuleData || isModuleType) {
      // 兼容可能的字段名差异
      const moduleName = res?.name || res?.moduleName || res?.title;
      const moduleImg = res?.moduleImage;

      return (
        <ModuleContentCard
          name={moduleName}
          description={description}
          moduleImage={moduleImg}
          moduleId={res.moduleId}
          onClick={() => {
            if (res?.moduleId) {
              navigate(`/module/detail/${res.moduleId}`, {
                state: {
                  // TODO
                  moduleData: {
                    moduleId: res.moduleId,
                    // ruleId: module.ruleId,
                    // ruleName: module.rule,
                    moduleName: res.name,
                    description: res.description,
                    userId,
                    // authorName: module.authorName,
                    image: res.moduleImage,
                    // createTime: module.createTime,
                    // updateTime: module.updateTime,
                    // minPeople: module.minPeople,
                    // maxPeople: module.maxPeople,
                    // minTime: module.minTime,
                    // maxTime: module.maxTime,
                    // parent: module.parent,
                    // instruction: module.instruction,
                  },
                },
              });
            }
          }}
        />
      );
    }

    // 如果不是特殊内容类型，返回null，使用默认渲染逻辑
    return null;
  };

  // 获取实际的ID用于点赞、评论等操作
  const getActualId = () => {
    if (hasPostData) {
      return res?.postId || res?.communityPostId || postId;
    }
    else if (hasModuleData) {
      return res?.moduleId;
    }
    else {
      return postId;
    }
  };

  const actualId = getActualId() ?? -1;

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
        {!isFeed && (
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
                      <div className="flex items-center gap-2 text-xs text-base-content/80">
                        <p>{publishTime}</p>
                        <p>{contentType}</p>
                      </div>
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
        )}

        {/* 可点击区域：内容 */}
        <div className="mb-4">
          {/* 渲染特殊内容卡片 */}
          {renderSpecialContent() || (
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
                  : (
                      <div className="text-base-content/60 text-sm">
                        发布了内容
                      </div>
                    )}
            </div>
          )}

          {/* Feed 专用：消息内容容器 */}
          {isFeed && res?.message && (
            <div className="mt-4">
              <SlidableChatPreview
                messageResponse={res.message}
                maxHeight="160px"
                showAvatars={true}
                beFull={true}
              />
            </div>
          )}

          {/* 图片预览（非 Feed 且没有特殊内容卡片时） */}
          {!isFeed && images.length > 0 && !renderSpecialContent() && (
            <div className="mt-4 pl-16">
              <ImagePreview images={images} maxPreview={9} />
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <div className="flex items-center space-x-4 sm:space-x-6 pt-3 border-t border-base-300">
          <div className="flex items-center space-x-1 text-sm transition-colors px-2 py-1 cursor-pointer hover:text-error hover:bg-error/10 rounded-full">
            <LikeIconButton
              targetInfo={{ targetId: actualId, targetType }}
              className="w-9 h-6 cursor-pointer"
              direction="row"
            />
          </div>

          <div
            onClick={handleComment}
            className="flex items-center space-x-1 text-sm hover:text-primary cursor-pointer hover:bg-primary/10 transition-colors px-2 py-1 rounded-full"
          >
            <CommentOutline className="h-6 w-5" />
            <span className="font-medium">{stats?.commentCount || 0}</span>
          </div>

          <div className="flex items-center space-x-1 text-sm hover:text-warning cursor-pointer hover:bg-warning/10 transition-colors px-2 py-1 rounded-full">
            <CollectionIconButton
              targetInfo={{ resourceId: actualId, resourceType: targetType }}
              className="w-9 h-6 cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-1 text-sm cursor-pointer hover:bg-blue-500/10 transition-colors px-2 py-1 rounded-full">
            <ShareIconButton targetRef={postRef as React.RefObject<HTMLDivElement>} qrLink={window.location.href} searchKey={`feedShowSharePop${actualId}`} className="cursor-pointer w-9 h-6" />
          </div>
        </div>

        {isCommentMenuOpen && (
          <div className="mt-6 p-6 bg-base-200 rounded-lg">
            <CommentPanel
              targetInfo={{ targetId: actualId, targetType }}
              loginUserId={loginUserId || -1}
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
