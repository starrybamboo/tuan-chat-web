// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { SpaceMember, UserRole } from "../../../../api";

import {
  buildChatMentionCandidates,
  extractChatInputMentionSnapshot,
  filterChatMentionCandidates,
} from "./chatMention";

type MentionSpanStub = {
  dataset: {
    member?: string;
    role?: string;
  };
  parentNode: {
    removeChild: () => void;
  };
  textContent: string;
};

function createEditorStub(text: string, spans: Array<{
  dataset: MentionSpanStub["dataset"];
  textContent: string;
}>): HTMLDivElement {
  let cloneText = text;
  const cloneSpans: MentionSpanStub[] = spans.map((span) => {
    return {
      dataset: span.dataset,
      parentNode: {
        removeChild: () => {
          cloneText = cloneText.replace(span.textContent, "");
        },
      },
      textContent: span.textContent,
    };
  });

  return {
    cloneNode: () => ({
      querySelectorAll: () => cloneSpans,
      get textContent() {
        return cloneText;
      },
    }),
  } as unknown as HTMLDivElement;
}

describe("chatMention", () => {
  it("会同时构建角色和空间成员候选项", () => {
    const roles = [{
      roleId: 11,
      roleName: "艾莉丝",
      userId: 7,
      type: 0,
    }] as UserRole[];
    const spaceMembers = [{
      userId: 8,
      username: "团长",
      memberType: 1,
    }] as SpaceMember[];

    const candidates = buildChatMentionCandidates({ roles, spaceMembers });

    expect(candidates).toEqual([
      expect.objectContaining({
        kind: "role",
        role: expect.objectContaining({ roleId: 11 }),
      }),
      expect.objectContaining({
        kind: "member",
        member: expect.objectContaining({ userId: 8 }),
        note: "空间成员 · 主持",
      }),
    ]);
  });

  it("会按关键字过滤角色和空间成员", () => {
    const candidates = buildChatMentionCandidates({
      roles: [{
        roleId: 11,
        roleName: "艾莉丝",
        userId: 7,
        type: 0,
      }] as UserRole[],
      spaceMembers: [{
        userId: 8,
        username: "团长",
        memberType: 1,
      }] as SpaceMember[],
    });

    expect(filterChatMentionCandidates(candidates, "艾莉").map(item => item.kind)).toEqual(["role"]);
    expect(filterChatMentionCandidates(candidates, "主持").map(item => item.kind)).toEqual(["member"]);
  });

  it("提取快照时会保留角色 mention 并移除所有 mention 文本", () => {
    const editor = createEditorStub("你好 @艾莉丝\u00A0@团长\u00A0请行动", [
      {
        dataset: {
          role: JSON.stringify({
            roleId: 11,
            roleName: "艾莉丝",
            userId: 7,
            type: 0,
          } satisfies UserRole),
        },
        textContent: "@艾莉丝\u00A0",
      },
      {
        dataset: {
          member: JSON.stringify({
            userId: 8,
            username: "团长",
            memberType: 1,
          } satisfies SpaceMember),
        },
        textContent: "@团长\u00A0",
      },
    ]);

    const snapshot = extractChatInputMentionSnapshot(editor);

    expect(snapshot.mentionedRoles).toEqual([
      expect.objectContaining({
        roleId: 11,
        roleName: "艾莉丝",
      }),
    ]);
    expect(snapshot.textWithoutMentions).toBe("你好 请行动");
  });
});
