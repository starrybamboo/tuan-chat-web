import { describe, expect, it } from "vitest";

import {
  buildDiagnosticLogFile,
  buildRouteErrorFeedbackDraft,
  buildSupportIssueFeedbackDraft,
} from "@/components/feedback/feedbackDiagnosticDraft";

describe("feedbackDiagnosticDraft", () => {
  it("会把报错页面和诊断日志附件提示写入反馈草稿正文", () => {
    const draft = buildRouteErrorFeedbackDraft({
      message: "Chunk load failed",
      details: "Failed to fetch dynamically imported module",
      pageUrl: "http://localhost:5177/chat/1",
      diagnosticFileName: "tuanchat-console-2026-05-07T12-34-56-789Z.json",
    });

    expect(draft).toMatchObject({
      title: "页面报错：Chunk load failed",
      issueType: 1,
    });
    expect(draft.content).toContain("Failed to fetch dynamically imported module");
    expect(draft.content).toContain("http://localhost:5177/chat/1");
    expect(draft.content).toContain("tuanchat-console-2026-05-07T12-34-56-789Z.json");
    expect(draft.content).toContain("诊断日志已自动放入本反馈附件区");
    expect(draft.content).not.toContain("```json");
  });

  it("会把诊断日志内容构造成可上传的 File", async () => {
    const file = buildDiagnosticLogFile(
      "tuanchat-console-2026-05-07T12-34-56-789Z.json",
      JSON.stringify({ entries: [{ level: "error", message: "boom" }] }),
    );

    expect(file.name).toBe("tuanchat-console-2026-05-07T12-34-56-789Z.json");
    expect(file.type).toBe("application/json;charset=utf-8");
    expect(await file.text()).toContain('"message":"boom"');
  });

  it("会把 Toast 问题、关联 FAQ 和页面默认写入反馈草稿", () => {
    const draft = buildSupportIssueFeedbackDraft({
      issueTitle: "当前空间已归档",
      issueDescription: "归档后普通成员不能继续发送消息。",
      supportIssueId: "space-archived",
      faqQuestions: ["为什么空间归档后不能继续发言？"],
      pageUrl: "http://localhost:5177/chat/1/2",
      diagnosticFileName: "tuanchat-console.json",
    });

    expect(draft).toMatchObject({
      title: "问题反馈：当前空间已归档",
      issueType: 1,
    });
    expect(draft.content).toContain("space-archived");
    expect(draft.content).toContain("为什么空间归档后不能继续发言？");
    expect(draft.content).toContain("http://localhost:5177/chat/1/2");
    expect(draft.content).toContain("tuanchat-console.json");
  });
});
