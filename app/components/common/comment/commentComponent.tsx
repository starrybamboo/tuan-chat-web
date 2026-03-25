import type { CommentVO } from "api";
import React, { use, useMemo, useState } from "react";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import CommentPreview from "@/components/common/comment/commentPreview";
import {
  buildMediaContentPreview,
} from "@/components/common/content/mediaContent";
import MediaContentView from "@/components/common/content/mediaContentView";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import LikeIconButton from "@/components/common/likeIconButton";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRightIcon, CloseIcon } from "@/icons";
import {
  DEFAULT_COMMENT_CHILD_LIMIT,
  DEFAULT_COMMENT_MAX_LEVEL,
  useDeleteCommentMutation,
  useGetCommentByIdQuery,
  useGetCommentChildPageInfiniteQuery,
} from "../../../../api/hooks/commentQueryHooks";

const MAX_LEVEL = 4;

function summarizeCommentContent(content?: string) {
  return buildMediaContentPreview(content, 28, "原评论内容为空");
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 15a3 3 0 0 1-3 3H7l-4 4V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function ThumbUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 10v10" />
      <path d="M14 10h4.8a2 2 0 0 1 1.8 2.9l-2.7 5.4A2 2 0 0 1 16.1 19H7V10l3.2-5.3A1.8 1.8 0 0 1 11.8 4h.2A2 2 0 0 1 14 6z" />
      <path d="M7 19H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
    </svg>
  );
}

function CommentActionButton({
  label,
  icon,
  onClick,
  tone = "default",
  active = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "primary" | "danger";
  active?: boolean;
}) {
  const toneClass = tone === "danger"
    ? "text-base-content/60 hover:bg-error/10 hover:text-error"
    : active || tone === "primary"
      ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
      : "text-base-content/60 hover:bg-primary/10 hover:text-primary";

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-xs h-8 min-h-8 rounded-full px-3 transition-colors ${toneClass}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function getRemainingChildrenCount(totalChildren: number, visibleChildrenCount: number) {
  return Math.max(totalChildren - visibleChildrenCount, 0);
}

function mergeVisibleChildren(initialChildren: CommentVO[] | undefined, loadedChildren: CommentVO[]) {
  const mergedChildren: CommentVO[] = [];
  const seenCommentIds = new Set<number>();

  for (const child of [...(initialChildren ?? []), ...loadedChildren]) {
    const commentId = child.commentId;
    if (typeof commentId === "number") {
      if (seenCommentIds.has(commentId)) {
        continue;
      }
      seenCommentIds.add(commentId);
    }
    mergedChildren.push(child);
  }

  return mergedChildren;
}

export default function CommentComponent({
  comment,
  level = 1,
  displayMode = "threaded",
  parentComment = null,
}: {
  comment: number | CommentVO;
  level?: number;
  displayMode?: "threaded" | "flat";
  parentComment?: CommentVO | null;
}) {
  const commentContext = use(CommentContext);
  const userId: number | null = useGlobalContext().userId;
  const getCommentByIdQuery = useGetCommentByIdQuery(typeof comment === "number" ? comment : -1);
  const commentVO = typeof comment === "number" ? getCommentByIdQuery.data : comment;
  const deleteCommentMutation = useDeleteCommentMutation();
  const [isInput, setIsInput] = useState(false);
  const [isFolded, setIsFolded] = useState(false);
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`commentPop${commentVO?.commentId}`, false);
  const treeOptions = commentContext.treeOptions ?? {
    childLimit: DEFAULT_COMMENT_CHILD_LIMIT,
    maxLevel: DEFAULT_COMMENT_MAX_LEVEL,
  };
  const childPageSize = treeOptions.childLimit > 0 ? treeOptions.childLimit : DEFAULT_COMMENT_CHILD_LIMIT;
  const childSubtreeMaxLevel = Math.max(treeOptions.maxLevel - level, 1);
  const initialChildPageNo = (commentVO?.children?.length ?? 0) > 0 ? 2 : 1;
  const childCommentQuery = useGetCommentChildPageInfiniteQuery(
    commentContext.targetInfo,
    commentVO?.commentId ?? -1,
    childPageSize,
    childPageSize,
    childSubtreeMaxLevel,
    initialChildPageNo,
  );
  const loadedChildren = useMemo(() => {
    return childCommentQuery.data?.pages.flatMap(page => page.data ?? []) ?? [];
  }, [childCommentQuery.data?.pages]);
  const visibleChildren = useMemo(() => {
    return mergeVisibleChildren(commentVO?.children, loadedChildren);
  }, [commentVO?.children, loadedChildren]);

  const totalChildren = commentVO?.totalChildren ?? visibleChildren.length;
  const remainingChildren = getRemainingChildrenCount(totalChildren, visibleChildren.length);
  const hasLoadedChildren = visibleChildren.length > 0;
  const rootCommentId = commentVO?.rootCommentId === 0 ? commentVO?.commentId : commentVO?.rootCommentId;
  const isFlatMode = displayMode === "flat";
  const parentAuthorName = parentComment?.userInfo?.username || "上一条评论";
  const isLoadingMoreChildren = childCommentQuery.isFetchingNextPage;
  const canLoadMoreChildren = Boolean(commentVO?.commentId) && remainingChildren > 0;
  const childLoadFailed = childCommentQuery.isError;

  const childrenComments = useMemo(() => {
    if (!visibleChildren.length) {
      return null;
    }

    return visibleChildren.map(child => (
      <CommentComponent
        comment={child}
        key={child.commentId}
        level={level + 1}
        displayMode={displayMode}
      />
    ));
  }, [displayMode, level, visibleChildren]);

  if (typeof comment === "number" && getCommentByIdQuery.isPending) {
    return <div className="loading loading-spinner text-primary"></div>;
  }
  if (!commentVO) {
    return null;
  }
  if (String(commentVO.status) !== "1") {
    return null;
  }

  if (isFlatMode) {
    return (
      <article className="rounded-2xl border border-base-300 bg-base-100/95 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <UserAvatarComponent
              userId={commentVO.userId || -1}
              username={commentVO.userInfo?.username}
              avatar={commentVO.userInfo?.avatar}
              avatarThumbUrl={commentVO.userInfo?.avatarThumbUrl}
              width={10}
              isRounded={true}
              withName={false}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CommentPreview commentVO={commentVO} />

            {parentComment
              ? (
                  <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-base-200/70 px-3 py-1 text-xs text-base-content/60">
                    <ReplyIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="shrink-0 font-medium text-base-content/75">
                      回复
                      {" "}
                      {parentAuthorName}
                    </span>
                    <span className="truncate text-base-content/55">
                      {summarizeCommentContent(parentComment.content)}
                    </span>
                  </div>
                )
              : null}

            <div className="mt-3 pl-0.5">
              <MediaContentView
                content={commentVO.content}
                emptyText="原评论内容为空"
                className="[&_p]:my-0 [&_p+_p]:mt-3 [&_img]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_pre]:my-2 [&_blockquote]:my-2 text-[14px] leading-[1.7] text-base-content/90"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1">
              <CommentActionButton
                label={isInput ? "取消回复" : "回复"}
                icon={<ReplyIcon className="h-4 w-4" />}
                tone={isInput ? "primary" : "default"}
                active={isInput}
                onClick={() => setIsInput(value => !value)}
              />
              <LikeIconButton
                targetInfo={{ targetId: commentVO.commentId ?? -1, targetType: "2" }}
                className="btn btn-ghost btn-xs h-8 min-h-8 rounded-full px-2.5 text-base-content/65 hover:bg-primary/10 hover:text-primary"
                icon={<ThumbUpIcon className="h-4 w-4" />}
                direction="row"
              />
              {Number(commentVO.userId) === userId && (
                <CommentActionButton
                  label="删除"
                  icon={<CloseIcon className="h-4 w-4" />}
                  tone="danger"
                  onClick={() => {
                    deleteCommentMutation.mutate({
                      commentId: commentVO.commentId!,
                      targetId: commentContext.targetInfo.targetId,
                      targetType: commentContext.targetInfo.targetType,
                    });
                  }}
                />
              )}
            </div>

            {isInput && (
              <div className="mt-3">
                <CommentInputBox
                  parentCommentId={commentVO.commentId}
                  rootCommentId={rootCommentId ?? 0}
                  onSubmitFinish={() => setIsInput(false)}
                  onCancel={() => setIsInput(false)}
                />
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className={level > 1 ? "mt-2 relative" : "relative"}>
      <div className="flex items-start gap-2.5">
        {/* Left column for Avatar + Thread Line */}
        <div className="flex flex-col items-center self-stretch shrink-0">
          <div className="h-8 w-8 flex items-center justify-center">
            <UserAvatarComponent
              userId={commentVO.userId || -1}
              username={commentVO.userInfo?.username}
              avatar={commentVO.userInfo?.avatar}
              avatarThumbUrl={commentVO.userInfo?.avatarThumbUrl}
              width={8}
              isRounded={true}
              withName={false}
            />
          </div>

          {/* Flex-1 makes the line stretch to match the parent height */}
          {!isFolded && (hasLoadedChildren || (commentVO.hasMore && remainingChildren > 0)) && level < MAX_LEVEL && (
            <div
              className="group/threadline mt-1 flex flex-1 w-5 cursor-pointer justify-center pb-1 z-10"
              onClick={() => setIsFolded(true)}
              title="收起回复"
            >
              <div className="h-full w-[2px] bg-base-content/15 hover:bg-base-content/30 transition-all duration-200 group-hover/threadline:w-[3px] group-hover/threadline:bg-primary" />
            </div>
          )}
        </div>

        {/* Right column for Content + Children */}
        <div className="min-w-0 flex-1 pb-1">
          {/* Main Comment */}
          <article className="group/comment relative transition-all duration-200 rounded-xl px-2 py-1.5 -ml-2 hover:bg-base-200/40">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className={`min-w-0 flex-1 flex flex-wrap items-center gap-2 ${isFolded ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (isFolded)
                    setIsFolded(false);
                }}
              >
                <CommentPreview commentVO={commentVO} />
                {isFolded && (
                  <span className="flex items-center gap-1 rounded-full bg-base-200 px-2 py-0.5 text-[11px] font-medium text-base-content/55 transition-colors hover:bg-base-300 hover:text-base-content/80">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    {totalChildren > 0 ? `${totalChildren} 条回复的内容已折叠` : "已折叠"}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end">
                <button
                  className={`btn btn-ghost btn-xs h-7 min-h-7 w-7 rounded-full p-0 text-base-content/40 hover:bg-primary/10 hover:text-primary ${isFolded ? "bg-base-200/50" : "opacity-0 group-hover/comment:opacity-100 focus:opacity-100"}`}
                  type="button"
                  onClick={() => setIsFolded(!isFolded)}
                  title={isFolded ? "展开" : "收起"}
                >
                  <svg className={`h-4 w-4 transition-transform ${isFolded ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            {!isFolded && (
              <>
                <div className="mt-1 pl-1">
                  <MediaContentView
                    content={commentVO.content}
                    emptyText="原评论内容为空"
                    className="[&_p]:my-0 [&_p+_p]:mt-3 [&_img]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_pre]:my-2 [&_blockquote]:my-2 text-[14px] leading-[1.6] text-base-content/90"
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1 ml-0.5">
                  <CommentActionButton
                    label={isInput ? "取消回复" : "回复"}
                    icon={<ReplyIcon className="h-4 w-4" />}
                    tone={isInput ? "primary" : "default"}
                    active={isInput}
                    onClick={() => setIsInput(value => !value)}
                  />
                  <LikeIconButton
                    targetInfo={{ targetId: commentVO.commentId ?? -1, targetType: "2" }}
                    className="btn btn-ghost btn-xs h-8 min-h-8 rounded-full px-2.5 text-base-content/65 hover:bg-primary/10 hover:text-primary"
                    icon={<ThumbUpIcon className="h-4 w-4" />}
                    direction="row"
                  />
                  {Number(commentVO.userId) === userId && (
                    <CommentActionButton
                      label="删除"
                      icon={<CloseIcon className="h-4 w-4" />}
                      tone="danger"
                      onClick={() => {
                        deleteCommentMutation.mutate({
                          commentId: commentVO.commentId!,
                          targetId: commentContext.targetInfo.targetId,
                          targetType: commentContext.targetInfo.targetType,
                        });
                      }}
                    />
                  )}
                </div>

                {isInput && (
                  <div className="mt-3 pr-2">
                    <CommentInputBox
                      parentCommentId={commentVO.commentId}
                      rootCommentId={rootCommentId ?? 0}
                      onSubmitFinish={() => setIsInput(false)}
                      onCancel={() => setIsInput(false)}
                    />
                  </div>
                )}
              </>
            )}
          </article>

          {/* Children block */}
          {level < MAX_LEVEL
            ? (
                !isFolded && (
                  <div className="mt-1">
                    {hasLoadedChildren && (
                      <div className="space-y-1">
                        {childrenComments}
                      </div>
                    )}

                    {canLoadMoreChildren && (
                      <div className="mt-3 ml-1.5">
                        <button
                          className="text-[13px] font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                          disabled={isLoadingMoreChildren}
                          onClick={() => {
                            void childCommentQuery.fetchNextPage();
                          }}
                          type="button"
                        >
                          {isLoadingMoreChildren
                            ? "正在加载回复..."
                            : childLoadFailed
                              ? `重试加载剩余 ${remainingChildren} 条回复...`
                              : `加载更多 ${remainingChildren} 条回复...`}
                        </button>
                      </div>
                    )}
                  </div>
                )
              )
            : (!isFolded && hasLoadedChildren)
                ? (
                    <div className="mt-3 ml-1.5">
                      <button
                        className="btn btn-ghost btn-sm h-8 min-h-8 rounded-full border border-base-300 bg-base-200/35 px-4 text-xs text-base-content/65 hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
                        onClick={() => setIsOpen(true)}
                        type="button"
                      >
                        查看更深的回复
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </button>
                      <ToastWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>{childrenComments}</ToastWindow>
                    </div>
                  )
                : null}
        </div>
      </div>
    </div>
  );
}
