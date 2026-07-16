import {
  extractMessageEditorSlashQuery,
  filterMessageEditorSlashMenuItems,
  resolveMessageEditorSlashMenuState,
} from "../../model/messageEditorSlash";

describe("messageEditorSlash", () => {
  it("finds a slash command on any line", () => {
    expect(extractMessageEditorSlashQuery("前文\n/ h1\n后文")).toBe("h1");
    expect(extractMessageEditorSlashQuery("前文\n   / quote\n后文")).toBe("quote");
    expect(extractMessageEditorSlashQuery("前文\n@ feiyue\n后文")).toBeNull();
  });

  it("filters slash menu candidates by query", () => {
    expect(filterMessageEditorSlashMenuItems("h1").map(item => item.kind)).toEqual([
      "heading1",
    ]);
  });

  it("hides the slash menu for readonly, dismissed, speaker, and unmatched states", () => {
    expect(resolveMessageEditorSlashMenuState({
      activeBlockId: "block-1",
      content: "/",
      readOnly: true,
    })).toBeNull();

    expect(resolveMessageEditorSlashMenuState({
      activeBlockId: "block-1",
      content: "/ h1",
      dismissedSlashKey: "block-1:h1",
      readOnly: false,
    })).toBeNull();

    expect(resolveMessageEditorSlashMenuState({
      activeBlockId: "block-1",
      content: "/ 绯月\n正文",
      readOnly: false,
    })).toBeNull();

    expect(resolveMessageEditorSlashMenuState({
      activeBlockId: "block-1",
      content: "/ unknown-command",
      readOnly: false,
    })).toBeNull();
  });
});
