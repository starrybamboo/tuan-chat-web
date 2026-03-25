import type { CommentTimelineVO, MarkTarget } from "api";

import { use, useMemo, useState } from "react";
import { CommentContext } from "@/components/common/comment/commentContext";
import CommentInputBox from "@/components/common/comment/commentInputBox";
import CommentPreview from "@/components/common/comment/commentPreview";
import { buildMediaContentPreview } from "@/components/common/content/mediaContent";
import MediaContentView from "@/components/common/content/mediaContentView";
import LikeIconButton from "@/components/common/likeIconButton";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { CloseIcon } from "@/icons";
import { useDeleteCommentMutation, useGetCommentTimelineInfiniteQuery } from "../../../api/hooks/commentQueryHooks";

interface FeedbackIssueTimelineProps {
  commentCount: number;
  targetInfo: MarkTarget;
  loginUserId: number;
}

interface ReplyTarget {
  commentId: number;
  rootCommentId: number;
  parentUserInfo?: CommentTimelineVO["userInfo"];
  parentContentPreview: string;
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

function FeedbackTimelineActionButton({
  label,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  const toneClass = tone === "danger"
    ? "text-base-content/60 hover:bg-error/10 hover:text-error"
    : "text-base-content/60 hover:bg-primary/10 hover:text-primary";

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-xs h-8 min-h-8 rounded-full px-3 transition-colors ${toneClass}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function summarizeCommentContent(content?: string) {
  return buildMediaContentPreview(content, 36, "原评论内容为空");
}

function getRootCommentId(comment: CommentTimelineVO) {
  if ((comment.rootCommentId ?? 0) === 0) {
    return comment.commentId ?? 0;
  }
  return comment.rootCommentId ?? 0;
}

function TimelineItem({
  avatarUser,
  isLast,
  children,
}: {
  avatarUser: {
    userId?: number;
    username?: string;
    avatar?: string;
    avatarThumbUrl?: string;
  };
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
      <div className="relative flex justify-center">
        <div className="relative z-10 rounded-full bg-base-100 ring-4 ring-base-100">
          <UserAvatarByUser
            user={avatarUser}
            width={10}
            isRounded={true}
            withName={false}
            stopToastWindow={true}
            clickEnterProfilePage={false}
          />
        </div>
        {!isLast && (
          <div className="absolute top-11 bottom-[-1.5rem] w-px bg-base-300" />
        )}
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}

function TimelineReplyReference({
  parentUserInfo,
  parentContentPreview,
}: {
  parentUserInfo?: CommentTimelineVO["parentUserInfo"];
  parentContentPreview?: string;
}) {
  const parentAuthorName = parentUserInfo?.username || "上一条评论";

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-base-200/70 px-3 py-1 text-xs text-base-content/60">
      <ReplyIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0 font-medium text-base-content/75">
        回复
        {" "}
        {parentAuthorName}
      </span>
      <span className="truncate text-base-content/55">
        {parentContentPreview || "原评论内容为空"}
      </span>
    </div>
  );
}

function TimelineCommentCard({
  comment,
  currentUserId,
  onReply,
}: {
  comment: CommentTimelineVO;
  currentUserId: number;
  onReply: (target: ReplyTarget) => void;
}) {
  const deleteCommentMutation = useDeleteCommentMutation();
  const commentContext = use(CommentContext);

  return (
    <article className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 bg-base-200/20 px-5 py-3">
        <CommentPreview commentVO={comment} />
      </div>
      <div className="space-y-4 px-5 py-4">
        {(comment.parentCommentId ?? 0) > 0
          ? <TimelineReplyReference parentUserInfo={comment.parentUserInfo} parentContentPreview={comment.parentContentPreview} />
          : null}

        <MediaContentView
          content={comment.content}
          emptyText="原评论内容为空"
          className="[&_p]:my-0 [&_p+_p]:mt-3 [&_img]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_pre]:my-2 [&_blockquote]:my-2 text-sm leading-7 text-base-content/90"
        />

        <div className="flex flex-wrap items-center gap-1">
          <FeedbackTimelineActionButton
            label="回复"
            icon={<ReplyIcon className="h-4 w-4" />}
            onClick={() => {
              onReply({
                commentId: comment.commentId ?? 0,
                rootCommentId: getRootCommentId(comment),
                parentUserInfo: comment.userInfo,
                parentContentPreview: summarizeCommentContent(comment.content),
              });
            }}
          />
          <LikeIconButton
            targetInfo={{ targetId: comment.commentId ?? -1, targetType: "2" }}
            className="btn btn-ghost btn-xs h-8 min-h-8 rounded-full px-2.5 text-base-content/65 hover:bg-primary/10 hover:text-primary"
            icon={<ThumbUpIcon className="h-4 w-4" />}
            direction="row"
          />
          {Number(comment.userId) === currentUserId && (
            <FeedbackTimelineActionButton
              label="删除"
              icon={<CloseIcon className="h-4 w-4" />}
              tone="danger"
              onClick={() => {
                deleteCommentMutation.mutate({
                  commentId: comment.commentId ?? -1,
                  targetId: commentContext.targetInfo.targetId,
                  targetType: commentContext.targetInfo.targetType,
                });
              }}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function TimelineComposerCard({
  loginUserId,
  replyTarget,
  onCancelReply,
  onSubmitFinish,
}: {
  loginUserId: number;
  replyTarget: ReplyTarget | null;
  onCancelReply: () => void;
  onSubmitFinish: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 bg-base-200/20 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium text-base-content">
            {replyTarget ? "回复评论" : "添加评论"}
          </div>
          {replyTarget && (
            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-full px-3 text-base-content/55 hover:bg-base-200 hover:text-base-content"
              onClick={onCancelReply}
            >
              取消回复
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        {replyTarget
          ? <TimelineReplyReference parentUserInfo={replyTarget.parentUserInfo} parentContentPreview={replyTarget.parentContentPreview} />
          : null}

        <CommentInputBox
          rootCommentId={replyTarget?.rootCommentId ?? 0}
          parentCommentId={replyTarget?.commentId ?? 0}
          onSubmitFinish={onSubmitFinish}
          onCancel={replyTarget ? onCancelReply : undefined}
        />

        {loginUserId <= 0 && (
          <div className="text-xs text-base-content/50">
            登录后可参与评论。
          </div>
        )}
      </div>
    </article>
  );
}

export default function FeedbackIssueTimeline({
  commentCount,
  targetInfo,
  loginUserId,
}: FeedbackIssueTimelineProps) {
  const commentContextValue = useMemo(() => ({ targetInfo }), [targetInfo]);
  const getCommentTimelineInfiniteQuery = useGetCommentTimelineInfiniteQuery(targetInfo);
  const timelineComments = useMemo(() => {
    return getCommentTimelineInfiniteQuery.data?.pages.flatMap(page => page.data ?? []) ?? [];
  }, [getCommentTimelineInfiniteQuery.data?.pages]);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const hasNextPage = Boolean(getCommentTimelineInfiniteQuery.hasNextPage);
  const isFetchingNextPage = getCommentTimelineInfiniteQuery.isFetchingNextPage;
  const isInitialLoading = getCommentTimelineInfiniteQuery.isLoading && timelineComments.length === 0;

  return (
    <CommentContext value={commentContextValue}>
      <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-base font-medium text-base-content">
              讨论
              {" "}
              <span className="text-base-content/50">
                (
                {commentCount}
                )
              </span>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-base-content/40">
              Timeline
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {isInitialLoading
            ? (
                <div className="rounded-xl border border-base-300 bg-base-100/80 px-4 py-6">
                  <div className="flex items-center justify-center gap-3 text-sm text-base-content/60">
                    <span className="loading loading-spinner loading-sm" />
                    正在加载评论...
                  </div>
                </div>
              )
            : timelineComments.length > 0
              ? timelineComments.map(comment => (
                  <TimelineItem
                    key={comment.commentId ?? `comment-${comment.createTime ?? "unknown"}`}
                    avatarUser={{ userId: comment.userId, ...comment.userInfo }}
                    isLast={false}
                  >
                    <TimelineCommentCard
                      comment={comment}
                      currentUserId={loginUserId}
                      onReply={(target) => {
                        setReplyTarget(target);
                      }}
                    />
                  </TimelineItem>
                ))
              : (
                  <div className="rounded-xl border border-dashed border-base-300 bg-base-200/20 px-4 py-6 text-center text-sm text-base-content/55">
                    还没有讨论，来发第一条评论吧。
                  </div>
                )}

          {hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn btn-outline btn-sm rounded-full px-5"
                disabled={isFetchingNextPage}
                onClick={() => void getCommentTimelineInfiniteQuery.fetchNextPage()}
              >
                {isFetchingNextPage ? "正在加载评论..." : "加载更多评论"}
              </button>
            </div>
          )}

          <TimelineItem avatarUser={{ userId: loginUserId > 0 ? loginUserId : -1 }} isLast={true}>
            <TimelineComposerCard
              loginUserId={loginUserId}
              replyTarget={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              onSubmitFinish={() => setReplyTarget(null)}
            />
          </TimelineItem>
        </div>
      </section>
    </CommentContext>
  );
}
