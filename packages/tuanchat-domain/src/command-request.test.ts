import { describe, expect, it } from "vitest";

import {
  containsCommandRequestAllToken,
  extractFirstCommandText,
  isCommand,
  stripCommandRequestAllToken,
} from "./command-request";

describe("isCommand", () => {
  it("recognizes valid commands with dot prefix", () => {
    expect(isCommand(".r 1d100")).toBe(true);
    expect(isCommand(".rc 侦查")).toBe(true);
    expect(isCommand(".st 力量 50")).toBe(true);
  });

  it("recognizes valid commands with Chinese dot prefix", () => {
    expect(isCommand("。r 1d100")).toBe(true);
    expect(isCommand("。rc 侦查")).toBe(true);
  });

  it("recognizes valid commands with slash prefix", () => {
    expect(isCommand("/r 1d20")).toBe(true);
    expect(isCommand("/ri")).toBe(true);
  });

  it("rejects double-prefix symbols", () => {
    expect(isCommand("..ff")).toBe(false);
    expect(isCommand("。。ff")).toBe(false);
    expect(isCommand("//r")).toBe(false);
    expect(isCommand("...")).toBe(false);
  });

  it("rejects percent after prefix", () => {
    expect(isCommand(".%test")).toBe(false);
  });

  it("rejects non-letter after prefix", () => {
    expect(isCommand(".1d100")).toBe(false);
    expect(isCommand(". r")).toBe(false);
    expect(isCommand(".!test")).toBe(false);
  });

  it("rejects empty or whitespace-only", () => {
    expect(isCommand("")).toBe(false);
    expect(isCommand("   ")).toBe(false);
  });

  it("rejects plain text", () => {
    expect(isCommand("hello")).toBe(false);
    expect(isCommand("@all 今天集合")).toBe(false);
  });

  it("handles leading whitespace", () => {
    expect(isCommand("  .r 1d100")).toBe(true);
  });
});

describe("containsCommandRequestAllToken", () => {
  it("detects @all", () => {
    expect(containsCommandRequestAllToken("@all .rc 侦查")).toBe(true);
    expect(containsCommandRequestAllToken("@ALL .rc")).toBe(true);
  });

  it("detects Chinese tokens", () => {
    expect(containsCommandRequestAllToken("@全员 .ri")).toBe(true);
    expect(containsCommandRequestAllToken("@所有人 /r 1d20")).toBe(true);
    expect(containsCommandRequestAllToken("@检定请求 .st hp -2")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(containsCommandRequestAllToken("hello world")).toBe(false);
    expect(containsCommandRequestAllToken("@someone .r")).toBe(false);
  });

  it("handles null/undefined gracefully", () => {
    expect(containsCommandRequestAllToken(null as any)).toBe(false);
    expect(containsCommandRequestAllToken(undefined as any)).toBe(false);
  });
});

describe("stripCommandRequestAllToken", () => {
  it("removes @all and normalizes whitespace", () => {
    expect(stripCommandRequestAllToken("@all .rc 侦查")).toBe(".rc 侦查");
  });

  it("removes Chinese tokens", () => {
    expect(stripCommandRequestAllToken("@全员 .ri")).toBe(".ri");
    expect(stripCommandRequestAllToken("@所有人 /r 1d20")).toBe("/r 1d20");
    expect(stripCommandRequestAllToken("@检定请求 .st hp -2")).toBe(".st hp -2");
  });

  it("removes multiple tokens", () => {
    expect(stripCommandRequestAllToken("@all @全员 .rc")).toBe(".rc");
  });

  it("handles null/undefined gracefully", () => {
    expect(stripCommandRequestAllToken(null as any)).toBe("");
    expect(stripCommandRequestAllToken(undefined as any)).toBe("");
  });
});

describe("extractFirstCommandText", () => {
  it("returns the text itself if it is a command", () => {
    expect(extractFirstCommandText(".rc 侦查")).toBe(".rc 侦查");
    expect(extractFirstCommandText("/r 1d20")).toBe("/r 1d20");
  });

  it("extracts command from mixed text", () => {
    expect(extractFirstCommandText("请大家 .rc 侦查")).toBe(".rc 侦查");
    expect(extractFirstCommandText("全员 .ri")).toBe(".ri");
  });

  it("returns null for non-command text", () => {
    expect(extractFirstCommandText("hello world")).toBeNull();
    expect(extractFirstCommandText("@all 今天集合")).toBeNull();
  });

  it("returns null for pure symbols", () => {
    expect(extractFirstCommandText("...")).toBeNull();
    expect(extractFirstCommandText("//")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractFirstCommandText("")).toBeNull();
    expect(extractFirstCommandText("   ")).toBeNull();
  });

  it("handles null/undefined gracefully", () => {
    expect(extractFirstCommandText(null as any)).toBeNull();
    expect(extractFirstCommandText(undefined as any)).toBeNull();
  });
});
