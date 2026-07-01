import { afterEach, describe, expect, it } from "vitest";

import {
  consumeFeedbackAttachmentDraft,
  readFeedbackAttachmentDraft,
  resetFeedbackAttachmentDraftForTests,
  writeFeedbackAttachmentDraft,
} from "@/components/feedback/feedbackAttachmentDraft";

describe("feedbackAttachmentDraft", () => {
  afterEach(() => {
    resetFeedbackAttachmentDraftForTests();
  });

  it("会在内存中保存并消费反馈附件 File", () => {
    const file = new File(["{}"], "tuanchat-console.json", {
      type: "application/json",
    });

    expect(writeFeedbackAttachmentDraft([file])).toBe(true);

    const draft = readFeedbackAttachmentDraft();
    expect(draft?.files).toHaveLength(1);
    expect(draft?.files[0]?.id).toBe("feedback-attachment-1");
    expect(draft?.files[0]?.file).toBe(file);

    expect(consumeFeedbackAttachmentDraft()?.files[0]?.file).toBe(file);
    expect(readFeedbackAttachmentDraft()).toBeNull();
  });

  it("空附件不会留下草稿", () => {
    expect(writeFeedbackAttachmentDraft([])).toBe(false);
    expect(readFeedbackAttachmentDraft()).toBeNull();
  });
});
