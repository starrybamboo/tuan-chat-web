import type { LikeRecordRequest } from "../../../api";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import LikeIconButton from "@/components/common/likeIconButton";
import ShareIconButton from "@/components/common/share/shareIconButton";
import { useGlobalContext } from "@/components/globalContextProvider";
import { CommentOutline } from "@/icons";
import { useMemo, useState } from "react";
import { useDeletePostMutation } from "../../../api/hooks/communityQueryHooks";

interface PostActionBarProps {
  /** 帖子ID */
  postId?: number;
  /** 帖子作者ID */
  authorUserId?: number;
  /** 用于点赞的目标信息 */
  likeTargetInfo: LikeRecordRequest;
  /** 用于评论的目标信息 */
  _commentTargetInfo: LikeRecordRequest;
  /** 点赞数量 */
  likeCount?: number;
  /** 评论数量 */
  commentCount?: number;
  /** 分享按钮的搜索键 */
  shareSearchKey: string;
  /** 分享标题 */
  shareTitle?: string;
  /** 分享目标的引用 */
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
  /** 回复状态 */
  replyTo?: { userName: string; commentId: number } | null;
  /** 设置回复状态的回调 */
  onSetReplyTo?: (replyTo: { userName: string; commentId: number } | null) => void;
  /** 删除帖子成功的回调 */
  onDeleteSuccess?: () => void;
}

export default function PostActionBar({
  postId,
  authorUserId,
  likeTargetInfo,
  _commentTargetInfo,
  likeCount,
  commentCount,
  shareSearchKey,
  shareTitle,
  targetRef,
  className,
  replyTo,
  onSetReplyTo,
  onDeleteSuccess,
}: PostActionBarProps) {
  // 获取当前用户ID
  const currentUserId = useGlobalContext().userId ?? -1;

  // 检查是否是帖子作者
  const isAuthor = currentUserId === authorUserId && currentUserId !== -1 && authorUserId !== -1;
  // 为评论输入框创建上下文
  const commentContext = useMemo(() => {
    return { targetInfo: _commentTargetInfo };
  }, [_commentTargetInfo]);

  // 生成placeholder文本 TODO: 实现逻辑
  // const placeholder = replyTo ? `回复@${replyTo.userName}` : "说点什么...";

  const [openCommentInput, setOpenCommentInput] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 删除帖子钩子
  const deletePostMutation = useDeletePostMutation();

  // 处理评论提交完成
  const handleCommentSubmitted = () => {
    if (onSetReplyTo) {
      onSetReplyTo(null); // 清除回复状态
    }
  };

  // 处理删除帖子
  const handleDeletePost = () => {
    if (!postId)
      return;

    if (showDeleteConfirm) {
      // 确认删除
      deletePostMutation.mutate(postId, {
        onSuccess: () => {
          setShowMoreMenu(false);
          setShowDeleteConfirm(false);
          // 调用删除成功回调
          if (onDeleteSuccess) {
            onDeleteSuccess();
          }
          // 可以添加成功提示
        },
        onError: (error) => {
          console.error("删除帖子失败:", error);
          setShowDeleteConfirm(false);
          // 可以添加错误提示
        },
      });
    }
    else {
      // 显示确认
      setShowDeleteConfirm(true);
    }
  };

  return (
    <CommentContext value={commentContext}>
      <div className={`md:bg-base-100 md:rounded-lg md:border md:border-base-200 fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 shadow-lg z-50 md:static md:border-t-0 md:shadow-sm ${className}`}>
        {/* 评论输入框和操作按钮 */}
        <div className="px-4 py-3 md:px-6 md:py-4">
          {/* 评论输入框 */}
          {
            openCommentInput && (
              <div className="mb-3">
                <CommentInputBox
                  className="mb-0"
                  onSubmitFinish={handleCommentSubmitted}
                  rootCommentId={replyTo?.commentId || 0}
                  parentCommentId={replyTo?.commentId || 0}
                />
              </div>
            )
          }

          {/* 操作按钮栏 */}
          <div className="flex items-center justify-between">
            {/* 左侧按钮组 */}
            <div className="flex items-center space-x-6">
              {/* 点赞按钮 */}
              <div className="flex items-center space-x-1">
                <LikeIconButton
                  targetInfo={likeTargetInfo}
                  direction="row"
                  likeCount={likeCount}
                  className="btn-ghost hover:bg-transparent p-0 min-h-0 h-auto border-none"
                />
              </div>

              {/* 评论数量显示 */}
              <div
                className="flex items-center space-x-1 text-base-content"
                onClick={() => setOpenCommentInput(!openCommentInput)}
              >
                <CommentOutline className="w-5 h-5" />
                <span className="text-sm font-medium">{commentCount ?? 0}</span>
              </div>

              {/* 收藏按钮 */}
              <button
                type="button"
                className="flex items-center text-base-content hover:text-warning transition-colors"
                title="收藏"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {/* 右侧分享按钮和更多菜单 */}
            <div className="flex items-center space-x-2">
              <ShareIconButton
                targetRef={targetRef}
                qrLink={window.location.href}
                searchKey={shareSearchKey}
                title={shareTitle}
                className="p-0 min-h-0 h-auto border-none hover:bg-transparent"
              />

              {/* 三点菜单按钮 */}
              {postId && isAuthor && (
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 text-base-content hover:bg-base-200 rounded-full transition-colors"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    title="更多选项"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  {/* 下拉菜单 */}
                  {showMoreMenu && (
                    <>
                      {/* 点击遮罩关闭菜单 */}
                      <div
                        className="fixed inset-0 z-50"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteConfirm(false);
                        }}
                      />
                      {/* 菜单容器 - 在移动端向上展开，桌面端向下展开 */}
                      <div className="absolute right-0 bottom-full mb-2 md:top-full md:bottom-auto md:mt-2 md:mb-0 w-32 bg-base-100 border border-base-200 rounded-lg shadow-lg z-[60]">
                        {showDeleteConfirm
                          ? (
                              <div className="p-2">
                                <p className="text-xs text-base-content mb-2">确定删除？</p>
                                <div className="flex space-x-1">
                                  <button
                                    type="button"
                                    className="flex-1 px-2 py-1 text-xs text-error bg-error/10 hover:bg-error/20 rounded transition-colors"
                                    onClick={handleDeletePost}
                                    disabled={deletePostMutation.isPending}
                                  >
                                    {deletePostMutation.isPending ? "删除中" : "确定"}
                                  </button>
                                  <button
                                    type="button"
                                    className="flex-1 px-2 py-1 text-xs text-base-content hover:bg-base-200 rounded transition-colors"
                                    onClick={() => setShowDeleteConfirm(false)}
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )
                          : (
                              <button
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm text-error hover:bg-base-200 rounded-lg transition-colors"
                                onClick={handleDeletePost}
                              >
                                删除帖子
                              </button>
                            )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CommentContext>
  );
}
