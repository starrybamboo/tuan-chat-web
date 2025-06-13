import type { CommentVO } from "api";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import CommentPreview from "@/components/common/comment/commentPreview";
import CommentToggle from "@/components/common/comment/CommentToggle";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";
import React, { useMemo, useState } from "react";
import { useGetCommentByIdQuery } from "../../../../api/hooks/commentQueryHooks";
import {useGlobalContext} from "@/components/globalContextProvider";
import LikeIconButton from "@/components/common/likeIconButton";

export default function CommentComponent({ comment, level = 1 }: { comment: number | CommentVO; level?: number }) {
  const MAX_LEVEL = 4;
  const userId : number | null = useGlobalContext().userId;
  const getCommentByIdQuery = useGetCommentByIdQuery(typeof comment === "number" ? comment : -1);
  const commentVO = typeof comment === "number" ? getCommentByIdQuery.data : comment;

  const [isInput, setIsInput] = useState(false);
  const [isFolded, setIsFolded] = useState(false);
  // 评论过深时，打开一个PopWindow来显示
  const [isOpen, setIsOpen] = useState(false);

  const childrenComments = useMemo(() => {
    return (
      <>
        {/* Child Comments */}
        {/* TODO：分页获取子消息 */}
        {
          commentVO?.children && commentVO?.children.length > 0 && (
            <div>
              {commentVO.children.map(child => (
                <CommentComponent key={child.commentId} comment={child} level={level + 1 > MAX_LEVEL ? 1 : level + 1} />
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
          )
        }
      </>
    );
  }, [commentVO?.children, level]);

  if (!commentVO) {
    return <div className="loading loading-spinner text-primary"></div>;
  }

  if (isFolded) {
    return (
      <div
        className="flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          setIsFolded(!isFolded);
        }}
      >
        <div className="w-10 h-10 rounded-full flex justify-center items-center">
          <CommentToggle
            isFolded={isFolded}
            onClick={() => setIsFolded(!isFolded)}
          />
        </div>
        <CommentPreview commentVO={commentVO}></CommentPreview>
      </div>

    );
  }
  return (
    <div className="text-base-content">
      {/* Comment Header - User Info */}
      <div className="flex items-center gap-2">
        <UserAvatarComponent userId={commentVO?.userId || -1} width={10} isRounded={true} withName={false} />
        <CommentPreview commentVO={commentVO}></CommentPreview>
      </div>
      <div className="flex flex-col lg:flex-row">
        <div className="divider lg:divider-horizontal divider-start hover:divider-neutral hover:font-bold" onClick={() => setIsFolded(!isFolded)}>
          <div className="pt-3">
            <CommentToggle isFolded={isFolded} />
          </div>
        </div>
        <div>
          {/* Comment Content */}
          <div className="prose max-w-none ">
            <p>{commentVO?.content}</p>
          </div>
          {/* Comment Actions */}
          <div className="card-actions">
            <button
              className="btn btn-sm btn-ghost hover:text-primary"
              type="button"
              onClick={() => setIsInput(!isInput)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              回复
            </button>

            <LikeIconButton
                targetInfo={{targetId:commentVO.commentId??-1,targetType: "2"}}
                className={"btn btn-sm btn-ghost text-base-content hover:text-primary"}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>}/>
            {Number(commentVO.userId) === userId && ( <button className="btn btn-sm btn-ghost text-base-content hover:text-error" type="button">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
                删除
            </button>)}
          </div>
          {
            isInput && (
              <CommentInputBox
                parentCommentId={commentVO?.commentId}
                rootCommentId={commentVO?.rootCommentId === 0 ? commentVO?.commentId : commentVO?.rootCommentId}
                onSubmitFinish={() => { setIsInput(false); }}
              >
              </CommentInputBox>
            )
          }
          {
            level < MAX_LEVEL
              ? (
                  childrenComments
                )
              : (commentVO?.children?.length ?? -1) > 0
                  ? (
                      <div>
                        <button
                          className="btn btn-ghost"
                          onClick={() => setIsOpen(true)}
                          type="button"
                        >
                          点击查看更深的回复
                        </button>
                        <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
                          {childrenComments}
                        </PopWindow>
                      </div>
                    )
                  : null
          }
        </div>
      </div>
    </div>
  );
}
