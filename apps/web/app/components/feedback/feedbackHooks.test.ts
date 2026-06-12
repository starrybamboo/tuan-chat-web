import type { InfiniteData } from "@tanstack/react-query";

import { describe, expect, it } from "vitest";

import type { FeedbackIssuePageResponse } from "@/components/feedback/feedbackTypes";

import { patchFeedbackIssuePageData } from "@/components/feedback/feedbackHooks";

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
});
