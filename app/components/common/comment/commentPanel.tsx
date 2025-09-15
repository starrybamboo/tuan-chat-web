import type { CommentContextType } from "@/components/common/comment/commentContext";
import type { LikeRecordRequest } from "../../../../api";
import CommentComponent from "@/components/common/comment/commentComponent";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import { useMemo } from "react";
import { useGetCommentPageInfiniteQuery } from "../../../../api/hooks/commentQueryHooks";

/**
 * 评论区组件
 * @param targetInfo 用于指明是哪个 feed，post 或者 module 的评论区
 * @param className
 * @constructor
 */
export default function CommentPanel({ targetInfo, className }: { targetInfo: LikeRecordRequest; className?: string }) {
  const getCommentPageInfiniteQuery = useGetCommentPageInfiniteQuery(targetInfo);
  const comments = useMemo(() => {
    return (getCommentPageInfiniteQuery.data?.pages.flatMap(p => p.data ?? []) ?? []);
  }, [getCommentPageInfiniteQuery.data?.pages]);

  const renderedComments = useMemo(() => {
    return comments.map(comment => <CommentComponent comment={comment} key={comment.commentId} />);
  }, [comments]);

  const commentContext: CommentContextType = useMemo(() => {
    return { targetInfo };
  }, [targetInfo]);
  return (
    <CommentContext value={commentContext}>
      <div className={className}>
        {
          renderedComments
        }
        {/* 评论输入框 */}
        <CommentInputBox />
      </div>
    </CommentContext>
  );
}
