export type MobileFeedbackDraft = {
  title: string;
  content: string;
};

function readDraftParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export function buildMobileFeedbackDraftParams(draft: MobileFeedbackDraft): MobileFeedbackDraft {
  return {
    title: draft.title,
    content: draft.content,
  };
}

export function readMobileFeedbackDraft(params: {
  title?: string | string[];
  content?: string | string[];
}): MobileFeedbackDraft | null {
  const title = readDraftParam(params.title).trim();
  const content = readDraftParam(params.content);

  if (title.length === 0 && content.length === 0) {
    return null;
  }

  return {
    title,
    content,
  };
}
