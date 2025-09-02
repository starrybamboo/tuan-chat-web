import CommentPanel from "@/components/common/comment/commentPanel";
import LikeIconButton from "@/components/common/likeIconButton";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";
import { CommentOutline, XMarkICon } from "@/icons";
import React, { useCallback, useState } from "react";
import { useDeleteMomentFeedMutation, useGetMomentByIdQuery } from "../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../api/queryHooks";

interface MomentDetailViewProps {
  feedId: number;
  loginUserId: number;
  onClose?: () => void;
  isOpen: boolean;
}

/**
 * 动态详情页面组件 - 显示完整动态内容和评论区
 */
export const MomentDetailView: React.FC<MomentDetailViewProps> = ({
  feedId,
  loginUserId,
  onClose,
  isOpen,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserDetailCardOpen, setIsUserDetailCardOpen] = useState(false);

  // 获取动态详情
  const {
    data: momentData,
    isLoading: momentLoading,
    isError: momentError,
  } = useGetMomentByIdQuery(feedId, isOpen);

  const feed = momentData?.data?.feed ?? {};
  const userId = feed?.userId ?? -1;

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || 0);

  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
  };

  const deleteMutation = useDeleteMomentFeedMutation();

  const closeUserCard = useCallback(() => {
    setIsUserDetailCardOpen(false);
  }, []);

  const handleDelete = async () => {
    const feedIdNum = feed?.feedId !== undefined ? Number(feed.feedId) : Number.NaN;

    if (!Number.isFinite(feedIdNum)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(feedIdNum);
      onClose?.(); // 删除成功后关闭详情页
    }
    catch (err) {
      console.error("删除失败", err);
      setIsDeleting(false);
    }
  };

  const handleComment = () => {
    // 评论功能占位
  };

  const handleShare = () => {
    // 分享功能占位
  };

  const handleAvatarClick = useCallback(() => {
    if (userId) {
      setIsUserDetailCardOpen(true);
    }
  }, [userId]);

  const images = Array.isArray(feed?.imageUrls) ? feed.imageUrls : [];
  const publishTime = feed?.createTime ?? "";

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center p-4">
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 w-full overflow-hidden">
        {/* 头部 - 带关闭按钮 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold text-base-content">动态详情</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            type="button"
          >
            <XMarkICon />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {momentLoading && (
            <div className="flex justify-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
          )}

          {momentError && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-6 m-6 text-center">
              <p className="text-error font-medium">加载失败</p>
              <p className="text-error/80 text-sm mt-1">请检查网络连接后重试</p>
            </div>
          )}

          {!momentLoading && !momentError && feed && (
            <div className={`p-6 relative ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
              {isDeleting && (
                <div className="absolute inset-0 bg-base-100/80 rounded-xl flex items-center justify-center z-10">
                  <div className="loading loading-spinner loading-lg text-primary" />
                </div>
              )}

              {/* 用户信息区域 */}
              <div className="flex flex-row items-center gap-3 mb-6">
                {userInfoLoading
                  ? (
                      <div className="skeleton w-16 h-16 rounded-full flex-shrink-0"></div>
                    )
                  : (
                      <img
                        className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                        src={data.avatar}
                        onClick={handleAvatarClick}
                        alt="用户头像"
                      />
                    )}

                <div className="flex flex-col justify-center min-w-0 flex-1">
                  {userInfoLoading
                    ? (
                        <>
                          <div className="skeleton h-6 w-32 mb-2"></div>
                          <div className="skeleton h-4 w-40"></div>
                        </>
                      )
                    : (
                        <>
                          <h3 className="text-xl font-semibold text-base-content">{data.name}</h3>
                          <p className="text-sm text-base-content/60 mt-1">{publishTime}</p>
                        </>
                      )}
                </div>

                <div className="relative ml-auto">
                  <button
                    className="text-base-content/40 hover:text-base-content/80 transition-colors p-3 rounded-full hover:bg-base-200"
                    onClick={() => setShowMenu(!showMenu)}
                    type="button"
                  >
                    ⋯
                  </button>

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

              {/* 动态内容区域 */}
              <div className="mb-6">
                <div className="text-base-content whitespace-pre-wrap text-lg leading-relaxed">
                  {feed?.content ?? ""}
                </div>

                {/* 模组信息 */}
                {feed?.moduleVO && (
                  <div className="mt-4 p-4 bg-base-200 rounded-lg border border-base-300">
                    <div className="flex items-center gap-3">
                      {feed.moduleVO.imageUrl && (
                        <img
                          src={feed.moduleVO.imageUrl}
                          alt={feed.moduleVO.moduleName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base-content">{feed.moduleVO.moduleName}</h4>
                        <p className="text-sm text-base-content/60">
                          作者：
                          {feed.moduleVO.authorName}
                        </p>
                        {feed.moduleVO.moduleDescription && (
                          <p className="text-sm text-base-content/80 mt-1 line-clamp-2">
                            {feed.moduleVO.moduleDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 图片展示区域 */}
                {images.length > 0 && (
                  <div className="mt-6">
                    <div
                      className={`grid gap-4 max-w-lg mx-auto ${
                        images.length === 1
                          ? "grid-cols-1 max-w-md mx-auto"
                          : images.length === 2
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      }`}
                    >
                      {images.map((img: string, idx: number) => (
                        <div
                          key={img}
                          className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={img}
                            alt={`图片 ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 操作栏 */}
              <div className="flex items-center justify-center space-x-8 py-4 border-t border-base-300 bg-base-50">
                <button
                  className="flex items-center space-x-2 text-base transition-colors px-4 py-2 rounded-full hover:text-error hover:bg-error/10"
                  type="button"
                >
                  <LikeIconButton
                    targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "4" }}
                    className="w-10 h-8"
                    direction="row"
                  />
                </button>

                <button
                  onClick={handleComment}
                  className="flex items-center space-x-2 text-base text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors px-4 py-2 rounded-full"
                  type="button"
                >
                  <span className="text-xl">💬</span>
                  <span className="font-medium">0</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center space-x-2 text-base text-base-content/70 hover:text-success hover:bg-success/10 transition-colors px-4 py-2 rounded-full"
                  type="button"
                >
                  <CommentOutline className="h-6 w-5" />
                  <span className="font-medium">分享</span>
                </button>
              </div>

              {/* 评论区域 */}
              <div className="mt-6 p-6 bg-base-200 rounded-lg">
                <CommentPanel
                  targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "4" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* UserDetail 弹窗 */}
        <PopWindow isOpen={isUserDetailCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} />
        </PopWindow>
      </div>
    </div>
  );
};

export default MomentDetailView;
