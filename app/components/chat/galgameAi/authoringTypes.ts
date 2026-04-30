import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

export type GalMessagePurpose
  = | "dialogue"
    | "narration"
    | "background"
    | "cg"
    | "se"
    | "bgm"
    | "control"
    | "choice"
    | "unknown";

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
  = | { kind: "message"; messageId: string }
    | { kind: "role"; roleId: string }
    | { kind: "room"; roomId: string };

export type GalStoryFlow = {
  rawRoomMap: Record<string, string[]>;
  validationWarnings?: string[];
};

export type GalAuthoringContext = {
  staticGuide: {
    schemaVersion: string;
    fieldGuide: string;
    patchGuide: string;
    validationGuide: string;
  };
  space: GalSpaceContext;
  room: GalRoomContext;
  messages: GalMessageView[];
  roles: {
    roomRoles: GalRoomRole[];
    narrator: GalNarrator;
  };
  annotations: GalAnnotation[];
  flow?: GalStoryFlow;
  attachmentRefs: GalReference[];
  activeProposal?: GalPatchProposalSummary;
};

export type GalStoryPatchOperation
  = | {
    op: "replace_content";
    messageId: string;
    content: string;
  }
  | {
    op: "insert_before";
    beforeMessageId: string;
    message: GalPatchMessageInput;
  }
  | {
    op: "insert_after";
    afterMessageId: string;
    message: GalPatchMessageInput;
  }
  | {
    op: "delete";
    messageId: string;
  }
  | {
    op: "move";
    messageId: string;
    beforeMessageId?: string;
    afterMessageId?: string;
  }
  | {
    op: "update_annotations";
    messageId: string;
    annotations: string[];
  }
  | {
    op: "update_role";
    messageId: string;
    roleId: string;
    customRoleName?: string;
  }
  | {
    op: "update_avatar";
    messageId: string;
    avatarId?: string;
  }
  | {
    op: "replace_message";
    messageId: string;
    message: GalPatchMessageInput;
  };

export type GalPatchMessageInput = {
  messageType: number;
  purpose?: GalMessagePurpose;
  roleId?: string;
  customRoleName?: string;
  avatarId?: string;
  content?: string;
  annotations?: string[];
  webgal?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export type GalStoryPatch = {
  operations: GalStoryPatchOperation[];
};

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

export type GalPatchProposalSummary = {
  proposalId: string;
  status: GalPatchProposal["status"];
  added: number;
  deleted: number;
  modified: number;
  moved: number;
  metadataChanged: number;
};

export type GalPatchProposal = {
  proposalId: string;
  spaceId: string;
  roomId: string;
  source: "ai";
  status: "draft" | "accepted" | "discarded" | "expired";
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

export type GalPatchValidationError = {
  code: string;
  message: string;
  operationIndex?: number;
  messageId?: string;
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
