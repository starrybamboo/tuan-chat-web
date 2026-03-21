import type { CommentVO } from "api";
import type { MarkTarget } from "../../../../api";
import type { CommentContextType } from "@/components/common/comment/commentContext";
import { useMemo } from "react";
import CommentComponent from "@/components/common/comment/commentComponent";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import UserAvatarComponent from "@/components/common/userAvatar";
import {
  DEFAULT_COMMENT_CHILD_LIMIT,
  DEFAULT_COMMENT_MAX_LEVEL,
  normalizeCommentTreeQueryOptions,
  useGetCommentPageInfiniteQuery,
} from "../../../../api/hooks/commentQueryHooks";

type CommentPanelDisplayMode = "threaded" | "flat";

interface CommentPanelProps {
  targetInfo: MarkTarget;
  className?: string;
  composerStyle?: "card" | "split";
  loginUserId: number;
  displayMode?: CommentPanelDisplayMode;
  childLimit?: number;
  maxLevel?: number;
}

interface FlatCommentEntry {
  comment: CommentVO;
  parentComment: CommentVO | null;
}

function flattenComments(
  comments: CommentVO[],
  parentComment: CommentVO | null = null,
): FlatCommentEntry[] {
  const entries: FlatCommentEntry[] = [];
  for (const comment of comments) {
    entries.push({ comment, parentComment });
    if (Array.isArray(comment.children) && comment.children.length > 0) {
      entries.push(...flattenComments(comment.children, comment));
    }
  }
  return entries;
}

/**
 * 评论区组件
 * @param targetInfo 用于指明是哪个 feed，post 或者 repository 的评论区
 * @param className
 * @param loginUserId
 * @constructor
 */
export default function CommentPanel({
  targetInfo,
  className,
  composerStyle = "card",
  loginUserId,
  displayMode = "threaded",
  childLimit = DEFAULT_COMMENT_CHILD_LIMIT,
  maxLevel = DEFAULT_COMMENT_MAX_LEVEL,
}: CommentPanelProps) {
  const normalizedTreeOptions = useMemo(
    () => normalizeCommentTreeQueryOptions(childLimit, maxLevel),
    [childLimit, maxLevel],
  );
  const getCommentPageInfiniteQuery = useGetCommentPageInfiniteQuery(
    targetInfo,
    10,
    normalizedTreeOptions.childLimit,
    normalizedTreeOptions.maxLevel,
  );
  const comments = useMemo(() => {
    return (getCommentPageInfiniteQuery.data?.pages.flatMap(p => p.data ?? []) ?? []);
  }, [getCommentPageInfiniteQuery.data?.pages]);
  const hasNextPage = Boolean(getCommentPageInfiniteQuery.hasNextPage);
  const isFetchingNextPage = getCommentPageInfiniteQuery.isFetchingNextPage;
  const isInitialLoading = getCommentPageInfiniteQuery.isLoading && comments.length === 0;

  const renderedComments = useMemo(() => {
    if (displayMode === "flat") {
      return flattenComments(comments).map(({ comment, parentComment }) => (
        <CommentComponent
          comment={comment}
          key={comment.commentId}
          displayMode="flat"
          parentComment={parentComment}
        />
      ));
    }

    return comments.map(comment => <CommentComponent comment={comment} key={comment.commentId} />);
  }, [comments, displayMode]);

  const commentContext: CommentContextType = useMemo(() => {
    return {
      targetInfo,
      treeOptions: normalizedTreeOptions,
    };
  }, [normalizedTreeOptions, targetInfo]);
  return (
    <CommentContext value={commentContext}>
      <div className={`space-y-4 ${className ?? ""}`}>
        <div className="space-y-3">
          {isInitialLoading
            ? (
                <div className="rounded-xl border border-base-300 bg-base-100/80 px-4 py-6">
                  <div className="flex items-center justify-center gap-3 text-sm text-base-content/60">
                    <span className="loading loading-spinner loading-sm" />
                    正在加载评论...
                  </div>
                </div>
              )
            : renderedComments.length > 0
              ? renderedComments
              : (
                  <div className="rounded-xl border border-dashed border-base-300 bg-base-200/20 px-4 py-6 text-center text-sm text-base-content/55">
                    还没有讨论，来发第一条评论吧。
                  </div>
                )}
        </div>

        {/* 评论输入框区域 */}
        {composerStyle === "split"
          ? (
              <div className="border-t border-base-300/80 pt-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-base-content/45">
                  参与讨论
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    <UserAvatarComponent
                      userId={loginUserId}
                      width={10}
                      isRounded={true}
                      withName={false}
                      stopToastWindow={true}
                      clickEnterProfilePage={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CommentInputBox />
                  </div>
                </div>
              </div>
            )
          : (
              <div className="rounded-xl border border-base-300 bg-base-100/95 p-3 shadow-sm">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-base-content/45">
                  参与讨论
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <UserAvatarComponent
                      userId={loginUserId}
                      width={10}
                      isRounded={true}
                      withName={false}
                      stopToastWindow={true}
                      clickEnterProfilePage={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CommentInputBox />
                  </div>
                </div>
              </div>
            )}
        {hasNextPage
          ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  className="btn btn-outline btn-sm rounded-full px-5"
                  disabled={isFetchingNextPage}
                  onClick={() => void getCommentPageInfiniteQuery.fetchNextPage()}
                >
                  {isFetchingNextPage ? "正在加载评论..." : "加载更多评论"}
                </button>
              </div>
            )
          : null}
      </div>
    </CommentContext>
  );
}
