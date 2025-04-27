import type { CommentVO } from "api";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useState } from "react";
import { useGetCommentByIdQuery, useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function CommentComponent({ comment }: { comment: number | CommentVO }) {
  const getCommentByIdQuery = useGetCommentByIdQuery(typeof comment === "number" ? comment : -1);
  const commentVO = typeof comment === "number" ? getCommentByIdQuery.data : comment;
  const getUserInfoQuery = useGetUserInfoQuery(commentVO?.userId || -1);
  const user = getUserInfoQuery.data?.data;

  const [isInput, setIsInput] = useState(false);

  if (!commentVO) {
    return <div className="loading loading-spinner text-primary"></div>;
  }

  return (
    <div className="card bg-base-100 shadow-sm mb-4 text-base-content">
      <div className="card-body p-4">
        {/* Comment Header - User Info */}
        <div className="flex items-center gap-2 mb-2">
          <div className="avatar">
            <UserAvatarComponent
              userId={commentVO.userId || -1}
              width={10}
              isRounded={true}
              withName={false}
            />
          </div>
          <div>
            <h3 className="font-semibold text-base-content">
              {user?.username || "YOU_KNOW_WHO"}
            </h3>
            <span className="text-xs text-base-content/70">
              {new Date(commentVO.createTime || "").toLocaleString()}
            </span>
          </div>
        </div>

        {/* Comment Content */}
        <div className="prose max-w-none text-base-content">
          <p>{commentVO.content}</p>
        </div>

        {/* Comment Actions */}
        <div className="card-actions justify-end mt-2">
          <button className="btn btn-sm btn-ghost text-base-content hover:text-primary" type="button" onClick={() => setIsInput(!isInput)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            回复
          </button>
          <button className="btn btn-sm btn-ghost text-base-content hover:text-primary" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            喜欢
          </button>
        </div>

        {
          isInput && (
            <CommentInputBox
              parentCommentId={commentVO.commentId}
              rootCommentId={commentVO.rootCommentId === 0 ? commentVO.commentId : commentVO.rootCommentId}
            >
            </CommentInputBox>
          )
        }

        {/* Child Comments */}
        {/* TODO：分页获取子消息 */}
        {commentVO.children && commentVO.children.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-base-200">
            {commentVO.children.map(child => (
              <CommentComponent key={child.commentId} comment={child} />
            ))}
            {commentVO.hasMore && (
              <button className="btn btn-sm btn-ghost mt-2 text-base-content hover:text-primary" type="button">
                Load more replies (
                {commentVO.totalChildren || 0 - commentVO.children.length}
                {" "}
                more)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
