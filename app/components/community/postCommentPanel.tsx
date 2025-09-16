import type { CommentVO, LikeRecordRequest } from "../../../api";
import CommentComponent from "@/components/common/comment/commentComponent";
import { CommentContext } from "@/components/common/comment/commentContext";
import { useMemo } from "react";
import { useGetCommentPageInfiniteQuery } from "../../../api/hooks/commentQueryHooks";

/**
 * 帖子评论区组件 - 专门用于帖子详情页面 TODO: 更换评论逻辑
 * @param props - 组件属性
 * @param props.targetInfo - 用于指明是哪个帖子的评论区
 * @param props.className - 样式类名
 * @param props.onReply - 回复回调函数
 * @constructor
 */
export default function PostCommentPanel({
  targetInfo,
  className,
  onReply,
}: {
  targetInfo: LikeRecordRequest;
  className?: string;
  onReply?: (userName: string, commentId: number) => void;
}) {
  const getCommentPageInfiniteQuery = useGetCommentPageInfiniteQuery(targetInfo);
  const comments = useMemo(() => {
    return (getCommentPageInfiniteQuery.data?.pages.flatMap((p: any) => p.data ?? []) ?? []);
  }, [getCommentPageInfiniteQuery.data?.pages]);

  const renderedComments = useMemo(() => {
    return comments.map((comment: CommentVO) => (
      <PostCommentComponent
        comment={comment}
        key={comment.commentId}
        onReply={onReply}
      />
    ));
  }, [comments, onReply]);

  const commentContext = useMemo(() => {
    return { targetInfo };
  }, [targetInfo]);

  return (
    <CommentContext value={commentContext}>
      <div className={className}>
        {comments.length === 0
          ? (
              <div className="text-gray-400 text-center py-8">暂无评论</div>
            )
          : (
              renderedComments
            )}
      </div>
    </CommentContext>
  );
}

/**
 * 帖子评论组件 - 在CommentComponent基础上增加回复功能
 */
function PostCommentComponent({
  comment,
  // onReply,
}: {
  comment: CommentVO;
  onReply?: (userName: string, commentId: number) => void;
}) {
  // const handleReply = () => {
  //   if (onReply && comment.userInfo?.userName && comment.commentId) {
  //     onReply(comment.userInfo.userName, comment.commentId);
  //   }
  // };

  return (
    <div className="mb-4">
      {/* 使用原有的CommentComponent */}
      <CommentComponent comment={comment} />

      {/* 添加回复按钮 */}
      {/* <div className="ml-12 mt-2">
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-primary transition-colors"
          onClick={handleReply}
        >
          回复
        </button>
      </div> */}
    </div>
  );
}
