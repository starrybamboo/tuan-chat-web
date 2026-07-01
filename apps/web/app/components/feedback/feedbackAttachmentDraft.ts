export type FeedbackAttachmentDraftFile = {
  id: string;
  file: File;
};

export type FeedbackAttachmentDraft = {
  files: FeedbackAttachmentDraftFile[];
};

let attachmentDraft: FeedbackAttachmentDraft | null = null;
let nextAttachmentDraftFileId = 1;

function normalizeFiles(files: File[] | readonly File[] | null | undefined) {
  if (typeof File === "undefined") {
    return [];
  }
  return (files ?? [])
    .filter(file => file instanceof File)
    .map(file => ({
      id: `feedback-attachment-${nextAttachmentDraftFileId++}`,
      file,
    }));
}

export function writeFeedbackAttachmentDraft(files: File[] | readonly File[] | null | undefined): boolean {
  const normalizedFiles = normalizeFiles(files);
  attachmentDraft = normalizedFiles.length > 0 ? { files: normalizedFiles } : null;
  return normalizedFiles.length > 0;
}

export function readFeedbackAttachmentDraft(): FeedbackAttachmentDraft | null {
  return attachmentDraft == null ? null : { files: [...attachmentDraft.files] };
}

export function clearFeedbackAttachmentDraft(): void {
  attachmentDraft = null;
}

export function consumeFeedbackAttachmentDraft(): FeedbackAttachmentDraft | null {
  const draft = readFeedbackAttachmentDraft();
  clearFeedbackAttachmentDraft();
  return draft;
}

export function resetFeedbackAttachmentDraftForTests(): void {
  attachmentDraft = null;
  nextAttachmentDraftFileId = 1;
}
