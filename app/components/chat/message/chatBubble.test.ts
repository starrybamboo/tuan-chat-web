import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

import { ChatBubble } from "./chatBubble";

const roomPreferenceState = vi.hoisted(() => ({
  useChatBubbleStyle: false,
  webgalLinkMode: false,
  autoReplyMode: false,
  runModeEnabled: false,
  draftCustomRoleNameMap: {} as Record<number, string>,
}));

vi.mock("@/components/chat/stores/roomPreferenceStore", () => ({
  useRoomPreferenceStore: (selector: (state: typeof roomPreferenceState) => unknown) => selector(roomPreferenceState),
}));

vi.mock("@/components/chat/message/annotations/messageAnnotationsBar", () => ({
  default: ({ annotations = [], showNormalModeAnnotationsOnly }: {
    annotations?: string[];
    showNormalModeAnnotationsOnly?: boolean;
  }) => createElement("div", {
    "data-testid": "annotations-bar",
    "data-annotations": annotations.join(","),
    "data-normal-only": String(Boolean(showNormalModeAnnotationsOnly)),
  }),
}));

vi.mock("@/components/chat/message/messageContentRenderer", () => ({
  default: ({ message }: { message: { content?: string } }) => createElement("div", {
    "data-testid": "message-content",
  }, message.content ?? ""),
}));

vi.mock("@/components/common/roleAvatar", () => ({
  default: () => createElement("div", { "data-testid": "role-avatar" }),
}));

vi.mock("@/components/chat/input/expressionChooser", () => ({
  ExpressionChooser: () => null,
}));

vi.mock("@/components/chat/input/textStyleToolbar", () => ({
  default: () => null,
}));

vi.mock("@/components/chat/message/diff/MessageTextDiffPreview", () => ({
  default: () => null,
}));

vi.mock("@/components/chat/message/editableMessageContent", () => ({
  default: () => null,
}));

vi.mock("@/components/chat/message/preview/forwardMessage", () => ({
  default: () => null,
}));

vi.mock("@/components/chat/message/preview/messagePreviewContent", () => ({
  MessagePreviewContent: () => null,
}));

vi.mock("@/components/chat/message/preview/previewMessage", () => ({
  PreviewMessage: () => null,
}));

vi.mock("@/components/chat/message/roomJump/roomJumpMessage", () => ({
  default: () => null,
}));

vi.mock("./docCard/docCardMessage", () => ({
  default: () => null,
}));

vi.mock("@/components/common/userAccess", () => ({
  UserAvatarByUser: () => null,
}));

vi.mock("@/components/common/toastWindow/toastWindow", () => ({
  default: {},
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../../../../api/hooks/RoleAndAvatarHooks", () => ({
  useGetRoleQuery: () => ({
    data: {
      data: {
        roleName: "测试角色",
      },
    },
    error: undefined,
  }),
}));

vi.mock("../../../../api/hooks/UserHooks", () => ({
  useGetUserInfoQuery: () => ({
    data: {
      data: {
        username: "测试用户",
      },
    },
  }),
}));

vi.mock("../../../../api/hooks/chatQueryHooks", () => ({
  useUpdateMessageMutation: () => ({
    mutate: vi.fn(),
  }),
}));

function createChatMessageResponse(annotations: string[]): ChatMessageResponse {
  return {
    message: {
      messageId: 101,
      syncId: 101,
      roomId: 10530,
      userId: 32,
      roleId: 11454,
      content: "测试内容",
      annotations,
      status: 0,
      messageType: MESSAGE_TYPE.TEXT,
      position: 1,
      createTime: "2026-05-21 10:00:00",
      updateTime: "2026-05-21 10:00:00",
    },
  };
}

describe("chatBubble annotations", () => {
  beforeEach(() => {
    roomPreferenceState.useChatBubbleStyle = false;
    roomPreferenceState.webgalLinkMode = false;
    roomPreferenceState.autoReplyMode = false;
    roomPreferenceState.runModeEnabled = false;
    roomPreferenceState.draftCustomRoleNameMap = {};
  });

  it("跑团模式下会继续展示普通模式隐藏的注解", () => {
    roomPreferenceState.runModeEnabled = true;

    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: createChatMessageResponse(["figure.pos.left"]),
    }));

    expect(html).toContain("data-testid=\"annotations-bar\"");
    expect(html).toContain("data-annotations=\"figure.pos.left\"");
    expect(html).toContain("data-normal-only=\"false\"");
  });

  it("普通模式下仍然会折叠普通模式隐藏的注解", () => {
    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: createChatMessageResponse(["figure.pos.left"]),
    }));

    expect(html).toContain("data-normal-only=\"true\"");
  });
});
