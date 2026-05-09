import type { z } from "zod";

import type {
  galAuthoringContextSchema,
  galCopilotIntentResponseSchema,
  galCopilotIntentSchema,
  galCopilotMessageDraftSchema,
  galCopilotPatchRepairRequestSchema,
  galCopilotPatchRequestSchema,
  galCopilotPatchResponseSchema,
  galCopilotPatchStreamEventSchema,
  galMessagePurposeSchema,
  galMessageSelectorSchema,
  galPatchMessageInputSchema,
  galPatchValidationErrorSchema,
  galReferenceRoomContextSchema,
  galStoryPatchOperationSchema,
  galStoryPatchSchema,
} from "./schemas";

export type GalMessagePurpose = z.infer<typeof galMessagePurposeSchema>;

export type GalAnnotation = {
  id: string;
  label: string;
  category?: string;
  source: "builtin" | "custom";
  appliesTo?: GalMessagePurpose[];
  description?: string;
};

export type GalSpaceContext = {
  spaceId: string;
  name?: string;
  rooms: Array<{
    roomId: string;
    name?: string;
    description?: string;
  }>;
  annotationCatalog: GalAnnotation[];
  roomMap?: Record<string, string[]>;
};

export type GalRoomContext = {
  spaceId: string;
  roomId: string;
  name?: string;
  description?: string;
};

export type GalMessageView = {
  messageId: string;
  position: number;
  roomId: string;
  messageType: number;
  purpose: GalMessagePurpose;
  roleId?: string;
  roleName?: string;
  customRoleName?: string;
  avatarId?: string;
  content: string;
  annotations: string[];
  webgal?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export type GalRoleAvatarVariant = {
  roleId?: string;
  avatarId: string;
  avatarTitle?: Record<string, string>;
  category?: string;
};

export type GalRoomRole = {
  roleId: string;
  roleName?: string;
  type?: number;
  role?: boolean;
  npc?: boolean;
  diceMaiden?: boolean;
  description?: string;
  avatarId?: string;
  avatarVariants: GalRoleAvatarVariant[];
};

export type GalNarrator = {
  roleId: "narrator";
  roleName: "旁白";
  kind: "narrator";
};

export type GalReference
  = | { kind: "message"; messageId: string; mode?: "target" | "reference"; label?: string }
    | { kind: "role"; roleId: string; label?: string }
    | { kind: "room"; roomId: string; label?: string }
    | { kind: "doc"; docId: string; label?: string; title?: string; excerpt?: string };

export type GalReferenceRoomContext = z.infer<typeof galReferenceRoomContextSchema>;

export type GalStoryFlow = {
  rawRoomMap: Record<string, string[]>;
  validationWarnings?: string[];
};

export type GalPatchProposalStatus = "draft" | "accepted" | "discarded" | "expired";

export type GalPatchProposalSummary = {
  proposalId: string;
  status: GalPatchProposalStatus;
  added: number;
  deleted: number;
  modified: number;
  moved: number;
  metadataChanged: number;
};

export type GalAuthoringContext = z.infer<typeof galAuthoringContextSchema>;

export type GalPatchMessageInput = z.infer<typeof galPatchMessageInputSchema>;

export type GalStoryPatchOperation = z.infer<typeof galStoryPatchOperationSchema>;

export type GalStoryPatch = z.infer<typeof galStoryPatchSchema>;

export type GalMessageSelector = z.infer<typeof galMessageSelectorSchema>;

export type GalCopilotMessageDraft = z.infer<typeof galCopilotMessageDraftSchema>;

export type GalCopilotIntent = z.infer<typeof galCopilotIntentSchema>;

export type GalCopilotIntentResponse = z.infer<typeof galCopilotIntentResponseSchema>;

export type GalDocumentFingerprint = {
  messageIds: string[];
  signature: string;
};

export type GalStoryDiffItem
  = | {
    kind: "added";
    message: GalMessageView;
  }
  | {
    kind: "deleted";
    before: GalMessageView;
  }
  | {
    kind: "modified";
    before: GalMessageView;
    after: GalMessageView;
    fields: string[];
  }
  | {
    kind: "moved";
    before: GalMessageView;
    after: GalMessageView;
  };

export type GalStoryDiff = {
  items: GalStoryDiffItem[];
};

export type GalPatchValidationError = z.infer<typeof galPatchValidationErrorSchema>;

export type GalPatchProposal = {
  proposalId: string;
  spaceId: string;
  roomId: string;
  source: "ai";
  status: GalPatchProposalStatus;
  baseFingerprint: GalDocumentFingerprint;
  baseSnapshot: GalMessageView[];
  patch: GalStoryPatch;
  projectedSnapshot: GalMessageView[];
  diff: GalStoryDiff;
  summary: {
    added: number;
    deleted: number;
    modified: number;
    moved: number;
    metadataChanged: number;
  };
  validationErrors: GalPatchValidationError[];
  createTime: string;
  updateTime: string;
};

export type GalPatchValidationContext = {
  roomId: string;
  roles: GalRoomRole[];
  narrator: GalNarrator;
  annotations: GalAnnotation[];
};

export type ApplyGalPatchResult = {
  projectedSnapshot: GalMessageView[];
  diff: GalStoryDiff;
  summary: GalPatchProposal["summary"];
  validationErrors: GalPatchValidationError[];
};

export type GalCopilotPatchRequest = z.infer<typeof galCopilotPatchRequestSchema>;

export type GalCopilotPatchRepairRequest = z.infer<typeof galCopilotPatchRepairRequestSchema>;

export type GalCopilotPatchResponse = z.infer<typeof galCopilotPatchResponseSchema>;

export type GalCopilotPatchStreamEvent = z.infer<typeof galCopilotPatchStreamEventSchema>;
