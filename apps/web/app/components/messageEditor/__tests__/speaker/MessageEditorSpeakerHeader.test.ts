import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, vi } from "vitest";

import { createMessageEditorTextDraft } from "../../document/messageEditorTransforms";
import { MessageEditorSpeakerHeader } from "../../speaker/MessageEditorSpeakerHeader";

const queryMocks = vi.hoisted(() => ({
  getRole: vi.fn(),
  getRoleAvatar: vi.fn(),
  getRoleAvatars: vi.fn(),
}));

vi.mock("../../../../../api/hooks/RoleAndAvatarHooks", () => ({
  useGetRoleQuery: queryMocks.getRole,
  useGetRoleAvatarQuery: queryMocks.getRoleAvatar,
  useGetRoleAvatarsQuery: queryMocks.getRoleAvatars,
}));

vi.mock("@/components/common/Avatar", () => ({
  AVATAR_HOVER_IMAGE_CLASS: "avatar-image",
  AVATAR_HOVER_SHELL_CLASS: "avatar-shell",
  Avatar: ({ alt, imageDecoding, imageLoading, size, src }: {
    alt?: string;
    imageDecoding?: "async" | "auto" | "sync";
    imageLoading?: "eager" | "lazy";
    size?: number | string;
    src?: string;
  }) => createElement("img", {
    alt,
    "data-size": size,
    decoding: imageDecoding,
    loading: imageLoading,
    src,
  }),
}));

describe("MessageEditorSpeakerHeader", () => {
  beforeEach(() => {
    queryMocks.getRole.mockReset().mockReturnValue({ data: undefined });
    queryMocks.getRoleAvatar.mockReset().mockReturnValue({ data: undefined });
    queryMocks.getRoleAvatars.mockReset().mockReturnValue({ data: undefined });
  });

  it("does not create query observers for narrator blocks", () => {
    const html = renderToStaticMarkup(createElement(MessageEditorSpeakerHeader, {
      message: createMessageEditorTextDraft({ content: "narration" }),
    }));

    expect(html).toContain("旁白");
    expect(queryMocks.getRole).not.toHaveBeenCalled();
    expect(queryMocks.getRoleAvatar).not.toHaveBeenCalled();
    expect(queryMocks.getRoleAvatars).not.toHaveBeenCalled();
  });

  it("uses only role and avatar queries for an explicit avatar", () => {
    queryMocks.getRole.mockReturnValue({ data: { data: { roleName: "角色" } } });
    queryMocks.getRoleAvatar.mockReturnValue({
      data: { data: { avatarFileId: 123, avatarTitle: "默认" } },
    });
    const html = renderToStaticMarkup(createElement(MessageEditorSpeakerHeader, {
      message: {
        ...createMessageEditorTextDraft({ content: "line" }),
        avatarId: 9,
        roleId: 7,
      },
    }));

    expect(queryMocks.getRole).toHaveBeenCalledOnce();
    expect(queryMocks.getRoleAvatar).toHaveBeenCalledOnce();
    expect(queryMocks.getRoleAvatars).not.toHaveBeenCalled();
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('data-size="8"');
    expect(html).toContain("size-8");
    expect(html).toContain("items-start");
    expect(html).toContain("/media/v1/files/123/123/image/low.webp");
  });

  it("uses role and avatar-list queries only when an explicit avatar is absent", () => {
    queryMocks.getRole.mockReturnValue({ data: { data: { roleName: "角色" } } });
    queryMocks.getRoleAvatars.mockReturnValue({
      data: { data: [{ avatarFileId: 456, avatarTitle: "默认" }] },
    });
    renderToStaticMarkup(createElement(MessageEditorSpeakerHeader, {
      message: {
        ...createMessageEditorTextDraft({ content: "line" }),
        roleId: 7,
      },
    }));

    expect(queryMocks.getRole).toHaveBeenCalledOnce();
    expect(queryMocks.getRoleAvatar).not.toHaveBeenCalled();
    expect(queryMocks.getRoleAvatars).toHaveBeenCalledOnce();
  });
});
