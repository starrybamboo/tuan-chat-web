import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

export type {
  ApplyGalPatchResult,
  GalAnnotation,
  GalAuthoringContext,
  GalDocumentFingerprint,
  GalMessagePurpose,
  GalMessageView,
  GalNarrator,
  GalPatchMessageInput,
  GalPatchProposal,
  GalPatchProposalStatus,
  GalPatchProposalSummary,
  GalPatchValidationContext,
  GalPatchValidationError,
  GalReference,
  GalReferenceRoomContext,
  GalRoleAvatarVariant,
  GalRoomContext,
  GalRoomRole,
  GalSpaceContext,
  GalStoryDiff,
  GalStoryDiffItem,
  GalStoryFlow,
  GalStoryPatch,
  GalStoryPatchOperation,
} from "@tuanchat/galgame-ai-contract";

export type GalMessageWriteChange
  = | {
    kind: "insert";
    message: ChatMessageRequest;
  }
  | {
    kind: "update";
    message: Message;
  }
  | {
    kind: "delete";
    messageId: number;
  };
