import {
  canDeleteRoomMessage,
  canEditRoomMessage,
  canReplyRoomMessage,
} from "@tuanchat/domain/message-action-permissions";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

describe("messageActionMenu permission logic", () => {
  describe("kP sees edit/delete for others' messages", () => {
    it("kP can edit another user's text message", () => {
      expect(canEditRoomMessage({
        currentUserId: 1,
        hasHostPrivileges: true,
        messageSenderId: 99,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.TEXT,
      })).toBe(true);
    });

    it("kP can delete another user's text message", () => {
      expect(canDeleteRoomMessage({
        currentUserId: 1,
        hasHostPrivileges: true,
        messageSenderId: 99,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.TEXT,
      })).toBe(true);
    });

    it("kP can delete another user's image message", () => {
      expect(canDeleteRoomMessage({
        currentUserId: 1,
        hasHostPrivileges: true,
        messageSenderId: 99,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.IMG,
      })).toBe(true);
    });
  });

  describe("ordinary member cannot edit/delete others' messages", () => {
    it("cannot edit another user's message", () => {
      expect(canEditRoomMessage({
        currentUserId: 2,
        hasHostPrivileges: false,
        messageSenderId: 99,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.TEXT,
      })).toBe(false);
    });

    it("cannot delete another user's message", () => {
      expect(canDeleteRoomMessage({
        currentUserId: 2,
        hasHostPrivileges: false,
        messageSenderId: 99,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.TEXT,
      })).toBe(false);
    });
  });

  describe("deleted messages hide edit/delete", () => {
    it("sender cannot edit deleted message", () => {
      expect(canEditRoomMessage({
        currentUserId: 5,
        hasHostPrivileges: false,
        messageSenderId: 5,
        messageStatus: 1,
        messageType: MESSAGE_TYPE.TEXT,
      })).toBe(false);
    });

    it("kP cannot delete already-deleted message", () => {
      expect(canDeleteRoomMessage({
        currentUserId: 1,
        hasHostPrivileges: true,
        messageSenderId: 5,
        messageStatus: 1,
        messageType: MESSAGE_TYPE.TEXT,
      })).toBe(false);
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

  describe("unsupported message types", () => {
    it("cannot edit system message even as sender", () => {
      expect(canEditRoomMessage({
        currentUserId: 5,
        hasHostPrivileges: false,
        messageSenderId: 5,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.SYSTEM,
      })).toBe(false);
    });

    it("cannot edit image message", () => {
      expect(canEditRoomMessage({
        currentUserId: 5,
        hasHostPrivileges: false,
        messageSenderId: 5,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.IMG,
      })).toBe(false);
    });

    it("cannot delete forward message", () => {
      expect(canDeleteRoomMessage({
        currentUserId: 5,
        hasHostPrivileges: false,
        messageSenderId: 5,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.FORWARD,
      })).toBe(false);
    });
  });

  describe("mobile clue entry action", () => {
    it("allows normal messages to expose add clue without changing edit/delete permissions", () => {
      const context = {
        currentUserId: 5,
        hasHostPrivileges: false,
        messageSenderId: 99,
        messageStatus: 0,
        messageType: MESSAGE_TYPE.TEXT,
      };

      expect(canEditRoomMessage(context)).toBe(false);
      expect(canDeleteRoomMessage(context)).toBe(false);
      expect(canReplyRoomMessage(context)).toBe(true);
    });
  });
});
