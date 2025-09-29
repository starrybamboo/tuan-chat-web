import type { LikeRecordRequest } from "../../../api";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import LikeIconButton from "@/components/common/likeIconButton";
import ShareIconButton from "@/components/common/share/shareIconButton";
import { CommentOutline } from "@/icons";
import { useMemo, useState } from "react";

interface PostActionBarProps {
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
}

export default function PostActionBar({
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
}: PostActionBarProps) {
  // 为评论输入框创建上下文
  const commentContext = useMemo(() => {
    return { targetInfo: _commentTargetInfo };
  }, [_commentTargetInfo]);

  // 生成placeholder文本 TODO: 实现逻辑
  // const placeholder = replyTo ? `回复@${replyTo.userName}` : "说点什么...";

  const [openCommentInput, setOpenCommentInput] = useState(false);

  // 处理评论提交完成
  const handleCommentSubmitted = () => {
    if (onSetReplyTo) {
      onSetReplyTo(null); // 清除回复状态
    }
  };

  return (
    <CommentContext value={commentContext}>
      <div className={`md:bg-base-100 md:rounded-lg md:border md:border-base-200 md:shadow-sm fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 shadow-lg z-50 md:static md:border-t-0 md:shadow-sm ${className}`}>
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

            {/* 右侧分享按钮 */}
            <div className="flex items-center">
              <ShareIconButton
                targetRef={targetRef}
                qrLink={window.location.href}
                searchKey={shareSearchKey}
                title={shareTitle}
                className="p-0 min-h-0 h-auto border-none hover:bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </CommentContext>
  );
}
