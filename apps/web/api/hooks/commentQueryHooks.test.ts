import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  beginDeleteCommentOptimisticMutation,
  buildCommentPageQueryKey,
  buildCommentTimelineQueryKey,
  DEFAULT_COMMENT_MAX_LEVEL,
  getNextCommentChildPageParam,
  getNextCommentPageParam,
  getNextCommentTimelinePageParam,
  invalidateCommentTargetQueries,
  normalizeCommentTreeQueryOptions,
} from "./commentQueryHooks";
import { FEEDBACK_ISSUE_TARGET_TYPE } from "../../app/components/feedback/feedbackTypes";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

describe("commentQueryHooks", () => {
  it("删除评论即时移出树状、子评论和时间线缓存并支持回滚", async () => {
    const queryClient = new QueryClient();
    const target = { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE };
    const rootKey = buildCommentPageQueryKey(target);
    const timelineKey = buildCommentTimelineQueryKey(target);
    const childKey = ["pageChildComments", target, 1, 20, 20, 2] as const;
    const rootComment = {
      commentId: 1,
      children: [{ commentId: 2 }, { commentId: 3 }],
      totalChildren: 2,
    };
    queryClient.setQueryData(rootKey, { pages: [{ success: true, data: [rootComment] }], pageParams: [] });
    queryClient.setQueryData(childKey, { pages: [{ success: true, data: [{ commentId: 2 }] }], pageParams: [] });
    queryClient.setQueryData(timelineKey, { pages: [{ success: true, data: [{ commentId: 2 }] }], pageParams: [] });

    const transaction = await beginDeleteCommentOptimisticMutation(queryClient, { ...target, commentId: 2 });
    expect(queryClient.getQueryData<any>(rootKey)?.pages[0].data[0]).toMatchObject({
      children: [{ commentId: 3 }],
      totalChildren: 1,
    });
    expect(queryClient.getQueryData<any>(childKey)?.pages[0].data).toEqual([]);
    expect(queryClient.getQueryData<any>(timelineKey)?.pages[0].data).toEqual([]);

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData<any>(rootKey)?.pages[0].data[0]).toEqual(rootComment);
  });

  it("树状评论分页参数会钳制到后端允许范围", () => {
    expect(normalizeCommentTreeQueryOptions(9999, 99)).toEqual({
      childLimit: 20,
      maxLevel: 5,
    });
    expect(normalizeCommentTreeQueryOptions(-3, 0)).toEqual({
      childLimit: 0,
      maxLevel: 1,
    });
  });

  it("树状评论分页参数在无效输入时回退到两级默认查询", () => {
    expect(normalizeCommentTreeQueryOptions(Number.NaN, Number.NaN)).toEqual({
      childLimit: 20,
      maxLevel: DEFAULT_COMMENT_MAX_LEVEL,
    });
  });

  it("最后一页不足 pageSize 时不会继续请求下一页", () => {
    const nextPageParam = getNextCommentPageParam(
      {
        success: true,
        data: [{ commentId: 1 }, { commentId: 2 }, { commentId: 3 }],
      },
      [{ success: true, data: [{ commentId: 1 }] }],
      { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE },
      10,
      9999,
      99,
    );

    expect(nextPageParam).toBeUndefined();
  });

  it("页大小打满时会生成下一页请求参数", () => {
    const nextPageParam = getNextCommentPageParam(
      {
        success: true,
        data: Array.from({ length: 10 }, (_, index) => ({ commentId: index + 1 })),
      },
      [
        { success: true, data: [{ commentId: 1 }] },
        { success: true, data: [{ commentId: 2 }] },
      ],
      { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE },
      10,
      9999,
      99,
    );

    expect(nextPageParam).toEqual({
      targetId: 11,
      targetType: FEEDBACK_ISSUE_TARGET_TYPE,
      pageSize: 10,
      childLimit: 20,
      maxLevel: 5,
      pageNo: 3,
    });
  });

  it("子评论页大小打满时会生成下一页请求参数", () => {
    const nextPageParam = getNextCommentChildPageParam(
      {
        success: true,
        data: Array.from({ length: 5 }, (_, index) => ({ commentId: index + 1 })),
      },
      [{ success: true, data: [{ commentId: 21 }] }],
      { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE },
      66,
      5,
      9999,
      99,
      2,
    );

    expect(nextPageParam).toEqual({
      targetId: 11,
      targetType: FEEDBACK_ISSUE_TARGET_TYPE,
      parentCommentId: 66,
      pageSize: 5,
      childLimit: 20,
      maxLevel: 5,
      pageNo: 3,
    });
  });

  it("时间线评论最后一页不足 pageSize 时不会继续请求下一页", () => {
    const nextPageParam = getNextCommentTimelinePageParam(
      {
        success: true,
        data: [{ commentId: 1 }, { commentId: 2 }, { commentId: 3 }],
      },
      [{ success: true, data: [{ commentId: 1 }] }],
      { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE },
      10,
    );

    expect(nextPageParam).toBeUndefined();
  });

  it("时间线评论页大小打满时会生成下一页请求参数", () => {
    const nextPageParam = getNextCommentTimelinePageParam(
      {
        success: true,
        data: Array.from({ length: 10 }, (_, index) => ({ commentId: index + 1 })),
      },
      [
        { success: true, data: [{ commentId: 1 }] },
        { success: true, data: [{ commentId: 2 }] },
      ],
      { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE },
      10,
    );

    expect(nextPageParam).toEqual({
      targetId: 11,
      targetType: FEEDBACK_ISSUE_TARGET_TYPE,
      pageSize: 10,
      pageNo: 3,
    });
  });

  it("反馈评论刷新时会同时联动评论列表与反馈详情缓存", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const childQueryPrefix = ["pageChildComments", { targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE }];

    await invalidateCommentTargetQueries(queryClient, {
      targetId: 11,
      targetType: FEEDBACK_ISSUE_TARGET_TYPE,
    });

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: childQueryPrefix,
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(4);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildCommentPageQueryKey({ targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildCommentTimelineQueryKey({ targetId: 11, targetType: FEEDBACK_ISSUE_TARGET_TYPE }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["feedbackIssues"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["feedbackIssueDetail", 11],
    });
  });

  it("非反馈评论刷新时不会误触发反馈缓存刷新", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const childQueryPrefix = ["pageChildComments", { targetId: 22, targetType: "1" }];

    await invalidateCommentTargetQueries(queryClient, {
      targetId: 22,
      targetType: "1",
    });

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: childQueryPrefix,
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildCommentPageQueryKey({ targetId: 22, targetType: "1" }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildCommentTimelineQueryKey({ targetId: 22, targetType: "1" }),
    });
  });
});
