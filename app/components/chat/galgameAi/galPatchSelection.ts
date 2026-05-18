import type { GalPatchProposal, GalStoryDiffItem } from "./authoringTypes";

export type GalPatchProposalApplyOptions = {
  acceptedMessageIds?: string[];
};

type GalPatchProposalSelectionSummary = GalPatchProposal["summary"] & {
  selectedMessageCount: number;
  totalMessageCount: number;
};

const METADATA_FIELDS = new Set(["messageType", "purpose", "roleId", "customRoleName", "avatarId", "annotations", "webgal", "extra"]);
const CONTENT_FIELDS = new Set(["content"]);

export function getGalStoryDiffItemMessageId(item: GalStoryDiffItem): string {
  switch (item.kind) {
    case "added":
      return item.message.messageId;
    case "deleted":
      return item.before.messageId;
    case "modified":
    case "moved":
      return item.after.messageId;
  }
}

export function getGalPatchProposalChangedMessageIds(proposal: GalPatchProposal | null | undefined): string[] {
  if (!proposal) {
    return [];
  }

  return Array.from(new Set(proposal.diff.items.map(getGalStoryDiffItemMessageId)));
}

export function summarizeGalPatchProposalSelection(
  proposal: GalPatchProposal,
  acceptedMessageIds: Iterable<string>,
): GalPatchProposalSelectionSummary {
  const accepted = new Set(acceptedMessageIds);
  const selectedItems = proposal.diff.items.filter(item => accepted.has(getGalStoryDiffItemMessageId(item)));
  return {
    added: selectedItems.filter(item => item.kind === "added").length,
    deleted: selectedItems.filter(item => item.kind === "deleted").length,
    modified: selectedItems.filter(item => item.kind === "modified").length,
    moved: selectedItems.filter(item => item.kind === "moved").length,
    metadataChanged: selectedItems.filter(item =>
      item.kind === "modified"
      && item.fields.some(field => METADATA_FIELDS.has(field))
      && !item.fields.every(field => CONTENT_FIELDS.has(field)),
    ).length,
    selectedMessageCount: accepted.size,
    totalMessageCount: getGalPatchProposalChangedMessageIds(proposal).length,
  };
}
