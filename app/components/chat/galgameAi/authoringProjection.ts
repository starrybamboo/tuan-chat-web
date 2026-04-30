import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { resolveRenderedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { ANNOTATION_IDS, getSceneEffectFromAnnotations, hasAnnotation, hasClearBackgroundAnnotation, hasClearBgmAnnotation, hasClearFigureAnnotation, hasClearImageAnnotation, isImageMessageBackground, isImageMessageShown, normalizeAnnotations } from "@/types/messageAnnotations";

import type { GalAnnotation, GalAuthoringContext, GalDocumentFingerprint, GalMessagePurpose, GalMessageView, GalNarrator, GalReference, GalRoleAvatarVariant, GalRoomContext, GalRoomRole, GalSpaceContext, GalStoryFlow } from "./authoringTypes";

import { MessageType } from "../../../../api/wsModels";

const INTRO_TEXT_MESSAGE_TYPE = 9;

export const GAL_AUTHORING_SCHEMA_VERSION = "gal-authoring-context.v1";

export const GAL_NARRATOR: GalNarrator = {
  roleId: "narrator",
  roleName: "旁白",
  kind: "narrator",
};

export function toGalId(value: number | string | undefined | null) {
  return value == null ? undefined : String(value);
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function buildGalAnnotations(catalog: AnnotationDefinition[]): GalAnnotation[] {
  return catalog.map(item => ({
    id: item.id,
    label: item.label,
    category: item.category,
    source: item.source === "custom" ? "custom" : "builtin",
  }));
}

export function inferGalMessagePurpose(message: Pick<Message, "messageType" | "roleId" | "content" | "annotations" | "extra">): GalMessagePurpose {
  const annotations = normalizeAnnotations(message.annotations);
  const extra = message.extra;

  if (message.messageType === MessageType.WEBGAL_CHOOSE) {
    return "choice";
  }

  if (message.messageType === MessageType.SOUND) {
    const purpose = resolveRenderedSoundMessagePurpose({
      annotations,
      payloadPurpose: extra?.soundMessage?.purpose,
      content: message.content,
    });
    return purpose === "bgm" || purpose === "se" ? purpose : "unknown";
  }

  if (message.messageType === MessageType.IMG) {
    if (isImageMessageBackground(annotations, extra?.imageMessage)) {
      return "background";
    }
    if (hasAnnotation(annotations, ANNOTATION_IDS.CG) || isImageMessageShown(annotations)) {
      return "cg";
    }
    return "unknown";
  }

  if (message.messageType === MessageType.EFFECT) {
    return "control";
  }

  if (
    hasClearBackgroundAnnotation(annotations)
    || hasClearBgmAnnotation(annotations)
    || hasClearImageAnnotation(annotations)
    || hasClearFigureAnnotation(annotations)
    || getSceneEffectFromAnnotations(annotations)
  ) {
    return "control";
  }

  if (
    message.messageType === MessageType.TEXT
    || message.messageType === MessageType.DICE
    || message.messageType === INTRO_TEXT_MESSAGE_TYPE
  ) {
    return (message.roleId ?? 0) > 0 ? "dialogue" : "narration";
  }

  return "unknown";
}

export function projectGalMessage(message: Message, roleNameById: Map<number, string | undefined>): GalMessageView {
  const roleId = message.roleId != null && message.roleId <= 0 ? GAL_NARRATOR.roleId : toGalId(message.roleId);
  const avatarId = toGalId(message.avatarId);
  return {
    messageId: String(message.messageId),
    position: message.position,
    roomId: String(message.roomId),
    messageType: message.messageType,
    purpose: inferGalMessagePurpose(message),
    ...(roleId ? { roleId } : {}),
    ...(roleId === GAL_NARRATOR.roleId ? { roleName: GAL_NARRATOR.roleName } : {}),
    ...(message.roleId && roleNameById.has(message.roleId) ? { roleName: roleNameById.get(message.roleId) } : {}),
    ...(message.customRoleName ? { customRoleName: message.customRoleName } : {}),
    ...(avatarId ? { avatarId } : {}),
    content: message.content ?? "",
    annotations: normalizeAnnotations(message.annotations),
    ...(toRecord(message.webgal) ? { webgal: toRecord(message.webgal) } : {}),
    ...(toRecord(message.extra) ? { extra: toRecord(message.extra) } : {}),
  };
}

export function projectGalMessages(messages: Message[], roles: UserRole[]): GalMessageView[] {
  const roleNameById = new Map(roles.map(role => [role.roleId, role.roleName]));
  return messages
    .filter(message => message.status !== 1)
    .slice()
    .sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.messageId - b.messageId;
    })
    .map(message => projectGalMessage(message, roleNameById));
}

export function projectGalRoomRoles(roles: UserRole[], avatarMap: Map<number, RoleAvatar[]>): GalRoomRole[] {
  return roles
    .filter(role => role.roleId > 0 && role.state !== 1)
    .map((role) => {
      const variants: GalRoleAvatarVariant[] = (avatarMap.get(role.roleId) ?? [])
        .filter(avatar => avatar.avatarId != null)
        .map(avatar => ({
          ...(avatar.roleId != null ? { roleId: String(avatar.roleId) } : {}),
          avatarId: String(avatar.avatarId),
          ...(avatar.avatarTitle ? { avatarTitle: avatar.avatarTitle } : {}),
          ...(avatar.category ? { category: avatar.category } : {}),
        }));

      return {
        roleId: String(role.roleId),
        ...(role.roleName ? { roleName: role.roleName } : {}),
        ...(role.type != null ? { type: role.type } : {}),
        ...(role.role != null ? { role: role.role } : {}),
        ...(role.npc != null ? { npc: role.npc } : {}),
        ...(role.diceMaiden != null ? { diceMaiden: role.diceMaiden } : {}),
        ...(role.description ? { description: role.description } : {}),
        ...(role.avatarId != null ? { avatarId: String(role.avatarId) } : {}),
        avatarVariants: variants,
      };
    });
}

export function projectGalRoomContext(room: Room): GalRoomContext {
  return {
    spaceId: String(room.spaceId),
    roomId: String(room.roomId),
    ...(room.name ? { name: room.name } : {}),
    ...(room.description ? { description: room.description } : {}),
  };
}

export function projectGalSpaceContext(params: {
  space: Space;
  rooms: Room[];
  annotations: GalAnnotation[];
  includeFlow?: boolean;
}): GalSpaceContext {
  return {
    spaceId: String(params.space.spaceId),
    ...(params.space.name ? { name: params.space.name } : {}),
    rooms: params.rooms
      .filter(room => room.roomId != null && room.status !== 1)
      .map(room => ({
        roomId: String(room.roomId),
        ...(room.name ? { name: room.name } : {}),
        ...(room.description ? { description: room.description } : {}),
      })),
    annotationCatalog: params.annotations,
    ...(params.includeFlow && params.space.roomMap ? { roomMap: normalizeRoomMapValues(params.space.roomMap) } : {}),
  };
}

export function projectGalStoryFlow(space: Space | undefined): GalStoryFlow | undefined {
  if (!space?.roomMap) {
    return undefined;
  }
  return {
    rawRoomMap: normalizeRoomMapValues(space.roomMap),
  };
}

function normalizeRoomMapValues(roomMap: Record<string, Array<string>>) {
  return Object.fromEntries(
    Object.entries(roomMap).map(([key, values]) => [
      key,
      Array.isArray(values) ? values.map(String) : [],
    ]),
  );
}

export function buildGalDocumentFingerprint(messages: GalMessageView[]): GalDocumentFingerprint {
  const signaturePayload = messages.map(message => ({
    messageId: message.messageId,
    position: message.position,
    messageType: message.messageType,
    roleId: message.roleId,
    customRoleName: message.customRoleName,
    avatarId: message.avatarId,
    content: message.content,
    annotations: message.annotations,
    webgal: message.webgal,
    extra: message.extra,
  }));
  return {
    messageIds: messages.map(message => message.messageId),
    signature: JSON.stringify(signaturePayload),
  };
}

export function buildGalAuthoringContext(params: {
  space: Space;
  room: Room;
  rooms: Room[];
  messages: Message[];
  roomRoles: UserRole[];
  roleAvatarsByRoleId: Map<number, RoleAvatar[]>;
  annotations: GalAnnotation[];
  attachmentRefs?: GalReference[];
  includeFlow?: boolean;
  activeProposal?: GalAuthoringContext["activeProposal"];
}): GalAuthoringContext {
  const messages = projectGalMessages(params.messages, params.roomRoles);
  return {
    staticGuide: {
      schemaVersion: GAL_AUTHORING_SCHEMA_VERSION,
      fieldGuide: "Use messageId to target existing messages. Use position only for order. Use roleId 'narrator' for narration.",
      patchGuide: "Return structured GalStoryPatch operations only. Do not generate WebGAL script directly.",
      validationGuide: "roleId, avatarId, and annotations must exist in the supplied context.",
    },
    space: projectGalSpaceContext({
      space: params.space,
      rooms: params.rooms,
      annotations: params.annotations,
      includeFlow: params.includeFlow,
    }),
    room: projectGalRoomContext(params.room),
    messages,
    roles: {
      roomRoles: projectGalRoomRoles(params.roomRoles, params.roleAvatarsByRoleId),
      narrator: GAL_NARRATOR,
    },
    annotations: params.annotations,
    ...(params.includeFlow ? { flow: projectGalStoryFlow(params.space) } : {}),
    attachmentRefs: params.attachmentRefs ?? [],
    ...(params.activeProposal ? { activeProposal: params.activeProposal } : {}),
  };
}
