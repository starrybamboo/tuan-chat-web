import { vi } from "vitest";

import { prepareDiagnosticFeedback } from "@/components/feedback/feedbackPreparation";

describe("feedbackPreparation", () => {
  it("默认把诊断文件写入附件并把文件名传给草稿构造器", () => {
    const diagnosticFile = new File(["{}"], "tuanchat-console.json", {
      type: "application/json;charset=utf-8",
    });
    const writeAttachmentDraft = vi.fn(() => true);
    const writeDraft = vi.fn(() => true);
    const buildDraft = vi.fn((diagnosticFileName: string) => ({
      title: "页面报错：加载失败",
      content: diagnosticFileName,
      issueType: 1 as const,
    }));

    const result = prepareDiagnosticFeedback(buildDraft, {
      createDiagnosticFile: () => ({
        fileName: diagnosticFile.name,
        file: diagnosticFile,
      }),
      writeAttachmentDraft,
      writeDraft,
    });

    expect(result).toEqual({
      ok: true,
      attachmentWritten: true,
      draftWritten: true,
      diagnosticFileName: "tuanchat-console.json",
    });
    expect(buildDraft).toHaveBeenCalledWith("tuanchat-console.json");
    expect(writeAttachmentDraft).toHaveBeenCalledWith([diagnosticFile]);
    expect(writeDraft).toHaveBeenCalledWith(expect.objectContaining({
      content: "tuanchat-console.json",
    }));
  });

  it("任一草稿写入失败时返回失败结果", () => {
    const diagnosticFile = new File(["{}"], "tuanchat-console.json");

    const result = prepareDiagnosticFeedback(() => ({
      title: "问题反馈",
      content: "诊断信息",
      issueType: 1,
    }), {
      createDiagnosticFile: () => ({ fileName: diagnosticFile.name, file: diagnosticFile }),
      writeAttachmentDraft: () => false,
      writeDraft: () => true,
    });

    expect(result.ok).toBe(false);
    expect(result.attachmentWritten).toBe(false);
    expect(result.draftWritten).toBe(true);
  });
});
