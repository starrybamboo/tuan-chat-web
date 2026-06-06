import type { MessageTypeValue } from "@tuanchat/domain/message-type";

export type AuthoringBatchStatus = "pending" | "committed" | "failed" | "cleaned";
export type AuthoringResourceAction = "created" | "reused" | "unresolved";
export type AuthoringMediaPurpose = "bgm" | "se" | "image" | "video" | "file";

export type AuthoringSourceMetadata = {
  kind: string;
  key?: string;
  workId?: string;
  segmentId?: string;
  eventIndex?: number;
  originalSpeaker?: string;
  originalAssetPath?: string;
  originalMediaName?: string;
  title?: string;
  url?: string;
};

export type AuthoringBatch = {
  agentId?: string;
  batchId: string;
  createdAt: string;
  inputHash: string;
  source: AuthoringSourceMetadata & { key: string };
  status: AuthoringBatchStatus;
  targetRoomId: number;
  updatedAt: string;
};

export type AuthoringRole = {
  batchId?: string;
  displayName?: string;
  normalizedName: string;
  roleId: number;
  roomId: number;
  sourceKey?: string;
};

export type AuthoringAvatar = {
  avatarId: number;
  batchId?: string;
  fileHash?: string;
  fileName?: string;
  roleId: number;
  sourceAssetKey?: string;
};

export type AuthoringMedia = {
  batchId?: string;
  fileHash?: string;
  fileName?: string;
  mediaId: number;
  purpose: AuthoringMediaPurpose;
  remoteUrl?: string;
  sourceKey?: string;
  unresolved?: false;
};

export type AuthoringUnresolvedMedia = {
  batchId: string;
  originalName: string;
  purpose: AuthoringMediaPurpose;
  reason: string;
  source?: AuthoringSourceMetadata;
  unresolvedMediaId: string;
  unresolved: true;
};

export type AuthoringResourceRef = {
  action: AuthoringResourceAction;
  avatarId?: number;
  mediaId?: number;
  roleId?: number;
  sourceKey?: string;
  unresolvedMediaId?: string;
};

export type AuthoringMessageKind = "dialog" | "narration" | "dice" | "bgm";

export type AuthoringMessageWrite = {
  avatarId?: number;
  content?: string;
  customRoleName?: string;
  dice?: {
    description?: string;
    options?: string[];
    result?: string;
    rollText?: string;
  };
  kind: AuthoringMessageKind;
  mediaId?: number;
  messageType?: MessageTypeValue;
  roleId?: number;
  source?: AuthoringSourceMetadata;
  unresolvedMediaId?: string;
};

export type AuthoredRoomMessage = {
  avatarId?: number;
  batchId: string;
  content: string;
  customRoleName?: string;
  extra: Record<string, unknown>;
  kind: AuthoringMessageKind;
  mediaId?: number;
  messageId: number;
  messageType: MessageTypeValue;
  roleId?: number;
  roomId: number;
  source?: AuthoringSourceMetadata;
  unresolvedMediaId?: string;
};

export type AuthoringBatchStats = {
  avatarsCreated: number;
  avatarsReused: number;
  mediaCreated: number;
  mediaReused: number;
  messagesWritten: number;
  rolesCreated: number;
  rolesReused: number;
  unresolvedMedia: number;
};

export type AuthoringInspectReport = {
  batch: AuthoringBatch;
  messages: AuthoredRoomMessage[];
  resources: {
    avatars: Array<AuthoringResourceRef & Pick<AuthoringAvatar, "fileHash" | "fileName" | "sourceAssetKey">>;
    media: Array<AuthoringResourceRef & Partial<Pick<AuthoringMedia, "fileHash" | "fileName" | "purpose" | "remoteUrl" | "sourceKey">>>;
    roles: Array<AuthoringResourceRef & Pick<AuthoringRole, "displayName" | "normalizedName" | "sourceKey">>;
    unresolvedMedia: AuthoringUnresolvedMedia[];
  };
  stats: AuthoringBatchStats;
};

export type WebgalReadinessReport = {
  exportable: boolean;
  messageCount: number;
  missingAvatarMessageIds: number[];
  unresolvedMedia: AuthoringUnresolvedMedia[];
};

export type StartAuthoringBatchResponse = {
  batch: AuthoringBatch;
};

export type UpsertRoleResponse = {
  action: AuthoringResourceAction;
  role: AuthoringRole;
};

export type UpsertAvatarResponse = {
  action: AuthoringResourceAction;
  avatar: AuthoringAvatar;
};

export type UpsertMediaResponse = {
  action: AuthoringResourceAction;
  media: AuthoringMedia;
};

export type RecordUnresolvedMediaResponse = {
  unresolvedMedia: AuthoringUnresolvedMedia;
};

export type WriteMessagesResponse = {
  messages: AuthoredRoomMessage[];
};

export type CleanupAuthoringBatchResponse = {
  report: AuthoringInspectReport;
};

export type InspectAuthoringBatchResponse = {
  report: AuthoringInspectReport;
};

export type InspectWebgalReadinessResponse = {
  report: WebgalReadinessReport;
};

export type AgentAuthoringCommand
  = | { request: StartAuthoringBatchRequest; type: "batch.start" }
    | { batchId: string; type: "batch.cleanup" }
    | { batchId: string; type: "batch.commit" }
    | { batchId: string; type: "batch.inspect" }
    | { batchId: string; type: "webgal.inspectReadiness" }
    | { request: RecordUnresolvedMediaRequest; type: "media.unresolved" }
    | { request: UpsertAvatarRequest; type: "avatar.upsert" }
    | { request: UpsertMediaRequest; type: "media.upsert" }
    | { request: UpsertRoleRequest; type: "role.upsert" }
    | { request: WriteMessagesRequest; type: "message.batchWrite" };

export type AgentAuthoringCommandResult
  = | CleanupAuthoringBatchResponse
    | InspectAuthoringBatchResponse
    | InspectWebgalReadinessResponse
    | RecordUnresolvedMediaResponse
    | StartAuthoringBatchResponse
    | UpsertAvatarResponse
    | UpsertMediaResponse
    | UpsertRoleResponse
    | WriteMessagesResponse;

export type StartAuthoringBatchRequest = {
  agentId?: string;
  force?: boolean;
  inputHash?: string;
  rawInput?: unknown;
  source: AuthoringSourceMetadata;
  targetRoomId: number;
};

export type UpsertRoleRequest = {
  batchId: string;
  displayName?: string;
  normalizedName: string;
  sourceKey?: string;
};

export type UpsertAvatarRequest = {
  batchId: string;
  fileHash?: string;
  fileName?: string;
  roleId: number;
  sourceAssetKey?: string;
};

export type UpsertMediaRequest = {
  batchId: string;
  fileHash?: string;
  fileName?: string;
  existingMediaId?: number;
  purpose: AuthoringMediaPurpose;
  remoteUrl?: string;
  sourceKey?: string;
};

export type RecordUnresolvedMediaRequest = {
  batchId: string;
  originalName: string;
  purpose: AuthoringMediaPurpose;
  reason: string;
  source?: AuthoringSourceMetadata;
};

export type WriteMessagesRequest = {
  batchId: string;
  messages: AuthoringMessageWrite[];
};

export type AuthoringErrorCode
  = | "BATCH_NOT_FOUND"
    | "DUPLICATE_BATCH"
    | "INVALID_BATCH_STATUS"
    | "INVALID_REQUEST"
    | "RESOURCE_NOT_FOUND";

export class AuthoringPrimitiveError extends Error {
  readonly code: AuthoringErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AuthoringErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AuthoringPrimitiveError";
    this.code = code;
    this.details = details;
  }
}

export function assertPositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AuthoringPrimitiveError("INVALID_REQUEST", `${fieldName} must be a positive integer`, {
      fieldName,
      value,
    });
  }
  return value;
}

export function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AuthoringPrimitiveError("INVALID_REQUEST", `${fieldName} must be a non-empty string`, {
      fieldName,
      value,
    });
  }
  return value.trim();
}
