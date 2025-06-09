import type { CommentContextType } from "@/components/common/comment/commentContext";
import type { LikeRecordRequest } from "../../../../api";
import CommentComponent from "@/components/common/comment/commentComponent";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import { useMemo } from "react";
import { useGetCommentPageInfiniteQuery } from "../../../../api/hooks/commentQueryHooks";

/**
 * 主组件。评论区。
 * @param targetInfo
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
        <CommentInputBox></CommentInputBox>
      </div>
    </CommentContext>
  );
}
