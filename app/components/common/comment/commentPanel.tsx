import type { LikeRecordRequest } from "../../../../api";
import CommentComponent from "@/components/common/comment/commentComponent";
import { useMemo } from "react";
import { useGetCommentPageInfiniteQuery } from "../../../../api/queryHooks";

export default function CommentPanel({ targetInfo, className }: { targetInfo: LikeRecordRequest; className?: string }) {
  const getCommentPageInfiniteQuery = useGetCommentPageInfiniteQuery(targetInfo);
  const comments = useMemo(() => {
    return (getCommentPageInfiniteQuery.data?.pages.flatMap(p => p.data ?? []) ?? []);
  }, [getCommentPageInfiniteQuery.data?.pages]);
  return (
    <div className={className}>
      {
        comments.map(comment => <CommentComponent comment={comment} key={comment.commentId} />)
      }
    </div>
  );
}
