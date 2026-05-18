import { describe, expect, it } from "vitest";

import { formatMessageDateTime, formatMessageTime } from "./messageTime";

describe("formatMessageTime", () => {
  it("returns HH:MM for valid time string", () => {
    const date = new Date(2024, 2, 15, 14, 5, 30);
    const result = formatMessageTime(date.toISOString());
    expect(result).toBe("14:05");
  });

  it("returns '刚刚' for null", () => {
    expect(formatMessageTime(null)).toBe("刚刚");
  });

  it("returns '刚刚' for undefined", () => {
    expect(formatMessageTime(undefined)).toBe("刚刚");
  });

  it("returns original string for invalid date", () => {
    expect(formatMessageTime("not-a-date")).toBe("not-a-date");
  });

  it("returns '刚刚' for empty string", () => {
    expect(formatMessageTime("")).toBe("刚刚");
  });
});

describe("formatMessageDateTime", () => {
  it("returns MM-DD HH:MM for valid time string", () => {
    const date = new Date(2024, 2, 15, 14, 5, 30);
    const result = formatMessageDateTime(date.toISOString());
    expect(result).toBe("03-15 14:05");
  });

  it("returns '刚刚' for null", () => {
    expect(formatMessageDateTime(null)).toBe("刚刚");
  });

  it("returns '刚刚' for undefined", () => {
    expect(formatMessageDateTime(undefined)).toBe("刚刚");
  });

  it("returns original string for invalid date", () => {
    expect(formatMessageDateTime("not-a-date")).toBe("not-a-date");
  });
});
