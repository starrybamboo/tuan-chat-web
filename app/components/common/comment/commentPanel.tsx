import type { LikeRecordRequest } from "../../../../api";
import CommentComponent from "@/components/common/comment/commentComponent";
import { useMemo } from "react";
import { useGetCommentPageInfiniteQuery } from "../../../../api/queryHooks";

export default function CommentPanel(targetInfo: LikeRecordRequest) {
  const getCommentPageInfiniteQuery = useGetCommentPageInfiniteQuery(targetInfo);
  const comments = useMemo(() => {
    return (getCommentPageInfiniteQuery.data?.pages.flatMap(p => p.data ?? []) ?? []);
  }, [getCommentPageInfiniteQuery.data?.pages]);
  return (
    <div className="h-screen bg-base-200">
      {
        comments.map(comment => <CommentComponent comment={comment} key={comment.commentId} />)
      }
    </div>
  );
}
