import type { LikeRecordRequest } from "../../../../api";
import CommentComponent from "@/components/common/comment/commentComponent";
import { useMemo, useState } from "react";
import { useAddCommentMutation, useGetCommentPageInfiniteQuery } from "../../../../api/queryHooks";

export default function CommentPanel({ targetInfo, className }: { targetInfo: LikeRecordRequest; className?: string }) {
  const getCommentPageInfiniteQuery = useGetCommentPageInfiniteQuery(targetInfo);
  const comments = useMemo(() => {
    return (getCommentPageInfiniteQuery.data?.pages.flatMap(p => p.data ?? []) ?? []);
  }, [getCommentPageInfiniteQuery.data?.pages]);

  const [inputContent, setInputContent] = useState("");
  const addCommentMutation = useAddCommentMutation();

  const handleAddComment = () => {
    addCommentMutation.mutate({
      content: inputContent,
      targetId: targetInfo.targetId,
      targetType: targetInfo.targetType,
      rootCommentId: 0,
      parentCommentId: 0,
    }, {
      onSuccess: () => {
        getCommentPageInfiniteQuery.refetch();
      },
    });
    setInputContent("");
  };

  const renderedComments = useMemo(() => {
    return comments.map(comment => <CommentComponent comment={comment} key={comment.commentId} />);
  }, [comments]);
  return (
    <div className={className}>
      {
        renderedComments
      }
      {/* 评论输入框 */}
      <div className="mt-4 flex items-center bg-base-300 rounded-full p-2">
        <input
          type="text"
          placeholder="说点什么..."
          value={inputContent}
          className="flex-1 bg-transparent outline-none px-3 text-sm"
          onChange={e => setInputContent(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddComment()}
        />
        <button className="btn btn-info" type="button" onClick={() => handleAddComment()} disabled={inputContent.length === 0}>发布</button>
      </div>
    </div>
  );
}
