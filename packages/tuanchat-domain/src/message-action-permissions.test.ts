import { describe, expect, it } from "vitest";

import {
  canDeleteRoomMessage,
  canEditRoomMessage,
  canReplyRoomMessage,
} from "./message-action-permissions";
import { MESSAGE_TYPE } from "./messageType";

describe("canEditRoomMessage", () => {
  it("sender can edit own text message", () => {
    expect(canEditRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(true);
  });

  it("kp can edit others' text message", () => {
    expect(canEditRoomMessage({
      currentUserId: 1,
      hasHostPrivileges: true,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(true);
  });

  it("ordinary member cannot edit others' message", () => {
    expect(canEditRoomMessage({
      currentUserId: 2,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(false);
  });

  it("cannot edit deleted message", () => {
    expect(canEditRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 1,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(false);
  });

  it("cannot edit unsupported message type (IMG)", () => {
    expect(canEditRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.IMG,
    })).toBe(false);
  });

  it("can edit dice message", () => {
    expect(canEditRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.DICE,
    })).toBe(true);
  });

  it("can edit command request message", () => {
    expect(canEditRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.COMMAND_REQUEST,
    })).toBe(true);
  });
});

describe("canDeleteRoomMessage", () => {
  it("sender can delete own message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(true);
  });

  it("kp can delete others' message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 1,
      hasHostPrivileges: true,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(true);
  });

  it("ordinary member cannot delete others' message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 2,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(false);
  });

  it("cannot delete already deleted message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 1,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(false);
  });

  it("can delete image message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.IMG,
    })).toBe(true);
  });

  it("can delete sound message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.SOUND,
    })).toBe(true);
  });

  it("cannot delete system message", () => {
    expect(canDeleteRoomMessage({
      currentUserId: 5,
      hasHostPrivileges: true,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.SYSTEM,
    })).toBe(false);
  });
});

describe("canReplyRoomMessage", () => {
  it("can reply to normal message", () => {
    expect(canReplyRoomMessage({
      currentUserId: 2,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 0,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(true);
  });

  it("cannot reply to deleted message", () => {
    expect(canReplyRoomMessage({
      currentUserId: 2,
      hasHostPrivileges: false,
      messageSenderId: 5,
      messageStatus: 1,
      messageType: MESSAGE_TYPE.TEXT,
    })).toBe(false);
  });
});
