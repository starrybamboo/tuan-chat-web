import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getContactUserFromMessage, resolveDirectContactUser } from "../utils/directContactUser";
import ChatItem from "./ChatItem";

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    history: {
      push: vi.fn(),
    },
  }),
}));

vi.mock("@/components/chat/chatPageLayoutContext", () => ({
  useChatPageLayoutContext: () => ({
    setActiveRoomId: vi.fn(),
  }),
}));

vi.mock("@/components/common/userAvatar", () => ({
  default: ({
    avatar,
    avatarThumbUrl,
    clickEnterProfilePage,
    isRounded,
    stopToastWindow,
    userId,
    username,
    width,
  }: {
    avatar?: string;
    avatarThumbUrl?: string;
    clickEnterProfilePage?: boolean;
    isRounded: boolean;
    stopToastWindow?: boolean;
    userId: number;
    username?: string;
    width: number;
  }) => createElement("img", {
    "data-avatar-url": avatar ?? "",
    "data-click-enter-profile": String(clickEnterProfilePage),
    "data-is-rounded": String(isRounded),
    "data-stop-toast-window": String(stopToastWindow),
    "data-user-avatar-component": "true",
    "data-user-id": String(userId),
    "data-username": username ?? "",
    "data-width": String(width),
    src: avatarThumbUrl,
  }),
}));

vi.mock("@/components/common/userAccess.shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/common/userAccess.shared")>();
  return {
    ...actual,
    useResolvedUserInfo: (user: { avatarFileId?: number; userId?: number; username?: string } | null | undefined, fallbackUserId?: number) => ({
      avatar: user?.avatarFileId
        ? `https://media.tuan.chat/media/v1/files/${String(user.avatarFileId).padStart(3, "0")}/${user.avatarFileId}/image/medium.webp`
        : "",
      avatarThumbUrl: user?.avatarFileId
        ? `https://media.tuan.chat/media/v1/files/${String(user.avatarFileId).padStart(3, "0")}/${user.avatarFileId}/image/low.webp`
        : "",
      isLoading: false,
      userId: user?.userId ?? fallbackUserId ?? -1,
      username: user?.username ?? "",
    }),
  };
});

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
    expect(getContactUserFromMessage(42, {
      senderAvatarFileId: 88,
      senderAvatarMediaType: "image/webp",
      senderId: 42,
      senderUsername: "Alice",
    })).toEqual({
      avatarFileId: 88,
      avatarMediaType: "image/webp",
      userId: 42,
      username: "Alice",
    });
  });

  it("returns receiver info when contact is receiver", () => {
    expect(getContactUserFromMessage(42, {
      receiverAvatarFileId: 99,
      receiverAvatarMediaType: "image/png",
      receiverId: 42,
      receiverUsername: "Bob",
    })).toEqual({
      avatarFileId: 99,
      avatarMediaType: "image/png",
      userId: 42,
      username: "Bob",
    });
  });

  it("falls back to userId when contact is neither sender nor receiver", () => {
    expect(getContactUserFromMessage(42, { senderId: 1, receiverId: 2 }))
      .toEqual({ userId: 42 });
  });

  it("prefers latest message avatar over stale friend avatar", () => {
    expect(resolveDirectContactUser(
      42,
      { userId: 42, username: "Friend Alice", avatarFileId: 1, avatarMediaType: "image/png" },
      { senderId: 42, senderUsername: "Message Alice", senderAvatarFileId: 88, senderAvatarMediaType: "image/webp" },
    )).toEqual({
      avatarFileId: 88,
      avatarMediaType: "image/webp",
      userId: 42,
      username: "Friend Alice",
    });
  });

  it("ignores non-positive avatar file ids from message and friend data", () => {
    expect(resolveDirectContactUser(
      42,
      { userId: 42, username: "Alice", avatarFileId: 0 },
      { senderId: 42, senderUsername: "Alice", senderAvatarFileId: 0 },
    )).toEqual({
      avatarFileId: undefined,
      avatarMediaType: undefined,
      userId: 42,
      username: "Alice",
    });
  });
});

describe("privateChatUI - ChatItem avatar", () => {
  it("renders private chat list avatars through the dedicated user avatar component", () => {
    const html = renderToStaticMarkup(createElement(ChatItem, {
      currentContactUserId: null,
      deletedContactId: vi.fn(),
      id: 2082,
      isSmallScreen: false,
      lastMessage: null,
      openContextMenu: vi.fn(),
      setIsOpenLeftDrawer: vi.fn(),
      unreadMessageNumber: 0,
      updateReadlinePosition: vi.fn(),
      user: {
        avatarFileId: 2082,
        userId: 2082,
        username: "吟风",
      },
    }));

    expect(html).toContain('data-user-avatar-component="true"');
    expect(html).toContain('data-stop-toast-window="true"');
    expect(html).toContain('data-click-enter-profile="false"');
    expect(html).toContain('data-width="9"');
    expect(html).toContain("https://media.tuan.chat/media/v1/files/2082/2082/image/low.webp");
  });

  it("使用强选中态标记当前私聊", () => {
    const html = renderToStaticMarkup(createElement(ChatItem, {
      currentContactUserId: 2082,
      deletedContactId: vi.fn(),
      id: 2082,
      isSmallScreen: false,
      lastMessage: null,
      openContextMenu: vi.fn(),
      setIsOpenLeftDrawer: vi.fn(),
      unreadMessageNumber: 3,
      updateReadlinePosition: vi.fn(),
      user: {
        userId: 2082,
        username: "吟风",
      },
    }));

    expect(html).toContain('aria-current="page"');
    expect(html).toContain("bg-info/15");
    expect(html).toContain("ring-info/70");
    expect(html).not.toContain("3 条未读");
  });
});
