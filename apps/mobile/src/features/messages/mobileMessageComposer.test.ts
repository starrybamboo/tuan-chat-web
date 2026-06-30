import { describe, expect, it } from "vitest";

import {
  getMobileMessageModeLabel,
  MOBILE_MESSAGE_MODE,
} from "./mobileMessageComposer";

describe("mobileMessageComposer", () => {
  it("只保留文本和指令请求两种移动端消息模式", () => {
    expect(getMobileMessageModeLabel(MOBILE_MESSAGE_MODE.TEXT)).toBe("文本");
    expect(getMobileMessageModeLabel(MOBILE_MESSAGE_MODE.COMMAND_REQUEST)).toBe("指令请求");
  });
});
