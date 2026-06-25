import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

import { ChatBubble, ClueCardReadonlyContent } from "./chatBubble";
import { getMessagePreviewText } from "./preview/getMessagePreviewText";

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
  default: ({ content, className, canEdit, placeholder }: {
    content?: string;
    className?: string;
    canEdit?: boolean;
    placeholder?: string;
  }) => createElement("div", {
    className,
    "data-testid": "editable-content",
    "data-can-edit": String(Boolean(canEdit)),
    "data-placeholder": placeholder ?? "",
  }, content ?? ""),
}));

vi.mock("@/components/chat/message/preview/forwardMessage", () => ({
  default: () => null,
}));

vi.mock("@/components/chat/message/preview/messagePreviewContent", () => ({
  MessagePreviewContent: ({ message }: { message?: { content?: string } | null }) => createElement("div", {
    "data-testid": "message-preview",
  }, getMessagePreviewText(message as any)),
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

vi.mock("@/components/globalContextProvider", () => ({
  useGlobalUserId: () => 32,
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

  afterEach(() => {
    vi.useRealTimers();
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

  it("编辑过的消息头不再展示已编辑标记", () => {
    const response = createChatMessageResponse([]);
    response.message.updateTime = "2026-05-21 10:05:00";

    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: response,
    }));

    expect(html).toContain("【测试角色】");
    expect(html).not.toContain("已编辑");
  });

  it("编辑过的消息头继续展示创建时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026/05/21 21:00:00"));
    const response = createChatMessageResponse([]);
    response.message.createTime = "2026-05-21 12:00:00";
    response.message.updateTime = "2026-05-21 20:01:00";

    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: response,
    }));

    expect(html).toContain("下午12:00");
    expect(html).not.toContain("晚上8:01");
  });

  it("本地缓存 createTime 晚于 updateTime 时退回服务端时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026/05/21 21:00:00"));
    const response = createChatMessageResponse([]);
    response.message.createTime = "2026-05-21 20:01:00";
    response.message.updateTime = "2026-05-21 12:00:00";

    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: response,
    }));

    expect(html).toContain("下午12:00");
    expect(html).not.toContain("晚上8:01");
  });

  it("线索正文会使用预览而不是空正文", () => {
    const html = renderToStaticMarkup(createElement(ClueCardReadonlyContent, {
      message: {
        content: "",
        extra: {
          commandRequest: {
            command: ".rc 射击",
          },
        },
        messageId: 102,
        messageType: MESSAGE_TYPE.COMMAND_REQUEST,
        roomId: 10530,
        status: 0,
      } as any,
      onClose: vi.fn(),
    }));

    expect(html).toContain("[检定请求] .rc 射击");
  });

  it("图片消息正文会渲染成可编辑 caption", () => {
    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: {
        message: {
          ...createChatMessageResponse([]).message,
          content: "图片说明",
          messageType: MESSAGE_TYPE.IMG,
          extra: {
            imageMessage: {
              source: { kind: "internal", fileId: 45 },
              background: false,
              width: 640,
              height: 480,
            },
          },
        },
      },
    }));

    expect(html).toContain("data-testid=\"message-content\"");
    expect(html).toContain("data-testid=\"editable-content\"");
    expect(html).toContain("data-can-edit=\"true\"");
    expect(html).toContain("图片说明");
  });

  it("空图片正文也保留编辑入口给工具栏触发", () => {
    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: {
        message: {
          ...createChatMessageResponse([]).message,
          content: "",
          messageType: MESSAGE_TYPE.IMG,
          extra: {
            imageMessage: {
              source: { kind: "internal", fileId: 45 },
              background: false,
              width: 640,
              height: 480,
            },
          },
        },
      },
    }));

    expect(html).toContain("data-testid=\"editable-content\"");
    expect(html).toContain("data-placeholder=\"添加图片说明\"");
    expect(html).toContain("sr-only");
  });

  it("音频消息正文会渲染成可编辑文本", () => {
    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: {
        message: {
          ...createChatMessageResponse([]).message,
          content: "这是语音台词",
          messageType: MESSAGE_TYPE.SOUND,
          extra: {
            soundMessage: {
              source: { kind: "internal", fileId: 77 },
              second: 3,
            },
          },
        },
      },
    }));

    expect(html).toContain("data-testid=\"editable-content\"");
    expect(html).toContain("data-can-edit=\"true\"");
    expect(html).toContain("这是语音台词");
  });

  it("空音频正文也保留编辑入口并带占位提示", () => {
    const html = renderToStaticMarkup(createElement(ChatBubble, {
      chatMessageResponse: {
        message: {
          ...createChatMessageResponse([]).message,
          content: "",
          messageType: MESSAGE_TYPE.SOUND,
          extra: {
            soundMessage: {
              source: { kind: "internal", fileId: 77 },
              second: 3,
            },
          },
        },
      },
    }));

    expect(html).toContain("data-testid=\"editable-content\"");
    expect(html).toContain("data-placeholder=\"添加语音文本\"");
    expect(html).toContain("sr-only");
  });
});
