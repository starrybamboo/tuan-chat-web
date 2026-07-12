import { MESSAGE_TYPE } from "./messageType";

export type MessageActionContext = {
  currentUserId?: number | null;
  hasHostPrivileges?: boolean;
  messageSenderId?: number | null;
  messageStatus?: number | null;
  messageType?: number | null;
};

function isSenderOrHost(context: MessageActionContext): boolean {
  if (context.hasHostPrivileges) {
    return true;
  }
  if (
    typeof context.currentUserId === "number"
    && context.currentUserId > 0
    && context.currentUserId === context.messageSenderId
  ) {
    return true;
  }
  return false;
}

function isDeletedMessage(context: MessageActionContext): boolean {
  return context.messageStatus === 1;
}

const EDITABLE_MESSAGE_TYPES = new Set<number>([
  MESSAGE_TYPE.TEXT,
  MESSAGE_TYPE.DICE,
  MESSAGE_TYPE.SOUND,
  MESSAGE_TYPE.COMMAND_REQUEST,
  MESSAGE_TYPE.STATE_EVENT,
  MESSAGE_TYPE.POKE,
]);

const DELETABLE_MESSAGE_TYPES = new Set<number>([
  MESSAGE_TYPE.TEXT,
  MESSAGE_TYPE.IMG,
  MESSAGE_TYPE.FILE,
  MESSAGE_TYPE.DICE,
  MESSAGE_TYPE.SOUND,
  MESSAGE_TYPE.VIDEO,
  MESSAGE_TYPE.COMMAND_REQUEST,
  MESSAGE_TYPE.STATE_EVENT,
  MESSAGE_TYPE.POKE,
  MESSAGE_TYPE.EFFECT,
]);

function isEditableMessageType(messageType: unknown): boolean {
  return typeof messageType === "number" && EDITABLE_MESSAGE_TYPES.has(messageType);
}

function isDeletableMessageType(messageType: unknown): boolean {
  return typeof messageType === "number" && DELETABLE_MESSAGE_TYPES.has(messageType);
}

export function canEditRoomMessage(context: MessageActionContext): boolean {
  if (isDeletedMessage(context)) {
    return false;
  }
  if (!isEditableMessageType(context.messageType)) {
    return false;
  }
  return isSenderOrHost(context);
}

export function canDeleteRoomMessage(context: MessageActionContext): boolean {
  if (isDeletedMessage(context)) {
    return false;
  }
  if (!isDeletableMessageType(context.messageType)) {
    return false;
  }
  return isSenderOrHost(context);
}

export function canReplyRoomMessage(context: MessageActionContext): boolean {
  if (isDeletedMessage(context)) {
    return false;
  }
  return true;
}
