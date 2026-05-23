import { describe, expect, it } from "vitest";

function getMessagePreview(msg: { messageType?: number; content?: string } | null) {
  if (!msg)
    return "";
  if (msg.messageType === 2)
    return "[图片]";
  if (msg.messageType === 14)
    return "[视频]";
  if (msg.messageType === 3)
    return "[文件]";
  return msg.content || "";
}

function getContactUserFromMessage(
  contactId: number,
  message: { senderId?: number; receiverId?: number; senderUsername?: string; receiverUsername?: string } | null,
) {
  if (!message) {
    return { userId: contactId };
  }
  if (message.senderId === contactId) {
    return { userId: contactId, username: message.senderUsername };
  }
  if (message.receiverId === contactId) {
    return { userId: contactId, username: message.receiverUsername };
  }
  return { userId: contactId };
}

describe("privateChatUI - message preview", () => {
  it("returns empty string for null message", () => {
    expect(getMessagePreview(null)).toBe("");
  });

  it("returns [图片] for image messages", () => {
    expect(getMessagePreview({ messageType: 2, content: "img.png" })).toBe("[图片]");
  });

  it("returns [视频] for video messages", () => {
    expect(getMessagePreview({ messageType: 14, content: "vid.mp4" })).toBe("[视频]");
  });

  it("returns [文件] for file messages", () => {
    expect(getMessagePreview({ messageType: 3, content: "doc.pdf" })).toBe("[文件]");
  });

  it("returns content for text messages", () => {
    expect(getMessagePreview({ messageType: 1, content: "hello" })).toBe("hello");
  });

  it("returns empty string for text message with no content", () => {
    expect(getMessagePreview({ messageType: 1 })).toBe("");
  });
});

describe("privateChatUI - contact user resolution", () => {
  it("returns userId only when message is null", () => {
    expect(getContactUserFromMessage(42, null)).toEqual({ userId: 42 });
  });

  it("returns sender info when contact is sender", () => {
    expect(getContactUserFromMessage(42, { senderId: 42, senderUsername: "Alice" }))
      .toEqual({ userId: 42, username: "Alice" });
  });

  it("returns receiver info when contact is receiver", () => {
    expect(getContactUserFromMessage(42, { receiverId: 42, receiverUsername: "Bob" }))
      .toEqual({ userId: 42, username: "Bob" });
  });

  it("falls back to userId when contact is neither sender nor receiver", () => {
    expect(getContactUserFromMessage(42, { senderId: 1, receiverId: 2 }))
      .toEqual({ userId: 42 });
  });
});
