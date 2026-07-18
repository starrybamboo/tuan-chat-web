import type { InfiniteData } from "@tanstack/react-query";

import { QueryClient } from "@tanstack/react-query";
import {
  FEEDBACK_ISSUES_QUERY_KEY,
  feedbackIssueDetailQueryKey,
  invalidateFeedbackIssueQueries,
  optimisticPatchFeedbackIssueCaches,
  patchFeedbackIssuePageData,
  reconcileFeedbackIssueCaches,
  rollbackFeedbackIssueCaches,
} from "api/feedbackQueryCache";
import { describe, expect, it } from "vitest";

import type { FeedbackIssuePageResponse } from "@/components/feedback/feedbackTypes";

function createPageData(): InfiniteData<FeedbackIssuePageResponse> {
  return {
    pageParams: [undefined, 102],
    pages: [
      {
        cursor: 102,
        isLast: false,
        list: [
          {
            feedbackIssueId: 11,
            title: "标题 11",
            contentPreview: "预览 11",
            issueType: 1,
            status: 1,
            archived: false,
            commentCount: 2,
            canManage: true,
            author: null,
            createTime: "2026-03-12 10:00:00",
            updateTime: "2026-03-12 10:00:00",
          },
        ],
      },
      {
        cursor: null,
        isLast: true,
        list: [
          {
            feedbackIssueId: 12,
            title: "标题 12",
            contentPreview: "预览 12",
            issueType: 2,
            status: 2,
            archived: false,
            commentCount: 4,
            canManage: true,
            author: null,
            createTime: "2026-03-12 11:00:00",
            updateTime: "2026-03-12 11:00:00",
          },
        ],
      },
    ],
  };
}

describe("feedbackHooks", () => {
  it("会在分页缓存中更新匹配反馈的状态与归档信息", () => {
    const data = createPageData();

    const patched = patchFeedbackIssuePageData(data, {
      feedbackIssueId: 12,
      status: 3,
      archived: true,
      updateTime: "2026-03-12 12:30:00",
    });

    expect(patched).not.toBe(data);
    expect(patched?.pages[0]).toBe(data.pages[0]);
    expect(patched?.pages[1]).not.toBe(data.pages[1]);
    expect(patched?.pages[1].list[0]).toMatchObject({
      feedbackIssueId: 12,
      status: 3,
      archived: true,
      updateTime: "2026-03-12 12:30:00",
    });
    expect(data.pages[1].list[0]).toMatchObject({
      feedbackIssueId: 12,
      status: 2,
      archived: false,
      updateTime: "2026-03-12 11:00:00",
    });
  });

  it("未命中反馈时直接返回原缓存对象", () => {
    const data = createPageData();

    const patched = patchFeedbackIssuePageData(data, {
      feedbackIssueId: 999,
      archived: true,
    });

    expect(patched).toBe(data);
  });

  it("会乐观更新反馈详情和列表缓存，并能按快照回滚", async () => {
    const queryClient = new QueryClient();
    const pageData = createPageData();
    queryClient.setQueryData(feedbackIssueDetailQueryKey(12), {
      ...pageData.pages[1].list[0],
      content: "完整内容",
    });
    queryClient.setQueryData([...FEEDBACK_ISSUES_QUERY_KEY, { archived: false }], pageData);

    const context = await optimisticPatchFeedbackIssueCaches(queryClient, {
      feedbackIssueId: 12,
      status: 3,
      archived: true,
    });

    expect(queryClient.getQueryData<any>(feedbackIssueDetailQueryKey(12))).toMatchObject({
      feedbackIssueId: 12,
      status: 3,
      archived: true,
    });
    expect(queryClient.getQueryData<any>([...FEEDBACK_ISSUES_QUERY_KEY, { archived: false }])?.pages[1].list[0]).toMatchObject({
      feedbackIssueId: 12,
      status: 3,
      archived: true,
    });

    rollbackFeedbackIssueCaches(queryClient, context);

    expect(queryClient.getQueryData<any>(feedbackIssueDetailQueryKey(12))).toMatchObject({
      feedbackIssueId: 12,
      status: 2,
      archived: false,
    });
    expect(queryClient.getQueryData<any>([...FEEDBACK_ISSUES_QUERY_KEY, { archived: false }])?.pages[1].list[0]).toMatchObject({
      feedbackIssueId: 12,
      status: 2,
      archived: false,
    });
  });

  it("反馈失败回滚不会覆盖并发到达的较新服务端数据", async () => {
    const queryClient = new QueryClient();
    const pageData = createPageData();
    const detailKey = feedbackIssueDetailQueryKey(12);
    queryClient.setQueryData(detailKey, {
      ...pageData.pages[1].list[0],
      content: "完整内容",
    });

    const context = await optimisticPatchFeedbackIssueCaches(queryClient, {
      feedbackIssueId: 12,
      status: 3,
    });
    const newerDetail = {
      ...pageData.pages[1].list[0],
      status: 4,
      content: "服务端新版本",
    };
    queryClient.setQueryData(detailKey, newerDetail);
    rollbackFeedbackIssueCaches(queryClient, context);

    expect(queryClient.getQueryData(detailKey)).toEqual(newerDetail);
  });

  it("成功返回会用服务端反馈详情校准缓存，并在 settled 阶段失效查询", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const pageData = createPageData();
    queryClient.setQueryData([...FEEDBACK_ISSUES_QUERY_KEY, { archived: false }], pageData);

    reconcileFeedbackIssueCaches(queryClient, {
      ...pageData.pages[1].list[0],
      content: "服务端内容",
      status: 4,
      archived: true,
      commentCount: 8,
      updateTime: "2026-03-12 13:30:00",
    });
    await invalidateFeedbackIssueQueries(queryClient, 12);

    expect(queryClient.getQueryData<any>(feedbackIssueDetailQueryKey(12))).toMatchObject({
      feedbackIssueId: 12,
      status: 4,
      archived: true,
      commentCount: 8,
      updateTime: "2026-03-12 13:30:00",
    });
    expect(queryClient.getQueryData<any>([...FEEDBACK_ISSUES_QUERY_KEY, { archived: false }])?.pages[1].list[0]).toMatchObject({
      feedbackIssueId: 12,
      status: 4,
      archived: true,
      commentCount: 8,
      updateTime: "2026-03-12 13:30:00",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: feedbackIssueDetailQueryKey(12) });
  });
});
