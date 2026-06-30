import type { FeedbackIssueType } from "@/components/feedback/feedbackTypes";

export type FeedbackDraft = {
  title: string;
  content: string;
  issueType: FeedbackIssueType;
};

const FEEDBACK_DRAFT_STORAGE_KEY = "tc:feedback:draft:v1";

function isFeedbackDraft(value: unknown): value is FeedbackDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const draft = value as Partial<FeedbackDraft>;
  return typeof draft.title === "string"
    && typeof draft.content === "string"
    && (draft.issueType === 1 || draft.issueType === 2);
}

export function writeFeedbackDraft(draft: FeedbackDraft): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.sessionStorage.setItem(FEEDBACK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  }
  catch {
    return false;
  }
}

export function readFeedbackDraft(): FeedbackDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.sessionStorage.getItem(FEEDBACK_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    const parsed = JSON.parse(rawDraft);
    return isFeedbackDraft(parsed) ? parsed : null;
  }
  catch {
    return null;
  }
}

export function clearFeedbackDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(FEEDBACK_DRAFT_STORAGE_KEY);
  }
  catch {
    // ignore
  }
}

export function consumeFeedbackDraft(): FeedbackDraft | null {
  const draft = readFeedbackDraft();
  clearFeedbackDraft();
  return draft;
}
