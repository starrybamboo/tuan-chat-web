import type { ApiResultListCommentVO } from "@tuanchat/openapi-client/models/ApiResultListCommentVO";
import type { ApiResultListCommentTimelineVO } from "@tuanchat/openapi-client/models/ApiResultListCommentTimelineVO";
import type { QueryClient } from "@tanstack/react-query";
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {CommentPageRequest} from "@tuanchat/openapi-client/models/CommentPageRequest";
import type {CommentChildPageRequest} from "@tuanchat/openapi-client/models/CommentChildPageRequest";
import type {CommentAddRequest} from "@tuanchat/openapi-client/models/CommentAddRequest";
import type {CommentTimelinePageRequest} from "@tuanchat/openapi-client/models/CommentTimelinePageRequest";
import { FEEDBACK_ISSUE_TARGET_TYPE } from "@/components/feedback/feedbackTypes";
import { FEEDBACK_ISSUES_QUERY_KEY, feedbackIssueDetailQueryKey } from "../feedbackQueryCache";
import {
    beginOptimisticQueryTransaction,
    optimisticQueryPatch,
    rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

const COMMENT_PAGE_QUERY_KEY = ["pageComments"] as const;
const COMMENT_CHILD_PAGE_QUERY_KEY = ["pageChildComments"] as const;
const COMMENT_TIMELINE_QUERY_KEY = ["pageTimelineComments"] as const;
const MAX_COMMENT_CHILD_LIMIT = 20;
const MAX_COMMENT_MAX_LEVEL = 5;
export const DEFAULT_COMMENT_CHILD_LIMIT = MAX_COMMENT_CHILD_LIMIT;
export const DEFAULT_COMMENT_MAX_LEVEL = 2;

export type CommentTargetInfo = Pick<CommentPageRequest, "targetId" | "targetType">;
export type DeleteCommentPayload = CommentTargetInfo & {
    commentId: number;
};

function normalizeCommentTargetInfo(targetInfo: CommentTargetInfo): CommentTargetInfo {
    return {
        targetId: targetInfo.targetId,
        targetType: targetInfo.targetType,
    };
}

export function buildCommentPageQueryKey(targetInfo: CommentTargetInfo) {
    return [...COMMENT_PAGE_QUERY_KEY, normalizeCommentTargetInfo(targetInfo)] as const;
}

function buildCommentChildPageQueryKey(
    targetInfo: CommentTargetInfo,
    parentCommentId: number,
    pageSize: number,
    childLimit: number,
    maxLevel: number,
) {
    return [
        ...COMMENT_CHILD_PAGE_QUERY_KEY,
        normalizeCommentTargetInfo(targetInfo),
        parentCommentId,
        pageSize,
        childLimit,
        maxLevel,
    ] as const;
}

export function buildCommentTimelineQueryKey(targetInfo: CommentTargetInfo) {
    return [...COMMENT_TIMELINE_QUERY_KEY, normalizeCommentTargetInfo(targetInfo)] as const;
}

export function normalizeCommentTreeQueryOptions(childLimit: number, maxLevel: number) {
    const normalizedChildLimit = Number.isFinite(childLimit)
        ? Math.min(Math.max(Math.trunc(childLimit), 0), MAX_COMMENT_CHILD_LIMIT)
        : DEFAULT_COMMENT_CHILD_LIMIT;
    const normalizedMaxLevel = Number.isFinite(maxLevel)
        ? Math.min(Math.max(Math.trunc(maxLevel), 1), MAX_COMMENT_MAX_LEVEL)
        : DEFAULT_COMMENT_MAX_LEVEL;
    return {
        childLimit: normalizedChildLimit,
        maxLevel: normalizedMaxLevel,
    };
}

export function getNextCommentPageParam(
    lastPage: ApiResultListCommentVO,
    allPages: ApiResultListCommentVO[],
    targetInfo: CommentTargetInfo,
    pageSize: number,
    childLimit: number,
    maxLevel: number,
) {
    const normalizedOptions = normalizeCommentTreeQueryOptions(childLimit, maxLevel);
    const lastPageComments = lastPage.data ?? [];
    if (lastPageComments.length < pageSize) {
        return undefined;
    }
    return {
        ...normalizeCommentTargetInfo(targetInfo),
        pageSize,
        childLimit: normalizedOptions.childLimit,
        maxLevel: normalizedOptions.maxLevel,
        pageNo: allPages.length + 1,
    } as CommentPageRequest;
}

export function getNextCommentTimelinePageParam(
    lastPage: ApiResultListCommentTimelineVO,
    allPages: ApiResultListCommentTimelineVO[],
    targetInfo: CommentTargetInfo,
    pageSize: number,
) {
    const lastPageComments = lastPage.data ?? [];
    if (lastPageComments.length < pageSize) {
        return undefined;
    }
    return {
        ...normalizeCommentTargetInfo(targetInfo),
        pageSize,
        pageNo: allPages.length + 1,
    } as CommentTimelinePageRequest;
}

export function getNextCommentChildPageParam(
    lastPage: ApiResultListCommentVO,
    allPages: ApiResultListCommentVO[],
    targetInfo: CommentTargetInfo,
    parentCommentId: number,
    pageSize: number,
    childLimit: number,
    maxLevel: number,
    initialPageNo: number,
) {
    const normalizedOptions = normalizeCommentTreeQueryOptions(childLimit, maxLevel);
    const lastPageComments = lastPage.data ?? [];
    if (lastPageComments.length < pageSize) {
        return undefined;
    }
    return {
        ...normalizeCommentTargetInfo(targetInfo),
        parentCommentId,
        pageSize,
        childLimit: normalizedOptions.childLimit,
        maxLevel: normalizedOptions.maxLevel,
        pageNo: initialPageNo + allPages.length,
    } as CommentChildPageRequest;
}

function isFeedbackCommentTarget(targetInfo: CommentTargetInfo) {
    return targetInfo.targetType === FEEDBACK_ISSUE_TARGET_TYPE;
}

export async function invalidateCommentTargetQueries(queryClient: QueryClient, targetInfo: CommentTargetInfo) {
    const normalizedTargetInfo = normalizeCommentTargetInfo(targetInfo);
    queryClient.removeQueries({ queryKey: [...COMMENT_CHILD_PAGE_QUERY_KEY, normalizedTargetInfo] });
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: buildCommentPageQueryKey(normalizedTargetInfo) }),
        queryClient.invalidateQueries({ queryKey: buildCommentTimelineQueryKey(normalizedTargetInfo) }),
    ]);

    if (!isFeedbackCommentTarget(normalizedTargetInfo)) {
        return;
    }

    await Promise.all([
        queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: feedbackIssueDetailQueryKey(normalizedTargetInfo.targetId) }),
    ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function removeCommentFromCacheValue(current: unknown, commentId: number): unknown {
    if (Array.isArray(current)) {
        let changed = false;
        const next = current.flatMap((item) => {
            if (isRecord(item) && item.commentId === commentId) {
                changed = true;
                return [];
            }
            const patched = removeCommentFromCacheValue(item, commentId);
            changed ||= patched !== item;
            return [patched];
        });
        return changed ? next : current;
    }
    if (!isRecord(current)) {
        return current;
    }
    if (current.commentId === commentId) {
        return null;
    }

    let next = current;
    for (const key of ["data", "list", "pages", "children"] as const) {
        if (!Object.prototype.hasOwnProperty.call(current, key)) {
            continue;
        }
        const before = current[key];
        const patched = removeCommentFromCacheValue(before, commentId);
        if (patched !== before) {
            next = { ...next, [key]: patched };
            if (key === "children" && Array.isArray(before) && Array.isArray(patched)) {
                next = {
                    ...next,
                    totalChildren: Math.max(0, Number(current.totalChildren ?? before.length) - (before.length - patched.length)),
                };
            }
        }
    }
    return next;
}

export function beginDeleteCommentOptimisticMutation(queryClient: QueryClient, payload: DeleteCommentPayload) {
    const target = normalizeCommentTargetInfo(payload);
    return beginOptimisticQueryTransaction(queryClient, [
        optimisticQueryPatch<unknown>({
            queryKey: buildCommentPageQueryKey(target),
            exact: false,
            update: current => removeCommentFromCacheValue(current, payload.commentId),
        }),
        optimisticQueryPatch<unknown>({
            queryKey: [...COMMENT_CHILD_PAGE_QUERY_KEY, target],
            exact: false,
            update: current => removeCommentFromCacheValue(current, payload.commentId),
        }),
        optimisticQueryPatch<unknown>({
            queryKey: buildCommentTimelineQueryKey(target),
            exact: false,
            update: current => removeCommentFromCacheValue(current, payload.commentId),
        }),
        optimisticQueryPatch<unknown>({
            queryKey: ["getComment", payload.commentId],
            update: current => removeCommentFromCacheValue(current, payload.commentId),
        }),
    ]);
}

/**
 * 根据id获取评论
 */
export function useGetCommentByIdQuery(commentId: number){
    return useQuery({
        queryKey: ["getComment", commentId],
        queryFn: async () => {
            const res = await tuanchat.commentController.getComment(commentId);
            return res.data;
        },
        staleTime: 300 * 1000,
        enabled: commentId > 0
    })
}

/**
 * comment分页查询
 */
export function useGetCommentPageInfiniteQuery(
    targetInfo: CommentTargetInfo,
    pageSize: number = 10,
    childLimit: number = DEFAULT_COMMENT_CHILD_LIMIT,
    maxLevel: number = DEFAULT_COMMENT_MAX_LEVEL,
) {
    const normalizedOptions = normalizeCommentTreeQueryOptions(childLimit, maxLevel);
    return useInfiniteQuery({
        queryKey: buildCommentPageQueryKey(targetInfo),
        queryFn: async ({ pageParam }) => {
            return tuanchat.commentController.pageComments(pageParam);
        },
        getNextPageParam: (lastPage,allPages) => {
            return getNextCommentPageParam(
                lastPage,
                allPages,
                targetInfo,
                pageSize,
                normalizedOptions.childLimit,
                normalizedOptions.maxLevel,
            );
        },
        initialPageParam: {
            ...targetInfo,
            pageSize,
            childLimit: normalizedOptions.childLimit,
            maxLevel: normalizedOptions.maxLevel,
            pageNo: 1,
        } as CommentPageRequest,
        refetchOnWindowFocus: false,
    });
}

export function useGetCommentChildPageInfiniteQuery(
    targetInfo: CommentTargetInfo,
    parentCommentId: number,
    pageSize: number,
    childLimit: number,
    maxLevel: number,
    initialPageNo: number,
) {
    const normalizedOptions = normalizeCommentTreeQueryOptions(childLimit, maxLevel);
    return useInfiniteQuery({
        queryKey: buildCommentChildPageQueryKey(
            targetInfo,
            parentCommentId,
            pageSize,
            normalizedOptions.childLimit,
            normalizedOptions.maxLevel,
        ),
        queryFn: async ({ pageParam }) => {
            return tuanchat.commentController.pageChildComments(pageParam);
        },
        getNextPageParam: (lastPage, allPages) => {
            return getNextCommentChildPageParam(
                lastPage,
                allPages,
                targetInfo,
                parentCommentId,
                pageSize,
                normalizedOptions.childLimit,
                normalizedOptions.maxLevel,
                initialPageNo,
            );
        },
        initialPageParam: {
            ...targetInfo,
            parentCommentId,
            pageSize,
            childLimit: normalizedOptions.childLimit,
            maxLevel: normalizedOptions.maxLevel,
            pageNo: initialPageNo,
        } as CommentChildPageRequest,
        enabled: false,
        refetchOnWindowFocus: false,
    });
}

export function useGetCommentTimelineInfiniteQuery(targetInfo: CommentTargetInfo, pageSize: number = 20) {
    return useInfiniteQuery({
        queryKey: buildCommentTimelineQueryKey(targetInfo),
        queryFn: async ({ pageParam }) => {
            return tuanchat.commentController.pageTimelineComments(pageParam);
        },
        getNextPageParam: (lastPage,allPages) => {
            return getNextCommentTimelinePageParam(lastPage, allPages, targetInfo, pageSize);
        },
        initialPageParam: { ...targetInfo, pageSize, pageNo:1 } as CommentTimelinePageRequest,
        refetchOnWindowFocus: false,
    });
}

/**
 * 发表comment
 */
export function useAddCommentMutation(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["addComment"],
        mutationFn: (req: CommentAddRequest)=> tuanchat.commentController.addComment(req),
        onSuccess:(_,variables)=>{
            void invalidateCommentTargetQueries(queryClient, variables);
        }
    })
}
/**
 * 删除comment
 */
export function useDeleteCommentMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["deleteComment"],
        mutationFn: async ({ commentId }: DeleteCommentPayload) =>{
            await tuanchat.commentController.deleteComment(commentId);
    },
        onMutate: variables => beginDeleteCommentOptimisticMutation(queryClient, variables),
        onError: (_error, _variables, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
        onSettled:(_, _error, variables) => invalidateCommentTargetQueries(queryClient, variables),
})}
