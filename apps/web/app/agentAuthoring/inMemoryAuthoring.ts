import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type {
  AuthoredRoomMessage,
  AuthoringAvatar,
  AuthoringBatch,
  AuthoringBatchStats,
  AuthoringInspectReport,
  AuthoringMedia,
  AuthoringMessageWrite,
  AuthoringResourceAction,
  AuthoringResourceRef,
  AuthoringRole,
  AuthoringUnresolvedMedia,
  AgentAuthoringCommand,
  AgentAuthoringCommandResult,
  RecordUnresolvedMediaRequest,
  StartAuthoringBatchRequest,
  UpsertAvatarRequest,
  UpsertMediaRequest,
  UpsertRoleRequest,
  WebgalReadinessReport,
  WriteMessagesRequest,
} from "./contracts";

import {
  assertNonEmptyString,
  assertPositiveInteger,
  AuthoringPrimitiveError,
} from "./contracts";
import { buildBatchDedupeKey, buildStableInputHash, normalizeAuthoringSource } from "./hash";

type ResourceLedger = {
  avatars: AuthoringResourceRef[];
  media: AuthoringResourceRef[];
  roles: AuthoringResourceRef[];
  unresolvedMedia: string[];
};

export type InMemoryAuthoringState = {
  avatars: AuthoringAvatar[];
  batches: AuthoringBatch[];
  media: AuthoringMedia[];
  messages: AuthoredRoomMessage[];
  roles: AuthoringRole[];
  unresolvedMedia: AuthoringUnresolvedMedia[];
};

function createEmptyLedger(): ResourceLedger {
  return {
    avatars: [],
    media: [],
    roles: [],
    unresolvedMedia: [],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function toCollisionFreeName(baseName: string, existingNames: Set<string>) {
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (existingNames.has(`${baseName}(${index})`)) {
    index++;
  }
  return `${baseName}(${index})`;
}

function sourceKeyOf(sourceKind: string, sourceKey: string | undefined) {
  return sourceKey ? `${sourceKind}:${sourceKey}` : "";
}

function addSourceExtra(message: AuthoringMessageWrite, batchId: string): Record<string, unknown> {
  return {
    agentAuthoring: {
      batchId,
      source: message.source,
    },
  };
}

function createMessageExtra(message: AuthoringMessageWrite, batchId: string): Record<string, unknown> {
  const extra = addSourceExtra(message, batchId);
  if (message.kind === "dice" && message.dice) {
    const result = message.dice.result?.trim();
    const description = message.dice.description?.trim();
    const authoredDice = {
      description,
      options: message.dice.options ?? [],
      result,
      rollText: message.dice.rollText,
    };
    if (!result) {
      return {
        ...extra,
        authoredDice,
      };
    }
    return {
      ...extra,
      diceResult: { result },
      authoredDice,
    };
  }
  if (message.kind === "bgm") {
    if (message.mediaId) {
      return {
        ...extra,
        soundMessage: {
          source: { fileId: message.mediaId, kind: "internal" },
          purpose: "bgm",
        },
      };
    }
    return {
      ...extra,
      authoredBgm: {
        unresolvedMediaId: message.unresolvedMediaId,
      },
    };
  }
  return extra;
}

function createRoleResourceReport(
  ref: AuthoringResourceRef,
  roles: AuthoringRole[],
): AuthoringResourceRef & Pick<AuthoringRole, "displayName" | "normalizedName" | "sourceKey"> {
  const role = ref.roleId ? roles.find(item => item.roleId === ref.roleId) : undefined;
  return {
    ...ref,
    ...(role?.displayName ? { displayName: role.displayName } : {}),
    normalizedName: role?.normalizedName ?? "",
    ...(role?.sourceKey ? { sourceKey: role.sourceKey } : {}),
  };
}

function resolveMessageType(message: AuthoringMessageWrite) {
  if (message.messageType) {
    return message.messageType;
  }
  if (message.kind === "dice") {
    return MESSAGE_TYPE.DICE;
  }
  if (message.kind === "bgm") {
    return message.mediaId ? MESSAGE_TYPE.SOUND : MESSAGE_TYPE.TEXT;
  }
  return MESSAGE_TYPE.TEXT;
}

function resolveMessageContent(message: AuthoringMessageWrite) {
  if (message.content != null) {
    return message.content;
  }
  if (message.kind === "dice") {
    return message.dice?.result ?? message.dice?.description ?? message.dice?.rollText ?? "";
  }
  if (message.kind === "bgm") {
    return message.source?.originalMediaName ?? "";
  }
  return "";
}

export class InMemoryAuthoringPrimitives {
  private nextAvatarId = 1;
  private nextBatchId = 1;
  private nextMediaId = 1;
  private nextMessageId = 1;
  private nextRoleId = 1;
  private readonly ledgers = new Map<string, ResourceLedger>();
  private readonly state: InMemoryAuthoringState = {
    avatars: [],
    batches: [],
    media: [],
    messages: [],
    roles: [],
    unresolvedMedia: [],
  };

  snapshot(): InMemoryAuthoringState {
    return {
      avatars: this.state.avatars.map(item => ({ ...item })),
      batches: this.state.batches.map(item => ({ ...item, source: { ...item.source } })),
      media: this.state.media.map(item => ({ ...item })),
      messages: this.state.messages.map(item => ({
        ...item,
        extra: { ...item.extra },
        source: item.source ? { ...item.source } : undefined,
      })),
      roles: this.state.roles.map(item => ({ ...item })),
      unresolvedMedia: this.state.unresolvedMedia.map(item => ({
        ...item,
        source: item.source ? { ...item.source } : undefined,
      })),
    };
  }

  executeCommand(command: AgentAuthoringCommand): AgentAuthoringCommandResult {
    switch (command.type) {
      case "batch.start":
        return { batch: this.startBatch(command.request) };
      case "batch.cleanup":
        return { report: this.cleanupBatch(command.batchId) };
      case "batch.commit":
        return { report: this.commitBatch(command.batchId) };
      case "batch.inspect":
        return { report: this.inspectBatch(command.batchId) };
      case "webgal.inspectReadiness":
        return { report: this.inspectWebgalReadiness(command.batchId) };
      case "media.unresolved":
        return { unresolvedMedia: this.recordUnresolvedMedia(command.request) };
      case "avatar.upsert": {
        const { action, ...avatar } = this.upsertAvatar(command.request);
        return { action, avatar };
      }
      case "media.upsert": {
        const { action, ...media } = this.upsertMedia(command.request);
        return { action, media };
      }
      case "role.upsert": {
        const { action, ...role } = this.upsertRole(command.request);
        return { action, role };
      }
      case "message.batchWrite":
        return { messages: this.writeMessages(command.request) };
      default: {
        const exhaustive: never = command;
        throw new AuthoringPrimitiveError("INVALID_REQUEST", "unsupported authoring command", { command: exhaustive });
      }
    }
  }

  startBatch(request: StartAuthoringBatchRequest): AuthoringBatch {
    const targetRoomId = assertPositiveInteger(request.targetRoomId, "targetRoomId");
    const source = normalizeAuthoringSource(request.source);
    const inputHash = request.inputHash?.trim() || buildStableInputHash(request.rawInput ?? source);
    const dedupeKey = buildBatchDedupeKey({ inputHash, source, targetRoomId });
    const duplicate = this.state.batches.find((batch) => {
      return batch.status === "committed"
        && buildBatchDedupeKey({
          inputHash: batch.inputHash,
          source: batch.source,
          targetRoomId: batch.targetRoomId,
        }) === dedupeKey;
    });
    if (duplicate && !request.force) {
      throw new AuthoringPrimitiveError("DUPLICATE_BATCH", "authoring batch already committed", {
        batchId: duplicate.batchId,
        dedupeKey,
      });
    }

    const timestamp = nowIso();
    const batch: AuthoringBatch = {
      agentId: request.agentId,
      batchId: `batch-${this.nextBatchId++}`,
      createdAt: timestamp,
      inputHash,
      source,
      status: "pending",
      targetRoomId,
      updatedAt: timestamp,
    };
    this.state.batches.push(batch);
    this.ledgers.set(batch.batchId, createEmptyLedger());
    return { ...batch, source: { ...batch.source } };
  }

  upsertRole(request: UpsertRoleRequest): AuthoringRole & { action: AuthoringResourceAction } {
    const batch = this.getPendingBatch(request.batchId);
    const normalizedName = normalizeName(assertNonEmptyString(request.normalizedName, "normalizedName"));
    const sourceKey = request.sourceKey?.trim();
    const sourceLookup = sourceKeyOf(batch.source.kind, sourceKey);
    const existing = this.state.roles.find((role) => {
      return role.roomId === batch.targetRoomId
        && ((sourceLookup && role.sourceKey === sourceLookup) || role.normalizedName === normalizedName);
    });
    if (existing) {
      this.recordResource(batch.batchId, "roles", {
        action: "reused",
        roleId: existing.roleId,
        sourceKey: existing.sourceKey,
      });
      return { ...existing, action: "reused" };
    }

    const existingNames = new Set(this.state.roles
      .filter(role => role.roomId === batch.targetRoomId)
      .map(role => role.displayName || role.normalizedName));
    const role: AuthoringRole = {
      batchId: batch.batchId,
      displayName: request.displayName ? toCollisionFreeName(normalizeName(request.displayName), existingNames) : undefined,
      normalizedName,
      roleId: this.nextRoleId++,
      roomId: batch.targetRoomId,
      sourceKey: sourceLookup || undefined,
    };
    if (!role.displayName) {
      role.displayName = toCollisionFreeName(normalizedName, existingNames);
    }
    this.state.roles.push(role);
    this.recordResource(batch.batchId, "roles", {
      action: "created",
      roleId: role.roleId,
      sourceKey: role.sourceKey,
    });
    return { ...role, action: "created" };
  }

  upsertAvatar(request: UpsertAvatarRequest): AuthoringAvatar & { action: AuthoringResourceAction } {
    const batch = this.getPendingBatch(request.batchId);
    const roleId = assertPositiveInteger(request.roleId, "roleId");
    this.assertRoleInRoom(batch.targetRoomId, roleId);
    const existing = this.state.avatars.find((avatar) => {
      return avatar.roleId === roleId
        && ((request.sourceAssetKey && avatar.sourceAssetKey === request.sourceAssetKey)
          || (request.fileHash && avatar.fileHash === request.fileHash));
    });
    if (existing) {
      this.recordResource(batch.batchId, "avatars", {
        action: "reused",
        avatarId: existing.avatarId,
        sourceKey: existing.sourceAssetKey,
      });
      return { ...existing, action: "reused" };
    }

    const avatar: AuthoringAvatar = {
      avatarId: this.nextAvatarId++,
      batchId: batch.batchId,
      fileHash: request.fileHash?.trim(),
      fileName: request.fileName?.trim(),
      roleId,
      sourceAssetKey: request.sourceAssetKey?.trim(),
    };
    this.state.avatars.push(avatar);
    this.recordResource(batch.batchId, "avatars", {
      action: "created",
      avatarId: avatar.avatarId,
      sourceKey: avatar.sourceAssetKey,
    });
    return { ...avatar, action: "created" };
  }

  upsertMedia(request: UpsertMediaRequest): AuthoringMedia & { action: AuthoringResourceAction } {
    const batch = this.getPendingBatch(request.batchId);
    if (request.existingMediaId) {
      const existingById = this.state.media.find(media => media.mediaId === request.existingMediaId);
      if (existingById) {
        this.recordResource(batch.batchId, "media", {
          action: "reused",
          mediaId: existingById.mediaId,
          sourceKey: existingById.sourceKey,
        });
        return { ...existingById, action: "reused" };
      }
    }
    const existing = this.state.media.find((media) => {
      return (request.sourceKey && media.sourceKey === request.sourceKey)
        || (request.fileHash && media.fileHash === request.fileHash)
        || (request.remoteUrl && media.remoteUrl === request.remoteUrl);
    });
    if (existing) {
      this.recordResource(batch.batchId, "media", {
        action: "reused",
        mediaId: existing.mediaId,
        sourceKey: existing.sourceKey,
      });
      return { ...existing, action: "reused" };
    }

    const media: AuthoringMedia = {
      batchId: batch.batchId,
      fileHash: request.fileHash?.trim(),
      fileName: request.fileName?.trim(),
      mediaId: this.nextMediaId++,
      purpose: request.purpose,
      remoteUrl: request.remoteUrl?.trim(),
      sourceKey: request.sourceKey?.trim(),
      unresolved: false,
    };
    this.state.media.push(media);
    this.recordResource(batch.batchId, "media", {
      action: "created",
      mediaId: media.mediaId,
      sourceKey: media.sourceKey,
    });
    return { ...media, action: "created" };
  }

  recordUnresolvedMedia(request: RecordUnresolvedMediaRequest): AuthoringUnresolvedMedia {
    const batch = this.getPendingBatch(request.batchId);
    const originalName = assertNonEmptyString(request.originalName, "originalName");
    const unresolved: AuthoringUnresolvedMedia = {
      batchId: batch.batchId,
      originalName,
      purpose: request.purpose,
      reason: assertNonEmptyString(request.reason, "reason"),
      source: request.source,
      unresolved: true,
      unresolvedMediaId: `unresolved-${this.state.unresolvedMedia.length + 1}`,
    };
    this.state.unresolvedMedia.push(unresolved);
    this.ledger(batch.batchId).unresolvedMedia.push(unresolved.unresolvedMediaId);
    return { ...unresolved, source: unresolved.source ? { ...unresolved.source } : undefined };
  }

  writeMessages(request: WriteMessagesRequest): AuthoredRoomMessage[] {
    const batch = this.getPendingBatch(request.batchId);
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new AuthoringPrimitiveError("INVALID_REQUEST", "messages must not be empty");
    }
    const written = request.messages.map((message) => {
      this.validateMessageResources(batch.targetRoomId, message);
      const authored: AuthoredRoomMessage = {
        avatarId: message.avatarId,
        batchId: batch.batchId,
        content: resolveMessageContent(message),
        customRoleName: message.customRoleName,
        extra: createMessageExtra(message, batch.batchId),
        kind: message.kind,
        mediaId: message.mediaId,
        messageId: this.nextMessageId++,
        messageType: resolveMessageType(message),
        roleId: message.roleId,
        roomId: batch.targetRoomId,
        source: message.source,
        unresolvedMediaId: message.unresolvedMediaId,
      };
      this.state.messages.push(authored);
      return authored;
    });
    this.touchBatch(batch);
    return written.map(message => ({ ...message, extra: { ...message.extra } }));
  }

  commitBatch(batchId: string): AuthoringInspectReport {
    const batch = this.getPendingBatch(batchId);
    batch.status = "committed";
    this.touchBatch(batch);
    return this.inspectBatch(batchId);
  }

  failBatch(batchId: string): AuthoringBatch {
    const batch = this.getBatch(batchId);
    if (batch.status === "cleaned") {
      throw new AuthoringPrimitiveError("INVALID_BATCH_STATUS", "cleaned batch cannot be failed", { batchId });
    }
    batch.status = "failed";
    this.touchBatch(batch);
    return { ...batch, source: { ...batch.source } };
  }

  cleanupBatch(batchId: string): AuthoringInspectReport {
    const batch = this.getBatch(batchId);
    if (batch.status === "committed") {
      throw new AuthoringPrimitiveError("INVALID_BATCH_STATUS", "committed batch cannot be cleaned", { batchId });
    }
    const ledger = this.ledger(batchId);
    const createdRoleIds = new Set(ledger.roles.filter(ref => ref.action === "created").map(ref => ref.roleId));
    const createdAvatarIds = new Set(ledger.avatars.filter(ref => ref.action === "created").map(ref => ref.avatarId));
    const createdMediaIds = new Set(ledger.media.filter(ref => ref.action === "created").map(ref => ref.mediaId));
    this.state.messages = this.state.messages.filter(message => message.batchId !== batchId);
    this.state.avatars = this.state.avatars.filter(avatar => !createdAvatarIds.has(avatar.avatarId));
    this.state.media = this.state.media.filter(media => !createdMediaIds.has(media.mediaId));
    this.state.roles = this.state.roles.filter(role => !createdRoleIds.has(role.roleId));
    this.state.unresolvedMedia = this.state.unresolvedMedia.filter(item => item.batchId !== batchId);
    batch.status = "cleaned";
    this.touchBatch(batch);
    return this.inspectBatch(batchId);
  }

  inspectBatch(batchId: string): AuthoringInspectReport {
    const batch = this.getBatch(batchId);
    const ledger = this.ledger(batchId);
    const messages = this.state.messages.filter(message => message.batchId === batchId);
    const unresolved = this.state.unresolvedMedia.filter(item => item.batchId === batchId);
    const stats = this.computeStats(batchId, ledger, messages.length, unresolved.length);
    return {
      batch: { ...batch, source: { ...batch.source } },
      messages: messages.map(message => ({ ...message, extra: { ...message.extra } })),
      resources: {
        avatars: ledger.avatars.map(ref => ({
          ...ref,
          ...this.state.avatars.find(avatar => avatar.avatarId === ref.avatarId),
        })),
        media: ledger.media.map(ref => ({
          ...ref,
          ...this.state.media.find(media => media.mediaId === ref.mediaId),
        })),
        roles: ledger.roles.map(ref => createRoleResourceReport(ref, this.state.roles)),
        unresolvedMedia: unresolved.map(item => ({ ...item })),
      },
      stats,
    };
  }

  inspectWebgalReadiness(batchId: string): WebgalReadinessReport {
    const report = this.inspectBatch(batchId);
    const missingAvatarMessageIds = report.messages
      .filter(message => message.kind === "dialog" && message.roleId && !message.avatarId)
      .map(message => message.messageId);
    return {
      exportable: missingAvatarMessageIds.length === 0 && report.resources.unresolvedMedia.length === 0,
      messageCount: report.messages.length,
      missingAvatarMessageIds,
      unresolvedMedia: report.resources.unresolvedMedia,
    };
  }

  private getBatch(batchId: string): AuthoringBatch {
    const batch = this.state.batches.find(item => item.batchId === batchId);
    if (!batch) {
      throw new AuthoringPrimitiveError("BATCH_NOT_FOUND", "authoring batch not found", { batchId });
    }
    return batch;
  }

  private getPendingBatch(batchId: string): AuthoringBatch {
    const batch = this.getBatch(batchId);
    if (batch.status !== "pending") {
      throw new AuthoringPrimitiveError("INVALID_BATCH_STATUS", "authoring batch must be pending", {
        batchId,
        status: batch.status,
      });
    }
    return batch;
  }

  private ledger(batchId: string): ResourceLedger {
    const ledger = this.ledgers.get(batchId);
    if (!ledger) {
      throw new AuthoringPrimitiveError("BATCH_NOT_FOUND", "authoring batch ledger not found", { batchId });
    }
    return ledger;
  }

  private recordResource(batchId: string, bucket: "avatars" | "media" | "roles", ref: AuthoringResourceRef): void {
    this.ledger(batchId)[bucket].push(ref);
  }

  private assertRoleInRoom(roomId: number, roleId: number): void {
    const role = this.state.roles.find(item => item.roomId === roomId && item.roleId === roleId);
    if (!role) {
      throw new AuthoringPrimitiveError("RESOURCE_NOT_FOUND", "role not found in target room", { roleId, roomId });
    }
  }

  private validateMessageResources(roomId: number, message: AuthoringMessageWrite): void {
    if (message.roleId) {
      this.assertRoleInRoom(roomId, message.roleId);
    }
    if (message.avatarId) {
      const avatar = this.state.avatars.find(item => item.avatarId === message.avatarId);
      if (!avatar) {
        throw new AuthoringPrimitiveError("RESOURCE_NOT_FOUND", "avatar not found", { avatarId: message.avatarId });
      }
    }
    if (message.mediaId) {
      const media = this.state.media.find(item => item.mediaId === message.mediaId);
      if (!media) {
        throw new AuthoringPrimitiveError("RESOURCE_NOT_FOUND", "media not found", { mediaId: message.mediaId });
      }
    }
    if (message.unresolvedMediaId) {
      const unresolved = this.state.unresolvedMedia.find(item => item.unresolvedMediaId === message.unresolvedMediaId);
      if (!unresolved) {
        throw new AuthoringPrimitiveError("RESOURCE_NOT_FOUND", "unresolved media not found", {
          unresolvedMediaId: message.unresolvedMediaId,
        });
      }
    }
  }

  private touchBatch(batch: AuthoringBatch): void {
    batch.updatedAt = nowIso();
  }

  private computeStats(
    batchId: string,
    ledger: ResourceLedger,
    messagesWritten: number,
    unresolvedMedia: number,
  ): AuthoringBatchStats {
    return {
      avatarsCreated: ledger.avatars.filter(ref => ref.action === "created").length,
      avatarsReused: ledger.avatars.filter(ref => ref.action === "reused").length,
      mediaCreated: ledger.media.filter(ref => ref.action === "created").length,
      mediaReused: ledger.media.filter(ref => ref.action === "reused").length,
      messagesWritten,
      rolesCreated: ledger.roles.filter(ref => ref.action === "created").length,
      rolesReused: ledger.roles.filter(ref => ref.action === "reused").length,
      unresolvedMedia,
    };
  }
}

export function createInMemoryAuthoringPrimitives() {
  return new InMemoryAuthoringPrimitives();
}
