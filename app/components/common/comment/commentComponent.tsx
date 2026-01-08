import type { CommentVO } from "api";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import CommentPreview from "@/components/common/comment/commentPreview";
import CommentToggle from "@/components/common/comment/CommentToggle";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import LikeIconButton from "@/components/common/likeIconButton";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useDeleteCommentMutation, useGetCommentByIdQuery } from "../../../../api/hooks/commentQueryHooks";

/**
 * “L”形回复连接线。
 */
function ReplyConnector({ isParentHovered }: { isParentHovered: boolean }) {
  // 根据父组件的悬停状态，动态决定边框颜色
  const borderColor = isParentHovered
    ? "border-gray-500 dark:border-gray-400"
    : "border-gray-300 dark:border-gray-600";

  return (
    // 这个 32x32 的盒子被绝对定位到父评论的“沟槽”区域
    <div aria-hidden="true" className="absolute -left-8 top-0 h-8 w-8 flex justify-end pointer-events-none">
      {/* L 形线条本身。它只占其容器的右半部分（w-1/2），
          并通过 justify-end 对齐到右侧。这确保其左边框与父评论居中的垂直线精确对齐。
        */}
      <div className={`box-border h-full w-1/2 rounded-bl-lg border-b border-b-2 border-l border-l-2 border-solid ${borderColor} transition-colors`} />
    </div>
  );
}

export default function CommentComponent({ comment, level = 1 }: {
  comment: number | CommentVO;
  level?: number;
}) {
  const MAX_LEVEL = 4;
  const userId: number | null = useGlobalContext().userId;
  const getCommentByIdQuery = useGetCommentByIdQuery(typeof comment === "number" ? comment : -1);
  const commentVO = typeof comment === "number" ? getCommentByIdQuery.data : comment;
  const deleteCommentMutation = useDeleteCommentMutation();
  const [isInput, setIsInput] = useState(false);
  const [isFolded, setIsFolded] = useState(false);
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`commentPop${commentVO?.commentId}`, false);

  // 追踪悬停状态
  const [isLineHovered, setIsLineHovered] = useState(false);

  // 动态计算垂直线高度
  const verticalLineRef = useRef<HTMLDivElement>(null);
  const lastChildRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentColumnRef = useRef<HTMLDivElement>(null);

  // 使用 ResizeObserver 动态调整垂直线的高度
  useLayoutEffect(() => {
    const verticalLine = verticalLineRef.current;
    if (!verticalLine)
      return;

    // 定义一个可重用的高度更新函数
    const updateHeight = () => {
      if (!isFolded && lastChildRef.current && contentRef.current) {
        const contentTop = contentRef.current.getBoundingClientRect().top;
        const lastChildTop = lastChildRef.current.getBoundingClientRect().top;
        const height = (lastChildTop - contentTop) + 16; // 16px 是连接器高度的一半
        verticalLine.style.height = `${height}px`;
      }
      else {
        verticalLine.style.height = "0px";
      }
    };

    updateHeight(); // 初始渲染时立即计算一次

    // 监视整个内容列的尺寸变化
    const contentColumn = contentColumnRef.current;
    if (contentColumn) {
      // 创建一个 ResizeObserver 来监视子评论容器的尺寸变化
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(contentColumn);

      // 清理函数
      return () => resizeObserver.disconnect();
    }
  }, [isFolded, commentVO?.children]); // 依赖于折叠状态和子评论列表

  const childrenComments = useMemo(() => {
    return (
      <>
        {commentVO?.children && commentVO.children.length > 0 && (
          <div className="space-y-4">
            {commentVO.children.map((child, index) => (
              <div
                key={child.commentId}
                className="relative"
                ref={index === (commentVO.children?.length ?? 0) - 1 ? lastChildRef : null}
              >
                <ReplyConnector isParentHovered={isLineHovered} />
                <CommentComponent comment={child} level={level + 1 > MAX_LEVEL ? 1 : level + 1} />
              </div>
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
      </>
    );
  }, [commentVO?.children, commentVO?.hasMore, commentVO?.totalChildren, level, isLineHovered]);

  if (!commentVO) {
    return <div className="loading loading-spinner text-primary"></div>;
  }
  if (String(commentVO.status) !== "1") {
    return null;
  }

  if (isFolded) {
    return (
      <div
        className="flex items-center "
        onClick={(e) => {
          e.stopPropagation();
          setIsFolded(!isFolded);
        }}
      >
        <div className="w-8 h-15 rounded-full flex justify-center items-center">
          <CommentToggle isFolded={isFolded} onClick={() => setIsFolded(!isFolded)} />
        </div>
        <CommentPreview commentVO={commentVO}></CommentPreview>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] text-base-content">
      {/* --- 第 1 列: 垂直主干线和折叠按钮 --- */}
      <div
        ref={contentRef}
        className="relative flex justify-center cursor-pointer"
        onMouseEnter={() => setIsLineHovered(true)}
        onMouseLeave={() => setIsLineHovered(false)}
        onClick={() => setIsFolded(!isFolded)}
      >
        <div
          ref={verticalLineRef}
          className={`absolute top-0 left-1/2 w-[2px] ${isLineHovered ? "bg-gray-500 dark:bg-gray-400" : "bg-gray-300 dark:bg-gray-600"} transition-colors`}
        />
        <div className="relative z-10 pt-4">
          <div className="bg-base-100">
            <CommentToggle isFolded={isFolded} />
          </div>
        </div>
      </div>

      {/* --- 第 2 列: 所有评论内容 --- */}
      <div className="min-w-0" ref={contentColumnRef}>
        <div>
          <div className="flex items-center gap-2">
            <UserAvatarComponent userId={commentVO?.userId || -1} width={10} isRounded={true} withName={false} />
            <CommentPreview commentVO={commentVO} />
          </div>

          <div className="pl-2 pt-2 text-sm leading-relaxed break-words overflow-wrap-anywhere">
            <p className="whitespace-pre-wrap">{commentVO?.content}</p>
          </div>

          <div className="card-actions">
            <button className="btn btn-sm btn-ghost hover:text-primary" type="button" onClick={() => setIsInput(!isInput)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              回复
            </button>
            <LikeIconButton targetInfo={{ targetId: commentVO.commentId ?? -1, targetType: "2" }} className="btn btn-sm btn-ghost text-base-content hover:text-primary" icon={(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>)} direction="row" />
            {Number(commentVO.userId) === userId && (
              <button className="btn btn-sm btn-ghost text-base-content hover:text-error" type="button" onClick={() => { deleteCommentMutation.mutate(commentVO.commentId!); }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                删除
              </button>
            )}
          </div>

          {isInput && (<CommentInputBox parentCommentId={commentVO?.commentId} rootCommentId={commentVO?.rootCommentId === 0 ? commentVO?.commentId : commentVO?.rootCommentId} onSubmitFinish={() => { setIsInput(false); }} />)}
        </div>

        <div className="pt-4">
          {level < MAX_LEVEL
            ? childrenComments
            : (commentVO?.children?.length ?? -1) > 0
                ? (
                    <div>
                      <button className="btn btn-ghost" onClick={() => setIsOpen(true)} type="button">点击查看更深的回复</button>
                      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>{childrenComments}</PopWindow>
                    </div>
                  )
                : null}
        </div>
      </div>
    </div>
  );
}
