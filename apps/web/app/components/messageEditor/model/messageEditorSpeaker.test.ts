import {
  buildMessageEditorSpeakerMenuItems,
  collectMessageEditorSpeakerSearchKeys,
  extractMessageEditorSpeakerCommandMatch,
  hasMessageEditorSpeaker,
  isMessageEditorSpeakerMenuCommitKey,
  parseMessageEditorSpeakerCommand,
  resolveMessageEditorAvatarTitleLabel,
  resolveMessageEditorSpeakerLabel,
  scoreMessageEditorSpeakerSearchCandidate,
  splitMessageEditorSpeakerCommandQuery,
} from "./messageEditorSpeaker";

describe("messageEditorSpeaker", () => {
  it("formats role and avatar title as a gal speaker label", () => {
    expect(resolveMessageEditorSpeakerLabel({
      roleId: 7,
      roleName: "绯月",
      avatarTitle: { label: "开心" },
    })).toBe("绯月（开心）");
    expect(resolveMessageEditorSpeakerLabel({
      roleId: 7,
      roleName: "绯月",
      avatarTitle: { label: "默认" },
    })).toBe("绯月");
  });

  it("uses common avatar title fallbacks", () => {
    expect(resolveMessageEditorAvatarTitleLabel({ zh: "微笑" })).toBe("微笑");
    expect(resolveMessageEditorAvatarTitleLabel({ mood: "惊讶" })).toBe("惊讶");
  });

  it("only treats meaningful speaker fields as displayable", () => {
    expect(hasMessageEditorSpeaker({ roleId: 0, avatarId: 0 })).toBe(false);
    expect(hasMessageEditorSpeaker({ roleId: 12, avatarId: 0 })).toBe(true);
    expect(hasMessageEditorSpeaker({ customRoleName: "旁白" })).toBe(true);
  });

  it("matches speaker candidates by pinyin and initials", () => {
    const speaker = {
      roleName: "绯月",
      description: "月光下的少女",
    };

    expect(scoreMessageEditorSpeakerSearchCandidate(speaker, "/feiyue")).toBeGreaterThan(0);
    expect(scoreMessageEditorSpeakerSearchCandidate(speaker, "@fy")).toBeGreaterThan(0);
  });

  it("builds speaker menu items with selected role first and a clear item", () => {
    const items = buildMessageEditorSpeakerMenuItems({
      hasSelectedSpeaker: true,
      query: "",
      roles: [
        { roleId: 1, roleName: "旁人", type: 0, userId: 1 },
        { roleId: 7, roleName: "绯月", avatarId: 70, description: "月光下的少女", type: 0, userId: 1 },
      ],
      selectedRoleId: 7,
    });

    expect(items[0]).toMatchObject({
      avatarId: 70,
      description: "月光下的少女",
      kind: "role",
      label: "绯月",
      roleId: 7,
      selected: true,
    });
    expect(items.at(-1)).toMatchObject({
      kind: "clear",
      label: "无",
      selected: false,
    });
  });

  it("extracts inline speaker commands and leaves only document content", () => {
    expect(parseMessageEditorSpeakerCommand("/ 小清")).toEqual({
      prefix: "/",
      query: "小清",
    });
    expect(extractMessageEditorSpeakerCommandMatch("/")).toEqual({
      command: {
        prefix: "/",
        query: "",
      },
      remainder: "",
    });
    expect(extractMessageEditorSpeakerCommandMatch("/ 小清\n今天去旧校舍。")).toEqual({
      command: {
        prefix: "/",
        query: "小清",
      },
      remainder: "今天去旧校舍。",
    });
    expect(extractMessageEditorSpeakerCommandMatch("@feiyue")).toEqual({
      command: {
        prefix: "@",
        query: "feiyue",
      },
      remainder: "",
    });
    expect(extractMessageEditorSpeakerCommandMatch("前文\n/ 小清\n今天去旧校舍。")).toEqual({
      command: {
        prefix: "/",
        query: "小清",
      },
      remainder: "前文\n今天去旧校舍。",
    });
    expect(extractMessageEditorSpeakerCommandMatch("前文\n@feiyue\n今天去旧校舍。")).toEqual({
      command: {
        prefix: "@",
        query: "feiyue",
      },
      remainder: "前文\n今天去旧校舍。",
    });
  });

  it("splits speaker queries into role and avatar search parts", () => {
    expect(splitMessageEditorSpeakerCommandQuery("绯月 开心")).toEqual({
      avatarQuery: "开心",
      roleQuery: "绯月",
    });
    expect(splitMessageEditorSpeakerCommandQuery("绯月")).toEqual({
      avatarQuery: "",
      roleQuery: "绯月",
    });
  });

  it("treats space and enter as speaker commit keys", () => {
    expect(isMessageEditorSpeakerMenuCommitKey({
      altKey: false,
      ctrlKey: false,
      key: " ",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe(true);
    expect(isMessageEditorSpeakerMenuCommitKey({
      altKey: false,
      ctrlKey: false,
      key: "Enter",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe(true);
    expect(isMessageEditorSpeakerMenuCommitKey({
      altKey: false,
      ctrlKey: false,
      key: "Enter",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent)).toBe(false);
  });

  it("collects searchable aliases from role extra fields", () => {
    const keys = collectMessageEditorSpeakerSearchKeys({
      roleName: "绯月",
      extra: {
        aliases: "Akari, 月月",
        ignored: "不会被搜到",
      },
    });

    expect(keys).toEqual(expect.arrayContaining(["akari", "月月", "yueyue", "yy"]));
    expect(scoreMessageEditorSpeakerSearchCandidate({ roleName: "绯月", extra: { aliases: "Akari, 月月" } }, "akari")).toBeGreaterThan(0);
    expect(scoreMessageEditorSpeakerSearchCandidate({ roleName: "绯月", extra: { aliases: "Akari, 月月" } }, "月月")).toBeGreaterThan(0);
  });
});
